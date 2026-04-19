const express = require('express');
const router = express.Router();
const db = require('../db');
const db2 = require('../db2');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { createToken } = require('../middleware/auth');
const { sendOtpEmail, verifyOTP } = require('../otpAuth');
const {
  ACCESS_DENIED_MESSAGE,
  normalizeCampusType,
  ensureAllFacultySchemas,
  resolveFacultyContext,
  facultyPrivilegesFromRow,
  hasFacultyPrivilege
} = require('../utils/facultyAccess');

const resourceUploadDir = path.join(__dirname, '../../uploads/resources');
fs.mkdirSync(resourceUploadDir, { recursive: true });

const resourceStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, resourceUploadDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);
    callback(null, `resource-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

const MAX_RESOURCE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const resourceUpload = multer({
  storage: resourceStorage,
  limits: { fileSize: MAX_RESOURCE_SIZE_BYTES }
});

async function getFacultyContext(identifierOptions = {}) {
  await ensureAllFacultySchemas();
  const campusType = identifierOptions.campusType ? normalizeCampusType(identifierOptions.campusType) : undefined;
  return resolveFacultyContext({ ...identifierOptions, campusType });
}

async function requireFacultyPrivilege(identifierOptions, privilegeKey) {
  const context = await getFacultyContext(identifierOptions);

  if (!context) {
    return { success: false, status: 404, message: 'Faculty not found' };
  }

  if (!hasFacultyPrivilege(context.faculty, privilegeKey)) {
    return { success: false, status: 403, message: ACCESS_DENIED_MESSAGE };
  }

  return { success: true, context };
}

async function ensureFacultyAssignedDriveTables(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS faculty_drive_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      faculty_id INT NOT NULL,
      placement_id INT NOT NULL,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_faculty_drive (faculty_id, placement_id),
      KEY idx_fda_faculty_id (faculty_id),
      KEY idx_fda_placement_id (placement_id),
      CONSTRAINT fk_fda_faculty FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
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

/**
 * ===========================
 * FACULTY AUTHENTICATION
 * ===========================
 */

// SIGNUP - Generate password reset token and send email
router.post('/signup', async (req, res) => {
    try {
        const { faculty_id, email } = req.body;

        if (!faculty_id || !email) {
            return res.json({ success: false, message: 'Faculty ID and email are required' });
        }

        const upperFacultyId = faculty_id.toUpperCase();

        // Check if faculty exists with this ID
        const [facultyRes] = await db.query(
            'SELECT * FROM faculty WHERE faculty_id=?',
            [upperFacultyId]
        );

        if (facultyRes.length === 0) {
            return res.json({ success: false, message: 'Faculty ID not found' });
        }

        const faculty = facultyRes[0];

        // Check if auth record already exists for this faculty_id
        const [existingAuth] = await db.query(
            'SELECT * FROM faculty_auth WHERE faculty_id=?',
            [upperFacultyId]
        );

        if (existingAuth.length > 0) {
            // Auth record exists - check if password is already set
            if (existingAuth[0].password) {
                return res.json({ success: false, message: 'This faculty already has an active account' });
            }
        }

        // Create or update auth record
        if (existingAuth.length > 0) {
            // Update existing auth record
            await db.query(
                'UPDATE faculty_auth SET email=?, password_reset_required=1 WHERE faculty_id=?',
                [email, upperFacultyId]
            );
        } else {
            // Insert new auth record
            await db.query(
                'INSERT INTO faculty_auth (faculty_id, email, password_reset_required) VALUES (?, ?, 1)',
                [upperFacultyId, email]
            );
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Save token in database
        await db.query(
            'INSERT INTO faculty_password_resets (faculty_id, reset_token, token_expires) VALUES (?, ?, ?)',
            [upperFacultyId, resetToken, tokenExpiry]
        );

        // Generate reset link
        const resetLink = `http://localhost:3000/faculty-reset-password.html?token=${resetToken}`;

        // Send email
        const emailSent = await sendPasswordResetEmail(faculty.name, email, resetLink);

        if (emailSent) {
            res.json({
                success: true,
                message: 'Password reset link has been sent to your email. Please check your inbox.'
            });
        } else {
            res.json({
                success: false,
                message: 'Account created but email could not be sent. Please try again later.'
            });
        }

    } catch (err) {
        console.error('Signup error:', err);
        res.json({ success: false, message: 'Server error during signup' });
    }
});

// SET PASSWORD - Faculty sets password using reset token
router.post('/set-password', async (req, res) => {
    try {
        const { token, password, password_confirm } = req.body;

        if (!token || !password) {
            return res.json({ success: false, message: 'Token and password required' });
        }

        if (password !== password_confirm) {
            return res.json({ success: false, message: 'Passwords do not match' });
        }

        // Verify token exists and is not expired in either campus database
        const tokenChecks = await Promise.all([
          db.query(
            'SELECT * FROM faculty_password_resets WHERE reset_token=? AND is_used=0 AND token_expires > NOW()',
            [token]
          ),
          db2.query(
            'SELECT * FROM faculty_password_resets WHERE reset_token=? AND is_used=0 AND token_expires > NOW()',
            [token]
          )
        ]);

        let targetDb = null;
        let resetRecord = null;

        if (tokenChecks[0][0].length > 0) {
          targetDb = db;
          resetRecord = tokenChecks[0][0][0];
        } else if (tokenChecks[1][0].length > 0) {
          targetDb = db2;
          resetRecord = tokenChecks[1][0][0];
        }

        if (!resetRecord || !targetDb) {
            return res.json({ success: false, message: 'Invalid or expired reset token' });
        }

        const [facultyRes] = await targetDb.query('SELECT id, faculty_id FROM faculty WHERE id=?', [resetRecord.faculty_id]);
        if (facultyRes.length === 0) {
          return res.json({ success: false, message: 'Faculty record not found' });
        }

        const faculty = facultyRes[0];

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update faculty_auth with password
        await targetDb.query(
            'UPDATE faculty_auth SET password=?, password_reset_required=0 WHERE faculty_id=?',
          [hashedPassword, faculty.faculty_id]
        );

        // Mark token as used
        await targetDb.query(
            'UPDATE faculty_password_resets SET is_used=1 WHERE id=?',
            [resetRecord.id]
        );

        res.json({ success: true, message: 'Password set successfully. You can now login.' });

    } catch (err) {
        console.error('Set password error:', err);
        res.json({ success: false, message: 'Server error while setting password' });
    }
});

// LOGIN - Faculty login with email OR faculty_id and password
router.post('/login-email', async (req, res) => {
    try {
        console.log('Login request received:', req.body);
        const { identifier, password, campus } = req.body;

        if (!identifier || !password) {
            return res.json({ success: false, message: 'Email/Faculty ID and password are required' });
        }

        const facultyContext = await getFacultyContext({ identifier, campusType: campus });

        if (!facultyContext) {
            return res.json({ success: false, message: 'Email or Faculty ID not found' });
        }

        const { connection, campusType, faculty } = facultyContext;
        const auth = {
          email: faculty.auth_email || faculty.email,
          password: faculty.auth_password
        };

        if (!auth.password) {
            return res.json({ success: false, message: 'Please set your password first using the signup link' });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, auth.password);

        if (!passwordMatch) {
            return res.json({ success: false, message: 'Incorrect password' });
        }

        // 🔴 SEND OTP HERE
        await sendOtpEmail(faculty.name, auth.email);

        console.log("OTP sent to:", auth.email);

        res.json({
            success: true,
            message: 'OTP sent to email',
            faculty: {
                faculty_id: faculty.faculty_id,
                name: faculty.name,
                email: auth.email,
                department: faculty.department,
                designation: faculty.designation,
                phone: faculty.phone,
                campusType,
                privileges: facultyPrivilegesFromRow(faculty)
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.json({ success: false, message: 'Server error during login' });
    }
});

// VERIFY OTP FOR FACULTY LOGIN
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp, college } = req.body;

        if (!email || !otp) {
            return res.json({ success: false, message: 'Email and OTP are required' });
        }

        const isValid = await verifyOTP(email, otp);

        if (!isValid) {
            return res.json({ success: false, message: 'Invalid or expired OTP' });
        }

        // Get faculty context to determine which database
        const facultyContext = await getFacultyContext({ email, campusType: college });

        if (!facultyContext) {
            return res.json({ success: false, message: 'Faculty not found' });
        }

        const { faculty, campusType } = facultyContext;
        const token = createToken({
            id: faculty.faculty_id,
            email: faculty.auth_email || faculty.email,
            role: 'faculty',
            college: campusType
        });

        res.json({
            success: true,
            message: 'OTP verified successfully',
            token,
            user: {
                id: faculty.faculty_id,
                name: faculty.name,
                email: faculty.auth_email || faculty.email,
                department: faculty.department,
                designation: faculty.designation,
                phone: faculty.phone,
                campusType,
                role: 'faculty',
                privileges: facultyPrivilegesFromRow(faculty)
            }
        });

    } catch (err) {
        console.error('OTP verification error:', err);
        res.json({ success: false, message: 'Server error during OTP verification' });
    }
});

/**
 * ===========================
 * FACULTY DASHBOARD
 * ===========================
 */

// Get faculty dashboard stats and summary
router.get('/dashboard/:facultyId', async (req, res) => {
    try {
        const { facultyId } = req.params;
    const facultyContext = await getFacultyContext({ facultyId, campusType: req.query.campus });

    if (!facultyContext) {
      return res.json({ success: false, message: 'Faculty not found' });
    }

    const { connection, faculty } = facultyContext;

    const facultyNumericId = faculty.id;

        // Count stats
    const [menteesRes] = await connection.query(
            'SELECT COUNT(*) as count FROM mentee_assignments WHERE faculty_id=?',
      [facultyNumericId]
        );
        const menteesCount = menteesRes[0].count;

    const [placedRes] = await connection.query(
            `SELECT COUNT(*) as count FROM mentee_assignments ma
             JOIN students s ON ma.student_id = s.id
             WHERE ma.faculty_id=? AND s.placement_status="placed"`,
      [facultyNumericId]
        );
        const placedCount = placedRes[0].count;

    const [eventsRes] = await connection.query(
            'SELECT COUNT(*) as count FROM faculty_events WHERE faculty_id=?',
      [facultyNumericId]
        );
        const eventsCount = eventsRes[0].count;

        // Get recent events
    const [recentEvents] = await connection.query(
            'SELECT * FROM faculty_events WHERE faculty_id=? ORDER BY created_at DESC LIMIT 5',
      [facultyNumericId]
        );

        // Get recent mentee assignments
    const [recentMentees] = await connection.query(`
            SELECT ma.*, s.name as student_name, s.email as student_email, s.placement_status
            FROM mentee_assignments ma 
            JOIN students s ON ma.student_id = s.id 
            WHERE ma.faculty_id=? 
            ORDER BY ma.assigned_at DESC 
            LIMIT 5
    `, [facultyNumericId]);

        res.json({
            success: true,
            faculty: {
                id: faculty.id,
                name: faculty.name,
                email: faculty.email,
                department: faculty.department,
                designation: faculty.designation
            },
            stats: {
                mentees: menteesCount,
                placed: placedCount,
                events: eventsCount
            },
            recentEvents,
            recentMentees
        });
    } catch (err) {
        console.error('Error fetching dashboard:', err);
        res.json({ success: false, message: 'Server error' });
    }
});

// Get faculty stats (for profile page)
router.get('/stats/:facultyId', async (req, res) => {
    try {
        const { facultyId } = req.params;
        console.log('Stats request for facultyId:', facultyId);
    const facultyContext = await getFacultyContext({ facultyId, campusType: req.query.campus });

    if (!facultyContext) {
      return res.json({ success: false, message: 'Faculty not found' });
    }

    const { connection, faculty } = facultyContext;
        let facultyIdNumeric = facultyId;
    let facultyIdString = faculty.faculty_id;

        // Check if facultyId is numeric or string format
    facultyIdNumeric = faculty.id;

        // Count mentees assigned to this faculty (handles numeric or string faculty_id in mentee_assignments)
        const facultyIdNumericValue = Number.isNaN(Number(facultyIdNumeric)) ? null : Number(facultyIdNumeric);
    const [menteesRes] = await connection.query(
          `SELECT COUNT(*) as count
           FROM mentee_assignments ma
           JOIN faculty f
             ON ma.faculty_id = f.id
             OR UPPER(ma.faculty_id) = UPPER(f.faculty_id)
           WHERE f.id = ? OR UPPER(f.faculty_id) = UPPER(?)`,
          [facultyIdNumericValue, facultyIdString]
        );
        console.log('Mentees count:', menteesRes[0].count, 'for numeric id:', facultyIdNumericValue, 'string id:', facultyIdString);

        // Count placed mentees (students with placement_status = 'placed')
        const [placedRes] = await connection.query(
            `SELECT COUNT(*) as count
             FROM mentee_assignments ma
             JOIN students s ON ma.student_id = s.id
             JOIN faculty f ON ma.faculty_id = f.id
             WHERE (f.id = ? OR UPPER(f.faculty_id) = UPPER(?))
             AND s.placement_status = 'placed'`,
            [facultyIdNumericValue, facultyIdString]
        );
        console.log('Placed count:', placedRes[0].count);

        // Count events organized by this faculty (faculty_events uses string faculty_id)
        const [eventsRes] = await connection.query(
          'SELECT COUNT(*) as count FROM faculty_events WHERE faculty_id = ? OR UPPER(CAST(faculty_id AS CHAR)) = UPPER(?)',
          [facultyIdNumericValue, facultyIdString]
        );
        console.log('Events count:', eventsRes[0].count);

        res.json({
            success: true,
            mentees: menteesRes[0].count,
            opportunities: placedRes[0].count,
            events: eventsRes[0].count
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

/**
 * ===========================
 * FACULTY PROFILE
 * ===========================
 */

// Get faculty profile details
router.get('/profile/:facultyId', async (req, res) => {
    try {
        const { facultyId } = req.params;
        console.log('Profile request for facultyId:', facultyId);
    const facultyContext = await getFacultyContext({ facultyId, campusType: req.query.campus });

    if (!facultyContext) {
      return res.json({ success: false, message: 'Faculty not found' });
    }

    const { connection, faculty } = facultyContext;

        // Query faculty table and join with faculty_auth to get email
        const query = `
            SELECT 
                f.*,
                fa.email
            FROM faculty f
            LEFT JOIN faculty_auth fa ON f.faculty_id = fa.faculty_id
            WHERE f.id = ?
        `;
        
    const [results] = await connection.query(query, [faculty.id]);
        
        console.log('Profile query result:', results);
        
        if (results.length === 0) {
            return res.json({ success: false, message: 'Faculty not found' });
        }

        res.json({ success: true, faculty: results[0] });
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Update faculty profile
router.put('/profile/:facultyId', async (req, res) => {
    try {
        const { facultyId } = req.params;
    const { name, phone, designation, department } = req.body;
    const facultyContext = await getFacultyContext({ facultyId, campusType: req.query.campus || req.body.campusType });

    if (!facultyContext) {
      return res.json({ success: false, message: 'Faculty not found' });
    }

    const { connection, faculty } = facultyContext;

        const query = `UPDATE faculty SET 
            name=COALESCE(?, name),
            phone=COALESCE(?, phone),
            designation=COALESCE(?, designation),
            department=COALESCE(?, department)
            WHERE id=?`;

          await connection.query(query, [name, phone, designation, department, faculty.id]);
        
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.json({ success: false, message: 'Server error' });
    }
});

/**
 * ===========================
 * TEST ENDPOINT - Set password for testing
 * ===========================
 */
router.post('/test/set-password', async (req, res) => {
    try {
        const { faculty_id, password, email } = req.body;

        if (!faculty_id || !password || !email) {
            return res.json({ success: false, message: 'faculty_id, password, and email are required' });
        }

        const upperFacultyId = faculty_id.toUpperCase();

        // Check if faculty exists
        const [facultyRes] = await db.query(
            'SELECT * FROM faculty WHERE faculty_id=?',
            [upperFacultyId]
        );

        if (facultyRes.length === 0) {
            return res.json({ success: false, message: 'Faculty ID not found' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if auth record exists
        const [existingAuth] = await db.query(
            'SELECT * FROM faculty_auth WHERE faculty_id=?',
            [upperFacultyId]
        );

        if (existingAuth.length > 0) {
            // Update existing record
            await db.query(
                'UPDATE faculty_auth SET email=?, password=? WHERE faculty_id=?',
                [email, hashedPassword, upperFacultyId]
            );
        } else {
            // Insert new record
            await db.query(
                'INSERT INTO faculty_auth (faculty_id, email, password, password_reset_required) VALUES (?, ?, ?, 0)',
                [upperFacultyId, email, hashedPassword]
            );
        }

        res.json({
            success: true,
            message: `Password set for ${upperFacultyId}. You can now login with either email or faculty ID.`,
            test_login: {
                method1: `Email: ${email}, Password: ${password}`,
                method2: `Faculty ID: ${upperFacultyId}, Password: ${password}`
            }
        });

    } catch (err) {
        console.error('Test password set error:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

/**
 * ===========================
 * FACULTY EVENTS MANAGEMENT
 * ===========================
 */

// Create/Add new event
router.post('/add-event', async (req, res) => {
    try {
        console.log('Add event request body:', req.body);
        
        const { faculty_id, event_name, event_type, event_date, location, eligible_branches, eligible_years, description } = req.body;

        const privilegeCheck = await requireFacultyPrivilege(
            { facultyId: faculty_id, campusType: req.body.campusType },
            'postEvents'
        );

        if (!privilegeCheck.success) {
            return res.status(privilegeCheck.status).json({ success: false, message: privilegeCheck.message });
        }

        const { connection, faculty } = privilegeCheck.context;

        // Validate required fields
        if (!faculty_id || !event_name || !event_type || !event_date || !location) {
            console.log('Validation failed:', { faculty_id, event_name, event_type, event_date, location });
            return res.json({ success: false, message: 'Missing required fields' });
        }

        const facultyIdToUse = faculty.id;

        // Convert eligible_years array to JSON string
        const eligible_years_json = eligible_years ? JSON.stringify(eligible_years) : null;

        // Convert date to DATETIME format (add time if not present)
        let eventDateTime = event_date;
        if (event_date && !event_date.includes('T')) {
            eventDateTime = event_date + ' 10:00:00'; // Add default time
        } else if (event_date && event_date.includes('T')) {
            eventDateTime = event_date.replace('T', ' ').substring(0, 19); // Convert ISO to MySQL format
        }

        console.log('Inserting event with data:', { 
            faculty_id, 
            event_name, 
            event_type, 
            event_date, 
            eventDateTime,
            location, 
            eligible_branches, 
            eligible_years_json, 
            description 
        });

        // Insert event into database
        const result = await connection.query(
          'INSERT INTO faculty_events (faculty_id, title, event_type, event_date, location, eligible_branches, eligible_years, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "published", NOW())',
          [facultyIdToUse, event_name, event_type, eventDateTime, location, eligible_branches || null, eligible_years_json, description || null]
        );

        console.log('Event inserted successfully, result:', result);

        res.json({
            success: true,
            message: 'Event added successfully!',
            event_id: result[0].insertId
        });

    } catch (err) {
        console.error('Add event error:', err);
        console.error('Error stack:', err.stack);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Get all events for a faculty
router.get('/get-events/:faculty_id', async (req, res) => {
    try {
        const { faculty_id } = req.params;

    let facultyIdToUse = faculty_id;
    if (isNaN(faculty_id)) {
      const [facultyRes] = await db.query(
        'SELECT id FROM faculty WHERE faculty_id = ?',
        [faculty_id]
      );

      if (facultyRes.length === 0) {
        return res.json({ success: false, message: 'Faculty not found' });
      }

      facultyIdToUse = facultyRes[0].id;
    }

        const [events] = await db.query(
            'SELECT * FROM faculty_events WHERE faculty_id=? ORDER BY event_date DESC',
      [facultyIdToUse]
        );

        // Parse JSON fields
        const parsedEvents = events.map(event => ({
            ...event,
            eligible_years: event.eligible_years ? JSON.parse(event.eligible_years) : []
        }));

        res.json({
            success: true,
            events: parsedEvents
        });

    } catch (err) {
        console.error('Get events error:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Get single event by ID
router.get('/event/:event_id', async (req, res) => {
    try {
        const { event_id } = req.params;

        const [event] = await db.query(
            'SELECT * FROM faculty_events WHERE id=?',
            [event_id]
        );

        if (event.length === 0) {
            return res.json({ success: false, message: 'Event not found' });
        }

        // Parse JSON fields
        const parsedEvent = {
            ...event[0],
            eligible_years: event[0].eligible_years ? JSON.parse(event[0].eligible_years) : []
        };

        res.json({
            success: true,
            event: parsedEvent
        });

    } catch (err) {
        console.error('Get event error:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Update event
router.put('/update-event/:event_id', async (req, res) => {
    try {
        const { event_id } = req.params;
        const { event_name, event_type, event_date, location, eligible_branches, eligible_years, description } = req.body;

        // Validate required fields
        if (!event_name || !event_type || !event_date || !location) {
            return res.json({ success: false, message: 'Missing required fields' });
        }

        // Convert eligible_years array to JSON string
        const eligible_years_json = eligible_years ? JSON.stringify(eligible_years) : null;

        // Update event
        await db.query(
          'UPDATE faculty_events SET title=?, event_type=?, event_date=?, location=?, eligible_branches=?, eligible_years=?, description=? WHERE id=?',
          [event_name, event_type, event_date, location, eligible_branches || null, eligible_years_json, description || null, event_id]
        );

        res.json({
            success: true,
            message: 'Event updated successfully!'
        });

    } catch (err) {
        console.error('Update event error:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Delete event
router.delete('/delete-event/:event_id', async (req, res) => {
    try {
        const { event_id } = req.params;

        await db.query('DELETE FROM faculty_events WHERE id=?', [event_id]);

        res.json({
            success: true,
            message: 'Event deleted successfully!'
        });

    } catch (err) {
        console.error('Delete event error:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Delete event (alternative route for frontend compatibility)
router.delete('/events/:event_id', async (req, res) => {
    try {
        const { event_id } = req.params;
    const { faculty_id, campusType } = req.body;

    const privilegeCheck = await requireFacultyPrivilege(
      { facultyId: faculty_id, campusType: campusType || req.query.campus },
      'postEvents'
    );

    if (!privilegeCheck.success) {
      return res.status(privilegeCheck.status).json({ success: false, message: privilegeCheck.message });
    }

    const { connection, faculty } = privilegeCheck.context;

        console.log('Delete event attempt:', { event_id, faculty_id });

        // Verify that the faculty owns this event before deleting
    const [event] = await connection.query('SELECT * FROM faculty_events WHERE id=?', [event_id]);
        
        console.log('Event found:', event);

        if (event.length === 0) {
            return res.json({ success: false, message: 'Event not found or you do not have permission to delete it' });
        }

        // Check if the event belongs to the faculty member (case-insensitive comparison)
        const eventFacultyId = String(event[0].faculty_id).trim();
        const requestFacultyId = String(faculty.id).trim();
        
        console.log('Faculty ID comparison:', { eventFacultyId, requestFacultyId, match: eventFacultyId === requestFacultyId });

        if (eventFacultyId.toLowerCase() !== requestFacultyId.toLowerCase()) {
            return res.json({ success: false, message: 'Event not found or you do not have permission to delete it' });
        }

        await connection.query('DELETE FROM faculty_events WHERE id=?', [event_id]);

        res.json({
            success: true,
            message: 'Event deleted successfully!'
        });

    } catch (err) {
        console.error('Delete event error:', err);
        res.json({ success: false, message: 'Server error: ' + err.message });
    }
});

/**
 * ===========================
 * FACULTY RESOURCE MANAGEMENT
 * ===========================
 */

// ✅ Get all resources for a faculty member
router.get('/:faculty_id/resources', async (req, res) => {
  const { faculty_id } = req.params;
  try {
    const facultyContext = await getFacultyContext({ facultyId: faculty_id, campusType: req.query.campus });

    if (!facultyContext) {
      return res.json({ success: false, message: 'Faculty not found' });
    }

    const [resources] = await facultyContext.connection.query(
      `SELECT * FROM faculty_resources 
       WHERE faculty_id = ? 
       ORDER BY created_at DESC`,
      [facultyContext.faculty.id]
    );

    res.json({ success: true, resources });
  } catch (err) {
    console.error('Error fetching resources:', err);
    res.json({ success: false, message: 'Server error' });
  }
});

// ✅ Add new resource
router.post('/:faculty_id/add-resource', (req, res, next) => {
  resourceUpload.single('file')(req, res, function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: 'File size exceeds 25MB limit' });
      }
      return res.status(400).json({ success: false, message: 'File upload error: ' + err.message });
    }
    next();
  });
}, async (req, res) => {
  const { faculty_id } = req.params;
  const { resource_name, resource_type, description, file_path } = req.body;

  try {
    const privilegeCheck = await requireFacultyPrivilege(
      { facultyId: faculty_id, campusType: req.body.campusType || req.query.campus },
      'uploadResources'
    );

    if (!privilegeCheck.success) {
      return res.status(privilegeCheck.status).json({ success: false, message: privilegeCheck.message });
    }

    const { connection, faculty } = privilegeCheck.context;

    // Validate required fields
    if (!resource_name || !resource_type || (!file_path && !req.file)) {
      return res.json({ success: false, message: 'Resource title, category, and either link or file are required' });
    }

    console.log('Adding resource:', { faculty_id, resource_name, resource_type });

    const uploadedFilePath = req.file ? `/uploads/resources/${req.file.filename}` : null;
    const primaryFilePath = file_path || uploadedFilePath;

    // Insert resource
    const [result] = await connection.query(
      `INSERT INTO faculty_resources 
       (faculty_id, title, category, description, file_path, uploaded_file_path, file_type, file_size) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        faculty.id,
        resource_name,
        resource_type,
        description || '',
        primaryFilePath,
        uploadedFilePath,
        req.file ? req.file.mimetype : null,
        req.file ? req.file.size : null
      ]
    );

    res.json({ 
      success: true, 
      message: 'Resource added successfully!',
      resource_id: result.insertId 
    });
  } catch (err) {
    console.error('Error adding resource:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ✅ Delete resource
router.delete('/:faculty_id/resource/:resource_id', async (req, res) => {
  const { faculty_id, resource_id } = req.params;

  try {
    const privilegeCheck = await requireFacultyPrivilege(
      { facultyId: faculty_id, campusType: req.query.campus },
      'uploadResources'
    );

    if (!privilegeCheck.success) {
      return res.status(privilegeCheck.status).json({ success: false, message: privilegeCheck.message });
    }

    const { connection, faculty } = privilegeCheck.context;

    // Verify resource belongs to this faculty
    const [[resource]] = await connection.query(
      'SELECT * FROM faculty_resources WHERE id = ? AND faculty_id = ?',
      [resource_id, faculty.id]
    );

    if (!resource) {
      return res.json({ success: false, message: 'Resource not found' });
    }

    // Delete resource
    await connection.query(
      'DELETE FROM faculty_resources WHERE id = ? AND faculty_id = ?',
      [resource_id, faculty.id]
    );

    res.json({ success: true, message: 'Resource deleted successfully!' });
  } catch (err) {
    console.error('Error deleting resource:', err);
    res.json({ success: false, message: 'Server error' });
  }
});

/**
 * ===========================
 * MENTEES & APPLICATIONS SECTION
 * ===========================
 */

// ✅ Get numeric faculty ID from string faculty_id
router.get('/get-numeric-id/:faculty_id', async (req, res) => {
  const { faculty_id } = req.params;

  try {
    const facultyContext = await getFacultyContext({ facultyId: faculty_id, campusType: req.query.campus });

    if (!facultyContext) {
      return res.json({ success: false, message: 'Faculty not found' });
    }
    
    res.json({ success: true, id: facultyContext.faculty.id, campusType: facultyContext.campusType });
  } catch (err) {
    console.error('Error getting numeric faculty ID:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ✅ List drives assigned by admin to a faculty (with filters + pagination)
router.get('/assigned-drives/:faculty_id', async (req, res) => {
  const { faculty_id } = req.params;
  const company = String(req.query.company || '').trim();
  const fromDate = String(req.query.fromDate || '').trim();
  const toDate = String(req.query.toDate || '').trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 6));
  const offset = (page - 1) * limit;

  try {
    const privilegeCheck = await requireFacultyPrivilege(
      { facultyId: faculty_id, campusType: req.query.campus },
      'monitorAssignedDrives'
    );

    if (!privilegeCheck.success) {
      return res.status(privilegeCheck.status).json({ success: false, message: privilegeCheck.message });
    }

    const { connection, faculty } = privilegeCheck.context;
    await ensureFacultyAssignedDriveTables(connection);

    const filterSqlParts = [];
    const filterParams = [faculty.id];

    if (company) {
      filterSqlParts.push('p.company_name LIKE ?');
      filterParams.push(`%${company}%`);
    }

    if (fromDate) {
      filterSqlParts.push('DATE(COALESCE(p.event_date, p.due_date, p.created_at)) >= ?');
      filterParams.push(fromDate);
    }

    if (toDate) {
      filterSqlParts.push('DATE(COALESCE(p.event_date, p.due_date, p.created_at)) <= ?');
      filterParams.push(toDate);
    }

    const dynamicFilters = filterSqlParts.length ? ` AND ${filterSqlParts.join(' AND ')}` : '';

    const [countRows] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM faculty_drive_assignments fda
       JOIN placements p ON p.id = fda.placement_id
       WHERE fda.faculty_id = ?
         AND p.is_active = TRUE
         ${dynamicFilters}`,
      filterParams
    );

    const total = Number(countRows[0]?.total || 0);

    const [drives] = await connection.query(
      `SELECT
         p.id,
         p.company_name,
         p.job_role,
         p.salary_package,
         p.interview_rounds,
         p.event_date,
         p.due_date,
         p.location,
         p.description,
         p.apply_link,
         p.created_at,
         fda.assigned_at,
         (
           SELECT COUNT(*)
           FROM student_registrations sr
           WHERE sr.drive_id = p.id
             AND sr.drive_type = 'placement'
         ) AS registrations_count
       FROM faculty_drive_assignments fda
       JOIN placements p ON p.id = fda.placement_id
       WHERE fda.faculty_id = ?
         AND p.is_active = TRUE
         ${dynamicFilters}
       ORDER BY COALESCE(p.event_date, p.due_date, p.created_at) DESC, p.id DESC
       LIMIT ? OFFSET ?`,
      [...filterParams, limit, offset]
    );

    res.json({
      success: true,
      drives,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err) {
    console.error('Error fetching assigned drives:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ✅ Get details + student registrations for a specific assigned drive
router.get('/assigned-drives/:faculty_id/:placement_id/registrations', async (req, res) => {
  const { faculty_id, placement_id } = req.params;

  try {
    const privilegeCheck = await requireFacultyPrivilege(
      { facultyId: faculty_id, campusType: req.query.campus },
      'monitorAssignedDrives'
    );

    if (!privilegeCheck.success) {
      return res.status(privilegeCheck.status).json({ success: false, message: privilegeCheck.message });
    }

    const { connection, faculty } = privilegeCheck.context;
    await ensureFacultyAssignedDriveTables(connection);

    const [driveRows] = await connection.query(
      `SELECT
         p.id,
         p.company_name,
         p.job_role,
         p.salary_package,
         p.interview_rounds,
         p.event_date,
         p.due_date,
         p.location,
         p.description,
         p.apply_link,
         p.created_at,
         fda.assigned_at
       FROM faculty_drive_assignments fda
       JOIN placements p ON p.id = fda.placement_id
       WHERE fda.faculty_id = ?
         AND p.id = ?
         AND p.is_active = TRUE
       LIMIT 1`,
      [faculty.id, placement_id]
    );

    if (!driveRows.length) {
      return res.status(404).json({ success: false, message: 'Assigned drive not found' });
    }

    const drive = driveRows[0];

    const [registrations] = await connection.query(
      `SELECT
         sr.id,
         sr.student_id,
         sr.status,
         sr.registered_on,
         s.name AS student_name,
         s.email AS student_email,
         s.branch,
         s.year,
         s.cgpa,
         s.placement_status
       FROM student_registrations sr
       JOIN students s ON s.id = sr.student_id
       WHERE sr.drive_id = ?
         AND sr.drive_type = 'placement'
       ORDER BY sr.registered_on DESC`,
      [placement_id]
    );

    const summary = {
      totalRegistered: registrations.length,
      applied: registrations.filter(r => r.status === 'applied').length,
      shortlisted: registrations.filter(r => r.status === 'shortlisted').length,
      selected: registrations.filter(r => r.status === 'selected').length,
      rejected: registrations.filter(r => r.status === 'rejected').length
    };

    res.json({
      success: true,
      drive,
      summary,
      registrations
    });
  } catch (err) {
    console.error('Error fetching drive registrations:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ✅ Get all mentees for a faculty (accepts faculty_id string like 'NECN_FAC_001' or numeric id)
router.get('/mentees/:faculty_id', async (req, res) => {
  const { faculty_id } = req.params;

  try {
    const privilegeCheck = await requireFacultyPrivilege(
      { facultyId: faculty_id, campusType: req.query.campus },
      'monitorAssignedDrives'
    );

    if (!privilegeCheck.success) {
      return res.status(privilegeCheck.status).json({ success: false, message: privilegeCheck.message });
    }

    const { connection, faculty } = privilegeCheck.context;
    
    const [mentees] = await connection.query(
      `SELECT 
        s.id, 
        s.name, 
        s.email, 
        s.branch, 
        s.year,
        s.cgpa,
        s.placement_status
      FROM mentee_assignments ma
      JOIN students s ON ma.student_id = s.id
      WHERE ma.faculty_id = ?
      ORDER BY s.name`,
      [faculty.id]
    );

    res.json({ 
      success: true, 
      mentees: mentees,
      count: mentees.length
    });
  } catch (err) {
    console.error('Error fetching mentees:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ✅ Get mentees' applications and event registrations
router.get('/mentees-activities/:faculty_id', async (req, res) => {
  const { faculty_id } = req.params;

  try {
    const privilegeCheck = await requireFacultyPrivilege(
      { facultyId: faculty_id, campusType: req.query.campus },
      'monitorAssignedDrives'
    );

    if (!privilegeCheck.success) {
      return res.status(privilegeCheck.status).json({ success: false, message: privilegeCheck.message });
    }

    const { connection, faculty } = privilegeCheck.context;

    // Get drive applications by mentees
    const [applications] = await connection.query(
      `SELECT 
        'application' as type,
        a.id,
        a.student_id,
        s.name as student_name,
        s.email as student_email,
        a.status,
        a.applied_on as date
      FROM applications a
      JOIN students s ON a.student_id = s.id
      JOIN mentee_assignments ma ON ma.student_id = s.id
      JOIN faculty f ON ma.faculty_id = f.id
      WHERE f.id = ?
      ORDER BY a.applied_on DESC`,
      [faculty.id]
    );

    // Get event registrations by mentees
    const [eventRegs] = await connection.query(
      `SELECT 
        'event' as type,
        fer.id,
        fer.student_id,
        s.name as student_name,
        s.email as student_email,
        fe.title as title,
        fe.title as event_name,
        fer.status,
        fer.registered_at as date
      FROM faculty_event_registrations fer
      JOIN students s ON fer.student_id = s.id
      JOIN faculty_events fe ON fer.event_id = fe.id
      JOIN mentee_assignments ma ON ma.student_id = s.id
      JOIN faculty f ON ma.faculty_id = f.id
      WHERE f.id = ?
      ORDER BY fer.registered_at DESC`,
      [faculty.id]
    );

    // Combine both arrays
    const activities = [...applications, ...eventRegs].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    res.json({ 
      success: true, 
      activities: activities,
      count: {
        applications: applications.length,
        eventRegistrations: eventRegs.length,
        total: activities.length
      }
    });
  } catch (err) {
    console.error('Error fetching mentees activities:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ✅ Get filtered mentees' activities (with filters)
router.post('/mentees-activities/:faculty_id/filter', async (req, res) => {
  const { faculty_id } = req.params;
  const { mentee_id, activity_type, status, from_date, to_date } = req.body;

  try {
    const privilegeCheck = await requireFacultyPrivilege(
      { facultyId: faculty_id, campusType: req.body.campusType || req.query.campus },
      'monitorAssignedDrives'
    );

    if (!privilegeCheck.success) {
      return res.status(privilegeCheck.status).json({ success: false, message: privilegeCheck.message });
    }

    const { connection, faculty } = privilegeCheck.context;

    let query = `
      SELECT 
        'application' as type,
        a.id,
        a.student_id,
        s.name as student_name,
        s.email as student_email,
        a.status,
        a.applied_on as date
      FROM applications a
      JOIN students s ON a.student_id = s.id
      JOIN mentee_assignments ma ON ma.student_id = s.id
      JOIN faculty f ON ma.faculty_id = f.id
      WHERE f.id = ?
    `;

    const params = [faculty.id];

    if (mentee_id) {
      query += ` AND s.id = ?`;
      params.push(mentee_id);
    }

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (from_date) {
      query += ` AND a.applied_on >= ?`;
      params.push(from_date);
    }

    if (to_date) {
      query += ` AND a.applied_on <= ?`;
      params.push(to_date);
    }

    const [applications] = await connection.query(query, params);

    // Similar query for events if activity_type is 'event' or empty
    let eventRegs = [];
    if (!activity_type || activity_type === 'event') {
      let eventQuery = `
        SELECT 
          'event' as type,
          fer.id,
          fer.student_id,
          s.name as student_name,
          s.email as student_email,
          fe.title as title,
          fe.title as event_name,
          fer.status,
          fer.registered_at as date
        FROM faculty_event_registrations fer
        JOIN students s ON fer.student_id = s.id
        JOIN faculty_events fe ON fer.event_id = fe.id
        JOIN mentee_assignments ma ON ma.student_id = s.id
        JOIN faculty f ON ma.faculty_id = f.id
        WHERE f.id = ?
      `;

      const eventParams = [faculty.id];

      if (mentee_id) {
        eventQuery += ` AND s.id = ?`;
        eventParams.push(mentee_id);
      }

      if (status) {
        eventQuery += ` AND fer.status = ?`;
        eventParams.push(status);
      }

      if (from_date) {
        eventQuery += ` AND fer.registered_at >= ?`;
        eventParams.push(from_date);
      }

      if (to_date) {
        eventQuery += ` AND fer.registered_at <= ?`;
        eventParams.push(to_date);
      }

      const [eventData] = await connection.query(eventQuery, eventParams);
      eventRegs = eventData;
    }

    // Combine results based on activity_type filter
    let activities = [];
    if (!activity_type || activity_type === 'application') {
      activities = [...activities, ...applications];
    }
    if (!activity_type || activity_type === 'event') {
      activities = [...activities, ...eventRegs];
    }

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ 
      success: true, 
      activities: activities,
      count: activities.length
    });
  } catch (err) {
    console.error('Error fetching filtered activities:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ✅ Get mentee details with statistics
router.get('/mentee/:mentee_id/stats', async (req, res) => {
  const { mentee_id } = req.params;

  try {
    // Get student info
    const [[student]] = await db.query(
      'SELECT * FROM students WHERE id = ?',
      [mentee_id]
    );

    if (!student) {
      return res.json({ success: false, message: 'Student not found' });
    }

    // Get applications count by status
    const [appStats] = await db.query(
      `SELECT status, COUNT(*) as count FROM applications 
       WHERE student_id = ? GROUP BY status`,
      [mentee_id]
    );

    // Get event registrations count by status
    const [eventStats] = await db.query(
      `SELECT fer.status, COUNT(*) as count FROM faculty_event_registrations fer
       WHERE fer.student_id = ? GROUP BY fer.status`,
      [mentee_id]
    );

    // Get recent activities
    const [recentActivities] = await db.query(
      `SELECT * FROM applications WHERE student_id = ? 
       ORDER BY applied_on DESC LIMIT 5`,
      [mentee_id]
    );

    res.json({
      success: true,
      student: student,
      applicationStats: appStats,
      eventStats: eventStats,
      recentActivities: recentActivities
    });
  } catch (err) {
    console.error('Error fetching mentee stats:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

/**
 * ===========================
 * FACULTY EVENTS MANAGEMENT
 * ===========================
 */

// ✅ Get all events posted by a faculty
// ✅ Delete an event
router.delete('/events/:event_id', async (req, res) => {
  const { event_id } = req.params;
  const { faculty_id } = req.body;

  try {
    const privilegeCheck = await requireFacultyPrivilege(
      { facultyId: faculty_id, campusType: req.body.campusType || req.query.campus },
      'postEvents'
    );

    if (!privilegeCheck.success) {
      return res.status(privilegeCheck.status).json({ success: false, message: privilegeCheck.message });
    }

    const { connection, faculty } = privilegeCheck.context;

    // Check if event belongs to this faculty
    const [eventRes] = await connection.query(
      'SELECT id FROM faculty_events WHERE id = ? AND faculty_id = ?',
      [event_id, faculty.id]
    );

    if (eventRes.length === 0) {
      return res.json({ success: false, message: 'Event not found or you do not have permission to delete it' });
    }

    // Delete the event
    await connection.query('DELETE FROM faculty_events WHERE id = ?', [event_id]);

    res.json({ 
      success: true, 
      message: 'Event deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ✅ Get all events for a faculty (accepts faculty_id string like 'NECN_FAC_001' or numeric id)
router.get('/events/:faculty_id', async (req, res) => {
  const { faculty_id } = req.params;

  try {
    const facultyContext = await getFacultyContext({ facultyId: faculty_id, campusType: req.query.campus });

    if (!facultyContext) {
      return res.json({ success: false, message: 'Faculty not found' });
    }

    const [events] = await facultyContext.connection.query(
      `SELECT * FROM faculty_events 
       WHERE faculty_id = ? 
       ORDER BY created_at DESC`,
      [facultyContext.faculty.id]
    );

    res.json({ 
      success: true, 
      events: events,
      count: events.length
    });
  } catch (err) {
    console.error('Error fetching events:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ✅ Get registration summary and student details for a posted event
router.get('/events/:faculty_id/:event_id/registrations', async (req, res) => {
  const { faculty_id, event_id } = req.params;

  try {
    const facultyContext = await getFacultyContext({ facultyId: faculty_id, campusType: req.query.campus });

    if (!facultyContext) {
      return res.json({ success: false, message: 'Faculty not found' });
    }

    const { connection, faculty } = facultyContext;

    const [eventRows] = await connection.query(
      `SELECT
        fe.id,
        fe.title AS event_name,
        fe.event_type,
        fe.event_date,
        fe.location,
        fe.description,
        fe.created_at
      FROM faculty_events fe
      WHERE fe.id = ?
        AND fe.faculty_id = ?
      LIMIT 1`,
      [event_id, faculty.id]
    );

    if (eventRows.length === 0) {
      return res.json({ success: false, message: 'Event not found or access denied' });
    }

    const [registrations] = await connection.query(
      `SELECT
        fer.id,
        fer.student_id,
        s.name,
        s.email,
        s.branch,
        s.year,
        s.cgpa,
        fer.status,
        fer.registered_at
      FROM faculty_event_registrations fer
      JOIN students s ON s.id = fer.student_id
      WHERE fer.event_id = ?
      ORDER BY fer.registered_at DESC`,
      [event_id]
    );

    const summary = {
      totalRegistered: registrations.length,
      registered: registrations.filter(r => r.status === 'registered').length,
      attended: registrations.filter(r => r.status === 'attended').length,
      cancelled: registrations.filter(r => r.status === 'cancelled').length
    };

    res.json({
      success: true,
      event: eventRows[0],
      summary,
      registrations
    });
  } catch (err) {
    console.error('Error fetching event registrations summary:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
