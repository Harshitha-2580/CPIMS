const express = require('express');
const router = express.Router();
const db = require('../db');
const db2 = require('../db2');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const {
  sendPasswordResetEmail,
  sendAdminPasswordSetupEmail,
  sendDriveAssignmentEmail,
  sendStudentApprovalEmail,
  sendStudentRejectionEmail
} = require('../mailer');

// Middleware to check if user is superadmin (JWT auth required)
function requireSuperadmin(req, res, next) {
  const userRole = req.user?.role;

  if (!userRole || !['superadmin', 'super'].includes(userRole)) {
    return res.status(403).json({ success: false, message: 'Only superadmin can perform this action' });
  }

  next();
}

// Middleware to check if admin can manage other admins
async function requireManageAdminsPrivilege(req, res, next) {
  try {
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    if (userRole === 'superadmin' || userRole === 'super') {
      return next();
    }

    if (userRole === 'admin' && userEmail) {
      const [admins] = await db.query(
        'SELECT can_manage_admins FROM admins WHERE email = ?',
        [userEmail]
      );

      if (admins && admins.length > 0 && admins[0].can_manage_admins === 1) {
        return next();
      }
    }

    return res.status(403).json({ 
      success: false, 
      message: 'You do not have permission to manage admins. Please contact your superadmin.' 
    });
  } catch (err) {
    console.error('Error checking manage admins privilege:', err);
    return res.status(500).json({ success: false, message: 'Server error while checking permissions' });
  }
}

// Middleware to check if admin can approve or reject students
async function requireApproveStudentsPrivilege(req, res, next) {
  try {
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    if (userRole === 'superadmin' || userRole === 'super') {
      return next();
    }

    if (userRole === 'admin' && userEmail) {
      const [admins] = await db.query(
        'SELECT can_approve_students FROM admins WHERE email = ?',
        [userEmail]
      );

      if (admins && admins.length > 0 && admins[0].can_approve_students === 1) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to approve students. Please contact superadmin.'
    });
  } catch (err) {
    console.error('Error checking approve students privilege:', err);
    return res.status(500).json({ success: false, message: 'Server error while checking permissions' });
  }
}

// Add new admin (superadmin only)
router.post('/add-admin', requireManageAdminsPrivilege, async (req, res) => {
  try {
    const { name, email, phone, designation, privileges, role, userRole } = req.body;
    if (!name || !email || !phone || !designation || !role) {
      return res.json({ success: false, message: 'All fields are required' });
    }
    // Accept both 'admin', 'superadmin', 'super', 'manager' for compatibility
    if (!['admin', 'superadmin', 'super', 'manager'].includes(role)) {
      return res.json({ success: false, message: 'Invalid role' });
    }
    
    // Generate random password and hash it
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiresDate = new Date();
    resetExpiresDate.setHours(resetExpiresDate.getHours() + 24); // Token expires in 24 hours
    
    // Map privileges to columns
    let can_add_faculty = 0;
    let can_generate_reports = 0;
    let can_post_opportunities = 0;
    let can_assign_students_opportunities = 0;
    let can_approve_students = 0;
    let can_manage_admins = 0;
    
    // If superadmin is creating, they can grant all privileges
    // Otherwise, only user-selected privileges from non-superadmin
    if (userRole === 'superadmin' || userRole === 'super') {
      // If role is superadmin/super, grant all privileges
      if (role === 'superadmin' || role === 'super') {
        can_add_faculty = 1;
        can_generate_reports = 1;
        can_post_opportunities = 1;
        can_assign_students_opportunities = 1;
        can_approve_students = 1;
        can_manage_admins = 1;
      } else if (privileges && Array.isArray(privileges)) {
        // For regular admins, map selected privileges
        can_add_faculty = privileges.includes('can_add_faculty') ? 1 : 0;
        can_generate_reports = privileges.includes('can_generate_reports') ? 1 : 0;
        can_post_opportunities = privileges.includes('can_post_opportunities') ? 1 : 0;
        can_assign_students_opportunities = privileges.includes('can_assign_students_opportunities') ? 1 : 0;
        can_approve_students = privileges.includes('can_approve_students') ? 1 : 0;
      }
    } else {
      // Non-superadmin can only assign privileges that they themselves have
      // This will be validated in frontend, but double-check on backend
      if (privileges && Array.isArray(privileges)) {
        can_add_faculty = privileges.includes('can_add_faculty') ? 1 : 0;
        can_generate_reports = privileges.includes('can_generate_reports') ? 1 : 0;
        can_post_opportunities = privileges.includes('can_post_opportunities') ? 1 : 0;
        can_assign_students_opportunities = privileges.includes('can_assign_students_opportunities') ? 1 : 0;
        can_approve_students = privileges.includes('can_approve_students') ? 1 : 0;
      }
    }
    
    // Insert new admin with reset token
    await db.query(
      `INSERT INTO admins (name, email, phone, designation, password, role, can_add_faculty, can_generate_reports, can_post_opportunities, can_assign_students_opportunities, can_approve_students, can_manage_admins, password_reset_token, password_reset_expires) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, designation, hashedPassword, role, can_add_faculty, can_generate_reports, can_post_opportunities, can_assign_students_opportunities, can_approve_students, can_manage_admins, resetToken, resetExpiresDate]
    );
    
    // Send password reset email
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-reset-password.html?token=${resetToken}&role=admin`;
    await sendAdminPasswordSetupEmail(name, email, resetLink);
    
    res.json({ success: true, message: 'Admin created successfully. Password reset email sent to ' + email });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.json({ success: false, message: 'Admin email already exists' });
    }
    console.error('Error adding admin:', err);
    res.json({ success: false, message: 'Server error while adding admin' });
  }
});

// Reset admin password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.json({ success: false, message: 'Token and password are required' });
    }
    
    if (newPassword.length < 8) {
      return res.json({ success: false, message: 'Password must be at least 8 characters' });
    }
    
    // Find admin by reset token
    const [admins] = await db.query(
      `SELECT id, password_reset_expires FROM admins WHERE password_reset_token = ?`,
      [token]
    );
    
    if (!admins || admins.length === 0) {
      return res.json({ success: false, message: 'Invalid reset token' });
    }
    
    const admin = admins[0];
    
    // Check if token has expired
    const expiresAt = new Date(admin.password_reset_expires);
    if (expiresAt < new Date()) {
      return res.json({ success: false, message: 'Reset token has expired. Please request a new one.' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear reset token
    await db.query(
      `UPDATE admins SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?`,
      [hashedPassword, admin.id]
    );
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.json({ success: false, message: 'Server error while resetting password' });
  }
});

const {
  CAMPUS_CONNECTIONS,
  normalizeCampusType,
  normalizePrivileges,
  ensureAllFacultySchemas,
  generateNextFacultyId,
  facultyPrivilegesFromRow
} = require('../utils/facultyAccess');

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
    // Fall back to comma-separated values.
  }

  return String(rawRounds)
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );

  return Number(rows[0]?.total || 0) > 0;
}

async function getActiveAssignedDrivesByFaculty(connection) {
  const activeAssignedByFaculty = {};

  try {
    await ensureFacultyAssignedColumn(connection);

    const [placements] = await connection.query(
      `SELECT id, faculty_assigned, interview_rounds
       FROM placements
       WHERE is_active = TRUE
         AND faculty_assigned IS NOT NULL
         AND TRIM(faculty_assigned) <> ''`
    );

    if (!placements.length) {
      return activeAssignedByFaculty;
    }

    const placementIds = placements.map(p => Number(p.id)).filter(Boolean);
    const uploadedRoundsByPlacement = {};

    if (placementIds.length) {
      const placeholders = placementIds.map(() => '?').join(',');
      try {
        const [uploadedRows] = await connection.query(
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

    placements.forEach(p => {
      const totalRounds = parseInterviewRounds(p.interview_rounds).length;
      const uploadedRounds = uploadedRoundsByPlacement[Number(p.id)] || 0;
      const isCompleted = totalRounds > 0 && uploadedRounds >= totalRounds;

      if (isCompleted) {
        return;
      }

      const facultyId = String(p.faculty_assigned || '').trim();
      if (!facultyId) {
        return;
      }

      activeAssignedByFaculty[facultyId] = (activeAssignedByFaculty[facultyId] || 0) + 1;
    });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return activeAssignedByFaculty;
    }
    throw err;
  }

  return activeAssignedByFaculty;
}

async function fetchFacultySummary(connection, campusType) {
  let activeAssignedByFaculty = {};

  try {
    activeAssignedByFaculty = await getActiveAssignedDrivesByFaculty(connection);
  } catch (assignmentError) {
    console.error(`Error computing active assigned drives for campus ${campusType}:`, assignmentError);
  }

  try {

    const [hasMentorships, hasOpportunities, hasBlogs, hasOpportunityAssignments] = await Promise.all([
      tableExists(connection, 'mentorships'),
      tableExists(connection, 'opportunities'),
      tableExists(connection, 'faculty_blogs'),
      tableExists(connection, 'opportunity_assignments')
    ]);

    const studentsMentoredExpr = hasMentorships
      ? '(SELECT COUNT(*) FROM mentorships m WHERE m.faculty_id=f.id)'
      : '0';

    const internshipsExpr = hasOpportunities
      ? `(SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id AND o.type='internship')`
      : '0';

    const hackathonsExpr = hasOpportunities
      ? `(SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id AND o.type='hackathon')`
      : '0';

    const competitionsExpr = hasOpportunities
      ? `(SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id AND o.type='competition')`
      : '0';

    const blogsExpr = hasBlogs
      ? '(SELECT COUNT(*) FROM faculty_blogs b WHERE b.faculty_id=f.id)'
      : '0';

    const assignedDrivesExpr = hasOpportunityAssignments
      ? '(SELECT COUNT(*) FROM opportunity_assignments oa WHERE oa.faculty_id=f.id)'
      : '0';

    const [results] = await connection.query(`
      SELECT f.*, 
        ${studentsMentoredExpr} AS studentsMentored,
        ${internshipsExpr} AS internships,
        ${hackathonsExpr} AS hackathons,
        ${competitionsExpr} AS competitions,
        ${blogsExpr} AS blogs,
        ${assignedDrivesExpr} AS assignedDrives
      FROM faculty f
      ORDER BY f.created_at DESC
    `);

    return results.map(faculty => ({
      id: faculty.id,
      facultyId: faculty.faculty_id,
      name: faculty.name,
      email: faculty.email,
      phone: faculty.phone,
      department: faculty.department,
      designation: faculty.designation,
      campusType,
      inDrive: (activeAssignedByFaculty[String(faculty.faculty_id || '').trim()] || 0) > 0,
      assignedDrives: activeAssignedByFaculty[String(faculty.faculty_id || '').trim()] || 0,
      studentsMentored: faculty.studentsMentored,
      opportunities: {
        internships: faculty.internships,
        hackathons: faculty.hackathons,
        competitions: faculty.competitions
      },
      blogs: faculty.blogs,
      activenessScore: Math.round((faculty.internships + faculty.hackathons + faculty.competitions + faculty.blogs) / 4 * 25),
      privileges: facultyPrivilegesFromRow(faculty)
    }));
  } catch (error) {
    console.error(`Error in fetchFacultySummary for campus ${campusType}:`, error);
    const [fallbackRows] = await connection.query('SELECT * FROM faculty ORDER BY created_at DESC');
    return fallbackRows.map(faculty => ({
      id: faculty.id,
      facultyId: faculty.faculty_id,
      name: faculty.name,
      email: faculty.email,
      phone: faculty.phone,
      department: faculty.department,
      designation: faculty.designation,
      campusType,
      inDrive: (activeAssignedByFaculty[String(faculty.faculty_id || '').trim()] || 0) > 0,
      assignedDrives: activeAssignedByFaculty[String(faculty.faculty_id || '').trim()] || 0,
      studentsMentored: 0,
      opportunities: {
        internships: 0,
        hackathons: 0,
        competitions: 0
      },
      blogs: 0,
      activenessScore: 0,
      privileges: facultyPrivilegesFromRow(faculty)
    }));
  }
}

/**
 * ===========================
 * Faculty Management (Admin)
 * ===========================
 */

// Get all faculty with summary stats
router.get('/faculty', async (req, res) => {
    try {
    await ensureAllFacultySchemas();

    const facultyByCampus = await Promise.all(
      Object.entries(CAMPUS_CONNECTIONS).map(([campusType, config]) =>
        fetchFacultySummary(config.db, campusType)
      )
    );

    const faculty = facultyByCampus.flat().sort((left, right) => left.name.localeCompare(right.name));

        res.json({ success: true, faculty });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Server error' });
    }
});

// Add new faculty
router.post('/add-faculty', async (req, res) => {
  try {
    const { campusType, name, email, phone, department, designation, privileges } = req.body;

    if (!name || !email || !department || !designation || !phone) {
      return res.json({ success: false, message: 'All fields are required' });
    }

    await ensureAllFacultySchemas();

    const normalizedCampusType = normalizeCampusType(campusType);
    const targetDb = CAMPUS_CONNECTIONS[normalizedCampusType].db;
    const normalizedPrivileges = normalizePrivileges(privileges);
    const facultyId = await generateNextFacultyId(targetDb, normalizedCampusType);

    const [insertResult] = await targetDb.query(
      `INSERT INTO faculty (
        faculty_id, name, email, phone, department, designation, campus_type,
        can_post_events, can_upload_resources, can_post_internships, can_monitor_assigned_drives
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        facultyId,
        name,
        email,
        phone,
        department,
        designation,
        normalizedCampusType,
        normalizedPrivileges.postEvents,
        normalizedPrivileges.uploadResources,
        normalizedPrivileges.postInternships,
        normalizedPrivileges.monitorAssignedDrives
      ]
    );

    await targetDb.query(
      `INSERT INTO faculty_auth (faculty_id, email, password, password_reset_required)
       VALUES (?, ?, NULL, 1)`,
      [facultyId, email]
    );

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await targetDb.query(
      'INSERT INTO faculty_password_resets (faculty_id, reset_token, token_expires) VALUES (?, ?, ?)',
      [insertResult.insertId, resetToken, tokenExpiry]
    );

    const resetLink = `http://localhost:3000/faculty-reset-password.html?token=${resetToken}`;
    await sendPasswordResetEmail(name, email, resetLink);

    res.json({
      success: true,
      facultyId,
      campusType: normalizedCampusType,
      message: 'Faculty added and password setup email sent successfully'
    });
    } catch(err) {
        console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.json({ success: false, message: 'Faculty email already exists' });
    }
        res.json({ success: false, message: 'Failed to add faculty and send password setup email' });
    }
});

// Remove faculty
router.delete('/remove-faculty/:email', async (req, res) => {
    try {
        const { email } = req.params;
    const campusType = normalizeCampusType(req.query.campus);
    const targetDb = CAMPUS_CONNECTIONS[campusType].db;

    await ensureAllFacultySchemas();
    await targetDb.query('DELETE FROM faculty WHERE email=?', [email]);
        res.json({ success: true });
    } catch(err) {
        console.error(err);
        res.json({ success: false, message: 'Failed to remove faculty' });
    }
});

// Toggle faculty active/inactive
router.patch('/toggle-faculty/:id', async (req, res) => {
  res.json({ success: false, message: 'Faculty status toggle is not available in the current schema' });
});

// Update faculty details
router.patch('/update-faculty', async (req, res) => {
    try {
    const { campusType, email, name, phone, department, designation, privileges } = req.body;
    if (!email || !name || !phone || !department || !designation) {
            return res.json({ success: false, message: 'Missing required fields' });
        }

    await ensureAllFacultySchemas();

    const normalizedCampusType = normalizeCampusType(campusType);
    const targetDb = CAMPUS_CONNECTIONS[normalizedCampusType].db;
    const normalizedPrivileges = normalizePrivileges(privileges);

        const [result] = await targetDb.query(
      `UPDATE faculty
       SET name=?, phone=?, department=?, designation=?,
         can_post_events=?, can_upload_resources=?, can_post_internships=?, can_monitor_assigned_drives=?
       WHERE email=?`,
      [
        name,
        phone,
        department,
        designation,
        normalizedPrivileges.postEvents,
        normalizedPrivileges.uploadResources,
        normalizedPrivileges.postInternships,
        normalizedPrivileges.monitorAssignedDrives,
        email
      ]
        );

        if (result.affectedRows === 0) {
            return res.json({ success: false, message: 'No such faculty found' });
        }

        res.json({ success: true, message: 'Faculty updated successfully' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Server error while updating faculty' });
    }
});

  router.get('/faculty-email/:email', async (req, res) => {
    try {
      const campusType = normalizeCampusType(req.query.campus);
      const targetDb = CAMPUS_CONNECTIONS[campusType].db;
      const { email } = req.params;

      await ensureAllFacultySchemas();

      const [facultyRows] = await targetDb.query('SELECT * FROM faculty WHERE email=?', [email]);
      if (facultyRows.length === 0) {
        return res.json({ success: false, message: 'Faculty not found' });
      }

      const faculty = facultyRows[0];

      const [opportunities] = await targetDb.query(
        'SELECT * FROM opportunities WHERE faculty_id=? ORDER BY created_at DESC',
        [faculty.id]
      ).catch(() => [[]]);

      const [blogs] = await targetDb.query(
        'SELECT * FROM faculty_blogs WHERE faculty_id=? ORDER BY created_at DESC',
        [faculty.id]
      ).catch(() => [[]]);

      const [mentorships] = await targetDb.query(
        `SELECT m.*, s.name AS studentName, s.email AS studentEmail
         FROM mentorships m
         LEFT JOIN students s ON s.id = m.student_id
         WHERE m.faculty_id=?
         ORDER BY m.created_at DESC`,
        [faculty.id]
      ).catch(() => [[]]);

      await ensureFacultyAssignedColumn(targetDb);

      const [assignedDrives] = await targetDb.query(
        `SELECT id, company_name, job_role, event_date, due_date, location, is_active, interview_rounds, faculty_assigned
         FROM placements
         WHERE faculty_assigned = ?
         ORDER BY COALESCE(event_date, due_date) DESC, id DESC`,
        [faculty.faculty_id]
      ).catch(() => [[]]);

      const assignedDriveIds = assignedDrives.map(drive => Number(drive.id)).filter(Boolean);
      const uploadedRoundsByPlacement = {};

      if (assignedDriveIds.length) {
        const placeholders = assignedDriveIds.map(() => '?').join(',');

        const [uploadedRows] = await targetDb.query(
          `SELECT placement_id, COUNT(DISTINCT round_number) AS uploaded_rounds
           FROM placement_round_results
           WHERE placement_id IN (${placeholders})
           GROUP BY placement_id`,
          assignedDriveIds
        ).catch((err) => {
          if (err.code === 'ER_NO_SUCH_TABLE') {
            return [[]];
          }
          throw err;
        });

        uploadedRows.forEach(row => {
          uploadedRoundsByPlacement[Number(row.placement_id)] = Number(row.uploaded_rounds || 0);
        });
      }

      const assignedDrivesWithCompletionStatus = assignedDrives.map(drive => {
        const totalRounds = parseInterviewRounds(drive.interview_rounds).length;
        const uploadedRounds = uploadedRoundsByPlacement[Number(drive.id)] || 0;
        const isDriveCompleted = totalRounds > 0 && uploadedRounds >= totalRounds;

        return {
          ...drive,
          is_drive_completed: isDriveCompleted,
          total_rounds: totalRounds,
          uploaded_rounds: uploadedRounds,
          is_active: isDriveCompleted ? 0 : Number(drive.is_active || 0)
        };
      });

      const [events] = await targetDb.query(
        'SELECT * FROM faculty_events WHERE faculty_id=? ORDER BY created_at DESC',
        [faculty.id]
      ).catch(() => [[]]);

      const [resources] = await targetDb.query(
        'SELECT * FROM faculty_resources WHERE faculty_id=? ORDER BY created_at DESC',
        [faculty.id]
      ).catch(() => [[]]);

      const internshipLikeOpportunities = opportunities.filter(opportunity =>
        ['internship', 'internships'].includes(String(opportunity.type || '').toLowerCase())
      );

      const privileges = facultyPrivilegesFromRow(faculty);

      const privilegeUsage = {
        postEvents: {
          allowed: privileges.postEvents,
          usageCount: events.length,
          records: events
        },
        uploadResources: {
          allowed: privileges.uploadResources,
          usageCount: resources.length,
          records: resources
        },
        postInternships: {
          allowed: privileges.postInternships,
          usageCount: internshipLikeOpportunities.length,
          records: internshipLikeOpportunities
        },
        monitorAssignedDrives: {
          allowed: privileges.monitorAssignedDrives,
          usageCount: assignedDrivesWithCompletionStatus.length,
          records: {
            mentorships,
            assignedDrives: assignedDrivesWithCompletionStatus
          }
        }
      };

      res.json({
        success: true,
        faculty: {
          ...faculty,
          campusType,
          privileges,
          opportunities,
          blogs,
          events,
          resources,
          mentorships,
          assignedDrives: assignedDrivesWithCompletionStatus,
          privilegeUsage
        }
      });
    } catch (err) {
      console.error(err);
      res.json({ success: false, message: 'Failed to fetch faculty details' });
    }
  });

/**
 * ===========================
 * Faculty Performance Analytics
 * ===========================
 */
router.get('/faculty-performance', async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT f.id, f.name, f.department, f.email,
                (SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id) AS totalOpportunities,
                (SELECT COUNT(*) FROM faculty_blogs b WHERE b.faculty_id=f.id) AS totalBlogs,
                (SELECT COUNT(*) FROM mentorships m WHERE m.faculty_id=f.id) AS totalMentorships,
                (SELECT COUNT(*) FROM placement_participation p WHERE p.faculty_id=f.id) AS totalPlacements,
            f.created_at AS lastActive
            FROM faculty f
        `);

        const performance = results.map(f => ({
            id: f.id,
            name: f.name,
            email: f.email,
            department: f.department,
            totalContributions: f.totalOpportunities + f.totalBlogs + f.totalMentorships,
            lastActive: f.lastActive,
            rating: Math.min(100, (f.totalContributions * 10)) // example rating logic
        }));

        res.json({ success: true, performance });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Failed to fetch faculty performance' });
    }
});





// =============== Add Placement Drive ===================
router.post('/add-placement', async (req, res) => {
  try {
    const { company_name, job_role, eligibility, salary_package, location, bond, process_details, due_date, description } = req.body;

    if (!company_name || !job_role || !eligibility || !salary_package || !location || !process_details || !due_date || !description)
      return res.json({ success: false, message: 'All fields are required' });

    await db.query(`
      INSERT INTO opportunities 
      (company_name, job_role, eligibility, salary_package, location, bond, process_details, due_date, description, title, type, posted_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company_name, job_role, eligibility, salary_package, location, bond, process_details, due_date, description, job_role, 'placement', 'admin']
    );

    res.json({ success: true, message: 'Placement drive added successfully' });
  } catch (err) {
    console.error('Error adding placement drive:', err);
    res.json({ success: false, message: 'Server error while adding placement drive' });
  }
});

// =============== View All Opportunities ===================
router.get('/all-opportunities', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM opportunities WHERE posted_by='admin' ORDER BY created_at DESC`);
    res.json({ success: true, opportunities: rows });
  } catch (err) {
    console.error('Error fetching admin opportunities:', err);
    res.json({ success: false, message: 'Server error while fetching opportunities' });
  }
});

// =============== Delete Placement ===================
router.delete('/delete-placement/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM opportunities WHERE id=? AND posted_by="admin"', [id]);
    res.json({ success: true, message: 'Placement drive deleted successfully' });
  } catch (err) {
    console.error('Error deleting placement drive:', err);
    res.json({ success: false, message: 'Server error while deleting placement drive' });
  }
});

// =============== Dashboard statistics (for admin-dashboard) ===================
router.get('/dashboard-stats', async (req, res) => {
    const { campus } = req.query;
    const activeDb = (campus === 'NECG') ? db2 : db;
    try {
        // ensure students/opportunities/placement tables exist same as in all-students route
        await activeDb.query(`
          CREATE TABLE IF NOT EXISTS students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            branch VARCHAR(50),
            year VARCHAR(10),
            cgpa DECIMAL(3,2),
            phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await activeDb.query(`
          CREATE TABLE IF NOT EXISTS opportunities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company_name VARCHAR(255),
            job_role VARCHAR(255),
            type VARCHAR(50),
            eligibility TEXT,
            salary_package VARCHAR(100),
            location VARCHAR(255),
            bond VARCHAR(100),
            process_details TEXT,
            due_date DATE,
            description TEXT,
            title VARCHAR(255),
            posted_by VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await activeDb.query(`
          CREATE TABLE IF NOT EXISTS placement_participation (
            id INT AUTO_INCREMENT PRIMARY KEY,
            faculty_id INT,
            student_id INT,
            company_name VARCHAR(255),
            placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // basic counts
        const [[{ total_students }]] = await activeDb.query(`SELECT COUNT(*) as total_students FROM students`);
        const [[{ total_placements }]] = await activeDb.query(`SELECT COUNT(*) as total_placements FROM placement_participation`);
        const [[{ upcoming_drives }]] = await activeDb.query(`
          SELECT COUNT(*) as upcoming_drives
          FROM placements
          WHERE is_active = TRUE AND event_date >= CURDATE()
        `);

        // partner companies count (distinct company_name from placements table)
        const [[{ partner_companies }]] = await activeDb.query(`SELECT COUNT(DISTINCT company_name) as partner_companies FROM placements WHERE company_name IS NOT NULL AND TRIM(company_name) <> ''`);

        // placed students count (students with placement_status = 'placed')
        const [[{ placed_students }]] = await activeDb.query(`
          SELECT COUNT(*) as placed_students
          FROM students
          WHERE placement_status = 'placed'
        `);

        let placement_rate = 0;
        if (total_students > 0) {
          placement_rate = Math.round((placed_students / total_students) * 100);
        }

        res.json({
          success: true,
          stats: {
            total_students,
            total_placements,
            upcoming_drives,
            partner_companies,
            placed_students,
            placement_rate
          }
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.json({ success: false, message: 'Server error while fetching dashboard statistics' });
    }
});


// =============== Get All Students ===================
router.get('/student-companies', async (req, res) => {
  try {
    const [companies] = await db.query(`
      SELECT company_name FROM (
        SELECT DISTINCT p.company_name AS company_name
        FROM placements p
        WHERE p.company_name IS NOT NULL AND TRIM(p.company_name) <> ''
        UNION
        SELECT DISTINCT i.company_name AS company_name
        FROM internships i
        WHERE i.company_name IS NOT NULL AND TRIM(i.company_name) <> ''
      ) c
      ORDER BY company_name ASC
    `);

    res.json({
      success: true,
      companies: companies.map(row => row.company_name)
    });
  } catch (err) {
    console.error('Error fetching student company list:', err);
    res.json({ success: false, message: 'Server error while fetching companies' });
  }
});

router.get('/all-students', async (req, res) => {
  try {
    const { branch, year, status, search, minCgpa, skills, company, campusType } = req.query;

    // Determine which campus DBs to query
    // campusType = 'NECN', 'NECG', or omitted (= both)
    const campusList = campusType
      ? campusType.split(',').map(c => c.trim().toUpperCase()).filter(c => c === 'NECN' || c === 'NECG')
      : [];
    const useNECN = campusList.length === 0 || campusList.includes('NECN');
    const useNECG = campusList.length === 0 || campusList.includes('NECG');

    // Ensure required tables exist on selected DBs
    const tableStatements = [
      `CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        branch VARCHAR(50),
        year VARCHAR(10),
        cgpa DECIMAL(3,2),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS student_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        drive_id INT NOT NULL,
        drive_type ENUM('placement', 'internship') NOT NULL,
        status ENUM('applied', 'shortlisted', 'selected', 'rejected') DEFAULT 'applied',
        registered_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_reg (student_id, drive_id, drive_type)
      )`,
      `CREATE TABLE IF NOT EXISTS student_skills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        skill_name VARCHAR(100) NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_student_skill (student_id, skill_name)
      )`
    ];
    const dbsToInit = [...(useNECN ? [db] : []), ...(useNECG ? [db2] : [])];
    for (const dbInst of dbsToInit) {
      for (const sql of tableStatements) {
        await dbInst.query(sql);
      }
    }

    // Build filter WHERE clause (campus-agnostic)
    let baseWhere = ` WHERE 1=1`;
    const filterParams = [];

    if (branch) {
      baseWhere += ` AND s.branch = ?`;
      filterParams.push(branch);
    }
    if (year) {
      baseWhere += ` AND s.year = ?`;
      filterParams.push(year);
    }
    if (minCgpa) {
      baseWhere += ` AND s.cgpa >= ?`;
      filterParams.push(parseFloat(minCgpa));
    }
    if (search) {
      baseWhere += ` AND (s.name LIKE ? OR s.email LIKE ?)`;
      filterParams.push(`%${search}%`, `%${search}%`);
    }
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
      if (skillsArray.length > 0) {
        baseWhere += ` AND LOWER(sk.skill_name) IN (${skillsArray.map(() => '?').join(',')})`;
        filterParams.push(...skillsArray.map(s => s.toLowerCase()));
      }
    }
    if (company) {
      const companyList = company.split(',').map(item => item.trim()).filter(item => item.length > 0);
      if (companyList.length > 0) {
        baseWhere += ` AND EXISTS (
          SELECT 1
          FROM student_registrations sr
          LEFT JOIN placements p ON sr.drive_type = 'placement' AND p.id = sr.drive_id
          LEFT JOIN internships i ON sr.drive_type = 'internship' AND i.id = sr.drive_id
          WHERE sr.student_id = s.id
            AND LOWER(COALESCE(p.company_name, i.company_name, '')) IN (${companyList.map(() => '?').join(',')})
        )`;
        filterParams.push(...companyList.map(item => item.toLowerCase()));
      }
    }
    if (status === 'placed') {
      baseWhere += ` AND (SELECT COUNT(*) FROM student_registrations WHERE student_id = s.id AND status = 'selected') > 0`;
    } else if (status === 'unplaced') {
      baseWhere += ` AND (SELECT COUNT(*) FROM student_registrations WHERE student_id = s.id AND status = 'selected') = 0`;
    }

    const mainQuery = `
      SELECT DISTINCT
        s.id,
        s.name,
        s.email,
        s.branch,
        s.year,
        s.cgpa,
        s.phone,
        (SELECT COUNT(*) FROM student_registrations sr WHERE sr.student_id = s.id) as applications_count,
        (SELECT COUNT(*) FROM student_registrations sr WHERE sr.student_id = s.id AND sr.status = 'selected') as placements_count,
        (
          SELECT GROUP_CONCAT(DISTINCT COALESCE(p.company_name, i.company_name) ORDER BY COALESCE(p.company_name, i.company_name) SEPARATOR ', ')
          FROM student_registrations sr
          LEFT JOIN placements p ON sr.drive_type = 'placement' AND p.id = sr.drive_id
          LEFT JOIN internships i ON sr.drive_type = 'internship' AND i.id = sr.drive_id
          WHERE sr.student_id = s.id
        ) as company_names,
        GROUP_CONCAT(DISTINCT sk.skill_name SEPARATOR ', ') as skills
      FROM students s
      LEFT JOIN student_skills sk ON s.id = sk.student_id
      ${baseWhere}
      GROUP BY s.id
      ORDER BY s.id ASC`;

    const statsQuery = `
      SELECT
        COUNT(*) as total_students,
        COALESCE(SUM(CASE WHEN (SELECT COUNT(*) FROM student_registrations WHERE student_id = s.id AND status = 'selected') > 0 THEN 1 ELSE 0 END), 0) as placed_students,
        COALESCE((SELECT COUNT(DISTINCT student_id) FROM student_registrations), 0) as applied_students,
        5 as total_branches
      FROM students s`;

    // Run query on each selected DB, tag rows with campus label
    const allRows = [];
    const mergedStats = { total_students: 0, placed_students: 0, applied_students: 0, total_branches: 5 };

    async function fetchFrom(dbInst, campusLabel) {
      const [rows] = await dbInst.query(mainQuery, filterParams);
      const [statsRes] = await dbInst.query(statsQuery);
      return { rows: rows.map(r => ({ ...r, campus: campusLabel })), stats: statsRes[0] };
    }

    if (useNECN) {
      const { rows, stats } = await fetchFrom(db, 'NECN');
      allRows.push(...rows);
      mergedStats.total_students += Number(stats.total_students) || 0;
      mergedStats.placed_students += Number(stats.placed_students) || 0;
      mergedStats.applied_students += Number(stats.applied_students) || 0;
    }
    if (useNECG) {
      const { rows, stats } = await fetchFrom(db2, 'NECG');
      allRows.push(...rows);
      mergedStats.total_students += Number(stats.total_students) || 0;
      mergedStats.placed_students += Number(stats.placed_students) || 0;
      mergedStats.applied_students += Number(stats.applied_students) || 0;
    }

    // Sort merged results, then paginate in memory
    allRows.sort((a, b) => a.id - b.id);
    const total = allRows.length;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const paginated = allRows.slice(offset, offset + limit);

    const studentsWithSkills = paginated.map(student => ({
      ...student,
      skills: student.skills ? student.skills.split(', ').filter(s => s.length > 0) : []
    }));

    res.json({
      success: true,
      students: studentsWithSkills,
      stats: mergedStats,
      total,
      page,
      limit
    });
  } catch (err) {
    console.error('Error fetching students:', err);
    res.json({ success: false, message: 'Server error while fetching students' });
  }
});

async function ensureFacultyAssignedColumn(connection) {
  const [columnRows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'placements'
       AND COLUMN_NAME = 'faculty_assigned'`
  );

  if (!Number(columnRows[0]?.total)) {
    await connection.query(`ALTER TABLE placements ADD COLUMN faculty_assigned VARCHAR(20) NULL`);
    await connection.query(`ALTER TABLE placements ADD INDEX idx_faculty_assigned (faculty_assigned)`);
  }
}

// =============== List assignable placement drives for faculty ===================
router.get('/faculty-assignable-drives', async (req, res) => {
  try {
    const campusType = normalizeCampusType(req.query.campus);
    const targetDb = CAMPUS_CONNECTIONS[campusType].db;

    await ensureFacultyAssignedColumn(targetDb);

    const [drives] = await targetDb.query(
      `SELECT id, company_name, job_role, event_date, due_date, location, is_active, faculty_assigned
       FROM placements
       WHERE is_active = TRUE
         AND DATE(COALESCE(event_date, due_date, CURDATE())) >= CURDATE()
       ORDER BY COALESCE(event_date, due_date) DESC, id DESC`
    );

    res.json({ success: true, drives });
  } catch (err) {
    console.error('Error fetching faculty assignable drives:', err);
    res.json({ success: false, message: 'Failed to fetch drives' });
  }
});

// =============== Assign existing drive to faculty ===================
router.post('/assign-drive-to-faculty', async (req, res) => {
  try {
    const { facultyEmail, campusType, placementId } = req.body;

    if (!facultyEmail || !placementId) {
      return res.json({ success: false, message: 'Faculty and drive are required' });
    }

    const normalizedCampusType = normalizeCampusType(campusType);
    const targetDb = CAMPUS_CONNECTIONS[normalizedCampusType].db;

    await ensureAllFacultySchemas();
    await ensureFacultyAssignedColumn(targetDb);

    await targetDb.query(`
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

    const [facultyRows] = await targetDb.query('SELECT * FROM faculty WHERE email = ?', [facultyEmail]);
    if (!facultyRows.length) {
      return res.json({ success: false, message: 'Faculty not found' });
    }

    const faculty = facultyRows[0];
    const privileges = facultyPrivilegesFromRow(faculty);

    if (!privileges.monitorAssignedDrives) {
      return res.json({
        success: false,
        needsPrivilegeGrant: true,
        facultyName: faculty.name,
        message: 'No privilege given. Grant the privilege and then assign.'
      });
    }

    const [driveRows] = await targetDb.query(
      `SELECT id, company_name, job_role, event_date, due_date, location, faculty_assigned
       FROM placements
       WHERE id = ?
         AND is_active = TRUE
         AND DATE(COALESCE(event_date, due_date, CURDATE())) >= CURDATE()`,
      [placementId]
    );
    if (!driveRows.length) {
      return res.json({ success: false, message: 'Selected drive is not available' });
    }

    const selectedDrive = driveRows[0];
    if (selectedDrive.faculty_assigned && selectedDrive.faculty_assigned !== faculty.faculty_id) {
      return res.json({ success: false, message: 'This drive is already assigned to another faculty' });
    }

    const [result] = await targetDb.query(
      'INSERT IGNORE INTO faculty_drive_assignments (faculty_id, placement_id) VALUES (?, ?)',
      [faculty.id, placementId]
    );

    if (!result.affectedRows) {
      return res.json({ success: false, message: 'Drive is already assigned to this faculty' });
    }

    await targetDb.query(
      'UPDATE placements SET faculty_assigned = ? WHERE id = ?',
      [faculty.faculty_id, placementId]
    );

    await sendDriveAssignmentEmail(
      faculty.name,
      faculty.email,
      {
        company_name: selectedDrive.company_name,
        job_role: selectedDrive.job_role,
        event_date: selectedDrive.event_date,
        due_date: selectedDrive.due_date,
        location: selectedDrive.location
      }
    );

    res.json({ success: true, message: 'Drive assigned successfully' });
  } catch (err) {
    console.error('Error assigning drive to faculty:', err);
    res.json({ success: false, message: 'Failed to assign drive' });
  }
});

// =============== Grant monitor assigned drives privilege ===================
router.post('/grant-monitor-assigned-drives', async (req, res) => {
  try {
    const { facultyEmail, campusType } = req.body;

    if (!facultyEmail) {
      return res.json({ success: false, message: 'Faculty email is required' });
    }

    const normalizedCampusType = normalizeCampusType(campusType);
    const targetDb = CAMPUS_CONNECTIONS[normalizedCampusType].db;

    const [result] = await targetDb.query(
      'UPDATE faculty SET can_monitor_assigned_drives = 1 WHERE email = ?',
      [facultyEmail]
    );

    if (!result.affectedRows) {
      return res.json({ success: false, message: 'Faculty not found' });
    }

    res.json({ success: true, message: 'Privilege granted successfully' });
  } catch (err) {
    console.error('Error granting monitor assigned drives privilege:', err);
    res.json({ success: false, message: 'Failed to grant privilege' });
  }
});

/**
 * ===========================
 * Admin User Management
 * ===========================
 */

// Get all admins (superadmin only)
router.get('/get-all-admins', requireSuperadmin, async (req, res) => {
  try {
    const [admins] = await db.query(
      `SELECT id, name, email, phone, designation, role, can_add_faculty, can_generate_reports, can_post_opportunities, can_assign_students_opportunities, can_approve_students, created_at
       FROM admins ORDER BY created_at DESC`
    );

    res.json({ success: true, admins });
  } catch (err) {
    console.error('Error fetching admins:', err);
    res.json({ success: false, message: 'Failed to fetch admins' });
  }
});

// Update admin details (superadmin only)
router.post('/update-admin', requireSuperadmin, async (req, res) => {
  try {
    const { adminId, name, phone, designation, privileges } = req.body;

    if (!adminId || !name) {
      return res.json({ success: false, message: 'Admin ID and name are required' });
    }

    // Map privileges to columns
    const can_add_faculty = privileges && privileges.can_add_faculty ? 1 : 0;
    const can_generate_reports = privileges && privileges.can_generate_reports ? 1 : 0;
    const can_post_opportunities = privileges && privileges.can_post_opportunities ? 1 : 0;
    const can_assign_students_opportunities = privileges && privileges.can_assign_students_opportunities ? 1 : 0;
    const can_approve_students = privileges && privileges.can_approve_students ? 1 : 0;

    const [result] = await db.query(
      `UPDATE admins 
       SET name = ?, phone = ?, designation = ?, can_add_faculty = ?, can_generate_reports = ?, can_post_opportunities = ?, can_assign_students_opportunities = ?, can_approve_students = ?
       WHERE id = ?`,
      [name, phone, designation, can_add_faculty, can_generate_reports, can_post_opportunities, can_assign_students_opportunities, can_approve_students, adminId]
    );

    if (result.affectedRows === 0) {
      return res.json({ success: false, message: 'Admin not found' });
    }

    res.json({ success: true, message: 'Admin updated successfully' });
  } catch (err) {
    console.error('Error updating admin:', err);
    res.json({ success: false, message: 'Failed to update admin' });
  }
});

// Delete admin (superadmin only)
router.post('/delete-admin', requireSuperadmin, async (req, res) => {
  try {
    const { adminId } = req.body;

    if (!adminId) {
      return res.json({ success: false, message: 'Admin ID is required' });
    }

    // Check if the admin being deleted is a superadmin
    const [admins] = await db.query(
      `SELECT role FROM admins WHERE id = ?`,
      [adminId]
    );

    if (!admins || admins.length === 0) {
      return res.json({ success: false, message: 'Admin not found' });
    }

    if (admins[0].role === 'super' || admins[0].role === 'superadmin') {
      return res.json({ success: false, message: 'Superadmins cannot be deleted' });
    }

    const [result] = await db.query(
      `DELETE FROM admins WHERE id = ?`,
      [adminId]
    );

    if (result.affectedRows === 0) {
      return res.json({ success: false, message: 'Failed to delete admin' });
    }

    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (err) {
    console.error('Error deleting admin:', err);
    res.json({ success: false, message: 'Failed to delete admin' });
  }
});

/**
 * GET /api/admin/privileges/:adminId
 * Verify and return admin privileges from database
 * This endpoint ensures privileges are always checked against the database
 */
router.get('/privileges/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    const requesterId = req.user?.id;
    const requesterRole = String(req.user?.role || '').toLowerCase();

    if (!adminId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin ID is required' 
      });
    }

    if (!requesterId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized request'
      });
    }

    const isSuperRequester = requesterRole === 'super' || requesterRole === 'superadmin';
    const effectiveAdminId = isSuperRequester ? adminId : requesterId;

    if (!isSuperRequester && String(adminId) !== String(requesterId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only verify your own privileges'
      });
    }

    // Query the database for this admin's record
    // Note: Only query columns that are guaranteed to exist
    const [admins] = await db.query(
      `SELECT id, name, email, role, 
              can_add_faculty, can_generate_reports, can_post_opportunities, 
              can_assign_students_opportunities, can_approve_students, can_manage_admins
       FROM admins WHERE id = ?`,
      [effectiveAdminId]
    );

    if (!admins || admins.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin not found' 
      });
    }

    const admin = admins[0];
    
    // Build privileges object from database
    const privileges = {
      can_add_faculty: admin.can_add_faculty || 0,
      can_generate_reports: admin.can_generate_reports || 0,
      can_post_opportunities: admin.can_post_opportunities || 0,
      can_assign_students_opportunities: admin.can_assign_students_opportunities || 0,
      can_approve_students: admin.can_approve_students || 0,
      can_manage_admins: admin.can_manage_admins || 0
    };

    // If admin is superadmin/super, grant all privileges
    if (admin.role === 'super' || admin.role === 'superadmin') {
      Object.keys(privileges).forEach(key => {
        privileges[key] = 1;
      });
    }

    console.log(`✓ Privileges verified from database for admin ${effectiveAdminId}:`, privileges);

    res.json({ 
      success: true, 
      privileges: privileges,
      adminId: admin.id,
      role: admin.role,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error verifying privileges:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while verifying privileges' 
    });
  }
});

/**
 * ===========================
 * STUDENT APPROVAL MANAGEMENT
 * ===========================
 */

// Get pending students for approval
router.get('/pending-students', requireApproveStudentsPrivilege, async (req, res) => {
  try {
    const campus = req.query.campus?.toUpperCase() || 'NECN';
    const targetDb = campus === 'NECG' ? db2 : db;

    const [students] = await targetDb.query(
      'SELECT * FROM pending_students ORDER BY status, created_at DESC'
    );

    res.json({ success: true, students });
  } catch (err) {
    console.error('Error fetching pending students:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Approve student - move from pending_students to students table
router.post('/approve-student/:studentId', requireApproveStudentsPrivilege, async (req, res) => {
  const { studentId } = req.params;
  const { campus, approvedBy } = req.body;

  try {
    const targetDb = campus === 'NECG' ? db2 : db;

    // Get pending student data
    const [[pendingStudent]] = await targetDb.query(
      'SELECT * FROM pending_students WHERE id = ? AND status = "pending"',
      [studentId]
    );

    if (!pendingStudent) {
      return res.json({ success: false, message: 'Student not found or already processed' });
    }

    // Generate temporary password (8 characters easy to copy and paste)
    const tempPassword = crypto.randomBytes(6).toString('base64url');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Insert into students table
    const [result] = await targetDb.query(
      'INSERT INTO students (name, email, password, roll_no, branch, year, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        pendingStudent.name,
        pendingStudent.email,
        hashedPassword,
        pendingStudent.roll_no,
        pendingStudent.branch,
        pendingStudent.year,
        pendingStudent.phone
      ]
    );

    // Update pending_students status
    await targetDb.query(
      'UPDATE pending_students SET status = "approved", approved_at = NOW(), approved_by = ? WHERE id = ?',
      [approvedBy, studentId]
    );

    // Send welcome email with temporary password
    await sendStudentApprovalEmail(pendingStudent.name, pendingStudent.email, tempPassword);

    res.json({
      success: true,
      message: 'Student approved successfully! Welcome email sent.',
      studentId: result.insertId
    });

  } catch (err) {
    console.error('Error approving student:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.json({ success: false, message: 'Email or Roll Number already exists' });
    }
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

// Reject student - remove pending request from pending_students table
router.post('/reject-student/:studentId', requireApproveStudentsPrivilege, async (req, res) => {
  const { studentId } = req.params;
  const { reason, campus } = req.body;

  try {
    const targetDb = campus === 'NECG' ? db2 : db;

    // Fetch pending student details
    const [[pendingStudent]] = await targetDb.query(
      'SELECT * FROM pending_students WHERE id = ? AND status = "pending"',
      [studentId]
    );

    if (!pendingStudent) {
      return res.json({ success: false, message: 'Student not found or already processed' });
    }

    // Mark as rejected and keep record for 2 days before cleanup
    const [result] = await targetDb.query(
      'UPDATE pending_students SET status = "rejected", rejection_reason = ? WHERE id = ? AND status = "pending"',
      [reason || null, studentId]
    );

    if (result.affectedRows === 0) {
      return res.json({ success: false, message: 'Student not found or already processed' });
    }

    // Send rejection email
    await sendStudentRejectionEmail(pendingStudent.name, pendingStudent.email);

    // Optional: log rejection reason in audit table (if exists) or a file for admin.
    // Here we just return success and front-end can display this.

    res.json({ success: true, message: 'Student request rejected and email sent. Removed from pending queue' });

  } catch (err) {
    console.error('Error rejecting student:', err);
    res.json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;














// const express = require('express');
// const router = express.Router();
// const db = require('../db');
// const bcrypt = require('bcrypt');

// // Get all faculty with summary stats
// router.get('/faculty', async (req, res) => {
//     try {
//         const [results] = await db.query(`
//             SELECT f.*, 
//                 (SELECT COUNT(*) FROM mentorships m WHERE m.faculty_id=f.id) AS studentsMentored,
//                 (SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id AND o.type='internship') AS internships,
//                 (SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id AND o.type='hackathon') AS hackathons,
//                 (SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id AND o.type='competition') AS competitions,
//                 (SELECT COUNT(*) FROM faculty_blogs b WHERE b.faculty_id=f.id) AS blogs,
//                 (SELECT COUNT(*) FROM placement_participation p WHERE p.faculty_id=f.id) AS drivesParticipated
//             FROM faculty f
//         `);

//         const faculty = results.map(f => ({
//             id: f.id,
//             name: f.name,
//             email: f.email,
//             department: f.department,
//             inDrive: f.drivesParticipated > 0,
//             studentsMentored: f.studentsMentored,
//             opportunities: {
//                 internships: f.internships,
//                 hackathons: f.hackathons,
//                 competitions: f.competitions
//             },
//             blogs: f.blogs,
//             activenessScore: Math.round((f.internships+f.hackathons+f.competitions+f.blogs)/4*25)
//         }));

//         res.json({ success: true, faculty });
//     } catch (err) {
//         console.error(err);
//         res.json({ success: false, message: 'Server error' });
//     }
// });

// // Add new faculty
// router.post('/add-faculty', async (req, res) => {
//     try {
//         const { name, email, department, password } = req.body;
//         const hashed = await bcrypt.hash(password, 10);
//         await db.query('INSERT INTO faculty (name,email,department,password) VALUES (?,?,?,?)',
//             [name,email,department,hashed]);
//         res.json({ success: true });
//     } catch(err) {
//         console.error(err);
//         res.json({ success: false, message: 'Failed to add faculty' });
//     }
// });

// // Remove faculty
// router.delete('/remove-faculty/:email', async (req, res) => {
//     try {
//         const { email } = req.params;
//         await db.query('DELETE FROM faculty WHERE email=?', [email]);
//         res.json({ success: true });
//     } catch(err) {
//         console.error(err);
//         res.json({ success: false, message: 'Failed to remove faculty' });
//     }
// });

// // Get detailed faculty activity by ID
// router.get('/faculty/:id', async (req, res) => {
//     try {
//         const { id } = req.params;

//         const [facultyRes] = await db.query('SELECT * FROM faculty WHERE id=?', [id]);
//         if(facultyRes.length === 0) return res.json({ success: false, message: 'Faculty not found' });
//         const faculty = facultyRes[0];

//         const [opportunities] = await db.query('SELECT * FROM opportunities WHERE faculty_id=?', [id]);
//         const [blogs] = await db.query('SELECT * FROM faculty_blogs WHERE faculty_id=?', [id]);
//         const [mentorships] = await db.query(`
//             SELECT m.*, s.name AS studentName, s.email AS studentEmail
//             FROM mentorships m
//             JOIN students s ON s.id=m.student_id
//             WHERE m.faculty_id=?
//         `, [id]);
//         const [placements] = await db.query(`
//             SELECT p.*, s.name AS studentName
//             FROM placement_participation p
//             JOIN students s ON s.id=p.student_id
//             WHERE p.faculty_id=?
//         `, [id]);

//         res.json({ success:true, faculty, opportunities, blogs, mentorships, placements });
//     } catch(err) {
//         console.error(err);
//         res.json({ success:false, message:'Server error' });
//     }
// });

// // Get faculty by email with all activity
// router.get('/faculty-email/:email', async (req, res) => {
//     try {
//         const { email } = req.params;
//         const [facultyRes] = await db.query('SELECT * FROM faculty WHERE email=?', [email]);
//         if(facultyRes.length === 0) return res.json({ success:false, message:'Faculty not found' });
//         const faculty = facultyRes[0];

//         const [opportunities] = await db.query('SELECT * FROM opportunities WHERE faculty_id=?', [faculty.id]);
//         const [blogs] = await db.query('SELECT * FROM faculty_blogs WHERE faculty_id=?', [faculty.id]);
//         const [mentorships] = await db.query(`
//             SELECT m.*, s.name AS studentName, s.email AS studentEmail
//             FROM mentorships m
//             JOIN students s ON s.id=m.student_id
//             WHERE m.faculty_id=?
//         `, [faculty.id]);
//         const [placements] = await db.query(`
//             SELECT p.*, s.name AS studentName
//             FROM placement_participation p
//             JOIN students s ON s.id=p.student_id
//             WHERE p.faculty_id=?
//         `, [faculty.id]);

//         res.json({ success:true, faculty, opportunities, blogs, mentorships, placements });

//     } catch(err) {
//         console.error(err);
//         res.json({ success:false, message:'Server error' });
//     }
// });

// // Add opportunity for a faculty
// // router.post('/add-opportunity', async (req, res) => {
// //     try {
// //         const { facultyEmail, title, type, description } = req.body;

// //         const [facultyRes] = await db.query('SELECT * FROM faculty WHERE email=?', [facultyEmail]);
// //         if(facultyRes.length === 0) return res.json({ success:false, message:'Faculty not found' });

// //         await db.query('INSERT INTO opportunities (faculty_id,title,type,description) VALUES (?,?,?,?)', 
// //             [facultyRes[0].id, title, type, description]);

// //         res.json({ success:true });
// //     } catch(err){
// //         console.error(err);
// //         res.json({ success:false, message:'Failed to add opportunity' });
// //     }
// // });

// // // Add opportunity assigned to faculty
// // router.post('/add-opportunity', async (req,res)=>{
// //     try{
// //         const { facultyEmail, title, type, description } = req.body;
// //         if(!['internship','hackathon','competition'].includes(type)){
// //             return res.json({ success:false, message:'Invalid opportunity type' });
// //         }

// //         // Get faculty id by email
// //         const [facultyRes] = await db.query('SELECT id FROM faculty WHERE email=?', [facultyEmail]);
// //         if(facultyRes.length===0) return res.json({ success:false, message:'Faculty not found' });

// //         const facultyId = facultyRes[0].id;

// //         await db.query('INSERT INTO opportunities (faculty_id,title,type,description) VALUES (?,?,?,?)',
// //             [facultyId,title,type,description]);
// //         res.json({ success:true });
// //     } catch(err){
// //         console.error(err);
// //         res.json({ success:false, message:'Server error' });
// //     }
// // });

// // Add opportunity (faculty limited)
// router.post('/add-opportunity', async (req, res) => {
//   try {
//     const { facultyEmail, title, type, description } = req.body;

//     // Validation
//     if (!facultyEmail || !title || !type || !description) {
//       return res.json({ success: false, message: 'Missing required fields' });
//     }

//     // Restrict type
//     const allowedTypes = ['internship', 'hackathon', 'competition'];
//     if (!allowedTypes.includes(type.toLowerCase())) {
//       return res.json({
//         success: false,
//         message: 'Faculty can only post internship, hackathon, or competition',
//       });
//     }

//     // Find faculty ID
//     const [facultyRes] = await db.query('SELECT id FROM faculty WHERE email=?', [facultyEmail]);
//     if (facultyRes.length === 0) {
//       return res.json({ success: false, message: 'Faculty not found' });
//     }
//     const facultyId = facultyRes[0].id;

//     // Insert into opportunities
//     await db.query(
//       `INSERT INTO opportunities (faculty_id, title, type, description)
//        VALUES (?, ?, ?, ?)`,
//       [facultyId, title, type, description]
//     );

//     res.json({ success: true, message: 'Opportunity added successfully' });
//   } catch (err) {
//     console.error('Error adding opportunity:', err);
//     res.json({ success: false, message: 'Server error while posting opportunity' });
//   }
// });

// // View all opportunities by a specific faculty
// router.get('/view-opportunities/:facultyEmail', async (req, res) => {
//   try {
//     const { facultyEmail } = req.params;

//     const [facultyRes] = await db.query('SELECT id FROM faculty WHERE email=?', [facultyEmail]);
//     if (facultyRes.length === 0) {
//       return res.json({ success: false, message: 'Faculty not found' });
//     }

//     const facultyId = facultyRes[0].id;
//     const [rows] = await db.query(
//       'SELECT * FROM opportunities WHERE faculty_id=? ORDER BY created_at DESC',
//       [facultyId]
//     );

//     res.json({ success: true, opportunities: rows });
//   } catch (err) {
//     console.error('Error fetching opportunities:', err);
//     res.json({ success: false, message: 'Server error while fetching opportunities' });
//   }
// });

// // View all opportunities (public view)
// router.get('/all-opportunities', async (req, res) => {
//   try {
//     const [rows] = await db.query(`
//       SELECT o.id, o.title, o.type, o.description, o.created_at, f.name AS faculty_name
//       FROM opportunities o
//       JOIN faculty f ON o.faculty_id = f.id
//       ORDER BY o.created_at DESC
//     `);
//     res.json({ success: true, opportunities: rows });
//   } catch (err) {
//     console.error('Error fetching all opportunities:', err);
//     res.json({ success: false, message: 'Server error while fetching opportunities' });
//   }
// });


// // Update opportunity (faculty only)
// router.put('/update-opportunity/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { facultyEmail, title, type, description } = req.body;

//     if (!facultyEmail || !title || !type || !description) {
//       return res.json({ success: false, message: 'Missing required fields' });
//     }

//     // Get faculty ID
//     const [facultyRes] = await db.query('SELECT id FROM faculty WHERE email=?', [facultyEmail]);
//     if (facultyRes.length === 0) {
//       return res.json({ success: false, message: 'Faculty not found' });
//     }
//     const facultyId = facultyRes[0].id;

//     // Update only if it belongs to the faculty
//     const [result] = await db.query(
//       `UPDATE opportunities 
//        SET title=?, type=?, description=? 
//        WHERE id=? AND faculty_id=?`,
//       [title, type, description, id, facultyId]
//     );

//     if (result.affectedRows === 0) {
//       return res.json({ success: false, message: 'No such opportunity or unauthorized update' });
//     }

//     res.json({ success: true, message: 'Opportunity updated successfully' });
//   } catch (err) {
//     console.error('Error updating opportunity:', err);
//     res.json({ success: false, message: 'Server error while updating opportunity' });
//   }
// });


// // Delete opportunity (faculty or admin)
// router.delete('/delete-opportunity/:id', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { facultyEmail, role } = req.body; // role can be 'faculty' or 'admin'

//     // Admin can delete directly
//     if (role === 'admin') {
//       await db.query('DELETE FROM opportunities WHERE id=?', [id]);
//       return res.json({ success: true, message: 'Opportunity deleted by admin' });
//     }

//     // Otherwise, check ownership
//     const [facultyRes] = await db.query('SELECT id FROM faculty WHERE email=?', [facultyEmail]);
//     if (facultyRes.length === 0) {
//       return res.json({ success: false, message: 'Faculty not found' });
//     }
//     const facultyId = facultyRes[0].id;

//     const [result] = await db.query('DELETE FROM opportunities WHERE id=? AND faculty_id=?', [
//       id,
//       facultyId,
//     ]);

//     if (result.affectedRows === 0) {
//       return res.json({ success: false, message: 'No such opportunity or unauthorized delete' });
//     }

//     res.json({ success: true, message: 'Opportunity deleted successfully' });
//   } catch (err) {
//     console.error('Error deleting opportunity:', err);
//     res.json({ success: false, message: 'Server error while deleting opportunity' });
//   }
// });


// // Faculty performance analytics for admin dashboard
// router.get('/faculty-performance', async (req, res) => {
//     try {
//         const [results] = await db.query(`
//             SELECT f.id, f.name, f.department, f.email,
//                 (SELECT COUNT(*) FROM opportunities o WHERE o.faculty_id=f.id) AS totalOpportunities,
//                 (SELECT COUNT(*) FROM faculty_blogs b WHERE b.faculty_id=f.id) AS totalBlogs,
//                 (SELECT COUNT(*) FROM mentorships m WHERE m.faculty_id=f.id) AS totalMentorships,
//                 (SELECT COUNT(*) FROM placement_participation p WHERE p.faculty_id=f.id) AS totalPlacements,
//                 COALESCE(f.last_active, f.created_at) AS lastActive
//             FROM faculty f
//         `);

//         const performance = results.map(f => ({
//             id: f.id,
//             name: f.name,
//             email: f.email,
//             department: f.department,
//             totalContributions: f.totalOpportunities + f.totalBlogs + f.totalMentorships,
//             lastActive: f.lastActive,
//             rating: Math.min(100, (f.totalContributions * 10)) // example rating logic
//         }));

//         res.json({ success: true, performance });
//     } catch (err) {
//         console.error(err);
//         res.json({ success: false, message: 'Failed to fetch faculty performance' });
//     }
// });


// router.patch('/toggle-faculty/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         await db.query('UPDATE faculty SET is_active = NOT is_active WHERE id=?', [id]);
//         res.json({ success: true, message: 'Faculty status updated' });
//     } catch (err) {
//         console.error(err);
//         res.json({ success: false, message: 'Failed to toggle status' });
//     }
// });


// // Update faculty details
// router.patch('/update-faculty', async (req, res) => {
//     try {
//         const { email, name, department } = req.body;
//         if (!email || !name || !department) {
//             return res.json({ success: false, message: 'Missing required fields' });
//         }

//         const [result] = await db.query(
//             'UPDATE faculty SET name=?, department=? WHERE email=?',
//             [name, department, email]
//         );

//         if (result.affectedRows === 0) {
//             return res.json({ success: false, message: 'No such faculty found' });
//         }

//         res.json({ success: true, message: 'Faculty updated successfully' });
//     } catch (err) {
//         console.error(err);
//         res.json({ success: false, message: 'Server error while updating faculty' });
//     }
// });


// =============== ADMIN REPORTS API ===================
// Fetch reports data for both NECN and NECG separately

router.get('/reports', async (req, res) => {
  try {
    const { campus } = req.query;
    
    // Use appropriate database based on campus selection
    const activeDb = (campus === 'NECG') ? db2 : db;
    const campusName = (campus === 'NECG') ? 'NECG' : 'NECN';
    
    // Total Placement Drives Conducted
    const [[drives_result]] = await activeDb.query(`
      SELECT COUNT(*) as total_drives FROM placements WHERE is_active = TRUE
    `);
    const total_drives = drives_result?.total_drives || 0;
    
    // Total Students Successfully Placed (from students table placement_status)
    const [[placed_result]] = await activeDb.query(`
      SELECT COUNT(*) as placed_students
      FROM students
      WHERE placement_status = 'placed'
    `);
    const placed_students = placed_result?.placed_students || 0;
    
    // Total Participants (total students in system)
    const [[participants_result]] = await activeDb.query(`
      SELECT COUNT(*) as total_participants
      FROM students
    `);
    const total_participants = participants_result?.total_participants || 0;
    
    // Average Package (from placements table) - handles multiple formats
    const [avg_pkg_result] = await activeDb.query(`
      SELECT 
        AVG(
          CAST(
            CASE 
              -- Handle "5.5L" or "5.5 L" format
              WHEN salary_package LIKE '%L' OR salary_package LIKE '%l' 
                THEN REPLACE(REPLACE(REPLACE(salary_package, 'L', ''), 'l', ''), ' ', '')
              -- Handle comma-separated numbers (e.g., "3,50,000") - convert to lakhs
              WHEN salary_package LIKE '%,%' 
                THEN CAST(REPLACE(salary_package, ',', '') AS DECIMAL(10,2)) / 100000
              -- Handle plain numbers
              ELSE salary_package
            END
          AS DECIMAL(10,2))
        ) as avg_package
      FROM placements
      WHERE salary_package IS NOT NULL AND salary_package != '' AND salary_package != '0'
    `);
    let avg_package = avg_pkg_result[0]?.avg_package || 0;
    avg_package = Number(avg_package).toFixed(2);
    
    // Placement Success Rate
    let placement_rate = 0;
    if (total_participants > 0) {
      placement_rate = Math.round((placed_students / total_participants) * 100);
    }
    
    // Fetch Recent Placement Statistics (Table Data)
    const [placements_data] = await activeDb.query(`
      SELECT 
        p.id,
        p.company_name,
        p.job_role,
        p.salary_package,
        COALESCE(COUNT(DISTINCT sr.student_id), 0) as participants,
        COALESCE(COUNT(DISTINCT CASE WHEN sr.status = 'selected' THEN sr.student_id END), 0) as selected,
        CASE 
          WHEN COALESCE(COUNT(DISTINCT sr.student_id), 0) > 0 
            THEN ROUND(COUNT(DISTINCT CASE WHEN sr.status = 'selected' THEN sr.student_id END) / COUNT(DISTINCT sr.student_id) * 100, 0)
          ELSE 0
        END as success_rate,
        p.event_date,
        CASE 
          WHEN p.event_date IS NULL THEN 'Scheduled'
          WHEN p.event_date < NOW() THEN 'Completed'
          WHEN p.event_date <= DATE_ADD(NOW(), INTERVAL 7 DAY) THEN 'Upcoming'
          ELSE 'Scheduled'
        END as status
      FROM placements p
      LEFT JOIN student_registrations sr ON p.id = sr.drive_id AND sr.drive_type = 'placement'
      WHERE p.is_active = TRUE
      GROUP BY p.id, p.company_name, p.job_role, p.salary_package, p.event_date
      ORDER BY p.event_date DESC
      LIMIT 20
    `);
    
    // Fetch Company-wise Statistics
    const [company_stats] = await activeDb.query(`
      SELECT 
        p.company_name,
        COUNT(DISTINCT p.id) as total_drives,
        COUNT(DISTINCT sr.student_id) as total_participants,
        COUNT(DISTINCT CASE WHEN sr.status = 'selected' THEN sr.student_id END) as total_selected,
        p.salary_package
      FROM placements p
      LEFT JOIN student_registrations sr ON p.id = sr.drive_id AND sr.drive_type = 'placement'
      WHERE p.is_active = TRUE
      GROUP BY p.company_name, p.salary_package
      ORDER BY total_selected DESC
      LIMIT 10
    `);
    
    // Fetch Student Branch-wise Distribution
    const [branch_stats] = await activeDb.query(`
      SELECT 
        s.branch,
        COUNT(s.id) as total_students,
        SUM(CASE WHEN s.placement_status = 'placed' THEN 1 ELSE 0 END) as placed_count,
        ROUND(SUM(CASE WHEN s.placement_status = 'placed' THEN 1 ELSE 0 END) / NULLIF(COUNT(s.id), 0) * 100, 1) as placement_rate
      FROM students s
      GROUP BY s.branch
      ORDER BY placement_rate DESC
    `);
    
    res.json({
      success: true,
      campus: campusName,
      statistics: {
        total_drives: total_drives || 0,
        placed_students: placed_students || 0,
        total_participants: total_participants || 0,
        avg_package: avg_package || '0',
        placement_rate: placement_rate || 0
      },
      placements: placements_data || [],
      company_stats: company_stats || [],
      branch_stats: branch_stats || []
    });
    
  } catch (err) {
    console.error('Error fetching reports data:', err);
    res.json({ 
      success: false, 
      message: 'Server error while fetching reports data',
      error: err.message 
    });
  }
});


// module.exports = router;
