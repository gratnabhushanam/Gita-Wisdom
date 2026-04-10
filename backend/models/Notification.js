// backend/models/Notification.js
// Mongoose model for in-app notifications

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['system', 'content', 'moderation', 'custom'], default: 'system' },
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: Object, default: {} },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);
