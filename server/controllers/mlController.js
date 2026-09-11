const mlService = require('../services/mlService');

const mlController = {
  getDemandPrediction: async (req, res) => {
    try {
      const { productId } = req.params;
      const { date } = req.query;

      const result = await mlService.getDemandPrediction(req.user._id, productId, date);
      return res.status(200).json(result);
    } catch (err) {
      console.error('[MLController] Prediction error:', err.message);
      const statusCode = err.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: err.message || 'Error processing demand prediction'
      });
    }
  },

  getPredictionHistory: async (req, res) => {
    try {
      const history = await mlService.getPredictionHistory(req.user._id, req.query);
      return res.status(200).json({
        success: true,
        data: history
      });
    } catch (err) {
      console.error('[MLController] History fetch error:', err.message);
      const statusCode = err.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: err.message || 'Error fetching prediction history'
      });
    }
  },

  getAdminMLStatus: async (req, res) => {
    try {
      const health = await mlService.getMLHealth();
      return res.status(200).json({
        success: true,
        data: health
      });
    } catch (err) {
      console.error('[MLController] Admin ML status error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Error fetching ML status'
      });
    }
  }
};

module.exports = mlController;
