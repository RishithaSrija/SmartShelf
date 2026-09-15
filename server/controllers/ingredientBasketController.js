const ingredientBasketService = require('../services/ingredientBasketService');

const ingredientBasketController = {
  /**
   * GET /api/ingredient-basket/recipes
   * Get list of all supported recipes
   */
  getRecipes: async (req, res, next) => {
    try {
      const recipes = ingredientBasketService.getRecipes();
      return res.status(200).json({
        success: true,
        data: {
          recipes,
          total: recipes.length
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/ingredient-basket/recipes/:id
   * Get single recipe details and default ingredient ratios
   */
  getRecipeDetails: async (req, res, next) => {
    try {
      const { id } = req.params;
      const recipe = ingredientBasketService.getRecipeById(id);
      return res.status(200).json({
        success: true,
        data: recipe
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/ingredient-basket/match
   * Match ingredients against SmartShelf active inventory with expire-soon priority
   */
  findMatchingIngredients: async (req, res, next) => {
    try {
      const { recipeId, batchSize = 10, latitude, longitude, radius = 15 } = req.body;

      if (!recipeId) {
        return res.status(400).json({
          success: false,
          message: 'recipeId is required'
        });
      }

      const customerId = req.user ? req.user.id || req.user._id : undefined;

      const matchResults = await ingredientBasketService.matchIngredients({
        recipeId,
        batchSize: parseFloat(batchSize) || 10,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        radius: radius ? parseFloat(radius) : 15,
        customerId
      });

      return res.status(200).json({
        success: true,
        data: matchResults
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/ingredient-basket/checkout
   * Create store-specific orders for selected ingredient basket items
   */
  checkoutBasket: async (req, res, next) => {
    try {
      const customerId = req.user.id || req.user._id;
      const { basketGroupId, recipeName, items, paymentMethod } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Basket must contain at least one ingredient item'
        });
      }

      const checkoutResult = await ingredientBasketService.checkoutBasket(customerId, {
        basketGroupId,
        recipeName,
        items,
        paymentMethod: paymentMethod || 'PAY_AT_STORE'
      });

      return res.status(201).json({
        success: true,
        message: 'Ingredient basket orders created successfully',
        data: checkoutResult
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = ingredientBasketController;
