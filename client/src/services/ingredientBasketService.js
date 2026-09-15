import api from './api';

const ingredientBasketService = {
  /**
   * Get all verified recipes from the catalog
   */
  getRecipes: async () => {
    const response = await api.get('/ingredient-basket/recipes');
    return response.data;
  },

  /**
   * Get recipe details and base ingredient ratios
   */
  getRecipeById: async (recipeId) => {
    const response = await api.get(`/ingredient-basket/recipes/${recipeId}`);
    return response.data;
  },

  /**
   * Find matching ingredients across nearby stores with expire-soon prioritization
   * @param {Object} data - { recipeId, batchSize, latitude, longitude, radius }
   */
  matchIngredients: async (data) => {
    const response = await api.post('/ingredient-basket/match', data);
    return response.data;
  },

  /**
   * Checkout selected ingredient basket items to create store-specific orders
   * @param {Object} data - { basketGroupId, recipeName, items, paymentMethod }
   */
  checkoutBasket: async (data) => {
    const response = await api.post('/ingredient-basket/checkout', data);
    return response.data;
  }
};

export default ingredientBasketService;
