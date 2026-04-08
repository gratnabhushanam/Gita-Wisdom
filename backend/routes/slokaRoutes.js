const express = require('express');
const router = express.Router();
const slokaController = require('../controllers/slokaController');
const { requireApiKey } = require('../middleware/apiKeyMiddleware');

router.get('/', slokaController.getSlokas);
router.get('/daily', requireApiKey, slokaController.getDailySloka);
router.get('/daily/history', requireApiKey, slokaController.getDailyHistory);
router.post('/daily/history', requireApiKey, slokaController.addDailyHistory);
router.get('/mentor', requireApiKey, slokaController.getMentorSloka);
router.get('/mentor/content', requireApiKey, slokaController.getMentorContent);
router.get('/mentor/history', requireApiKey, slokaController.getMentorHistory);
router.post('/mentor/history', requireApiKey, slokaController.addMentorHistory);
router.get('/:id', slokaController.getSlokaById);
router.post('/', slokaController.addSloka);

module.exports = router;
