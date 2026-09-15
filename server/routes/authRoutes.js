const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser, updatePreferences } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public auth routes
router.post('/register', register);
router.post('/login', login);

// Protected auth routes
router.get('/me', protect, getCurrentUser);
router.put('/preferences', protect, updatePreferences);

module.exports = router;
