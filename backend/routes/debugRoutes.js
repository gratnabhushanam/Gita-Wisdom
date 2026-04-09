// Debug endpoint to check which data source is being used (MongoDB, SQLite, or mock)
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { isMockMode } = require('../controllers/authController');

router.get('/debug/db-status', (req, res) => {
  let status = 'unknown';
  if (isMockMode && isMockMode()) {
    status = 'mock';
  } else if (mongoose.connection && mongoose.connection.readyState === 1) {
    status = 'mongodb';
  } else {
    status = 'sqlite-or-other';
  }
  res.json({ status });
});

module.exports = router;
