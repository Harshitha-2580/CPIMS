const nodemailer = require("nodemailer");
require("dotenv").config();

const otpStore = {};

// Email transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

// Verify transporter
transporter.verify((error, success) => {
    if (error) {
        console.error("Email transporter error:", error);
    } else {
        console.log("SMTP server ready to send emails");
    }
});

// Generate OTP
function generateOTP(){
    return Math.floor(100000 + Math.random()*900000).toString();
}

// Send OTP email
async function sendOtpEmail(name, email) {

    try {

        console.log("OTP function triggered for:", email);

        // prevent spam
        if (otpStore[email]) {
            console.log("OTP already sent recently to:", email);
            return otpStore[email];
        }

        const otp = generateOTP();

        otpStore[email] = otp;

        console.log("Generated OTP:", otp);

        setTimeout(() => {
            delete otpStore[email];
            console.log("OTP expired for:", email);
        }, 300000);

        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: "NEC Placement Cell Login OTP",
            html: `
            <div style="font-family: Arial; text-align:center;">
                <h2>Hello ${name}</h2>
                <p>Your login OTP is:</p>
                <h1 style="color:#0c054c">${otp}</h1>
                <p>This OTP expires in 5 minutes.</p>
            </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        console.log("OTP email sent successfully:", info.response);

        return otp;

    } catch (err) {

        console.error("Error sending OTP email:", err.message);
        return null;

    }
}

// Verify OTP
function verifyOTP(email, otp) {

    console.log("Stored OTP:", otpStore[email]);
    console.log("Entered OTP:", otp);

    if (otpStore[email] && otpStore[email] === otp) {

        delete otpStore[email];

        console.log("OTP verified successfully for:", email);

        return true;

    }

    console.log("OTP verification failed for:", email);

    return false;
}

module.exports = {
    sendOtpEmail,
    verifyOTP
};