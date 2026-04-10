// backend/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { getUserNotifications, markNotificationRead, markAllNotificationsRead } = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Get all notifications for the logged-in user
router.get('/', authMiddleware, getUserNotifications);

// Mark a notification as read
router.post('/:id/read', authMiddleware, markNotificationRead);

// Mark all notifications as read
router.post('/read-all', authMiddleware, markAllNotificationsRead);

module.exports = router;
