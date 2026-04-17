const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, text }) => {
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: `"NagarBot Alerts" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
  console.log(`Email sent to ${to} — MessageId: ${info.messageId}`);
  return info;
};

module.exports = { sendEmail };
