const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const {
  handleImageUpload,
  handleImageDelete,
  getUploadStatus
} = require('../controllers/uploadController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// All upload routes require authentication
router.use(protect);
router.use(authorizeRoles('STORE_OWNER', 'ADMIN'));

// Upload image (accepts multipart file or json with imageUrl)
router.post('/image', upload.single('image'), handleImageUpload);

// Delete image from Cloudinary
router.delete('/image', handleImageDelete);

// Status check (no secrets exposed)
router.get('/status', getUploadStatus);

module.exports = router;
