const express = require('express');
const { register, login, getMe, updateProfile, registerValidation } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

const router = express.Router();

router.post('/register', upload.single('proof'), registerValidation, register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, upload.single('avatar'), updateProfile);

module.exports = router;
