const express = require('express');
const router = express.Router();
const db = require('../db');
const db2 = require('../db2');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const { createToken } = require('../middleware/auth');
const { sendOtpEmail, verifyOTP } = require('../otpAuth');


// =========================
// LOGIN + OTP GENERATION
// =========================
router.post('/login', async (req, res) => {

  const { email, password, role, college } = req.body;

  try {

    let table;
    let connection = db; // default to db (placement_portal2)

    if(role === 'student') table = 'students';
    else if(role === 'faculty') table = 'faculty';
    else if(role === 'admin') table = 'admins';
    else return res.json({ success:false, message:'Invalid role' });

    // Determine database based on college selection
    if (college === 'necg') {
      connection = db2; // placement_portal3
    } else {
      connection = db; // placement_portal2 (default for necn)
    }

    const [results] = await connection.query(`SELECT * FROM ${table} WHERE email = ?`, [email]);

    console.log('Login attempt:', { email, role, college });

    if (!results || results.length === 0) {
      return res.json({ success:false, message:`${role} not found` });
    }

    const user = results[0];

    console.log('Stored password from DB:', user.password);
    console.log('Incoming password length:', password.length);

    const match = await bcrypt.compare(password, user.password);

    console.log('bcrypt.compare result:', match);

    if (!match) {
      return res.json({ success:false, message:'Incorrect password' });
    }

    // Use the actual role from DB for admins (could be 'admin', 'superadmin', 'super')
    let actualRole = role;
    if (role === 'admin' && user.role) {
        actualRole = user.role;
    }

    const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: actualRole
    };

    if (actualRole === 'student') {
        // For students, include extra info and OTP flow
        userData.branch = user.branch;
        userData.year = user.year;
    }

    if (['admin', 'superadmin', 'super'].includes(actualRole)) {
        // For admins, skip OTP and log in directly
        userData.can_add_faculty = user.can_add_faculty || 0;
        userData.can_generate_reports = user.can_generate_reports || 0;
        userData.can_post_opportunities = user.can_post_opportunities || 0;
        userData.can_assign_students_opportunities = user.can_assign_students_opportunities || 0;
        userData.can_edit_public_pages = user.can_edit_public_pages || 0;
        userData.can_manage_admins = user.can_manage_admins || 0;

        const token = createToken({
            id: user.id,
            email: user.email,
            role: actualRole,
            college
        });

        return res.json({
            success:true,
            message:'Login successful',
            token,
            user: userData
        });
    }

    // For non-admin roles (student/faculty), continue OTP workflow
    const otpSent = await sendOtpEmail(user.name, user.email);
    if (!otpSent) {
      console.warn('OTP delivery failed, allowing fallback login for:', user.email);
      return res.json({
        success:true,
        message:'Login successful (OTP email unavailable)',
        user:userData,
        otpRequired:false
      });
    }

    console.log('OTP sent to:', user.email);

    res.json({
      success:true,
      message:'OTP sent to email',
      user:userData,
      otpRequired:true
    });

  } catch(err){

    console.error("Login error:", err);

    res.json({
      success:false,
      message:"Server error"
    });

  }

});


// =========================
// VERIFY OTP
// =========================
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.json({ success: false, message: 'Email and OTP are required' });
        }

        const valid = verifyOTP(email, otp);
        if (!valid) {
            return res.json({ success: false, message: 'Invalid or expired OTP' });
        }

        // Determine student record and college for token payload
        let student = null;
        let college = 'necn';

        const [necnResults] = await db.query(
            'SELECT id, name, email, branch, year FROM students WHERE email = ?',
            [email]
        );

        if (necnResults && necnResults.length > 0) {
            student = necnResults[0];
            college = 'necn';
        } else {
            const [necgResults] = await db2.query(
                'SELECT id, name, email, branch, year FROM students WHERE email = ?',
                [email]
            );
            if (necgResults && necgResults.length > 0) {
                student = necgResults[0];
                college = 'necg';
            }
        }

        if (!student) {
            return res.json({ success: false, message: 'Student record not found after OTP verification' });
        }

        const token = createToken({
            id: student.id,
            email: student.email,
            role: 'student',
            college
        });

        res.json({
            success: true,
            message: 'OTP verified successfully',
            token,
            user: {
                id: student.id,
                name: student.name,
                email: student.email,
                branch: student.branch,
                year: student.year,
                role: 'student',
                college
            }
        });
    } catch (err) {
        console.error('OTP verify error:', err);
        res.json({ success: false, message: 'Server error while verifying OTP' });
    }
});
// =========================
// RESEND OTP
// =========================
router.post('/resend-otp', async (req, res) => {

    const { email, role, college } = req.body;

    try {

        let table;
        let connection = db; // default

        if(role === 'student') table = 'students';
        else if(role === 'faculty') table = 'faculty';
        else if(role === 'admin') table = 'admins';
        else return res.json({ success:false, message:'Invalid role' });

        // Determine database based on college selection
        if (college === 'necg') {
            connection = db2; // placement_portal3
        } else {
            connection = db; // placement_portal2 (default for necn)
        }

        const [results] = await connection.query(
            `SELECT name,email FROM ${table} WHERE email=?`,
            [email]
        );

        if(!results || results.length === 0){
            return res.json({
                success:false,
                message:"User not found"
            });
        }

        const user = results[0];

        await sendOtpEmail(user.name, user.email);

        res.json({
            success:true,
            message:"OTP resent successfully"
        });

    } catch(err){

        console.error("Resend OTP error:", err);

        res.json({
            success:false,
            message:"Server error"
        });

    }

});


// =========================
// FORGOT PASSWORD
// =========================
router.post('/forgot-password', async (req, res) => {

    const { email, role } = req.body;

    try {

        let table;
        let connection = db; // default to db (placement_portal2)

        if(role === 'student') table = 'students';
        else if(role === 'faculty') table = 'faculty';
        else if(role === 'admin') table = 'admins';
        else return res.json({ success:false, message:'Invalid role' });

        let results;
        let userConnection = db; // default

        if (role === 'student') {
            // For students, check both databases since we don't know which campus they're from
            const [necnResults] = await db.query(
                `SELECT id, name FROM ${table} WHERE email = ?`,
                [email]
            );

            if (necnResults && necnResults.length > 0) {
                results = necnResults;
                userConnection = db;
            } else {
                const [necgResults] = await db2.query(
                    `SELECT id, name FROM ${table} WHERE email = ?`,
                    [email]
                );
                results = necgResults;
                userConnection = db2;
            }
        } else {
            // For faculty and admins, use default database for now
            [results] = await connection.query(
                `SELECT id, name FROM ${table} WHERE email = ?`,
                [email]
            );
        }

        if(!results || results.length === 0){

            return res.json({
                success:false,
                message:"Account not found"
            });

        }

        const user = results[0];

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpiresDate = new Date();
        resetExpiresDate.setHours(resetExpiresDate.getHours() + 24); // Token expires in 24 hours

        // Store the reset token in database for students
        if (role === 'student') {
            await userConnection.query(
                `UPDATE students SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?`,
                [resetToken, resetExpiresDate, user.id]
            );
        }
        // For faculty and admins, they have different mechanisms already implemented elsewhere

        const resetLink =
        `http://localhost:3000/reset-password.html?token=${resetToken}&role=${role}`;

        const transporter = nodemailer.createTransport({
            service:'gmail',
            auth:{
                user:process.env.MAIL_USER,
                pass:process.env.MAIL_PASS
            }
        });

        const mailOptions = {
            from:process.env.MAIL_USER,
            to:email,
            subject:"Password Reset",
            html:`
            <h3>Hello ${user.name}</h3>
            <p>Click below to reset password</p>
            <a href="${resetLink}">${resetLink}</a>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({
            success:true,
            message:"Reset email sent"
        });

    }
    catch(err){

        console.error("Forgot password error:", err);

        res.json({
            success:false,
            message:"Server error"
        });

    }

});

// =========================
// RESET PASSWORD
// =========================
router.post('/reset-password', async (req, res) => {
    try {
        const { token, role, newPassword } = req.body;

        if (!token || !role || !newPassword) {
            return res.json({ success: false, message: 'Token, role, and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.json({ success: false, message: 'Password must be at least 6 characters long' });
        }

        let table;
        let userConnection = null;
        let user = null;

        if (role === 'student') {
            table = 'students';
            // Check both databases for the token
            const [necnUsers] = await db.query(
                `SELECT id FROM ${table} WHERE password_reset_token = ? AND password_reset_expires > NOW()`,
                [token]
            );

            if (necnUsers && necnUsers.length > 0) {
                user = necnUsers[0];
                userConnection = db;
            } else {
                const [necgUsers] = await db2.query(
                    `SELECT id FROM ${table} WHERE password_reset_token = ? AND password_reset_expires > NOW()`,
                    [token]
                );
                if (necgUsers && necgUsers.length > 0) {
                    user = necgUsers[0];
                    userConnection = db2;
                }
            }
        } else {
            return res.json({ success: false, message: 'Invalid role for this endpoint' });
        }

        if (!user || !userConnection) {
            return res.json({ success: false, message: 'Invalid or expired reset token' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        await userConnection.query(
            `UPDATE ${table} SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?`,
            [hashedPassword, user.id]
        );

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.json({ success: false, message: 'Server error while resetting password' });
    }
});

module.exports = router;