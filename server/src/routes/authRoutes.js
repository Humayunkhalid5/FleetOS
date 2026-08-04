const express = require('express');
const { register, login, getCurrentUser, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', protect, getCurrentUser);
router.put('/auth/profile', protect, updateProfile);
router.post('/auth/change-password', protect, changePassword);

module.exports = router;

