const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  createIssue, getIssues, getIssue, updateIssue, upvoteIssue, getMyIssues,
} = require('../controllers/issueController');

const router = express.Router();

router.get('/', getIssues);
router.get('/my', protect, getMyIssues);
router.get('/:id', getIssue);
router.post('/', protect, upload.single('image'), createIssue);
router.put('/:id', protect, authorize('officer', 'admin'), upload.single('resolutionImage'), updateIssue);
router.post('/:id/upvote', protect, upvoteIssue);

module.exports = router;
