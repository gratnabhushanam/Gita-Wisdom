// backend/controllers/notificationController.js
const Notification = require('../models/Notification');

// Get all notifications for the logged-in user
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(100);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark a notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    await Notification.updateOne({ _id: id, userId }, { $set: { read: true } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark all notifications as read
exports.markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
