const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../mailer');

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

        // Verify token exists and is not expired
        const [tokenRes] = await db.query(
            'SELECT * FROM faculty_password_resets WHERE reset_token=? AND is_used=0 AND token_expires > NOW()',
            [token]
        );

        if (tokenRes.length === 0) {
            return res.json({ success: false, message: 'Invalid or expired reset token' });
        }

        const resetRecord = tokenRes[0];

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update faculty_auth with password
        await db.query(
            'UPDATE faculty_auth SET password=?, password_reset_required=0 WHERE faculty_id=?',
            [hashedPassword, resetRecord.faculty_id]
        );

        // Mark token as used
        await db.query(
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
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.json({ success: false, message: 'Email/Faculty ID and password are required' });
        }

        // Try to find faculty by email first, then by faculty_id
        let authRes = null;
        
        // Check if identifier is email or faculty_id
        if (identifier.includes('@')) {
            // It's an email
            [authRes] = await db.query(
                'SELECT * FROM faculty_auth WHERE email=?',
                [identifier]
            );
        } else {
            // It's a faculty_id
            const upperIdentifier = identifier.toUpperCase();
            [authRes] = await db.query(
                'SELECT * FROM faculty_auth WHERE faculty_id=?',
                [upperIdentifier]
            );
        }

        if (authRes.length === 0) {
            return res.json({ success: false, message: 'Email or Faculty ID not found' });
        }

        const auth = authRes[0];

        if (!auth.password) {
            return res.json({ success: false, message: 'Please set your password first using the signup link' });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, auth.password);

        if (!passwordMatch) {
            return res.json({ success: false, message: 'Incorrect password' });
        }

        // Get full faculty details
        const [facultyRes] = await db.query(
            'SELECT * FROM faculty WHERE faculty_id=?',
            [auth.faculty_id]
        );

        if (facultyRes.length === 0) {
            return res.json({ success: false, message: 'Faculty record not found' });
        }

        const faculty = facultyRes[0];

        // Update last active time
        await db.query('UPDATE faculty SET last_active=NOW() WHERE faculty_id=?', [faculty.faculty_id]);

        res.json({
            success: true,
            message: 'Login successful',
            faculty: {
                faculty_id: faculty.faculty_id,
                name: faculty.name,
                email: auth.email,
                department: faculty.department,
                designation: faculty.designation
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.json({ success: false, message: 'Server error during login' });
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

        // Get faculty basic info
        const [facultyRes] = await db.query('SELECT * FROM faculty WHERE id=?', [facultyId]);
        if (facultyRes.length === 0) {
            return res.json({ success: false, message: 'Faculty not found' });
        }
        const faculty = facultyRes[0];

        // Count stats
        const [menteesRes] = await db.query(
            'SELECT COUNT(*) as count FROM mentee_assignments WHERE faculty_id=?',
            [facultyId]
        );
        const menteesCount = menteesRes[0].count;

        const [placedRes] = await db.query(
            `SELECT COUNT(*) as count FROM mentee_assignments ma
             JOIN students s ON ma.student_id = s.id
             WHERE ma.faculty_id=? AND s.placement_status="placed"`,
            [facultyId]
        );
        const placedCount = placedRes[0].count;

        const [eventsRes] = await db.query(
            'SELECT COUNT(*) as count FROM faculty_events WHERE faculty_id=?',
            [facultyId]
        );
        const eventsCount = eventsRes[0].count;

        // Get recent events
        const [recentEvents] = await db.query(
            'SELECT * FROM faculty_events WHERE faculty_id=? ORDER BY created_at DESC LIMIT 5',
            [facultyId]
        );

        // Get recent mentee assignments
        const [recentMentees] = await db.query(`
            SELECT ma.*, s.name as student_name, s.email as student_email, s.placement_status
            FROM mentee_assignments ma 
            JOIN students s ON ma.student_id = s.id 
            WHERE ma.faculty_id=? 
            ORDER BY ma.assigned_at DESC 
            LIMIT 5
        `, [facultyId]);

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
        let facultyIdNumeric = facultyId;
        let facultyIdString = facultyId;

        // Check if facultyId is numeric or string format
        if (isNaN(facultyId)) {
            console.log('Faculty ID is string format, looking up numeric ID...');
            // It's a string like 'NECN_FAC_001', get the numeric ID
            const [facultyRes] = await db.query(
                'SELECT id FROM faculty WHERE UPPER(faculty_id)=UPPER(?)',
                [facultyId]
            );
            
            if (facultyRes.length === 0) {
                console.log('Faculty not found with faculty_id:', facultyId);
                return res.json({ success: false, message: 'Faculty not found' });
            }
            facultyIdNumeric = facultyRes[0].id;
            facultyIdString = facultyId;
            console.log('Found numeric ID:', facultyIdNumeric, 'String ID:', facultyIdString);
        } else {
            // If numeric ID provided, look up the string faculty_id
            const [facultyRes] = await db.query(
                'SELECT faculty_id FROM faculty WHERE id=?',
                [facultyId]
            );
            
            if (facultyRes.length > 0) {
                facultyIdString = facultyRes[0].faculty_id;
            }
        }

        // Count mentees assigned to this faculty (handles numeric or string faculty_id in mentee_assignments)
        const facultyIdNumericValue = Number.isNaN(Number(facultyIdNumeric)) ? null : Number(facultyIdNumeric);
        const [menteesRes] = await db.query(
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
        const [placedRes] = await db.query(
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
        const [eventsRes] = await db.query(
            'SELECT COUNT(*) as count FROM faculty_events WHERE UPPER(faculty_id)=UPPER(?)',
            [facultyIdString]
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
        let facultyIdToUse = facultyId;

        // Check if facultyId is numeric or string format
        if (isNaN(facultyId)) {
            console.log('Faculty ID is string format, looking up numeric ID...');
            // It's a string like 'NECN_FAC_010', get the numeric ID
            // Use UPPER() for case-insensitive comparison
            const [facultyRes] = await db.query(
                'SELECT id FROM faculty WHERE UPPER(faculty_id)=UPPER(?)',
                [facultyId]
            );
            
            console.log('Lookup result:', facultyRes);
            
            if (facultyRes.length === 0) {
                console.log('Faculty not found with faculty_id:', facultyId);
                // Try without UPPER if first attempt failed
                const [facultyRes2] = await db.query(
                    'SELECT id FROM faculty WHERE faculty_id=?',
                    [facultyId]
                );
                if (facultyRes2.length === 0) {
                    return res.json({ success: false, message: 'Faculty not found' });
                }
                facultyIdToUse = facultyRes2[0].id;
            } else {
                facultyIdToUse = facultyRes[0].id;
            }
            console.log('Found numeric ID:', facultyIdToUse);
        }

        // Query faculty table and join with faculty_auth to get email
        const query = `
            SELECT 
                f.*,
                fa.email
            FROM faculty f
            LEFT JOIN faculty_auth fa ON f.faculty_id = fa.faculty_id
            WHERE f.id = ?
        `;
        
        const [results] = await db.query(query, [facultyIdToUse]);
        
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
        const { name, phone, designation, qualification, profile_image, department } = req.body;
        let facultyIdToUse = facultyId;

        // Check if facultyId is numeric or string format
        if (isNaN(facultyId)) {
            // It's a string like 'NECN_FAC_010', get the numeric ID
            const [facultyRes] = await db.query(
                'SELECT id FROM faculty WHERE faculty_id=?',
                [facultyId]
            );
            
            if (facultyRes.length === 0) {
                return res.json({ success: false, message: 'Faculty not found' });
            }
            facultyIdToUse = facultyRes[0].id;
        }

        const query = `UPDATE faculty SET 
            name=COALESCE(?, name),
            phone=COALESCE(?, phone),
            designation=COALESCE(?, designation),
            qualification=COALESCE(?, qualification),
            department=COALESCE(?, department),
            profile_image=COALESCE(?, profile_image),
            last_active=NOW()
            WHERE id=?`;

        await db.query(query, [name, phone, designation, qualification, department, profile_image, facultyIdToUse]);
        
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

        // Validate required fields
        if (!faculty_id || !event_name || !event_type || !event_date || !location) {
            console.log('Validation failed:', { faculty_id, event_name, event_type, event_date, location });
            return res.json({ success: false, message: 'Missing required fields' });
        }

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
        const result = await db.query(
            'INSERT INTO faculty_events (faculty_id, event_name, event_type, event_date, location, eligible_branches, eligible_years, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [faculty_id, event_name, event_type, eventDateTime, location, eligible_branches || null, eligible_years_json, description || null]
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

        const [events] = await db.query(
            'SELECT * FROM faculty_events WHERE faculty_id=? ORDER BY event_date DESC',
            [faculty_id]
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
            'UPDATE faculty_events SET event_name=?, event_type=?, event_date=?, location=?, eligible_branches=?, eligible_years=?, description=? WHERE id=?',
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
        const { faculty_id } = req.body;

        console.log('Delete event attempt:', { event_id, faculty_id });

        // Verify that the faculty owns this event before deleting
        const [event] = await db.query('SELECT * FROM faculty_events WHERE id=?', [event_id]);
        
        console.log('Event found:', event);

        if (event.length === 0) {
            return res.json({ success: false, message: 'Event not found or you do not have permission to delete it' });
        }

        // Check if the event belongs to the faculty member (case-insensitive comparison)
        const eventFacultyId = String(event[0].faculty_id).trim();
        const requestFacultyId = String(faculty_id).trim();
        
        console.log('Faculty ID comparison:', { eventFacultyId, requestFacultyId, match: eventFacultyId === requestFacultyId });

        if (eventFacultyId.toLowerCase() !== requestFacultyId.toLowerCase()) {
            return res.json({ success: false, message: 'Event not found or you do not have permission to delete it' });
        }

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

/**
 * ===========================
 * FACULTY RESOURCE MANAGEMENT
 * ===========================
 */

// ✅ Get all resources for a faculty member
router.get('/:faculty_id/resources', async (req, res) => {
  const { faculty_id } = req.params;
  try {
    const [resources] = await db.query(
      `SELECT * FROM faculty_resources 
       WHERE faculty_id = ? 
       ORDER BY created_at DESC`,
      [faculty_id]
    );

    res.json({ success: true, resources });
  } catch (err) {
    console.error('Error fetching resources:', err);
    res.json({ success: false, message: 'Server error' });
  }
});

// ✅ Add new resource
router.post('/:faculty_id/add-resource', async (req, res) => {
  const { faculty_id } = req.params;
  const { resource_name, resource_type, description, file_path } = req.body;

  try {
    // Validate required fields
    if (!resource_name || !resource_type || !file_path) {
      return res.json({ success: false, message: 'Resource name, type, and file path are required' });
    }

    console.log('Adding resource:', { faculty_id, resource_name, resource_type });

    // Insert resource
    const [result] = await db.query(
      `INSERT INTO faculty_resources 
       (faculty_id, resource_name, resource_type, description, file_path) 
       VALUES (?, ?, ?, ?, ?)`,
      [faculty_id, resource_name, resource_type, description || '', file_path]
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
    // Verify resource belongs to this faculty
    const [[resource]] = await db.query(
      'SELECT * FROM faculty_resources WHERE id = ? AND faculty_id = ?',
      [resource_id, faculty_id]
    );

    if (!resource) {
      return res.json({ success: false, message: 'Resource not found' });
    }

    // Delete resource
    await db.query(
      'DELETE FROM faculty_resources WHERE id = ? AND faculty_id = ?',
      [resource_id, faculty_id]
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
    // Check if faculty_id is already numeric
    if (!isNaN(faculty_id)) {
      return res.json({ success: true, id: parseInt(faculty_id) });
    }
    
    // It's a string like 'NECN_FAC_001', get the numeric ID
    const [facultyRes] = await db.query(
      'SELECT id FROM faculty WHERE faculty_id=?',
      [faculty_id]
    );
    
    if (facultyRes.length === 0) {
      return res.json({ success: false, message: 'Faculty not found' });
    }
    
    res.json({ success: true, id: facultyRes[0].id });
  } catch (err) {
    console.error('Error getting numeric faculty ID:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ✅ Get all mentees for a faculty (accepts faculty_id string like 'NECN_FAC_001' or numeric id)
router.get('/mentees/:faculty_id', async (req, res) => {
  const { faculty_id } = req.params;

  try {
    let facultyIdToUse = faculty_id;
    
    // Check if faculty_id is numeric or string format
    if (isNaN(faculty_id)) {
      // It's a string like 'NECN_FAC_001', get the numeric ID
      const [facultyRes] = await db.query(
        'SELECT id FROM faculty WHERE faculty_id=?',
        [faculty_id]
      );
      
      if (facultyRes.length === 0) {
        return res.json({ success: false, message: 'Faculty not found' });
      }
      facultyIdToUse = facultyRes[0].id;
    }
    
    const [mentees] = await db.query(
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
      [facultyIdToUse]
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
    // Get drive applications by mentees
    const [applications] = await db.query(
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
      [faculty_id]
    );

    // Get event registrations by mentees
    const [eventRegs] = await db.query(
      `SELECT 
        'event' as type,
        fer.id,
        fer.student_id,
        s.name as student_name,
        s.email as student_email,
        fe.event_name as title,
        fe.event_name,
        fer.status,
        fer.registered_at as date
      FROM faculty_event_registrations fer
      JOIN students s ON fer.student_id = s.id
      JOIN faculty_events fe ON fer.event_id = fe.id
      JOIN mentee_assignments ma ON ma.student_id = s.id
      JOIN faculty f ON ma.faculty_id = f.id
      WHERE f.id = ?
      ORDER BY fer.registered_at DESC`,
      [faculty_id]
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

    const params = [faculty_id];

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

    const [applications] = await db.query(query, params);

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
          fe.event_name as title,
          fe.event_name,
          fer.status,
          fer.registered_at as date
        FROM faculty_event_registrations fer
        JOIN students s ON fer.student_id = s.id
        JOIN faculty_events fe ON fer.event_id = fe.id
        JOIN mentee_assignments ma ON ma.student_id = s.id
        JOIN faculty f ON ma.faculty_id = f.id
        WHERE f.id = ?
      `;

      const eventParams = [faculty_id];

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

      const [eventData] = await db.query(eventQuery, eventParams);
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
    let facultyIdToUse = faculty_id;
    
    // Convert faculty_id string to numeric if needed
    if (isNaN(faculty_id)) {
      const [facultyRes] = await db.query(
        'SELECT id FROM faculty WHERE faculty_id=?',
        [faculty_id]
      );
      
      if (facultyRes.length === 0) {
        return res.json({ success: false, message: 'Faculty not found' });
      }
      facultyIdToUse = facultyRes[0].id;
    }

    // Check if event belongs to this faculty
    const [eventRes] = await db.query(
      'SELECT id FROM faculty_events WHERE id = ? AND faculty_id = ?',
      [event_id, facultyIdToUse]
    );

    if (eventRes.length === 0) {
      return res.json({ success: false, message: 'Event not found or you do not have permission to delete it' });
    }

    // Delete the event
    await db.query('DELETE FROM faculty_events WHERE id = ?', [event_id]);

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
    // Faculty_id can be either numeric or string format
    // Events are stored with string faculty_id, so use it directly
    const [events] = await db.query(
      `SELECT * FROM faculty_events 
       WHERE faculty_id = ? 
       ORDER BY created_at DESC`,
      [faculty_id]
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

module.exports = router;
