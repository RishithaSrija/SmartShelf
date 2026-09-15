const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ingredientBasketController = require('../controllers/ingredientBasketController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Optional auth helper for match endpoint so guests and logged-in business users can both use it
const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback_secret_key_smartshelf'
      );
      req.user = await User.findById(decoded.userId).select('-password');
    } catch (e) {
      // ignore token error for optional auth
    }
  }
  next();
};

// 1. Get deterministic recipe catalog
router.get('/recipes', ingredientBasketController.getRecipes);

// 2. Get single recipe details & default ingredient ratios
router.get('/recipes/:id', ingredientBasketController.getRecipeDetails);

// 3. Search and match ingredients against active SmartShelf inventory
router.post('/match', optionalAuth, ingredientBasketController.findMatchingIngredients);

// 4. Create store-specific orders for selected ingredient basket items
router.post(
  '/checkout',
  protect,
  authorizeRoles('CUSTOMER', 'ADMIN'),
  ingredientBasketController.checkoutBasket
);

module.exports = router;
