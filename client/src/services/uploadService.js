import api from './api';

const uploadService = {
  /**
   * Upload an image file or external image URL to Cloudinary
   * @param {File|Blob|string} image - File object or URL string
   * @param {string} folder - Folder name ('smartshelf/products' or 'smartshelf/stores')
   */
  uploadImage: async (image, folder = 'smartshelf/products') => {
    if (typeof image === 'string') {
      // Image URL string
      const response = await api.post('/upload/image', {
        imageUrl: image,
        folder
      });
      return response.data;
    }

    // Binary file upload (Multipart)
    const formData = new FormData();
    formData.append('image', image);
    formData.append('folder', folder);

    const response = await api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Delete an image from Cloudinary
   * @param {string} publicId - Cloudinary public_id
   */
  deleteImage: async (publicId) => {
    const response = await api.delete('/upload/image', {
      data: { publicId }
    });
    return response.data;
  },

  /**
   * Check Cloudinary upload status
   */
  getStatus: async () => {
    const response = await api.get('/upload/status');
    return response.data;
  }
};

export default uploadService;
