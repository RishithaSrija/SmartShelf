const Notification = require('../models/Notification');

const notificationService = {
  // Create an expiry alert notification safely without creating duplicates
  createExpiryNotification: async ({
    userId,
    batchId,
    productId,
    storeId,
    alertType,
    title,
    message
  }) => {
    // Check if an equivalent notification already exists for this batch & alertType
    const existing = await Notification.findOne({
      userId,
      'data.batchId': String(batchId),
      'data.alertType': alertType
    });

    if (existing) {
      return existing; // Duplicate prevented
    }

    const notification = await Notification.create({
      userId,
      type: 'EXPIRY_ALERT',
      title,
      message,
      data: {
        batchId: String(batchId),
        productId: String(productId),
        storeId: String(storeId),
        alertType
      },
      isRead: false
    });

    return notification;
  },

  // Create an order lifecycle notification
  createOrderNotification: async ({
    userId,
    orderId,
    orderNumber,
    title,
    message,
    status
  }) => {
    try {
      const notification = await Notification.create({
        userId,
        type: 'ORDER_UPDATE',
        title,
        message,
        data: {
          orderId: String(orderId),
          orderNumber,
          status
        },
        isRead: false
      });
      return notification;
    } catch (err) {
      console.error('[NotificationService] createOrderNotification error:', err.message);
      return null;
    }
  },

  // Get notifications for a user
  getUserNotifications: async (userId, limit = 20) => {
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return {
      notifications,
      unreadCount
    };
  },

  // Mark a notification as read
  markNotificationRead: async (userId, notificationId) => {
    const notification = await Notification.findOne({ _id: notificationId, userId });
    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    notification.isRead = true;
    await notification.save();
    return notification;
  }
};

module.exports = notificationService;
