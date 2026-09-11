const express = require('express');
const router = express.Router();
const {
  getRules,
  createRule,
  updateRule,
  updateRuleStatus,
  deleteRule,
  previewPrice,
  recalculateBatchPrice,
  recalculateStoreInventory
} = require('../controllers/pricingController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// All pricing engine routes require store owner authentication
router.use(protect);
router.use(authorizeRoles('STORE_OWNER', 'ADMIN'));

router.get('/rules', getRules);
router.post('/rules', createRule);
router.put('/rules/:id', updateRule);
router.patch('/rules/:id/status', updateRuleStatus);
router.delete('/rules/:id', deleteRule);

router.post('/preview', previewPrice);
router.post('/recalculate-all', recalculateStoreInventory);
router.post('/recalculate/:batchId', recalculateBatchPrice);

module.exports = router;
