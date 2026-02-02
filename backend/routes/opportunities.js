const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * ===========================
 * PLACEMENTS ROUTES
 * ===========================
 */

// Create new placement
router.post('/placements/create', async (req, res) => {
    try {
        const { company_name, job_role, salary_package, eligible_branches, eligible_years, min_cgpa, due_date, description, apply_link } = req.body;

        // Validate required fields
        if (!company_name || !job_role || !salary_package || !eligible_branches || !eligible_years || !due_date || !apply_link) {
            return res.json({ success: false, message: 'All required fields must be provided' });
        }

        const query = `
            INSERT INTO placements (company_name, job_role, salary_package, eligible_branches, eligible_years, min_cgpa, due_date, description, apply_link, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `;

        const values = [
            company_name,
            job_role,
            salary_package,
            eligible_branches,
            eligible_years,
            min_cgpa || null,
            due_date,
            description || null,
            apply_link
        ];

        const [result] = await db.query(query, values);

        res.json({
            success: true,
            message: 'Placement drive created successfully',
            placementId: result.insertId
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
        const { company_name, role, internship_type, stipend, duration, eligible_branches, eligible_years, min_cgpa, due_date, description, apply_link } = req.body;

        // Validate required fields
        if (!company_name || !role || !internship_type || !duration || !eligible_branches || !eligible_years || !due_date || !apply_link) {
            return res.json({ success: false, message: 'All required fields must be provided' });
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

        const [result] = await db.query(query, values);

        res.json({
            success: true,
            message: 'Internship created successfully',
            internshipId: result.insertId
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
            ORDER BY due_date ASC
        `;

        const values = [];

        // If branch provided, filter by eligible branches
        if (branch) {
            query = `
                SELECT * FROM placements 
                WHERE is_active = TRUE
                AND (eligible_branches = 'All' OR FIND_IN_SET(?, eligible_branches))
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
            ORDER BY due_date ASC
        `;

        const values = [];

        // If branch provided, filter by eligible branches
        if (branch) {
            query = `
                SELECT * FROM internships 
                WHERE is_active = TRUE
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
    // Fetch placements
    const [placements] = await db.query(`
      SELECT *, 'placement' as type FROM placements 
      WHERE is_active = TRUE
      ORDER BY created_at DESC
    `);

    // Fetch internships
    const [internships] = await db.query(`
      SELECT *, 'internship' as type FROM internships 
      WHERE is_active = TRUE
      ORDER BY created_at DESC
    `);

    // Combine and sort by created_at
    const allOpportunities = [...placements, ...internships].sort((a, b) => 
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
    const { studentId } = req.params;

    // Get internship assignments
    const [internships] = await db.query(`
      SELECT id, 'internship' as type, company_name, job_role, internship_type, stipend, duration, due_date, description, apply_link
      FROM assignments_internships
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, [studentId]);

    // Get placement/drive assignments
    const [drives] = await db.query(`
      SELECT id, 'placement' as type, company_name, job_role, salary_package, due_date, description, apply_link
      FROM assignments_drives
      WHERE student_id = ?
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
    const { type, company_name, job_role, due_date, studentIds, stipend, duration, description, salary_package, apply_link } = req.body;

    // Validate required fields
    if (!type || !company_name || !job_role || !due_date || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.json({ success: false, message: 'Missing required fields' });
    }

    // Assign to students in respective assignment tables
    let successCount = 0;
    let errorMessages = [];

    if (type === 'internship') {
      // For internships: determine type based on stipend
      const internshipType = stipend ? 'paid' : 'unpaid';
      
      for (const studentId of studentIds) {
        try {
          const studentIdStr = studentId.trim().toString();
          
          // Create assignment record directly with all internship details
          await db.query(`
            INSERT INTO assignments_internships 
            (student_id, company_name, job_role, internship_type, stipend, duration, due_date, description, apply_link)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [studentIdStr, company_name, job_role, internshipType, stipend || null, duration || null, due_date, description || null, apply_link || null]);
          successCount++;
        } catch (err) {
          errorMessages.push(`${studentId}: ${err.message}`);
        }
      }
    } else if (type === 'placement') {
      for (const studentId of studentIds) {
        try {
          const studentIdStr = studentId.trim().toString();
          
          // Create assignment record directly with all placement details
          await db.query(`
            INSERT INTO assignments_drives 
            (student_id, company_name, job_role, salary_package, due_date, description, apply_link)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [studentIdStr, company_name, job_role, salary_package || null, due_date, description || null, apply_link || null]);
          successCount++;
        } catch (err) {
          errorMessages.push(`${studentId}: ${err.message}`);
        }
      }
    } else {
      return res.json({ success: false, message: 'Invalid opportunity type' });
    }

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

module.exports = router;
