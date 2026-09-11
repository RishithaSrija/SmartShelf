const express = require('express');
const router = express.Router();
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  updateProductStatus,
  deleteProduct
} = require('../controllers/productController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// All product management routes require store owner authentication
router.use(protect);
router.use(authorizeRoles('STORE_OWNER', 'ADMIN'));

router.post('/', createProduct);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.put('/:id', updateProduct);
router.patch('/:id/status', updateProductStatus);
router.delete('/:id', deleteProduct);

module.exports = router;
