// routes/student.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const db2 = require('../db2');

// 📝 STUDENT SIGNUP - Register pending student (before approval)
router.post('/signup', async (req, res) => {
  const { name, email, rollNo, phone, year, branch, college } = req.body;
  
  try {
    // Validate required fields
    if (!name || !email || !rollNo || !phone || !year || !branch) {
      return res.json({ success: false, message: 'All fields are required' });
    }

    // Select database based on campus type
    const targetDb = (college && college.toUpperCase() === 'NECG') ? db2 : db;

    // Check across both pending_students and students to avoid duplicates
    const [existingPending] = await targetDb.query(
      'SELECT id FROM pending_students WHERE (email = ? OR roll_no = ?) AND status = "pending"',
      [email, rollNo]
    );

    if (existingPending && existingPending.length > 0) {
      return res.json({ success: false, message: 'Email or Roll Number already registered (pending)' });
    }

    const [existingRegistered] = await targetDb.query(
      'SELECT id FROM students WHERE email = ? OR roll_no = ?',
      [email, rollNo]
    );

    if (existingRegistered && existingRegistered.length > 0) {
      return res.json({ success: false, message: 'Email or Roll Number already exists in student records' });
    }

    // Insert into pending_students table
    const [result] = await targetDb.query(
      'INSERT INTO pending_students (name, email, phone, roll_no, branch, year, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, rollNo, branch, year, 'pending']
    );

    res.json({
      success: true,
      message: 'Registration successful! Your request is pending admin approval.',
      student_id: result.insertId
    });

  } catch (err) {
    console.error('Student signup error:', err);
    
    // Handle specific database errors
    if (err.code === 'ER_DUP_ENTRY') {
      return res.json({ success: false, message: 'Email or Roll Number already exists' });
    }
    
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ✅ 1. Get student details by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Try to get all fields including new ones
    let query = 'SELECT id, name, email, branch, year, cgpa, backlogs FROM students WHERE id = ?';
    let params = [id];
    
    // Check if new columns exist and include them if they do
    try {
      const [student] = await db.query(
        'SELECT id, name, email, branch, year, phone, dob, cgpa, backlogs FROM students WHERE id = ?',
        [id]
      );
      
      if (!student.length)
        return res.json({ success: false, message: 'Student not found' });

      res.json({ success: true, student: student[0] });
    } catch (err) {
      // If columns don't exist yet, use fallback query
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        const [student] = await db.query(
          'SELECT id, name, email, branch, year, cgpa, backlogs FROM students WHERE id = ?',
          [id]
        );
        
        if (!student.length)
          return res.json({ success: false, message: 'Student not found' });

        res.json({ success: true, student: { ...student[0], phone: null, dob: null } });
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error('Error fetching student data:', err);
    res.json({ success: false, message: 'Server error' });
  }
});


// ✅ 2. Fetch recent applications (latest 5)
router.get('/:id/applications', async (req, res) => {
  const { id } = req.params;
  try {
    const [apps] = await db.query(
      `SELECT a.id, o.company_name, o.title, a.status, a.applied_on
       FROM applications a 
       JOIN opportunities o ON a.opportunity_id = o.id 
       WHERE a.student_id = ? 
       ORDER BY a.applied_on DESC LIMIT 5`,
      [id]
    );
    res.json({ success: true, applications: apps });
  } catch (err) {
    console.error('Error fetching applications:', err);
    res.json({ success: false, message: 'Server error' });
  }
});


router.get('/:id/opportunities', async (req, res) => {
  const { id } = req.params; 
  try {
    const [[student]] = await db.query('SELECT branch FROM students WHERE id = ?', [id]);
    if (!student) return res.json({ success: false, message: 'Student not found' });

    // ✅ Query for opportunities (jobs/internships)
    const [opportunities] = await db.query(
      `SELECT o.* 
       FROM opportunities o 
       WHERE o.type = 'placement'
       AND (o.eligible_branches = 'All' OR FIND_IN_SET(?, o.eligible_branches))
       AND (o.due_date IS NULL OR o.due_date >= CURDATE())
       AND o.is_active = TRUE
       ORDER BY o.due_date ASC`,
      [id, student.branch]
    );

    res.json({ success: true, opportunities });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server error' });
  }
});

// Get ongoing drives where student is registered and generate QR option
router.get('/:id/registered-ongoing-drives', async (req, res) => {
  const { id } = req.params;
  try {
    await ensureRegistrationsTable();

    // Query placements registrations only (remove opportunities path)
    const [drives] = await db.query(
      `SELECT sr.id AS registration_id,
              p.id AS opportunity_id,
              p.company_name AS title,
              p.company_name,
              p.job_role AS job_role,
              p.job_role AS role,
              p.interview_rounds,
              p.due_date,
              p.location,
              sr.status AS application_status,
              'placement' AS type,
              CASE WHEN p.is_active = 1 THEN 'active' ELSE 'closed' END AS drive_status,
              'placement' AS source
       FROM student_registrations sr
       JOIN placements p ON sr.drive_id = p.id AND sr.drive_type = 'placement'
       WHERE sr.student_id = ?
         AND p.is_active = 1
         AND (p.due_date IS NULL OR DATE(p.due_date) >= CURDATE())
       ORDER BY p.due_date ASC`,
      [id]
    );

    const driveIds = drives
      .map(d => Number(d.opportunity_id))
      .filter(Boolean);

    const uploadedRoundsByPlacement = {};
    if (driveIds.length > 0) {
      const placeholders = driveIds.map(() => '?').join(',');
      try {
        const [uploadedRows] = await db.query(
          `SELECT placement_id, COUNT(DISTINCT round_number) AS uploaded_rounds
           FROM placement_round_results
           WHERE placement_id IN (${placeholders})
           GROUP BY placement_id`,
          driveIds
        );

        uploadedRows.forEach(row => {
          uploadedRoundsByPlacement[Number(row.placement_id)] = Number(row.uploaded_rounds || 0);
        });
      } catch (roundErr) {
        if (roundErr.code !== 'ER_NO_SUCH_TABLE') {
          throw roundErr;
        }
      }
    }

    const filteredDrives = drives
      .filter(drive => {
        const totalRounds = parseInterviewRoundCount(drive.interview_rounds);
        const uploadedRounds = uploadedRoundsByPlacement[Number(drive.opportunity_id)] || 0;
        return totalRounds === 0 || uploadedRounds < totalRounds;
      })
      .map(({ interview_rounds, ...drive }) => drive);

    res.json({ success: true, drives: filteredDrives });
  } catch (err) {
    console.error('Error fetching registered ongoing drives:', err);
    res.json({ success: false, message: 'Server error', drives: [] });
  }
});

// ✅ Get announcements (recent placements, internships, and events)
router.get('/:id/announcements', async (req, res) => {
  const { id } = req.params;
  try {
    const [[student]] = await db.query('SELECT branch, year FROM students WHERE id = ?', [id]);
    if (!student) return res.json({ success: false, message: 'Student not found' });

    // Get recent placements
    const [placements] = await db.query(
      `SELECT 
        id, 
        company_name, 
        job_role as title, 
        'placement' as type,
        created_at as posted_on,
        due_date,
        description
       FROM placements 
       WHERE (eligible_branches = 'All' OR FIND_IN_SET(?, eligible_branches) OR eligible_branches IS NULL)
       AND is_active = TRUE
       ORDER BY created_at DESC 
       LIMIT 3`,
      [student.branch]
    );

    // Get recent internships
    const [internships] = await db.query(
      `SELECT 
        id, 
        company_name, 
        role as title, 
        'internship' as type,
        created_at as posted_on,
        due_date,
        description
       FROM internships 
       WHERE (eligible_branches = 'All' OR FIND_IN_SET(?, eligible_branches) OR eligible_branches IS NULL)
       AND is_active = TRUE
       ORDER BY created_at DESC 
       LIMIT 3`,
      [student.branch]
    );

    // Get recent events
    const yearMappings = {
      '1': ['1', '1st Year', 'First Year'],
      '2': ['2', '2nd Year', 'Second Year'],
      '3': ['3', '3rd Year', 'Third Year'],
      '4': ['4', '4th Year', 'Final Year']
    };

    const possibleYears = yearMappings[student.year] || [student.year];
    let yearCondition = '';
    const yearParams = [];
    if (await columnExists('faculty_events','eligible_years')) {
      possibleYears.forEach((yr, idx) => {
        if (idx > 0) yearCondition += ' OR ';
        yearCondition += `eligible_years LIKE ?`;
        yearParams.push(`%${yr}%`);
      });
    }

    // build query conditionally
    let eventQuery = `SELECT 
        id,
        title as event_name,
        event_type,
        event_date,
        location,
        description,
        created_at
       FROM faculty_events 
       WHERE status = 'published'
       AND DATE(event_date) >= CURDATE()`;
    const eventParams = [];
    if (await columnExists('faculty_events','eligible_branches')) {
      eventQuery += `
       AND (eligible_branches IS NULL OR eligible_branches = '' OR FIND_IN_SET(?, eligible_branches))`;
      eventParams.push(student.branch);
    }
    if (yearCondition) {
      eventQuery += `
       AND (eligible_years IS NULL OR eligible_years = '' OR (${yearCondition}))`;
      eventParams.push(...yearParams);
    }
    eventQuery += `
       ORDER BY created_at DESC 
       LIMIT 3`;

    const [events] = await db.query(eventQuery, eventParams);

    // Combine all announcements
    const opportunities = [...(placements || []), ...(internships || [])];

    res.json({ 
      success: true, 
      announcements: {
        opportunities: opportunities,
        events: events || []
      }
    });
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDirectories = () => {
    const dirs = ['./uploads', './uploads/profiles', './uploads/resumes'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    });
};
ensureDirectories();

// Configure Multer for profile uploads
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/profiles/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
    }
});
const profileUpload = multer({ storage: profileStorage });

// Configure Multer for resume uploads
const resumeDir = path.join(__dirname, '../uploads/resumes');
if (!fs.existsSync(resumeDir)) {
    fs.mkdirSync(resumeDir, { recursive: true });
}

const resumeStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, resumeDir);
    },
    filename: (req, file, cb) => {
        // Use consistent filename: student_{id}_resume.pdf
        const studentId = req.params.id || req.body.student_id || 'unknown';
        cb(null, `student_${studentId}_resume.pdf`);
    }
});
const resumeUpload = multer({ 
    storage: resumeStorage,
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
            return cb(new Error('Only PDF files are allowed'));
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ✅ Update Profile Route
router.post('/:id/update', profileUpload.single('profile_pic'), async (req, res) => {
    const { id } = req.params;
    const { name, branch, cgpa, backlogs, phone } = req.body;
    let profilePicUrl = null;

    if (req.file) {
        profilePicUrl = `/uploads/profiles/${req.file.filename}`;
    }

    try {
        // We use COALESCE or simple logic: if a value is provided, use it; otherwise, keep old value.
        // But since we pre-fill the frontend, 'req.body' will always contain the values.
        
        let sql = `UPDATE students SET 
                   name = ?, 
                   branch = ?, 
                   cgpa = ?, 
                   backlogs = ?`;
        let params = [name, branch, cgpa, backlogs];

        // Only add profile_pic to query if a new file was uploaded
        if (profilePicUrl) {
            sql += `, profile_pic = ?`;
            params.push(profilePicUrl);
        }

        sql += ` WHERE id = ?`;
        params.push(id);

        await db.query(sql, params);
        res.json({ success: true, message: "Changes saved successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Database Error" });
    }
});
// ✅ 4. Fetch Internship Opportunities (for student-internships.html)
router.get('/:id/internships', async (req, res) => {
    const { id } = req.params;
    try {
      const [[student]] = await db.query(
        'SELECT branch FROM students WHERE id = ?',
        [id]
      );
  
      if (!student) return res.json({ success: false, message: 'Student not found' });
  
      const [opportunities] = await db.query(
        `SELECT * FROM opportunities 
         WHERE type = 'internship'
           AND (eligibility IS NULL OR eligibility LIKE CONCAT('%', ?, '%'))
           AND (due_date IS NULL OR due_date >= CURDATE())
         ORDER BY due_date ASC`,
        [student.branch]
      );
  
      res.json({ success: true, opportunities });
    } catch (err) {
      console.error('Error fetching internship opportunities:', err);
      res.json({ success: false, message: 'Server error' });
    }
  });

router.post('/:id/update-personal', profileUpload.single('profile_pic'), async (req, res) => {
    const { id } = req.params;
    const { phone } = req.body;

    try {
        console.log('Update personal info request:', { id, phone });
        
        // Build dynamic update query (name is NOT updatable)
        let updateFields = [];
        let params = [];
        
        if (phone !== undefined) {
            updateFields.push('phone = ?');
            params.push(phone);
        }
        if (req.file) {
            updateFields.push('profile_pic = ?');
            params.push(`/uploads/profiles/${req.file.filename}`);
        }
        
        // If no fields to update, return error
        if (updateFields.length === 0) {
            return res.json({ success: false, message: 'No fields to update' });
        }
        
        params.push(id);
        
        let sql = `UPDATE students SET ${updateFields.join(', ')} WHERE id = ?`;
        console.log('SQL:', sql, 'Params:', params);
        
        const result = await db.query(sql, params);
        console.log('Update result:', result);
        
        res.json({ success: true, message: 'Personal information updated successfully' });
    } catch (err) {
        console.error('Error updating personal info:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});
// ✅ 5. Unified Apply Route (Returns apply_link for frontend window.open)
router.post('/:id/apply', async (req, res) => {
    const { id } = req.params; // student_id
    const { opportunity_id } = req.body;

    if (!opportunity_id)
        return res.json({ success: false, message: 'Missing opportunity_id' });

    try {
        // 1. Get the opportunity details first to fetch the link
        const [opportunity] = await db.query(
            'SELECT apply_link FROM opportunities WHERE id = ?',
            [opportunity_id]
        );

        if (opportunity.length === 0)
            return res.json({ success: false, message: 'Opportunity not found' });

        const link = opportunity[0].apply_link;

        // 2. Check if student already applied
        const [existing] = await db.query(
            'SELECT id FROM applications WHERE student_id = ? AND opportunity_id = ?',
            [id, opportunity_id]
        );

        if (existing.length > 0) {
            // Return link so frontend can open it even if already recorded in DB
            return res.json({ 
                success: true, 
                message: 'Already applied', 
                apply_link: link 
            });
        }

        // 3. Record the application in database
        await db.query(
            'INSERT INTO applications (student_id, opportunity_id, status) VALUES (?, ?, "applied")',
            [id, opportunity_id]
        );

        res.json({ 
            success: true, 
            message: 'Applied successfully!', 
            apply_link: link 
        });

    } catch (err) {
        console.error('Error applying to opportunity:', err);
        res.json({ success: false, message: 'Server error' });
    }
});

// ✅ Ensure student_registrations table exists
async function ensureRegistrationsTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS student_registrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            drive_id INT NOT NULL,
            drive_type ENUM('placement', 'internship') NOT NULL,
            status ENUM('applied', 'shortlisted', 'selected', 'rejected') DEFAULT 'applied',
            registered_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_reg (student_id, drive_id, drive_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
}

function parseInterviewRoundCount(rawRounds) {
  if (!rawRounds) return 0;

  try {
    const parsed = JSON.parse(rawRounds);
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && Array.isArray(parsed.rounds)) return parsed.rounds.length;
    return 0;
  } catch (err) {
    return String(rawRounds)
      .split(',')
      .map(item => item.trim())
      .filter(Boolean).length;
  }
}

// ✅ Check if student is already registered for a drive
router.get('/:id/check-registration', async (req, res) => {
    const { id } = req.params;
    const { drive_id, drive_type } = req.query;

    if (!drive_id || !drive_type)
        return res.json({ registered: false });

    try {
        await ensureRegistrationsTable();
        const [rows] = await db.query(
            'SELECT id FROM student_registrations WHERE student_id = ? AND drive_id = ? AND drive_type = ?',
            [id, drive_id, drive_type]
        );
        res.json({ registered: rows.length > 0 });
    } catch (err) {
        console.error('Error checking registration:', err);
        res.json({ registered: false });
    }
});

// ✅ Register for a placement drive or internship
router.post('/:id/register-drive', async (req, res) => {
    const { id } = req.params;
    const { drive_id, drive_type } = req.body;

    if (!drive_id || !drive_type)
        return res.json({ success: false, message: 'Missing drive_id or drive_type' });

    try {
        await ensureRegistrationsTable();

        // Check if already registered
        const [existing] = await db.query(
            'SELECT id FROM student_registrations WHERE student_id = ? AND drive_id = ? AND drive_type = ?',
            [id, drive_id, drive_type]
        );

        if (existing.length > 0)
            return res.json({ success: true, message: 'Already registered', alreadyRegistered: true });

        await db.query(
            'INSERT INTO student_registrations (student_id, drive_id, drive_type, status) VALUES (?, ?, ?, "applied")',
            [id, drive_id, drive_type]
        );

        res.json({ success: true, message: 'Registered successfully!' });
    } catch (err) {
        console.error('Error registering for drive:', err);
        res.json({ success: false, message: 'Server error' });
    }
});

// ✅ Get all applications (paginated) for a student
router.get('/:id/my-applications', async (req, res) => {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        await ensureRegistrationsTable();

        // Count total
        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) AS total FROM student_registrations WHERE student_id = ?',
            [id]
        );

        // Fetch paginated registrations joined with placements/internships
        const [rows] = await db.query(
            `SELECT 
                sr.id, sr.drive_id, sr.drive_type, sr.status, sr.registered_on,
                CASE sr.drive_type
                    WHEN 'placement' THEN p.company_name
                    WHEN 'internship' THEN i.company_name
                END AS company_name,
                CASE sr.drive_type
                    WHEN 'placement' THEN p.job_role
                    WHEN 'internship' THEN i.role
                END AS job_role,
            CASE sr.drive_type
              WHEN 'placement' THEN COALESCE(p.drive_date, p.event_date, p.due_date)
              WHEN 'internship' THEN i.due_date
            END AS drive_date,
                CASE sr.drive_type
                    WHEN 'placement' THEN p.apply_link
                    WHEN 'internship' THEN i.apply_link
                END AS apply_link,
                (SELECT COUNT(*) FROM student_registrations sr2 
                 WHERE sr2.drive_id = sr.drive_id AND sr2.drive_type = sr.drive_type) AS applicant_count
             FROM student_registrations sr
             LEFT JOIN placements p ON sr.drive_type = 'placement' AND sr.drive_id = p.id
             LEFT JOIN internships i ON sr.drive_type = 'internship' AND sr.drive_id = i.id
             WHERE sr.student_id = ?
             ORDER BY sr.registered_on DESC
             LIMIT ? OFFSET ?`,
            [id, limit, offset]
        );

        // Enrich placement statuses from round results and placement notices.
        try {
          const placementIds = [...new Set(
            rows
              .filter(row => row.drive_type === 'placement' && row.drive_id)
              .map(row => Number(row.drive_id))
              .filter(Boolean)
          )];

          if (placementIds.length > 0) {
            const placeholders = placementIds.map(() => '?').join(',');

            const [latestRoundRows] = await db.query(
              `SELECT prr.placement_id, prr.round_number, prr.status
               FROM placement_round_results prr
               INNER JOIN (
                 SELECT placement_id, MAX(round_number) AS max_round
                 FROM placement_round_results
                 WHERE student_id = ? AND placement_id IN (${placeholders})
                 GROUP BY placement_id
               ) latest
                 ON latest.placement_id = prr.placement_id
                AND latest.max_round = prr.round_number
               WHERE prr.student_id = ?`,
              [id, ...placementIds, id]
            );

            const latestRoundByPlacement = {};
            latestRoundRows.forEach(row => {
              latestRoundByPlacement[row.placement_id] = row;
            });

            const [placementRows] = await db.query(
              `SELECT id, interview_rounds
               FROM placements
               WHERE id IN (${placeholders})`,
              placementIds
            );

            const totalRoundsByPlacement = {};
            placementRows.forEach(row => {
              totalRoundsByPlacement[row.id] = parseInterviewRoundCount(row.interview_rounds);
            });

            let placementSuccessSet = new Set();
            try {
              const [successRows] = await db.query(
                `SELECT DISTINCT placement_id
                 FROM student_notifications
                 WHERE student_id = ?
                   AND type = 'placement_success'
                   AND placement_id IN (${placeholders})`,
                [id, ...placementIds]
              );
              placementSuccessSet = new Set(successRows.map(row => row.placement_id));
            } catch (noticeErr) {
              if (noticeErr.code !== 'ER_NO_SUCH_TABLE') {
                throw noticeErr;
              }
            }

            rows.forEach(row => {
              if (row.drive_type !== 'placement') return;

              const placementId = Number(row.drive_id);
              if (!placementId) return;

              // Avoid stale values in student_registrations for placements.
              // Status should come from round outcomes for this exact placement.
              row.status = 'applied';

              if (placementSuccessSet.has(placementId)) {
                row.status = 'selected';
                return;
              }

              const latestRound = latestRoundByPlacement[placementId];
              if (!latestRound) return;

              if (latestRound.status === 'rejected') {
                row.status = 'rejected';
                return;
              }

              const totalRounds = Number(totalRoundsByPlacement[placementId]) || 0;
              if (latestRound.status === 'shortlisted') {
                row.status = totalRounds > 0 && Number(latestRound.round_number) >= totalRounds
                  ? 'selected'
                  : 'shortlisted';
              }
            });
          }
        } catch (statusSyncErr) {
          if (statusSyncErr.code !== 'ER_NO_SUCH_TABLE') {
            throw statusSyncErr;
          }
        }

        res.json({
            success: true,
            applications: rows,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('Error fetching my-applications:', err);
        res.json({ success: false, message: 'Server error' });
    }
});

// helper to detect schema changes
async function columnExists(table, column) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

// ✅ Get events for a student (filtered by branch and year)
router.get('/:id/events', async (req, res) => {
  const { id } = req.params;
  try {
    // Get student's branch and year
    const [[student]] = await db.query('SELECT branch, year FROM students WHERE id = ?', [id]);
    
    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    console.log('Fetching events for student:', { id, branch: student.branch, year: student.year });

    // Eligibility helpers
    const hasBranches = await columnExists('faculty_events', 'eligible_branches');
    const hasYears = await columnExists('faculty_events', 'eligible_years');

    const yearMappings = {
      '1': ['1', '1st Year', 'First Year'],
      '2': ['2', '2nd Year', 'Second Year'],
      '3': ['3', '3rd Year', 'Third Year'],
      '4': ['4', '4th Year', 'Final Year']
    };
    const possibleYears = yearMappings[student.year] || [student.year];
    let yearCondition = '';
    const yearParams = [];
    if (hasYears) {
      possibleYears.forEach((yr, idx) => {
        if (idx > 0) yearCondition += ' OR ';
        yearCondition += `eligible_years LIKE ?`;
        yearParams.push(`%${yr}%`);
      });
    }

    // Build query incrementally so it doesn't break if columns are missing
    let baseQuery = `SELECT id, faculty_id, title as event_name, description, event_date, location, event_type, created_at
                     FROM faculty_events
                     WHERE status = 'published'
                       AND DATE(event_date) >= CURDATE()`;
    const params = [];

    if (hasBranches) {
      baseQuery += ` AND (eligible_branches IS NULL OR eligible_branches = '' OR FIND_IN_SET(?, eligible_branches))`;
      params.push(student.branch);
    }
    if (hasYears) {
      baseQuery += ` AND (eligible_years IS NULL OR eligible_years = '' OR (${yearCondition}))`;
      params.push(...yearParams);
    }

    baseQuery += ` ORDER BY event_date ASC`;

    const [events] = await db.query(baseQuery, params);


    console.log('Found events:', events.length);
    events.forEach(event => {
      console.log('Event details:', { id: event.id, name: event.event_name, date: event.event_date });
    });

    res.json({ success: true, events: events });
  } catch (err) {
    console.error('Error fetching events for student:', err);
    res.json({ success: false, message: 'Server error', error: err.message });
  }
});

// ✅ Register student for an event
router.post('/:id/register-event', async (req, res) => {
  const { id } = req.params;
  const { event_id } = req.body;

  console.log('Register event request:', { id, event_id });

  if (!event_id) {
    return res.json({ success: false, message: 'Event ID is required' });
  }

  try {
    // Get student details
    const [[student]] = await db.query(
      'SELECT id, name, email FROM students WHERE id = ?',
      [id]
    );

    console.log('Student found:', student);

    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    // Check if student already registered for this event
    const [existing] = await db.query(
      'SELECT id FROM faculty_event_registrations WHERE student_id = ? AND event_id = ?',
      [id, event_id]
    );

    if (existing.length > 0) {
      return res.json({ 
        success: false, 
        message: 'You have already registered for this event' 
      });
    }

    // Get event details
    const [[event]] = await db.query(
      'SELECT * FROM faculty_events WHERE id = ?',
      [event_id]
    );

    console.log('Event found:', event);

    if (!event) {
      return res.json({ success: false, message: 'Event not found' });
    }

    // Insert registration
    const result = await db.query(
      'INSERT INTO faculty_event_registrations (student_id, event_id, status) VALUES (?, ?, "registered")',
      [id, event_id]
    );

    console.log('Registration inserted:', result);

    res.json({
      success: true,
      message: `Successfully registered for ${event.event_name}!`,
      registration: {
        student_id: student.id,
        student_name: student.name,
        student_email: student.email,
        event_id: event.id,
        event_name: event.event_name,
        registration_status: 'registered'
      }
    });

  } catch (err) {
    console.error('Error registering for event:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
});

// ✅ Update Academic Information
router.post('/:id/update-academic', resumeUpload.single('resume'), async (req, res) => {
  const { id } = req.params;
  const { cgpa, backlogs } = req.body;

  try {
    let sql = "UPDATE students SET cgpa = ?, backlogs = ?";
    let params = [cgpa, backlogs];

    sql += " WHERE id = ?";
    params.push(id);

    await db.query(sql, params);

    // Handle resume upload
    if (req.file) {
      const resumePath = `/uploads/resumes/${req.file.filename}`;

      // Simple UPSERT: Update existing record or insert new one
      await db.query(
        `INSERT INTO student_resumes (student_id, resume_path, version, upload_date)
         VALUES (?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
         resume_path = VALUES(resume_path),
         upload_date = NOW()`,
        [id, resumePath]
      );
    }

    res.json({ success: true, message: 'Academic information updated successfully!' });
  } catch (err) {
    console.error('Error updating academic info:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Get student's resume (single record per student)
router.get('/:id/resume', async (req, res) => {
  const { id } = req.params;

  try {
    const [resume] = await db.query(
      'SELECT * FROM student_resumes WHERE student_id = ? ORDER BY upload_date DESC LIMIT 1',
      [id]
    );

    if (resume.length === 0) {
      return res.json({ success: false, message: 'No resume found' });
    }

    res.json({ success: true, resume: resume[0] });
  } catch (err) {
    console.error('Error fetching resume:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Get all student's resumes
// ✅ Get student's professional info (resume and skills)
router.get('/:id/professional', async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`Fetching professional info for student_id: ${id}`);
    
    // First, ensure the tables exist
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS student_resumes (
          id INT NOT NULL AUTO_INCREMENT,
          student_id INT NOT NULL UNIQUE,
          resume_path VARCHAR(500) NOT NULL,
          version INT DEFAULT 1,
          upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_student_id (student_id)
        )
      `);
      
      await db.query(`
        CREATE TABLE IF NOT EXISTS student_skills (
          id INT NOT NULL AUTO_INCREMENT,
          student_id INT NOT NULL,
          skill_name VARCHAR(100) NOT NULL,
          added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_student_skill (student_id, skill_name),
          KEY idx_student_id (student_id)
        )
      `);
      
      console.log('Tables ensured to exist');
    } catch (tableErr) {
      console.log('Tables already exist');
    }
    
    // Get resume (only one per student)
    const [resume] = await db.query(
      'SELECT * FROM student_resumes WHERE student_id = ?',
      [id]
    );

    console.log(`Resume query result:`, resume);

    // Get all skills
    const [skills] = await db.query(
      'SELECT skill_name FROM student_skills WHERE student_id = ? ORDER BY added_at DESC',
      [id]
    );

    console.log(`Skills query result:`, skills);

    const response = {
      success: true, 
      professional: {
        resumeUrl: resume && resume.length > 0 ? resume[0].resume_path : null,
        skills: skills && skills.length > 0 ? skills.map(s => s.skill_name) : []
      }
    };
    
    console.log(`Sending response:`, response);
    res.json(response);
  } catch (err) {
    console.error('Error fetching professional info:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Save professional info (resume and skills)
router.post('/:id/professional', resumeUpload.single('resume'), async (req, res) => {
  const { id } = req.params;
  const { skills } = req.body;

  console.log(`Saving professional info for student_id: ${id}`);
  console.log(`Resume file:`, req.file ? req.file.filename : 'None');
  console.log(`Skills data:`, skills);

  try {
    // Ensure tables exist first
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS student_resumes (
          id INT NOT NULL AUTO_INCREMENT,
          student_id INT NOT NULL UNIQUE,
          resume_path VARCHAR(500) NOT NULL,
          version INT DEFAULT 1,
          upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_student_id (student_id)
        )
      `);
      
      await db.query(`
        CREATE TABLE IF NOT EXISTS student_skills (
          id INT NOT NULL AUTO_INCREMENT,
          student_id INT NOT NULL,
          skill_name VARCHAR(100) NOT NULL,
          added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_student_skill (student_id, skill_name),
          KEY idx_student_id (student_id)
        )
      `);
    } catch (tableErr) {
      console.log('Tables already exist');
    }
    
    // Handle resume upload - UPSERT (update if exists, insert if not)
    if (req.file) {
      const fileFullPath = req.file.path || path.join(__dirname, '../uploads/resumes', req.file.filename);
      console.log('req.file object:', req.file);
      console.log('Checking resume file full path:', fileFullPath);

      if (!fs.existsSync(fileFullPath)) {
        console.error('Expected file path not found:', fileFullPath);
        return res.status(400).json({ success: false, message: 'File upload failed - file not saved to disk' });
      }

      console.log(`File verified at: ${fileFullPath}`);
      const resumePath = `/uploads/resumes/${req.file.filename}`;
      
      // Simple UPSERT: Update existing record or insert new one
      await db.query(
        `INSERT INTO student_resumes (student_id, resume_path, version, upload_date) 
         VALUES (?, ?, 1, NOW()) 
         ON DUPLICATE KEY UPDATE 
         resume_path = VALUES(resume_path), 
         upload_date = NOW()`,
        [id, resumePath]
      );
      
      console.log(`Resume saved/updated with path: ${resumePath}`);
    }

    // Handle skills - Delete old and insert new (prevent duplicates)
    if (skills) {
      try {
        const skillsArray = typeof skills === 'string' ? JSON.parse(skills) : skills;
        
        console.log(`Parsed skills array:`, skillsArray);
        
        // Clear old skills for this student
        await db.query('DELETE FROM student_skills WHERE student_id = ?', [id]);
        
        console.log(`Deleted old skills for student_id: ${id}`);
        
        // Insert new skills
        for (const skill of skillsArray) {
          if (skill && skill.trim()) {
            await db.query(
              'INSERT INTO student_skills (student_id, skill_name) VALUES (?, ?)',
              [id, skill.trim()]
            );
            console.log(`Saved skill: ${skill.trim()}`);
          }
        }
      } catch (parseErr) {
        console.error('Error parsing skills:', parseErr);
      }
    }

    console.log(`Professional info saved successfully for student_id: ${id}`);
    res.json({ success: true, message: 'Professional information saved successfully!' });
  } catch (err) {
    console.error('Error saving professional info:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/resumes', async (req, res) => {
  const { id } = req.params;

  try {
    const [resumes] = await db.query(
      'SELECT * FROM resumes WHERE student_id = ? ORDER BY upload_date DESC',
      [id]
    );

    res.json({ success: true, resumes });
  } catch (err) {
    console.error('Error fetching resumes:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Get student's event registrations
router.get('/:id/registrations', async (req, res) => {
  const { id } = req.params;

  try {
    const [registrations] = await db.query(
      `SELECT fer.id, fer.event_id, fer.status, fer.registered_at, fe.title AS event_name
       FROM faculty_event_registrations fer
       JOIN faculty_events fe ON fer.event_id = fe.id
       WHERE fer.student_id = ?
       ORDER BY fer.registered_at DESC`,
      [id]
    );

    res.json({
      success: true,
      registrations: registrations
    });
  } catch (err) {
    console.error('Error fetching registrations:', err);
    res.json({ 
      success: false, 
      message: 'Server error: ' + err.message,
      registrations: []
    });
  }
});

module.exports = router;