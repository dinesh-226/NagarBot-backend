const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getStats, getAllUsers, getPendingOfficers, approveOfficer, rejectOfficer } = require('../controllers/adminController');

const router = express.Router();

router.use(protect, authorize('admin'));
router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.get('/pending-officers', getPendingOfficers);
router.put('/approve-officer/:id', approveOfficer);
router.delete('/reject-officer/:id', rejectOfficer);

module.exports = router;
