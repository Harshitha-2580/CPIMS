const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter with error handling
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    },
    pool: true,
    maxConnections: 1
});

// Send password reset email
async function sendPasswordResetEmail(facultyName, email, resetLink) {
    try {
        const mailOptions = {
            from: process.env.MAIL_USER, // Use MAIL_USER instead of MAIL_FROM
            to: email,
            subject: 'NEC Placement Cell - Set Your Faculty Account Password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #001e43 0%, #0d47a1 100%); padding: 30px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 28px;">NEC Placement Cell</h1>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Placement & Career Cell</p>
                    </div>
                    
                    <div style="padding: 40px; background: #f9f9f9;">
                        <h2 style="color: #333; margin-bottom: 20px;">Hello ${facultyName},</h2>
                        
                        <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                            Welcome to the NEC Placement Cell Faculty Portal! You've been registered as a faculty member. 
                            To complete your account setup and set your password, please click the button below:
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background: linear-gradient(135deg, #001e43 0%, #0d47a1 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                                Set Your Password
                            </a>
                        </div>
                        
                        <p style="color: #999; font-size: 12px; line-height: 1.6;">
                            Or copy and paste this link in your browser:<br>
                            <span style="color: #0d47a1; word-break: break-all;">${resetLink}</span>
                        </p>
                        
                        <p style="color: #999; font-size: 12px; margin-top: 20px;">
                            This link will expire in 24 hours. If you did not request this, please ignore this email.
                        </p>
                    </div>
                    
                    <div style="padding: 20px; background: #f0f0f0; text-align: center; font-size: 12px; color: #666;">
                        <p style="margin: 0;">© 2025 NEC Placement Cell - Placement & Career Cell</p>
                        <p style="margin: 5px 0 0 0;">Narayana Engineering College, Nellore</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✓ Email sent to:', email);
        return true;
    } catch (err) {
        console.error('✗ Error sending email:', err.message);
        // For development: return true even if email fails so signup still works
        // In production, you might want to handle this differently
        console.log('⚠ Email failed but signup continues (dev mode)');
        return true;
    }
}

// Send admin password setup email
async function sendAdminPasswordSetupEmail(adminName, email, resetLink) {
    try {
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'NEC Placement Cell - Set Your Admin Account Password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #001e43 0%, #0d47a1 100%); padding: 30px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 28px;">NEC Placement Cell</h1>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Placement & Career Cell</p>
                    </div>

                    <div style="padding: 40px; background: #f9f9f9;">
                        <h2 style="color: #333; margin-bottom: 20px;">Hello ${adminName},</h2>

                        <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                            Welcome to the NEC Placement Cell Admin Portal! You have been registered as an admin user.
                            To complete your account setup and set your password, please click the button below:
                        </p>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background: linear-gradient(135deg, #001e43 0%, #0d47a1 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                                Set Your Admin Password
                            </a>
                        </div>

                        <p style="color: #999; font-size: 12px; line-height: 1.6;">
                            Or copy and paste this link in your browser:<br>
                            <span style="color: #0d47a1; word-break: break-all;">${resetLink}</span>
                        </p>

                        <p style="color: #999; font-size: 12px; margin-top: 20px;">
                            This link will expire in 24 hours. If you did not request this, please ignore this email.
                        </p>
                    </div>

                    <div style="padding: 20px; background: #f0f0f0; text-align: center; font-size: 12px; color: #666;">
                        <p style="margin: 0;">© 2026 NEC Placement Cell - Placement & Career Cell</p>
                        <p style="margin: 5px 0 0 0;">Narayana Engineering College, Nellore</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✓ Admin password setup email sent to:', email);
        return true;
    } catch (err) {
        console.error('✗ Error sending admin password setup email:', err.message);
        console.log('⚠ Admin email failed but admin creation continues (dev mode)');
        return true;
    }
}

// Send drive assignment email
async function sendDriveAssignmentEmail(facultyName, email, drive) {
    try {
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'NEC Placement Cell - New Drive Assigned To You',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #001e43 0%, #0d47a1 100%); padding: 24px; text-align: center; color: #fff; border-radius: 10px 10px 0 0;">
                        <h2 style="margin: 0; font-size: 26px;">NEC Placement Cell</h2>
                        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.95;">Drive Assignment Notification</p>
                    </div>

                    <div style="border: 1px solid #dbe5f1; border-top: none; padding: 24px; border-radius: 0 0 10px 10px; background: #f8fbff;">
                        <p style="margin: 0 0 14px; color: #1f3754; font-size: 16px;">Hello <strong>${facultyName || 'Faculty'}</strong>,</p>
                        <p style="margin: 0 0 18px; color: #3e516a; line-height: 1.6;">
                            A placement drive has been assigned to you. Please review the details below and monitor assigned activities in your portal.
                        </p>

                        <div style="background: #fff; border: 1px solid #d8e4f3; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
                            <p style="margin: 0 0 8px; color: #001e43;"><strong>Company:</strong> ${drive.company_name || '-'}</p>
                            <p style="margin: 0 0 8px; color: #001e43;"><strong>Job Role:</strong> ${drive.job_role || '-'}</p>
                            <p style="margin: 0 0 8px; color: #001e43;"><strong>Event Date:</strong> ${drive.event_date || '-'}</p>
                            <p style="margin: 0 0 8px; color: #001e43;"><strong>Due Date:</strong> ${drive.due_date || '-'}</p>
                            <p style="margin: 0; color: #001e43;"><strong>Location:</strong> ${drive.location || '-'}</p>
                        </div>

                        <p style="margin: 0; color: #60738d; font-size: 12px;">
                            This is an automated message from NEC Central Placement Information and Management Center.
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✓ Drive assignment email sent to:', email);
        return true;
    } catch (err) {
        console.error('✗ Error sending drive assignment email:', err.message);
        console.log('⚠ Drive assignment email failed but flow continues (dev mode)');
        return true;
    }
}

module.exports = { sendPasswordResetEmail, sendAdminPasswordSetupEmail, sendDriveAssignmentEmail, sendStudentApprovalEmail, sendStudentRejectionEmail };

// Send student approval email with temporary password
async function sendStudentApprovalEmail(studentName, email, tempPassword) {
    try {
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Welcome to NEC Placement Cell - Your Account Approved!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #001e43 0%, #0d47a1 100%); padding: 30px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 28px;">NEC Placement Cell</h1>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Central Placement Information & Management System</p>
                    </div>
                    
                    <div style="padding: 40px; background: #f9f9f9;">
                        <h2 style="color: #001e43; margin-bottom: 20px;">Welcome, ${studentName}! 🎉</h2>
                        
                        <p style="color: #555; line-height: 1.6; margin-bottom: 20px; font-size: 15px;">
                            Your student account registration has been <strong style="color: #28a745;">approved</strong>! 
                            You can now access the NEC Placement Cell portal to explore placement opportunities, track your applications, 
                            and participate in campus drives.
                        </p>
                        
                        <div style="background: #fff; border-left: 4px solid #28a745; padding: 20px; margin: 25px 0; border-radius: 4px;">
                            <h3 style="color: #001e43; margin-top: 0; margin-bottom: 15px; font-size: 15px;">Login Credentials</h3>
                            <p style="color: #555; margin: 0 0 10px 0; font-size: 14px;">
                                <strong>Email:</strong> <span style="font-family: monospace; background: #f0f0f0; padding: 5px 10px; border-radius: 4px;">${email}</span>
                            </p>
                            <p style="color: #555; margin: 0; font-size: 14px;">
                                <strong>Temporary Password:</strong> <span style="font-family: monospace; background: #f0f0f0; padding: 5px 10px; border-radius: 4px; color: #d9534f; font-weight: bold;">${tempPassword}</span>
                            </p>
                        </div>

                        <div style="background: #fff3f3; border: 1px solid #ffcccc; padding: 15px; margin: 20px 0; border-radius: 4px;">
                            <p style="color: #c33; margin: 0; font-size: 13px;">
                                <strong>⚠️ Important Security Note:</strong><br>
                                For your account security, you must reset your password immediately after your first login. 
                                Do not share your temporary password with anyone.
                            </p>
                        </div>

                        <div style="background: linear-gradient(135deg, #f0f0f0 0%, #fafafa 100%); padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center;">
                            <a href="http://localhost:3000/login-student.html" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 12px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px;">
                                Login to Portal →
                            </a>
                        </div>

                        <h3 style="color: #001e43; margin-top: 30px; margin-bottom: 15px; font-size: 15px;">What You Can Do Now:</h3>
                        <ul style="color: #555; line-height: 1.8; margin: 0 0 20px 20px; font-size: 14px;">
                            <li>Complete your student profile and academic details</li>
                            <li>Upload your resume and other documents</li>
                            <li>Browse and apply for placement opportunities</li>
                            <li>Register for placement drives and events</li>
                            <li>Access placement resources and materials</li>
                            <li>Track your application status in real-time</li>
                        </ul>

                        <p style="color: #999; font-size: 13px; line-height: 1.6; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eee;">
                            If you have any questions or need assistance, please contact the Placement Cell at 
                            <a href="mailto:placement@necn.ac.in" style="color: #0d47a1; text-decoration: none;">placement@necn.ac.in</a>
                        </p>
                    </div>
                    
                    <div style="padding: 20px; background: #f0f0f0; text-align: center; font-size: 12px; color: #666;">
                        <p style="margin: 0;">© 2026 NEC Placement Cell - Placement & Career Cell</p>
                        <p style="margin: 5px 0 0 0;">Narayana Engineering College, Nellore</p>
                        <p style="margin: 8px 0 0 0; color: #999;">This is an automated message. Please do not reply to this email.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✓ Student approval email sent to:', email);
        return true;
    } catch (err) {
        console.error('✗ Error sending student approval email:', err.message);
        console.log('⚠ Student approval email failed but approval continues (dev mode)');
        return true;
    }
}

// Send student rejection email
async function sendStudentRejectionEmail(studentName, email) {
    try {
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'NEC Placement Cell - Student Verification Status',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #001e43 0%, #0d47a1 100%); padding: 30px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 28px;">NEC Placement Cell</h1>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Central Placement Information & Management System</p>
                    </div>
                    <div style="padding: 40px; background: #f9f9f9;">
                        <h2 style="color: #001e43; margin-bottom: 20px;">Hello, ${studentName}</h2>
                        <p style="color: #555; line-height: 1.6; margin-bottom: 20px; font-size: 15px;">
                            Unfortunately we are not able to verify your details at this time. 
                            We request you to visit the Placement Head in the Placement Cell regarding this issue.
                        </p>
                        <p style="color: #555; line-height: 1.6; margin-bottom: 10px; font-size: 14px;">
                            If you have any questions, please contact the Placement Cell office for support.
                        </p>
                    </div>
                    <div style="padding: 20px; background: #f0f0f0; text-align: center; font-size: 12px; color: #666;">
                        <p style="margin: 0;">© 2026 NEC Placement Cell - Placement & Career Cell</p>
                        <p style="margin: 5px 0 0 0;">Narayana Engineering College, Nellore</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✓ Student rejection email sent to:', email);
        return true;
    } catch (err) {
        console.error('✗ Error sending student rejection email:', err.message);
        console.log('⚠ Student rejection email failed but flow continues (dev mode)');
        return true;
    }
}

module.exports = { sendPasswordResetEmail, sendAdminPasswordSetupEmail, sendDriveAssignmentEmail, sendStudentApprovalEmail, sendStudentRejectionEmail };
