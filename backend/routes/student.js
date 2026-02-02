// routes/student.js
const express = require('express');
const router = express.Router();
const db = require('../db');

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
    possibleYears.forEach((yr, idx) => {
      if (idx > 0) yearCondition += ' OR ';
      yearCondition += `eligible_years LIKE ?`;
      yearParams.push(`%${yr}%`);
    });

    const [events] = await db.query(
      `SELECT 
        id,
        event_name,
        event_type,
        event_date,
        location,
        description,
        created_at
       FROM faculty_events 
       WHERE (eligible_branches IS NULL OR eligible_branches = '' OR FIND_IN_SET(?, eligible_branches))
       AND (eligible_years IS NULL OR eligible_years = '' OR (${yearCondition}))
       ORDER BY created_at DESC 
       LIMIT 3`,
      [student.branch, ...yearParams]
    );

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

// Configure Multer for profile uploads
const profileStorage = multer.diskStorage({
    destination: './uploads/profiles/',
    filename: (req, file, cb) => {
        cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
    }
});
const profileUpload = multer({ storage: profileStorage });

// Configure Multer for resume uploads
const resumeStorage = multer.diskStorage({
    destination: './uploads/resumes/',
    filename: (req, file, cb) => {
        cb(null, 'resume-' + req.params.id + '-' + Date.now() + path.extname(file.originalname));
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
    const { phone, dob } = req.body;

    try {
        console.log('Update personal info request:', { id, phone, dob });
        
        // Build dynamic update query (name is NOT updatable)
        let updateFields = [];
        let params = [];
        
        if (phone !== undefined) {
            updateFields.push('phone = ?');
            params.push(phone);
        }
        if (dob) {
            updateFields.push('dob = ?');
            params.push(dob);
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

    // Get all events where this student is eligible
    // Check branches with FIND_IN_SET
    // Check years - match both "1" and "1st Year", "2" and "2nd Year", etc.
    const yearMappings = {
      '1': ['1', '1st Year', 'First Year', '1st year'],
      '2': ['2', '2nd Year', 'Second Year', '2nd year'],
      '3': ['3', '3rd Year', 'Third Year', '3rd year'],
      '4': ['4', '4th Year', 'Final Year', 'final year', '4th year']
    };

    const possibleYears = yearMappings[student.year] || [student.year];
    
    // Build year search patterns
    let yearCondition = '';
    const yearParams = [];
    possibleYears.forEach((yr, idx) => {
      if (idx > 0) yearCondition += ' OR ';
      yearCondition += `eligible_years LIKE ?`;
      yearParams.push(`%${yr}%`);
    });

    const query = `SELECT * FROM faculty_events 
       WHERE (eligible_branches IS NULL OR eligible_branches = '' OR FIND_IN_SET(?, eligible_branches))
       AND (eligible_years IS NULL OR eligible_years = '' OR (${yearCondition}))
       ORDER BY event_date ASC`;

    const [events] = await db.query(query, [student.branch, ...yearParams]);

    console.log('Found events:', events.length);
    events.forEach(event => {
      console.log('Event details:', { id: event.id, name: event.event_name, description: event.description });
    });

    // Parse eligible_years JSON for each event
    const parsedEvents = events.map(event => ({
      ...event,
      eligible_years: event.eligible_years ? JSON.parse(event.eligible_years) : []
    }));

    res.json({ success: true, events: parsedEvents });
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
      
      // Set all previous resumes as not latest
      await db.query('UPDATE resumes SET is_latest = FALSE WHERE student_id = ?', [id]);
      
      // Get the latest version number
      const [latestResume] = await db.query(
        'SELECT MAX(version) as maxVersion FROM resumes WHERE student_id = ?',
        [id]
      );
      
      const newVersion = (latestResume[0].maxVersion || 0) + 1;
      
      // Insert new resume
      await db.query(
        'INSERT INTO resumes (student_id, resume_path, version, is_latest) VALUES (?, ?, ?, TRUE)',
        [id, resumePath, newVersion]
      );
    }

    res.json({ success: true, message: 'Academic information updated successfully!' });
  } catch (err) {
    console.error('Error updating academic info:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Get student's latest resume
router.get('/:id/resume', async (req, res) => {
  const { id } = req.params;

  try {
    const [resume] = await db.query(
      'SELECT * FROM resumes WHERE student_id = ? AND is_latest = TRUE ORDER BY upload_date DESC LIMIT 1',
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
      `SELECT fer.id, fer.event_id, fer.status, fer.registered_at, fe.event_name
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