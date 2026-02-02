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
            subject: 'Aspira - Set Your Faculty Account Password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #001e43 0%, #0d47a1 100%); padding: 30px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 28px;">Aspira</h1>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Placement & Career Cell</p>
                    </div>
                    
                    <div style="padding: 40px; background: #f9f9f9;">
                        <h2 style="color: #333; margin-bottom: 20px;">Hello ${facultyName},</h2>
                        
                        <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                            Welcome to the Aspira Faculty Portal! You've been registered as a faculty member. 
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
                        <p style="margin: 0;">© 2025 Aspira - Placement & Career Cell</p>
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

module.exports = { sendPasswordResetEmail };
