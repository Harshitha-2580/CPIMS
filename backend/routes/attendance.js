const express = require('express');
const router = express.Router();
const db = require('../db');
const QRCode = require('qrcode');

// Generate QR code for student attendance
router.get('/qr/:studentId/:opportunityId', async (req, res) => {
    try {
        const { studentId, opportunityId } = req.params;

        // Verify student exists
        const [studentRows] = await db.execute(
            'SELECT id, name FROM students WHERE id = ?',
            [studentId]
        );

        if (studentRows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Check if the student is registered and the drive is ongoing through student_registrations
        const [placementRegRows] = await db.execute(
            `SELECT p.id, p.company_name AS title, p.company_name, 'placement' AS type, p.due_date, p.is_active AS status
             FROM student_registrations sr
             JOIN placements p ON sr.drive_id = p.id AND sr.drive_type = 'placement'
             WHERE sr.student_id = ?
               AND sr.drive_id = ?
               AND p.is_active = 1
               AND (p.due_date IS NULL OR DATE(p.due_date) >= CURDATE())`,
            [studentId, opportunityId]
        );

        const sourceRow = placementRegRows[0];

        if (!sourceRow) {
            return res.status(403).json({ error: 'Drive not registered or not ongoing' });
        }

        const opportunityInfo = {
            id: sourceRow.id,
            title: sourceRow.title || sourceRow.company_name || 'Placement Drive',
            company_name: sourceRow.company_name,
            type: sourceRow.type || 'placement',
            due_date: sourceRow.due_date || null,
            status: sourceRow.status
        };

        const qrData = JSON.stringify({
            studentId: parseInt(studentId),
            opportunityId: parseInt(opportunityId),
            timestamp: new Date().toISOString(),
            type: 'attendance'
        });

        // Generate QR code as data URL
        const qrCodeDataURL = await QRCode.toDataURL(qrData);

        res.json({
            qrCode: qrCodeDataURL,
            student: studentRows[0],
            opportunity: opportunityInfo
        });

    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Generate QR code for a selected drive (admin display)
router.get('/drive-qr/:opportunityId', async (req, res) => {
    try {
        const { opportunityId } = req.params;

        if (!opportunityId) {
            return res.status(400).json({ error: 'Opportunity ID is required' });
        }

        const [placements] = await db.execute(
            `SELECT id, company_name, job_role, event_date
             FROM placements
             WHERE id = ?`,
            [opportunityId]
        );

        if (!placements || placements.length === 0) {
            return res.status(404).json({ error: 'Drive not found' });
        }

        const drive = placements[0];
        // Compact payload improves scan reliability on low-res mobile cameras.
        const qrData = `ATT|${parseInt(opportunityId, 10)}|${Date.now()}`;

        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: 420,
            margin: 2,
            errorCorrectionLevel: 'L'
        });

        res.json({
            success: true,
            qrCode: qrCodeDataURL,
            drive: {
                id: drive.id,
                company_name: drive.company_name,
                job_role: drive.job_role,
                drive_date: drive.event_date
            }
        });
    } catch (error) {
        console.error('Error generating drive QR code:', error);
        res.status(500).json({ error: 'Failed to generate drive QR code' });
    }
});

// Mark attendance when QR code is scanned
router.post('/scan', async (req, res) => {
    try {
        const { qrData } = req.body;

        if (!qrData) {
            return res.status(400).json({ error: 'QR data is required' });
        }

        let parsedData;
        try {
            parsedData = JSON.parse(qrData);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid QR code data' });
        }

        const { opportunityId, timestamp, type } = parsedData;
        const studentId = req.body.studentId || parsedData.studentId;
        const overrideOpportunityId = req.body.opportunityId;

        if (type !== 'attendance') {
            return res.status(400).json({ error: 'Invalid QR code type' });
        }

        if (!studentId) {
            return res.status(400).json({ error: 'Student ID is required' });
        }

        // Require selected drive (from UI) matches QR payload drive
        if (overrideOpportunityId && parseInt(overrideOpportunityId, 10) !== parseInt(opportunityId, 10)) {
            return res.status(400).json({ error: 'Selected drive does not match scanned QR drive' });
        }

        // Check if QR code is not too old (within 24 hours)
        const qrTime = new Date(timestamp);
        const now = new Date();
        const hoursDiff = (now - qrTime) / (1000 * 60 * 60);

        if (hoursDiff > 24) {
            return res.status(400).json({ error: 'QR code has expired' });
        }

        // Check if attendance already exists
        const [existingAttendance] = await db.execute(
            'SELECT id FROM attendance WHERE student_id = ? AND opportunity_id = ?',
            [studentId, opportunityId]
        );

        if (existingAttendance.length > 0) {
            return res.status(409).json({ error: 'Attendance already marked for this student and opportunity' });
        }

        // Insert attendance record
        const [result] = await db.execute(
            'INSERT INTO attendance (student_id, opportunity_id, scanned_at) VALUES (?, ?, NOW())',
            [studentId, opportunityId]
        );

        // Get student and placement details for response
        const [studentRows] = await db.execute(
            'SELECT name, roll_no FROM students WHERE id = ?',
            [studentId]
        );

        const [placementRows] = await db.execute(
            'SELECT id, company_name, job_role FROM placements WHERE id = ?',
            [opportunityId]
        );

        res.json({
            success: true,
            message: 'Attendance marked successfully',
            attendance: {
                id: result.insertId,
                student: studentRows[0],
                opportunity: placementRows[0] || null,
                scannedAt: new Date()
            }
        });

    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
});

// Get attendance records for an opportunity (admin view)
router.get('/opportunity/:opportunityId', async (req, res) => {
    try {
        const { opportunityId } = req.params;

        const [attendanceRows] = await db.execute(`
            SELECT
                a.id,
                a.scanned_at,
                a.status,
                s.name as student_name,
                s.roll_no,
                s.branch,
                s.year,
                CASE
                    WHEN DATABASE() = 'placement_portal3' THEN 'NECG'
                    ELSE 'NECN'
                END AS campus_type
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            LEFT JOIN placements p ON a.opportunity_id = p.id
            WHERE a.opportunity_id = ?
            ORDER BY a.scanned_at DESC
        `, [opportunityId]);

        res.json({
            attendance: attendanceRows,
            total: attendanceRows.length
        });

    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
});

// Export attendance records for an opportunity as CSV
router.get('/opportunity/:opportunityId/export', async (req, res) => {
    try {
        const { opportunityId } = req.params;

        const [attendanceRows] = await db.execute(`
            SELECT
                a.id,
                a.scanned_at,
                a.status,
                s.name AS student_name,
                s.roll_no,
                s.branch,
                s.year,
                CASE
                    WHEN DATABASE() = 'placement_portal3' THEN 'NECG'
                    ELSE 'NECN'
                END AS campus_type,
                p.id AS opportunity_id,
                COALESCE(p.job_role, p.company_name, 'Placement Drive') AS opportunity_title,
                p.company_name
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN placements p ON a.opportunity_id = p.id
            WHERE a.opportunity_id = ?
            ORDER BY a.scanned_at DESC
        `, [opportunityId]);

        const csvHeader = 'Sr No,Student Name,Roll No,Branch,Year,Campus,Status,Scanned At,Opportunity Title,Company Name\n';
        const csvRows = attendanceRows.map((row, idx) => {
            const safe = (value) => String(value || '').replace(/\"/g, '\"\"');
            return `${idx + 1},"${safe(row.student_name)}","${safe(row.roll_no)}","${safe(row.branch)}","${safe(row.year)}","${safe(row.campus_type || 'NECN')}","${safe(row.status)}","${new Date(row.scanned_at).toISOString()}","${safe(row.opportunity_title)}","${safe(row.company_name)}"`;
        });

        const csv = csvHeader + csvRows.join('\n');

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', `attachment; filename="attendance_opportunity_${opportunityId}.csv"`);
        res.send(csv);

    } catch (error) {
        console.error('Error exporting attendance csv:', error);
        res.status(500).json({ error: 'Failed to export attendance CSV' });
    }
});

// Get student's attendance history
router.get('/student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;

        const [attendanceRows] = await db.execute(`
            SELECT
                a.id,
                a.scanned_at,
                a.status,
                a.opportunity_id,
                COALESCE(p.job_role, p.company_name, 'Placement Drive') as opportunity_title,
                p.company_name,
                'placement' as type
            FROM attendance a
            JOIN placements p ON a.opportunity_id = p.id
            WHERE a.student_id = ?
            ORDER BY a.scanned_at DESC
        `, [studentId]);

        res.json({
            attendance: attendanceRows,
            total: attendanceRows.length
        });

    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance history' });
    }
});

module.exports = router;