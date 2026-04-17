const express = require('express');
const { protect } = require('../middleware/auth');
const { getLeaderboard, savePushSubscription } = require('../controllers/userController');

const router = express.Router();
router.get('/leaderboard', getLeaderboard);
router.post('/push-subscription', protect, savePushSubscription);
module.exports = router;
