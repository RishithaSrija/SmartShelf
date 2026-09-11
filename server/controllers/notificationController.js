const notificationService = require('../services/notificationService');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = async (req, res) => {
  try {
    const data = await notificationService.getUserNotifications(req.user._id);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[NotificationController] getUserNotifications error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while fetching notifications'
    });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markNotificationRead = async (req, res) => {
  try {
    const notification = await notificationService.markNotificationRead(
      req.user._id,
      req.params.id
    );
    return res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('[NotificationController] markNotificationRead error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while marking notification as read'
    });
  }
};

module.exports = {
  getUserNotifications,
  markNotificationRead
};
