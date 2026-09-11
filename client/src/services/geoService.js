import api from './api';

const geoService = {
  /**
   * Request user's current GPS location using browser navigator.geolocation
   * Wraps navigator.geolocation.getCurrentPosition in a Promise
   */
  getCurrentLocation: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject({
          code: 'UNSUPPORTED',
          message: 'Geolocation is not supported by your browser'
        });
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: parseFloat(position.coords.latitude.toFixed(6)),
            longitude: parseFloat(position.coords.longitude.toFixed(6)),
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          let message = 'Unable to retrieve your location.';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Location permission was denied. You can enter your coordinates manually.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'Location information is currently unavailable.';
          } else if (error.code === error.TIMEOUT) {
            message = 'Location request timed out. Please try again.';
          }
          reject({
            code: error.code,
            message
          });
        },
        options
      );
    });
  },

  /**
   * Fetch nearby active flash sales within given radius
   * GET /api/flash-sales/nearby
   */
  getNearbyFlashSales: async (params = {}) => {
    const response = await api.get('/flash-sales/nearby', { params });
    return response.data;
  }
};

export default geoService;
