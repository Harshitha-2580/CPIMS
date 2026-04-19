const express = require('express');
const router = express.Router();
const db = require('../db');
const db2 = require('../db2');
const multer = require('multer');
const {
  ACCESS_DENIED_MESSAGE,
  ensureAllFacultySchemas,
  resolveFacultyContext,
  hasFacultyPrivilege
} = require('../utils/facultyAccess');

const upload = multer({ storage: multer.memoryStorage() });

function parseInterviewRounds(rawRounds) {
  if (!rawRounds) return [];

  try {
    const parsed = JSON.parse(rawRounds);
    if (Array.isArray(parsed)) {
      return parsed
        .map((r, idx) => {
          if (typeof r === 'string') {
            return r.trim();
          }

          if (r && typeof r === 'object') {
            return String(r.round_type || r.round_name || r.name || `Round ${idx + 1}`).trim();
          }

          return '';
        })
        .filter(Boolean);
    }
  } catch (_) {
    // Fallback to comma-separated rounds.
  }

  return String(rawRounds)
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);
}

function parseInterviewRoundsDetailed(rawRounds) {
  if (!rawRounds) return [];

  try {
    const parsed = JSON.parse(rawRounds);
    if (Array.isArray(parsed)) {
      return parsed
        .map((r, idx) => {
          if (typeof r === 'string') {
            return {
              name: r.trim(),
              scheduled_datetime: null,
              location: null,
              description: null
            };
          }

          if (r && typeof r === 'object') {
            const name = String(r.round_type || r.round_name || r.name || `Round ${idx + 1}`).trim();
            return {
              name,
              scheduled_datetime: r.scheduled_datetime || r.datetime || r.date || null,
              location: r.location || null,
              description: r.description || null
            };
          }

          return null;
        })
        .filter(Boolean)
        .filter(r => r.name);
    }
  } catch (_) {
    // Fall through to comma separated parsing.
  }

  return String(rawRounds)
    .split(',')
    .map(r => r.trim())
    .filter(Boolean)
    .map(name => ({
      name,
      scheduled_datetime: null,
      location: null,
      description: null
    }));
}

async function filterOutCompletedPlacements(activeDb, placements) {
  if (!Array.isArray(placements) || placements.length === 0) {
    return [];
  }

  const placementIds = placements
    .map(p => Number(p.id))
    .filter(Boolean);

  const uploadedRoundsByPlacement = {};

  if (placementIds.length > 0) {
    const placeholders = placementIds.map(() => '?').join(',');
    try {
      const [uploadedRows] = await activeDb.query(
        `SELECT placement_id, COUNT(DISTINCT round_number) AS uploaded_rounds
         FROM placement_round_results
         WHERE placement_id IN (${placeholders})
         GROUP BY placement_id`,
        placementIds
      );

      uploadedRows.forEach(row => {
        uploadedRoundsByPlacement[Number(row.placement_id)] = Number(row.uploaded_rounds || 0);
      });
    } catch (err) {
      if (err.code !== 'ER_NO_SUCH_TABLE') {
        throw err;
      }
    }
  }

  return placements.filter(p => {
    const totalRounds = parseInterviewRounds(p.interview_rounds).length;
    const uploadedRounds = uploadedRoundsByPlacement[Number(p.id)] || 0;

    // Keep drives that are not fully completed; zero-round drives are treated as not completed.
    return totalRounds === 0 || uploadedRounds < totalRounds;
  });
}

function splitCsvLine(line) {
  return line
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map(token => token.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
}

function parseCsvContent(content) {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const row = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });

    rows.push(row);
  }

  return rows;
}

function isShortlistedRow(row) {
  const shortlistedRaw = String(row.shortlisted || row.is_shortlisted || '').toLowerCase();
  if (shortlistedRaw) {
    return ['1', 'true', 'yes', 'y', 'shortlisted', 'selected', 'qualified', 'pass', 'passed', 'cleared'].includes(shortlistedRaw);
  }

  const statusRaw = String(row.status || row.result || row.outcome || '').toLowerCase();
  return ['shortlisted', 'selected', 'qualified', 'pass', 'passed', 'cleared'].some(keyword => statusRaw.includes(keyword));
}

function hasExplicitDecisionData(row) {
  return !!String(row.shortlisted || row.is_shortlisted || row.status || row.result || row.outcome || '').trim();
}

function normalizeRowStatus(row, defaultToShortlisted) {
  if (defaultToShortlisted) {
    return 'shortlisted';
  }

  return isShortlistedRow(row) ? 'shortlisted' : 'rejected';
}

async function ensurePlacementRoundTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS placement_round_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      placement_id INT NOT NULL,
      round_number INT NOT NULL,
      student_id INT NOT NULL,
      status ENUM('shortlisted', 'rejected') DEFAULT 'rejected',
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_placement_round_student (placement_id, round_number, student_id),
      INDEX idx_placement_round (placement_id, round_number),
      INDEX idx_student_id (student_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS student_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'round_shortlist',
      placement_id INT DEFAULT NULL,
      round_number INT DEFAULT NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_student_round_notice (student_id, placement_id, round_number, type),
      INDEX idx_student_created (student_id, created_at)
    )
  `);
}

// Ensure assignment tables exist before assignment operations.
async function ensureAssignmentTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS assignments_internships (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id VARCHAR(50) NOT NULL,
      company_name VARCHAR(255) NOT NULL,
      job_role VARCHAR(255) NOT NULL,
      internship_type VARCHAR(50),
      stipend VARCHAR(100),
      duration VARCHAR(100),
      due_date DATE,
      description TEXT,
      apply_link TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_student_id (student_id),
      INDEX idx_created_at (created_at)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS assignments_drives (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id VARCHAR(50) NOT NULL,
      company_name VARCHAR(255) NOT NULL,
      job_role VARCHAR(255) NOT NULL,
      salary_package VARCHAR(100),
      due_date DATE,
      description TEXT,
      apply_link TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_student_id (student_id),
      INDEX idx_created_at (created_at)
    )
  `);
}

/**
 * ===========================
 * PLACEMENTS ROUTES
 * ===========================
 */

// Create new placement
router.post('/placements/create', async (req, res) => {
    try {
    const { company_name, job_role, salary_package, eligible_branches, eligible_years, min_cgpa, due_date, event_date, drive_date, location, placement_type, campus_type, location_type, description, apply_link, interview_rounds, target_campus } = req.body;

        // Validate required fields
        if (!company_name || !job_role || !salary_package || !eligible_branches || !eligible_years || !due_date || !apply_link) {
            return res.json({ success: false, message: 'All required fields must be provided' });
        }

        // Validate campus selection
        const campuses = Array.isArray(target_campus) ? target_campus : (target_campus ? [target_campus] : []);
        if (campuses.length === 0) {
            return res.json({ success: false, message: 'Please select at least one campus type (NECN or NECG)' });
        }

        // Map field names for backward compatibility
        const finalEventDate = event_date || drive_date || null;
        
        // Map campus_type to location_type ENUM values
        // Form sends: 'on-campus', 'off-campus', 'pool-campus'
        // Database expects: 'oncampus', 'offcampus' (without hyphens)
        let finalLocationType = 'oncampus'; // default
        if (campus_type) {
            if (campus_type === 'on-campus') finalLocationType = 'oncampus';
            else if (campus_type === 'off-campus') finalLocationType = 'offcampus';
            else if (campus_type === 'pool-campus') finalLocationType = 'oncampus'; // pool campus treated as on-campus
        }
        
        // placement_type stays as is or defaults to 'oncampus'
        const finalPlacementType = placement_type || 'oncampus';

        const hasInterviewRoundsColumn = await columnExists('placements', 'interview_rounds');
        const serializedRounds = Array.isArray(interview_rounds)
          ? JSON.stringify(interview_rounds)
          : (typeof interview_rounds === 'string' ? interview_rounds : null);

        const query = hasInterviewRoundsColumn
          ? `
            INSERT INTO placements (company_name, job_role, salary_package, eligible_branches, eligible_years, min_cgpa, due_date, event_date, location, placement_type, location_type, drive_date, description, apply_link, interview_rounds, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
          `
          : `
            INSERT INTO placements (company_name, job_role, salary_package, eligible_branches, eligible_years, min_cgpa, due_date, event_date, location, placement_type, location_type, drive_date, description, apply_link, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
          `;

        const values = hasInterviewRoundsColumn
          ? [
            company_name,
            job_role,
            salary_package,
            eligible_branches,
            eligible_years,
            min_cgpa || null,
            due_date,
            finalEventDate,
            location || null,
            finalPlacementType,
            finalLocationType,
            finalEventDate,
            description || null,
            apply_link,
            serializedRounds
          ]
          : [
            company_name,
            job_role,
            salary_package,
            eligible_branches,
            eligible_years,
            min_cgpa || null,
            due_date,
            finalEventDate,
            location || null,
            finalPlacementType,
            finalLocationType,
            finalEventDate,
            description || null,
            apply_link
          ];

        // Insert into NECN database (placement_portal2) if NECN selected
        if (campuses.includes('NECN')) {
            await db.query(query, values);
        }

        // Insert into NECG database (placement_portal3) if NECG selected
        if (campuses.includes('NECG')) {
            await db2.query(query, values);
        }

        // Check for placed students and send notifications for placement drives with 30% salary hike
        try {
            // Function to normalize salary values for comparison
            const normalizeSalary = (salaryStr) => {
                if (!salaryStr || salaryStr === '0' || salaryStr === '') return 0;

                // Remove any non-numeric characters except decimal point
                let cleanSalary = salaryStr.replace(/[^\d.]/g, '');

                // Handle LPA notation (L or LPA)
                if (salaryStr.toLowerCase().includes('l') || salaryStr.toLowerCase().includes('lpa')) {
                    return parseFloat(cleanSalary) * 100000; // Convert LPA to rupees
                }

                // Handle comma-separated values (lakhs)
                if (salaryStr.includes(',')) {
                    return parseFloat(cleanSalary) * 100000;
                }

                return parseFloat(cleanSalary);
            };

            const newSalary = normalizeSalary(salary_package);

            // Notify all unplaced students (any drive)
            const [unplacedStudents] = await db.query(`
                SELECT id FROM students WHERE placement_status = 'unplaced'
            `);

            let notificationCount = 0;

            for (const student of unplacedStudents) {
                await db.query(`
                    INSERT INTO student_notifications
                    (student_id, title, message, type, created_at, is_read)
                    VALUES (?, ?, ?, 'new_placement_drive', NOW(), 0)
                `, [
                    student.id,
                    `New Placement Drive Available`,
                    `A new placement drive for ${job_role} position at ${company_name} is now open. Apply before ${due_date}.`
                ]);

                notificationCount++;
            }

            // Get all placed students with their current salary details
            const [placedStudents] = await db.query(`
                SELECT
                    s.id,
                    s.name,
                    sp.salary_package as current_salary
                FROM students s
                JOIN student_placements sp ON s.id = sp.student_id
                WHERE s.placement_status = 'placed'
            `);

            // Check each placed student for 30% salary hike and notify only if threshold meets
            for (const student of placedStudents) {
                const currentSalary = normalizeSalary(student.current_salary);

                if (currentSalary > 0 && newSalary >= currentSalary * 1.3) {
                    await db.query(`
                        INSERT INTO student_notifications
                        (student_id, title, message, type, created_at, is_read)
                        VALUES (?, ?, ?, 'new_placement_drive', NOW(), 0)
                    `, [
                        student.id,
                        `New Placement Drive Available`,
                        `A new placement drive for ${job_role} position at ${company_name} is now open. Apply before ${due_date}.`
                    ]);

                    notificationCount++;
                }
            }

            console.log(`Sent ${notificationCount} placement drive notifications for ${company_name}`);

        } catch (notificationError) {
            console.error('Error sending placement notifications:', notificationError);
            // Don't fail the placement creation if notifications fail
        }

        res.json({
            success: true,
            message: `Placement drive created successfully in ${campuses.join(' & ')} campus`,
        });
    } catch (err) {
        console.error('Error creating placement:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

/**
 * ===========================
 * INTERNSHIPS ROUTES
 * ===========================
 */

// Create new internship
router.post('/internships/create', async (req, res) => {
    try {
        const {
          company_name,
          role,
          internship_type,
          stipend,
          duration,
          eligible_branches,
          eligible_years,
          min_cgpa,
          due_date,
          description,
          apply_link,
          target_campus,
          faculty_id,
          facultyEmail
        } = req.body;

        // Validate required fields
        if (!company_name || !role || !internship_type || !duration || !eligible_branches || !eligible_years || !due_date || !apply_link) {
            return res.json({ success: false, message: 'All required fields must be provided' });
        }

        let campuses = Array.isArray(target_campus) ? target_campus : (target_campus ? [target_campus] : []);

        if (faculty_id || facultyEmail) {
          await ensureAllFacultySchemas();
          const facultyContext = await resolveFacultyContext({ facultyId: faculty_id, email: facultyEmail });

          if (!facultyContext) {
            return res.json({ success: false, message: 'Faculty not found' });
          }

          if (!hasFacultyPrivilege(facultyContext.faculty, 'postInternships')) {
            return res.status(403).json({ success: false, message: ACCESS_DENIED_MESSAGE });
          }

          campuses = [facultyContext.campusType];
        }

        // Validate campus selection
        if (campuses.length === 0) {
            return res.json({ success: false, message: 'Please select at least one campus type (NECN or NECG)' });
        }

        // For paid internships, stipend is required
        if (internship_type === 'paid' && !stipend) {
            return res.json({ success: false, message: 'Stipend is required for paid internships' });
        }

        const query = `
            INSERT INTO internships (company_name, role, internship_type, stipend, duration, eligible_branches, eligible_years, min_cgpa, due_date, description, apply_link, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `;

        const values = [
            company_name,
            role,
            internship_type,
            stipend || null,
            duration,
            eligible_branches,
            eligible_years,
            min_cgpa || null,
            due_date,
            description || null,
            apply_link
        ];

        // Insert into NECN database (placement_portal2) if NECN selected
        if (campuses.includes('NECN')) {
            await db.query(query, values);
        }

        // Insert into NECG database (placement_portal3) if NECG selected
        if (campuses.includes('NECG')) {
            await db2.query(query, values);
        }

        res.json({
            success: true,
            message: `Internship created successfully in ${campuses.join(' & ')} campus`,
        });
    } catch (err) {
        console.error('Error creating internship:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

/**
 * ===========================
 * STUDENT VIEW ROUTES
 * ===========================
 */

// Get placements for student (student-jobs.html)
router.get('/placements', async (req, res) => {
    try {
        const { branch } = req.query;

        let query = `
            SELECT * FROM placements 
            WHERE is_active = TRUE
      AND (due_date IS NULL OR DATE(due_date) >= CURDATE())
            ORDER BY due_date ASC
        `;

        const values = [];

        // If branch provided, filter by eligible branches
        if (branch) {
            query = `
                SELECT * FROM placements 
                WHERE is_active = TRUE
              AND (due_date IS NULL OR DATE(due_date) >= CURDATE())
                AND (eligible_branches = 'All' OR eligible_branches = '' OR FIND_IN_SET(?, eligible_branches))
                ORDER BY due_date ASC
            `;
            values.push(branch);
        }

        const [placements] = await db.query(query, values);

        res.json({
            success: true,
          opportunities: placements,
          count: placements.length
        });
    } catch (err) {
        console.error('Error fetching placements:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Get internships for student (student-internships.html)
router.get('/internships', async (req, res) => {
    try {
        const { branch } = req.query;

        let query = `
            SELECT * FROM internships 
            WHERE is_active = TRUE
      AND (due_date IS NULL OR DATE(due_date) >= CURDATE())
            ORDER BY due_date ASC
        `;

        const values = [];

        // If branch provided, filter by eligible branches
        if (branch) {
            query = `
                SELECT * FROM internships 
                WHERE is_active = TRUE
              AND (due_date IS NULL OR DATE(due_date) >= CURDATE())
                AND (eligible_branches = 'All' OR FIND_IN_SET(?, eligible_branches))
                ORDER BY due_date ASC
            `;
            values.push(branch);
        }

        const [internships] = await db.query(query, values);

        res.json({
            success: true,
            opportunities: internships,
            count: internships.length
        });
    } catch (err) {
        console.error('Error fetching internships:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Get opportunities with query parameters (for admin attendance scanner)
router.get('/', async (req, res) => {
    try {
        const { type, status } = req.query;

        let query = 'SELECT * FROM opportunities WHERE 1=1';
        const values = [];

        if (type) {
            query += ' AND type = ?';
            values.push(type);
        }

        if (status) {
            if (status === 'active') {
                query += ' AND status = "active"';
            } else if (status === 'closed') {
                query += ' AND status = "closed"';
            }
        }

        query += ' ORDER BY created_at DESC';

        const [opportunities] = await db.query(query, values);

        res.json({
            success: true,
            opportunities: opportunities,
            count: opportunities.length
        });
    } catch (err) {
        console.error('Error fetching opportunities:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Get notifications for student dashboard (assigned + regular eligible opportunities)
// helper to detect schema changes
async function columnExists(table, column) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

router.get('/notifications/:studentId', async (req, res) => {
  try {
    await ensureAssignmentTables();
    await ensurePlacementRoundTables();
    const { studentId } = req.params;

    const [students] = await db.query(
      'SELECT id, branch, year FROM students WHERE id = ? LIMIT 1',
      [studentId]
    );

    if (!students || students.length === 0) {
      return res.json({ success: false, message: 'Student not found', notifications: [] });
    }

    const student = students[0];
    const branch = student.branch || '';
    const year = student.year ? String(student.year) : '';

    const [assignedInternships] = await db.query(
      `SELECT id, company_name, job_role, apply_link, created_at
       FROM assignments_internships
       WHERE student_id = ?
       AND (due_date IS NULL OR DATE(due_date) >= CURDATE())
       ORDER BY created_at DESC
       LIMIT 25`,
      [String(studentId)]
    );

    const [assignedPlacements] = await db.query(
      `SELECT id, company_name, job_role, apply_link, created_at
       FROM assignments_drives
       WHERE student_id = ?
       AND (due_date IS NULL OR DATE(due_date) >= CURDATE())
       ORDER BY created_at DESC
       LIMIT 25`,
      [String(studentId)]
    );

    const [regularPlacements] = await db.query(
      `SELECT id, company_name, job_role, apply_link, created_at, due_date
       FROM placements
       WHERE is_active = TRUE
       AND (due_date IS NULL OR DATE(due_date) >= CURDATE())
       AND (eligible_branches = 'All' OR FIND_IN_SET(?, eligible_branches))
       AND (eligible_years = 'All' OR FIND_IN_SET(?, eligible_years))
       ORDER BY created_at DESC
       LIMIT 25`,
      [branch, year]
    );

    const [regularInternships] = await db.query(
      `SELECT id, company_name, role, apply_link, created_at, due_date
       FROM internships
       WHERE is_active = TRUE
       AND (due_date IS NULL OR DATE(due_date) >= CURDATE())
       AND (eligible_branches = 'All' OR FIND_IN_SET(?, eligible_branches))
       AND (eligible_years = 'All' OR FIND_IN_SET(?, eligible_years))
       ORDER BY created_at DESC
       LIMIT 25`,
      [branch, year]
    );

    // only include events that the student is eligible for based on branch/year
    // build year matching similar to announcements logic since eligible_years is stored as JSON
    const yearMappings = {
      '1': ['1', '1st Year', 'First Year'],
      '2': ['2', '2nd Year', 'Second Year'],
      '3': ['3', '3rd Year', 'Third Year'],
      '4': ['4', '4th Year', 'Final Year']
    };
    const possibleYears = yearMappings[year] || [year];
    let yearCondition = '';
    const yearParams = [];
    possibleYears.forEach((yr, idx) => {
      if (idx > 0) yearCondition += ' OR ';
      yearCondition += `eligible_years LIKE ?`;
      yearParams.push(`%${yr}%`);
    });

    const hasBranches = await columnExists('faculty_events', 'eligible_branches');
    const hasYears = await columnExists('faculty_events', 'eligible_years');

    let eventQuery = `SELECT id, title, event_date, location, event_type, created_at
                      FROM faculty_events
                      WHERE status = 'published'
                        AND DATE(event_date) >= CURDATE()`;
    const eventParams = [];
    if (hasBranches) {
      eventQuery += ` AND (eligible_branches IS NULL OR eligible_branches = '' OR eligible_branches = 'All' OR FIND_IN_SET(?, eligible_branches))`;
      eventParams.push(branch);
    }
    if (hasYears) {
      eventQuery += ` AND (eligible_years IS NULL OR eligible_years = '' OR (${yearCondition}))`;
      eventParams.push(...yearParams);
    }
    eventQuery += ` ORDER BY event_date ASC LIMIT 15`;

    const [events] = await db.query(eventQuery, eventParams);


    const notifications = [];

    assignedPlacements.forEach(item => {
      notifications.push({
        id: `assigned-placement-${item.id}`,
        title: `${item.company_name} - ${item.job_role}`,
        message: 'Assigned placement drive for you. Click to apply.',
        createdAt: item.created_at,
        isAssigned: true,
        type: 'placement',
        targetUrl: 'student-assigned-opportunities.html'
      });
    });

    assignedInternships.forEach(item => {
      notifications.push({
        id: `assigned-internship-${item.id}`,
        title: `${item.company_name} - ${item.job_role}`,
        message: 'Assigned internship for you. Click to apply.',
        createdAt: item.created_at,
        isAssigned: true,
        type: 'internship',
        targetUrl: 'student-assigned-opportunities.html'
      });
    });

    regularPlacements.forEach(item => {
      notifications.push({
        id: `regular-placement-${item.id}`,
        title: `${item.company_name} - ${item.job_role}`,
        message: 'New placement drive uploaded. Click to apply.',
        createdAt: item.created_at,
        isAssigned: false,
        type: 'placement',
        targetUrl: 'student-jobs.html'
      });
    });

    regularInternships.forEach(item => {
      notifications.push({
        id: `regular-internship-${item.id}`,
        title: `${item.company_name} - ${item.role}`,
        message: 'New internship opportunity uploaded. Click to apply.',
        createdAt: item.created_at,
        isAssigned: false,
        type: 'internship',
        targetUrl: 'student-internships.html'
      });
    });

    events.forEach(item => {
      const eventDate = new Date(item.event_date);
      const dateStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // decide which event page to link based on type
      let targetUrl = 'student-events.html';
      const et = item.event_type ? item.event_type.toLowerCase() : '';
      if (et.includes('seminar')) targetUrl = 'student-events.html?type=seminar';
      else if (et.includes('hackathon')) targetUrl = 'student-events.html?type=hackathon';
      else if (et.includes('guidance') || et.includes('career')) targetUrl = 'student-events.html?type=career';

      notifications.push({
        id: `event-${item.id}`,
        title: `${item.title} - ${item.event_type}`,
        message: `Upcoming event on ${dateStr} at ${item.location || 'TBA'}. Click to register.`,
        createdAt: item.created_at,
        isAssigned: false,
        type: 'event',
        targetUrl: targetUrl
      });
    });

    const [roundNotices] = await db.query(
      `SELECT id, title, message, created_at
       FROM student_notifications
       WHERE student_id = ?
       ORDER BY created_at DESC
       LIMIT 25`,
      [studentId]
    );

    roundNotices.forEach(item => {
      notifications.push({
        id: `round-notice-${item.id}`,
        title: item.title,
        message: item.message,
        createdAt: item.created_at,
        isAssigned: false,
        type: 'round-update',
        targetUrl: 'student-jobs.html'
      });
    });

    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      notifications: notifications.slice(0, 50),
      count: notifications.length
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.json({ success: false, message: 'Server error: ' + err.message, notifications: [] });
  }
});

// Get active placements for admin with timeline metadata
router.get('/placements/admin/list', async (req, res) => {
  try {
    const [placements] = await db.query(
      `SELECT id, company_name, job_role, salary_package, eligible_branches, eligible_years,
              min_cgpa, due_date, event_date, location, placement_type, location_type,
              drive_date, description, apply_link, interview_rounds, is_active, created_at
       FROM placements
       WHERE is_active = TRUE
       ORDER BY created_at DESC`
    );

    const data = placements.map(p => {
      const rounds = parseInterviewRounds(p.interview_rounds);
      return {
        ...p,
        rounds,
        rounds_count: rounds.length,
        is_ongoing_today: !!p.event_date && new Date(p.event_date).toDateString() === new Date().toDateString()
      };
    });

    res.json({ success: true, placements: data, count: data.length });
  } catch (err) {
    console.error('Error fetching admin placements list:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Get placements whose drive date is today
router.get('/placements/admin/ongoing', async (req, res) => {
  const { campus } = req.query;
  const activeDb = (campus === 'NECG') ? db2 : db;
  try {
    const [ongoing] = await activeDb.query(
      `SELECT id, company_name, job_role, event_date, location, interview_rounds
       FROM placements
       WHERE is_active = TRUE
         AND event_date IS NOT NULL
         AND DATE(event_date) = CURDATE()
       ORDER BY event_date ASC`
    );

    const filteredOngoing = await filterOutCompletedPlacements(activeDb, ongoing);

    const data = filteredOngoing.map(p => {
      const rounds = parseInterviewRounds(p.interview_rounds);
      return {
        ...p,
        rounds,
        rounds_count: rounds.length
      };
    });

    res.json({ success: true, drives: data, count: data.length });
  } catch (err) {
    console.error('Error fetching ongoing drives:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Get recent drives with attendance count for admin
router.get('/placements/admin/recent-with-attendance', async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const [drives] = await db.query(`
      SELECT
        p.id,
        p.company_name,
        p.job_role,
        p.event_date,
        p.location,
        p.interview_rounds,
        COUNT(a.id) as attendance_count
      FROM placements p
      LEFT JOIN attendance a ON p.id = a.opportunity_id
      WHERE p.is_active = TRUE
        AND p.event_date IS NOT NULL
        AND DATE(p.event_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY p.id
      ORDER BY p.event_date DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    const [totalCount] = await db.query(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM placements p
      WHERE p.is_active = TRUE
        AND p.event_date IS NOT NULL
        AND DATE(p.event_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    const data = drives.map(p => {
      const rounds = parseInterviewRounds(p.interview_rounds);
      return {
        ...p,
        rounds,
        rounds_count: rounds.length,
        attendance_count: parseInt(p.attendance_count) || 0
      };
    });

    res.json({
      success: true,
      drives: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount[0].total,
        totalPages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching recent drives with attendance:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Ongoing drives as generic opportunities path
router.get('/ongoing', async (req, res) => {
  const { campus } = req.query;
  const activeDb = (campus === 'NECG') ? db2 : db;
  try {
    const [ongoing] = await activeDb.query(
      `SELECT id, company_name, job_role, event_date as drive_date, location, interview_rounds, is_active, created_at
       FROM placements
       WHERE is_active = TRUE
         AND event_date IS NOT NULL
         AND DATE(event_date) = CURDATE()
       ORDER BY event_date ASC`
    );

    const filteredOngoing = await filterOutCompletedPlacements(activeDb, ongoing);

    res.json({ success: true, opportunities: filteredOngoing, count: filteredOngoing.length });
  } catch (err) {
    console.error('Error fetching ongoing opportunities:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Get placement timeline detail with round summaries
router.get('/placements/:placementId/timeline', async (req, res) => {
  const { placementId } = req.params;

  try {
    await ensurePlacementRoundTables();

    const [[placement]] = await db.query(
      `SELECT id, company_name, job_role, event_date, location, interview_rounds, created_at
       FROM placements
       WHERE id = ? AND is_active = TRUE`,
      [placementId]
    );

    if (!placement) {
      return res.json({ success: false, message: 'Placement drive not found' });
    }

    const roundDetails = parseInterviewRoundsDetailed(placement.interview_rounds);
    const rounds = roundDetails.map(r => r.name);
    const [roundSummaryRows] = await db.query(
      `SELECT round_number,
              COUNT(*) AS total_results,
              SUM(CASE WHEN status = 'shortlisted' THEN 1 ELSE 0 END) AS shortlisted_count,
              MAX(uploaded_at) AS last_uploaded_at
       FROM placement_round_results
       WHERE placement_id = ?
       GROUP BY round_number
       ORDER BY round_number ASC`,
      [placementId]
    );

    const summaryByRound = {};
    roundSummaryRows.forEach(row => {
      summaryByRound[row.round_number] = row;
    });

    const driveDate = placement.event_date ? new Date(placement.event_date) : null;
    const today = new Date();
    const isDriveToday = driveDate
      ? driveDate.getFullYear() === today.getFullYear() &&
        driveDate.getMonth() === today.getMonth() &&
        driveDate.getDate() === today.getDate()
      : false;

    let currentRoundIndex = 0;
    const todayKey = today.toDateString();
    const todayRoundIndexes = [];

    // Prefer round-level scheduled date matching for current round.
    roundDetails.forEach((round, idx) => {
      if (!round.scheduled_datetime) return;

      const roundDate = new Date(round.scheduled_datetime);
      if (!Number.isNaN(roundDate.getTime()) && roundDate.toDateString() === todayKey) {
        todayRoundIndexes.push(idx + 1);
      }
    });

    if (todayRoundIndexes.length > 0) {
      const nextPendingToday = todayRoundIndexes.find(roundNo => {
        const summary = summaryByRound[roundNo];
        return !(summary && Number(summary.total_results || 0) > 0);
      });

      currentRoundIndex = nextPendingToday || 0;
    }

    if (isDriveToday && rounds.length > 0 && !currentRoundIndex) {
      // Fallback when explicit round dates are unavailable or all today's rounds are completed.
      let nextRound = 1;
      while (nextRound <= rounds.length) {
        const summary = summaryByRound[nextRound];
        if (!(summary && Number(summary.total_results || 0) > 0)) {
          break;
        }
        nextRound += 1;
      }

      currentRoundIndex = nextRound <= rounds.length ? nextRound : 0;
    }

    const isDriveCompleted = rounds.length > 0 && rounds.every((_, idx) => {
      const roundNo = idx + 1;
      const summary = summaryByRound[roundNo];
      return !!(summary && Number(summary.total_results || 0) > 0);
    });

    res.json({
      success: true,
      placement: {
        ...placement,
        rounds,
        round_details: roundDetails,
        rounds_count: rounds.length
      },
      round_summaries: summaryByRound,
      is_drive_today: isDriveToday,
      current_round_index: currentRoundIndex,
      is_drive_completed: isDriveCompleted
    });
  } catch (err) {
    console.error('Error fetching placement timeline:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Upload round results CSV and notify shortlisted students
router.post('/placements/:placementId/round-results/upload', upload.single('results_file'), async (req, res) => {
  const { placementId } = req.params;
  const roundNumber = Number.parseInt(req.body.round_number, 10);

  try {
    await ensurePlacementRoundTables();

    if (!req.file || !req.file.buffer) {
      return res.json({ success: false, message: 'CSV file is required' });
    }

    const uploadedName = String(req.file.originalname || '').toLowerCase();
    if (!uploadedName.endsWith('.csv')) {
      return res.json({
        success: false,
        message: 'Please upload a .csv file (Excel .xlsx is not supported directly).'
      });
    }

    if (!roundNumber || roundNumber < 1) {
      return res.json({ success: false, message: 'Valid round number is required' });
    }

    const [[placement]] = await db.query(
      `SELECT id, company_name, job_role, salary_package, placement_type, location, location_type, interview_rounds
       FROM placements
       WHERE id = ? AND is_active = TRUE`,
      [placementId]
    );

    if (!placement) {
      return res.json({ success: false, message: 'Placement drive not found' });
    }

    const rounds = parseInterviewRounds(placement.interview_rounds);
    if (rounds.length > 0 && roundNumber > rounds.length) {
      return res.json({ success: false, message: `Round number exceeds configured rounds (${rounds.length})` });
    }

    if (rounds.length > 0) {
      const [roundSummaryRows] = await db.query(
        `SELECT round_number, COUNT(*) AS total_results
         FROM placement_round_results
         WHERE placement_id = ?
         GROUP BY round_number`,
        [placementId]
      );

      const summaryByRound = {};
      roundSummaryRows.forEach(row => {
        summaryByRound[Number(row.round_number)] = Number(row.total_results || 0);
      });

      const isDriveCompleted = rounds.every((_, idx) => {
        const roundNo = idx + 1;
        return (summaryByRound[roundNo] || 0) > 0;
      });

      if (isDriveCompleted) {
        return res.json({
          success: false,
          message: 'This drive is already completed. Upload is not allowed after all rounds are finished.'
        });
      }
    }

    const isFinalRound = rounds.length > 0 ? roundNumber === rounds.length : true;

    const csvContent = req.file.buffer.toString('utf8');
    const rows = parseCsvContent(csvContent);

    if (!rows.length) {
      return res.json({ success: false, message: 'CSV has no data rows' });
    }

    // If CSV contains only student IDs/roll numbers and no decision columns,
    // treat every listed student as shortlisted for the selected round.
    const defaultToShortlisted = !rows.some(hasExplicitDecisionData);

    let processedCount = 0;
    const shortlistedStudentIds = [];

    for (const row of rows) {
      const studentRaw =
        row.student_id ||
        row.studentid ||
        row.roll_number ||
        row.rollnumber ||
        row.roll_no ||
        row.rollno ||
        row.id ||
        row.student;
      const studentId = Number.parseInt(studentRaw, 10);

      if (!studentId) {
        continue;
      }

      const normalizedStatus = normalizeRowStatus(row, defaultToShortlisted);

      await db.query(
        `INSERT INTO placement_round_results (placement_id, round_number, student_id, status)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           uploaded_at = CURRENT_TIMESTAMP`,
        [placementId, roundNumber, studentId, normalizedStatus]
      );

      const mappedStatus = normalizedStatus === 'shortlisted'
        ? (isFinalRound ? 'selected' : 'shortlisted')
        : 'rejected';

      // Keep student dashboard status in sync with round outcomes.
      try {
        await db.query(
          `UPDATE student_registrations
           SET status = ?
           WHERE student_id = ? AND drive_id = ? AND drive_type = 'placement'`,
          [mappedStatus, studentId, placementId]
        );
      } catch (registrationSyncErr) {
        if (registrationSyncErr.code !== 'ER_NO_SUCH_TABLE') {
          throw registrationSyncErr;
        }
      }

      await db.query(
        `UPDATE applications
         SET status = ?
         WHERE student_id = ? AND opportunity_id = ?`,
        [mappedStatus, studentId, placementId]
      );

      processedCount += 1;
      if (normalizedStatus === 'shortlisted') {
        shortlistedStudentIds.push(studentId);
      }
    }

    let noticeCount = 0;
    let placedCount = 0;
    let participationConfig = null;
    let fallbackFacultyId = null;
    if (shortlistedStudentIds.length > 0) {
      const uniqueIds = [...new Set(shortlistedStudentIds)];
      const placeholders = uniqueIds.map(() => '?').join(', ');
      const [students] = await db.query(
        `SELECT id, name FROM students WHERE id IN (${placeholders})`,
        uniqueIds
      );

      const roundLabel = rounds[roundNumber - 1] || `Round ${roundNumber}`;

      if (isFinalRound) {
        await db.query(`
          CREATE TABLE IF NOT EXISTS placement_participation (
            id INT AUTO_INCREMENT PRIMARY KEY,
            faculty_id INT,
            student_id INT,
            drive_name VARCHAR(255),
            placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        const [participationColumns] = await db.query(
          `SELECT COLUMN_NAME, IS_NULLABLE
           FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = 'placement_participation'
             AND COLUMN_NAME IN ('drive_name', 'company_name', 'faculty_id')`
        );

        const hasDriveName = participationColumns.some(col => col.COLUMN_NAME === 'drive_name');
        const hasCompanyName = participationColumns.some(col => col.COLUMN_NAME === 'company_name');
        const facultyColumn = participationColumns.find(col => col.COLUMN_NAME === 'faculty_id');

        participationConfig = {
          nameColumn: hasDriveName ? 'drive_name' : hasCompanyName ? 'company_name' : null,
          facultyRequired: facultyColumn ? facultyColumn.IS_NULLABLE === 'NO' : false
        };

        if (participationConfig.facultyRequired) {
          const [facultyRows] = await db.query(`SELECT id FROM faculty ORDER BY id ASC LIMIT 1`);
          fallbackFacultyId = facultyRows.length > 0 ? facultyRows[0].id : null;
        }
      }

      for (const student of students) {
        if (isFinalRound) {
          await db.query(
            `UPDATE applications
             SET status = 'selected'
             WHERE student_id = ? AND opportunity_id = ?`,
            [student.id, placementId]
          );

          await db.query(
            `UPDATE students SET placement_status = 'placed' WHERE id = ?`,
            [student.id]
          );

          // Insert or update student placement record
          await db.query(`
            INSERT INTO student_placements
            (student_id, company_name, job_role, salary_package, placement_type, location, drive_id, placement_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
              company_name = VALUES(company_name),
              job_role = VALUES(job_role),
              salary_package = VALUES(salary_package),
              placement_type = VALUES(placement_type),
              location = VALUES(location),
              drive_id = VALUES(drive_id),
              updated_at = NOW()
          `, [
            student.id,
            placement.company_name,
            placement.job_role,
            placement.salary_package || '0',
            placement.location_type || 'oncampus',
            placement.location,
            placementId
          ]);

          if (participationConfig && participationConfig.nameColumn) {
            const facultyIdValue = participationConfig.facultyRequired ? fallbackFacultyId : null;

            if (!(participationConfig.facultyRequired && !facultyIdValue)) {
              await db.query(
                `INSERT INTO placement_participation (faculty_id, student_id, ${participationConfig.nameColumn})
                 SELECT ?, ?, ?
                 FROM DUAL
                 WHERE NOT EXISTS (
                   SELECT 1
                   FROM placement_participation
                   WHERE student_id = ? AND ${participationConfig.nameColumn} = ?
                 )`,
                [facultyIdValue, student.id, placement.company_name, student.id, placement.company_name]
              );
            }
          }

          placedCount += 1;
        }

        await db.query(
          `INSERT INTO student_notifications (student_id, title, message, type, placement_id, round_number, is_read)
           VALUES (?, ?, ?, ?, ?, ?, 0)
           ON DUPLICATE KEY UPDATE
             title = VALUES(title),
             message = VALUES(message),
             is_read = 0,
             created_at = CURRENT_TIMESTAMP`,
          [
            student.id,
            isFinalRound
              ? `Congratulations! You are placed at ${placement.company_name}`
              : `Shortlisted: ${placement.company_name} - ${roundLabel}`,
            isFinalRound
              ? `Congratulations ${student.name}! You are placed for ${placement.job_role} at ${placement.company_name}.`
              : `Congratulations ${student.name}! You are shortlisted for ${roundLabel} (${placement.job_role}) at ${placement.company_name}.`,
            isFinalRound ? 'placement_success' : 'round_shortlist',
            placementId,
            roundNumber
          ]
        );
        noticeCount += 1;
      }
    }

    res.json({
      success: true,
      message: 'Round results uploaded successfully',
      processed_count: processedCount,
      shortlisted_count: [...new Set(shortlistedStudentIds)].length,
      notifications_sent: noticeCount,
      is_final_round: isFinalRound,
      placed_count: isFinalRound ? placedCount : 0
    });
  } catch (err) {
    console.error('Error uploading round results:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Get opportunities by type (DEPRECATED - for backward compatibility with hackathons)
router.get('/by-type/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { branch } = req.query;

        // For now, hackathons are not separated - return empty
        // You can add hackathons table later if needed
        if (type === 'hackathon') {
            return res.json({ success: true, opportunities: [], count: 0 });
        }

        // Redirect to placements or internships
        if (type === 'placement') {
            return req.url = '/placements?' + (branch ? 'branch=' + branch : '');
        } else if (type === 'internship') {
            return req.url = '/internships?' + (branch ? 'branch=' + branch : '');
        }

        res.json({ success: false, message: 'Invalid type' });
    } catch (err) {
        console.error('Error fetching opportunities:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

/**
 * ===========================
 * ADMIN ROUTES
 * ===========================
 */

// Get all opportunities (for admin view - combined placements + internships)
router.get('/all-opportunities', async (req, res) => {
  try {
    await ensurePlacementRoundTables();

    // Fetch placements
    const [placements] = await db.query(`
      SELECT *, 'placement' as type FROM placements 
      WHERE is_active = TRUE
      ORDER BY created_at DESC
    `);

    // Build completion map for placement drives based on uploaded round results
    const placementIds = placements.map(p => p.id);
    const uploadedRoundsByPlacement = {};

    if (placementIds.length > 0) {
      const placeholders = placementIds.map(() => '?').join(',');
      const [roundRows] = await db.query(
        `SELECT placement_id, round_number
         FROM placement_round_results
         WHERE placement_id IN (${placeholders})
         GROUP BY placement_id, round_number`,
        placementIds
      );

      roundRows.forEach(row => {
        if (!uploadedRoundsByPlacement[row.placement_id]) {
          uploadedRoundsByPlacement[row.placement_id] = new Set();
        }
        uploadedRoundsByPlacement[row.placement_id].add(Number(row.round_number));
      });
    }

    const placementsWithStatus = placements.map(p => {
      const rounds = parseInterviewRounds(p.interview_rounds);
      const uploadedRounds = uploadedRoundsByPlacement[p.id] ? uploadedRoundsByPlacement[p.id].size : 0;
      const isDriveCompleted = rounds.length > 0 && uploadedRounds >= rounds.length;

      return {
        ...p,
        is_drive_completed: isDriveCompleted
      };
    });

    // Fetch internships
    const [internships] = await db.query(`
      SELECT *, 'internship' as type FROM internships 
      WHERE is_active = TRUE
      ORDER BY created_at DESC
    `);

    // Combine and sort by created_at
    const allOpportunities = [...placementsWithStatus, ...internships].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    res.json({ success: true, opportunities: allOpportunities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while fetching opportunities' });
  }
});

// Delete/deactivate placement
router.delete('/placements/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('UPDATE placements SET is_active = FALSE WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.json({ success: false, message: 'Placement not found' });
    }
    
    res.json({ success: true, message: 'Placement deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while deleting placement' });
  }
});

// Delete/deactivate internship
router.delete('/internships/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('UPDATE internships SET is_active = FALSE WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.json({ success: false, message: 'Internship not found' });
    }
    
    res.json({ success: true, message: 'Internship deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while deleting internship' });
  }
});

// DEPRECATED: Old delete endpoint for backward compatibility
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to delete from placements first
    let [result] = await db.query('UPDATE placements SET is_active = FALSE WHERE id = ?', [id]);
    
    // If not found in placements, try internships
    if (result.affectedRows === 0) {
      [result] = await db.query('UPDATE internships SET is_active = FALSE WHERE id = ?', [id]);
    }
    
    if (result.affectedRows === 0) {
      return res.json({ success: false, message: 'Opportunity not found' });
    }
    
    res.json({ success: true, message: 'Opportunity deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while deleting opportunity' });
  }
});

/**
 * ===========================
 * STUDENT ASSIGNMENT ROUTES
 * ===========================
 */

// Assign opportunity to students
router.post('/assign-students', async (req, res) => {
  try {
    const { opportunityId, opportunityType, studentIds } = req.body;

    // Validate inputs
    if (!opportunityId || !opportunityType || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.json({ success: false, message: 'Invalid input. Please provide opportunityId, opportunityType, and studentIds array' });
    }

    let successCount = 0;
    let errorMessages = [];

    // Check if assignments table exists, create if not
    await db.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(50) NOT NULL,
        opportunity_id INT NOT NULL,
        opportunity_type VARCHAR(20) NOT NULL,
        assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Assign to each student
    for (const studentId of studentIds) {
      try {
        // Check for duplicate assignment
        const [existing] = await db.query(
          'SELECT id FROM assignments WHERE student_id = ? AND opportunity_id = ? AND opportunity_type = ?',
          [studentId.trim(), opportunityId, opportunityType]
        );

        if (existing && existing.length > 0) {
          errorMessages.push(`${studentId}: Already assigned`);
          continue;
        }

        // Get opportunity details to verify it exists
        let opportunityDetails;
        if (opportunityType === 'placement') {
          [opportunityDetails] = await db.query('SELECT id, company_name, job_role FROM placements WHERE id = ?', [opportunityId]);
        } else {
          [opportunityDetails] = await db.query('SELECT id, company_name, role FROM internships WHERE id = ?', [opportunityId]);
        }

        if (!opportunityDetails || opportunityDetails.length === 0) {
          errorMessages.push(`Opportunity with ID ${opportunityId} not found`);
          continue;
        }

        // Create assignment
        await db.query(
          'INSERT INTO assignments (student_id, opportunity_id, opportunity_type, status) VALUES (?, ?, ?, ?)',
          [studentId.trim(), opportunityId, opportunityType, 'pending']
        );

        successCount++;
      } catch (err) {
        console.error(`Error assigning to ${studentId}:`, err);
        errorMessages.push(`${studentId}: ${err.message}`);
      }
    }

    // Prepare response
    const response = {
      success: successCount > 0,
      message: `Successfully assigned to ${successCount} out of ${studentIds.length} student(s)`,
      successCount: successCount,
      totalAttempted: studentIds.length
    };

    if (errorMessages.length > 0) {
      response.errors = errorMessages;
    }

    res.json(response);
  } catch (err) {
    console.error('Error assigning students:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Get assignments for a student
router.get('/assignments/student/:studentId', async (req, res) => {
  try {
    await ensureAssignmentTables();
    const { studentId } = req.params;

    // Get internship assignments
    const [internships] = await db.query(`
      SELECT id, 'internship' as type, company_name, job_role, internship_type, stipend, duration, due_date, description, apply_link
      FROM assignments_internships
      WHERE student_id = ?
      AND (due_date IS NULL OR DATE(due_date) >= CURDATE())
      ORDER BY created_at DESC
    `, [studentId]);

    // Get placement/drive assignments
    const [drives] = await db.query(`
      SELECT id, 'placement' as type, company_name, job_role, salary_package, due_date, location, location_type, drive_date, description, apply_link
      FROM assignments_drives
      WHERE student_id = ?
      AND (due_date IS NULL OR DATE(due_date) >= CURDATE())
      ORDER BY created_at DESC
    `, [studentId]);

    // Combine both
    const allAssignments = [...internships, ...drives];
    
    res.json({
      success: true,
      assignments: allAssignments,
      count: allAssignments.length
    });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Get assignments for an opportunity (new structure)
router.get('/assignments/opportunity/:opportunityId/:type', async (req, res) => {
  try {
    await ensureAssignmentTables();
    const { opportunityId, type } = req.params;

    let query, table;
    if (type === 'internship') {
      table = 'assignments_internships';
    } else if (type === 'placement') {
      table = 'assignments_drives';
    } else {
      return res.json({ success: false, message: 'Invalid type' });
    }

    const [assignments] = await db.query(
      `SELECT student_id, created_at FROM ${table} WHERE id = ? ORDER BY created_at DESC`,
      [opportunityId]
    );

    res.json({
      success: true,
      assignments: assignments,
      count: assignments.length
    });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Create opportunity and assign to students in one step
router.post('/create-and-assign', async (req, res) => {
  try {
    await ensureAssignmentTables();
    const { type, company_name, job_role, due_date, necnStudentIds, necgStudentIds, studentIds, stipend, duration, description, salary_package, apply_link, location, location_type, drive_date } = req.body;

    // Support both legacy studentIds (treated as NECN) and the new per-campus arrays
    const necnIds = necnStudentIds && Array.isArray(necnStudentIds) ? necnStudentIds : (studentIds && Array.isArray(studentIds) ? studentIds : []);
    const necgIds = necgStudentIds && Array.isArray(necgStudentIds) ? necgStudentIds : [];
    const totalStudents = necnIds.length + necgIds.length;

    // Validate required fields
    if (!type || !company_name || !job_role || !due_date || totalStudents === 0) {
      return res.json({ success: false, message: 'Missing required fields' });
    }

    let successCount = 0;
    let errorMessages = [];

    // Helper: insert into a given DB instance
    async function insertForCampus(dbInst, ids) {
      if (type === 'internship') {
        const internshipType = stipend ? 'paid' : 'unpaid';
        for (const studentId of ids) {
          try {
            const sid = studentId.trim().toString();
            await dbInst.query(`
              INSERT INTO assignments_internships 
              (student_id, company_name, job_role, internship_type, stipend, duration, due_date, description, apply_link)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [sid, company_name, job_role, internshipType, stipend || null, duration || null, due_date, description || null, apply_link || null]);
            
            // Update students' placement_status to 'placed' if paid internship
            if (stipend) {
              await dbInst.query(`UPDATE students SET placement_status = 'placed' WHERE id = ?`, [sid]);
            }
            
            successCount++;
          } catch (err) {
            errorMessages.push(`${studentId}: ${err.message}`);
          }
        }
      } else if (type === 'placement') {
        // Ensure columns exist
        for (const col of [
          "ALTER TABLE assignments_drives ADD COLUMN location VARCHAR(255)",
          "ALTER TABLE assignments_drives ADD COLUMN location_type ENUM('oncampus','offcampus') DEFAULT 'oncampus'",
          "ALTER TABLE assignments_drives ADD COLUMN drive_date DATETIME"
        ]) { try { await dbInst.query(col); } catch (e) { /* ignore */ } }

        for (const studentId of ids) {
          try {
            const sid = studentId.trim().toString();
            await dbInst.query(`
              INSERT INTO assignments_drives 
              (student_id, company_name, job_role, salary_package, location, location_type, drive_date, due_date, description, apply_link)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [sid, company_name, job_role, salary_package || null, location || null, location_type || 'oncampus', drive_date || null, due_date, description || null, apply_link || null]);
            
            // Update students' placement_status to 'placed' when assigned to a placement drive
            await dbInst.query(`UPDATE students SET placement_status = 'placed' WHERE id = ?`, [sid]);

            // Insert or update student placement record
            if (salary_package) {
              await dbInst.query(`
                INSERT INTO student_placements
                (student_id, company_name, job_role, salary_package, placement_type, location, placement_date)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                  company_name = VALUES(company_name),
                  job_role = VALUES(job_role),
                  salary_package = VALUES(salary_package),
                  placement_type = VALUES(placement_type),
                  location = VALUES(location),
                  updated_at = NOW()
              `, [
                sid,
                company_name,
                job_role,
                salary_package,
                location_type || 'oncampus',
                location
              ]);
            }
            
            successCount++;
          } catch (err) {
            errorMessages.push(`${studentId}: ${err.message}`);
          }
        }
      }
    }

    // Route to correct DB by campus
    if (necnIds.length > 0) await insertForCampus(db, necnIds);
    if (necgIds.length > 0) await insertForCampus(db2, necgIds);

    res.json({
      success: true,
      message: `Assigned to ${successCount} student(s)`,
      assignedCount: successCount,
      errors: errorMessages
    });
  } catch (err) {
    console.error('Error creating and assigning opportunity:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Get all assignments for a specific type (for admin view)
router.get('/assignments/all/:type', async (req, res) => {
  try {
    await ensureAssignmentTables();
    const { type } = req.params;

    let query, table;
    if (type === 'internship') {
      table = 'assignments_internships';
      query = `SELECT * FROM ${table} ORDER BY created_at DESC`;
    } else if (type === 'placement') {
      table = 'assignments_drives';
      query = `SELECT * FROM ${table} ORDER BY created_at DESC`;
    } else {
      return res.json({ success: false, message: 'Invalid type' });
    }

    const [assignments] = await db.query(query);

    res.json({
      success: true,
      assignments: assignments,
      count: assignments.length
    });
  } catch (err) {
    console.error('Error fetching all assignments:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Delete a single assignment by ID
router.delete('/assignments/:id/:type', async (req, res) => {
  try {
    await ensureAssignmentTables();
    const { id, type } = req.params;

    let table;
    if (type === 'internship') {
      table = 'assignments_internships';
    } else if (type === 'placement') {
      table = 'assignments_drives';
    } else {
      return res.json({ success: false, message: 'Invalid type' });
    }

    await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);

    res.json({
      success: true,
      message: 'Assignment removed successfully'
    });
  } catch (err) {
    console.error('Error deleting assignment:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Delete all assignments for a specific opportunity
router.delete('/assignments/delete-by-opportunity', async (req, res) => {
  try {
    await ensureAssignmentTables();
    const { type, company_name, job_role, due_date } = req.body;

    console.log('Delete opportunity request:', { type, company_name, job_role, due_date });

    if (!type || !company_name || !job_role || !due_date) {
      return res.json({ success: false, message: 'Missing required fields' });
    }

    let table;
    if (type === 'internship') {
      table = 'assignments_internships';
    } else if (type === 'placement') {
      table = 'assignments_drives';
    } else {
      return res.json({ success: false, message: 'Invalid type' });
    }

    // Use DATE() function to compare only the date part, ignoring time
    const [result] = await db.query(
      `DELETE FROM ${table} WHERE company_name = ? AND job_role = ? AND DATE(due_date) = ?`,
      [company_name, job_role, due_date]
    );

    console.log('Delete result:', result.affectedRows, 'rows affected');

    res.json({
      success: true,
      message: `Deleted ${result.affectedRows} assignment(s)`,
      deletedCount: result.affectedRows
    });
  } catch (err) {
    console.error('Error deleting opportunity assignments:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Delete assignments by IDs (new improved method)
router.delete('/assignments/delete-by-ids', async (req, res) => {
  try {
    await ensureAssignmentTables();
    const { type, assignmentIds } = req.body;

    console.log('Delete by IDs request:', { type, assignmentIds });

    if (!type || !assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return res.json({ success: false, message: 'Missing required fields or invalid IDs' });
    }

    let table;
    if (type === 'internship') {
      table = 'assignments_internships';
    } else if (type === 'placement') {
      table = 'assignments_drives';
    } else {
      return res.json({ success: false, message: 'Invalid type' });
    }

    // Create placeholders for the IN clause
    const placeholders = assignmentIds.map(() => '?').join(',');
    const query = `DELETE FROM ${table} WHERE id IN (${placeholders})`;

    const [result] = await db.query(query, assignmentIds);

    console.log('Delete by IDs result:', result.affectedRows, 'rows affected');

    res.json({
      success: true,
      message: `Deleted ${result.affectedRows} assignment(s)`,
      deletedCount: result.affectedRows
    });
  } catch (err) {
    console.error('Error deleting assignments by IDs:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Add students to existing opportunity using assignment IDs as reference
router.post('/assignments/add-students', async (req, res) => {
  try {
    await ensureAssignmentTables();
    const { type, assignmentIds, studentIds } = req.body;

    console.log('Add students request:', { type, assignmentIds, studentIds });

    if (!type || !assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return res.json({ success: false, message: 'Missing assignment IDs' });
    }

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.json({ success: false, message: 'No student IDs provided' });
    }

    let table;
    if (type === 'internship') {
      table = 'assignments_internships';
    } else if (type === 'placement') {
      table = 'assignments_drives';
    } else {
      return res.json({ success: false, message: 'Invalid type' });
    }

    // Get details from first existing assignment to match with new ones
    const placeholders = assignmentIds.map(() => '?').join(',');
    const [existingAssignments] = await db.query(
      `SELECT * FROM ${table} WHERE id IN (${placeholders}) LIMIT 1`,
      assignmentIds
    );

    if (!existingAssignments || existingAssignments.length === 0) {
      return res.json({ success: false, message: 'Opportunity not found' });
    }

    const referenceAssignment = existingAssignments[0];
    let addedCount = 0;
    let errorMessages = [];

    // Add new students with same opportunity details
    for (const studentId of studentIds) {
      try {
        const studentIdStr = studentId.trim().toString();

        if (type === 'internship') {
          await db.query(`
            INSERT INTO assignments_internships 
            (student_id, company_name, job_role, internship_type, stipend, duration, due_date, description, apply_link)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            studentIdStr,
            referenceAssignment.company_name,
            referenceAssignment.job_role,
            referenceAssignment.internship_type || null,
            referenceAssignment.stipend || null,
            referenceAssignment.duration || null,
            referenceAssignment.due_date,
            referenceAssignment.description || null,
            referenceAssignment.apply_link || null
          ]);
        } else {
          await db.query(`
            INSERT INTO assignments_drives 
            (student_id, company_name, job_role, salary_package, due_date, description, apply_link)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            studentIdStr,
            referenceAssignment.company_name,
            referenceAssignment.job_role,
            referenceAssignment.salary_package || null,
            referenceAssignment.due_date,
            referenceAssignment.description || null,
            referenceAssignment.apply_link || null
          ]);
        }
        addedCount++;
      } catch (err) {
        errorMessages.push(`${studentId}: ${err.message}`);
      }
    }

    console.log('Add students result:', addedCount, 'rows added');

    res.json({
      success: true,
      message: `Added ${addedCount} student(s) to opportunity`,
      addedCount: addedCount,
      errors: errorMessages
    });
  } catch (err) {
    console.error('Error adding students:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

/**
 * GET /api/opportunities/get-by-id/:opportunityId
 * Get opportunity details by ID (for QR code generation)
 */
router.get('/get-by-id/:opportunityId', async (req, res) => {
  try {
    const { opportunityId } = req.params;

    if (!opportunityId) {
      return res.json({ success: false, message: 'Opportunity ID is required' });
    }

    // Try placement first
    const [placements] = await db.query(
      `SELECT id, company_name, job_role, salary_package, due_date, location, 
              location_type, event_date AS drive_date, description, apply_link
       FROM placements WHERE id = ?`,
      [opportunityId]
    );

    if (placements && placements.length > 0) {
      return res.json({
        success: true,
        opportunity: {
          ...placements[0],
          type: 'placement'
        }
      });
    }

    // Try internships
    const [internships] = await db.query(
      `SELECT id, company_name, job_role, stipend, duration, due_date, 
              description, apply_link
       FROM internships WHERE id = ?`,
      [opportunityId]
    );

    if (internships && internships.length > 0) {
      return res.json({
        success: true,
        opportunity: {
          ...internships[0],
          type: 'internship'
        }
      });
    }

    res.json({ success: false, message: 'Opportunity not found' });
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    res.json({ success: false, message: 'Server error fetching opportunity' });
  }
});

module.exports = router;
