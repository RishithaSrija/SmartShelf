const express = require('express');
const router = express.Router();
const expiryService = require('../services/expiryService');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Manual admin job trigger endpoint (Admin only)
router.post('/expiry/run', protect, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const summary = await expiryService.processExpiryForAllStores();
    return res.status(200).json({
      success: true,
      message: 'Expiry monitoring job completed',
      data: summary
    });
  } catch (error) {
    console.error('[AdminJobRoutes] Manual expiry job error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during manual expiry job run'
    });
  }
});

module.exports = router;
