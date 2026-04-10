// backend/utils/notificationService.js
// Centralized notification utility for email, push, and in-app notifications

const nodemailer = require('nodemailer');

// Email notification (Gmail SMTP, Resend, or Brevo)
async function sendEmail({ to, subject, html, text }) {
  // TODO: Switch provider based on env
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  await transporter.sendMail({
    from: `${process.env.EMAIL_FROM_NAME || 'Gita Wisdom'} <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text,
  });
}

// Placeholder for push notification (OneSignal, FCM, or webpush)
async function sendPush({ to, title, body, data }) {
  // Integrate with push provider here
  // Example: OneSignal/FCM/webpush
}

// In-app notification (DB insert)
async function sendInApp({ userId, type, title, body, data }) {
  // Lazy load to avoid circular dependency
  const Notification = require('../models/Notification');
  if (!userId || !title || !body) return;
  await Notification.create({
    userId,
    type: type || 'system',
    title,
    body,
    data: data || {},
    read: false,
    createdAt: new Date(),
  });
}

module.exports = {
  sendEmail,
  sendPush,
  sendInApp,
};
