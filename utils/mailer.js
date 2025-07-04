const nodemailer = require('nodemailer');
require('dotenv').config();

// Create the transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Correct function definition
const sendWelcomeEmail = async (to, name) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: to,
      subject: 'Welcome To Our App!',
      text: `Hi ${name},\n\nWelcome to our application. We are glad to have you!\n\nRegards,\nNikunj Usadadiya`
    });

    console.log("✅ Email Sent Successfully to", to);
  } catch (error) {
    console.error("❌ Email Send Failed:", error.message);
  }
};

module.exports = sendWelcomeEmail;
