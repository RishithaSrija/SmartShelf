const cloudinary = require('cloudinary').v2;
const streamifier = require('stream');

// Configure Cloudinary from environment variables
const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    return true;
  }
  return false;
};

// Initial config check
configureCloudinary();

/**
 * Check if Cloudinary credentials are fully configured
 */
const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from Multer memoryStorage
 * @param {Object} options - Upload options (folder, public_id, transformation, etc.)
 */
const uploadBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(new Error('Cloudinary credentials are not configured'));
    }

    const folder = options.folder || 'smartshelf/products';
    const uploadOptions = {
      folder,
      resource_type: 'image',
      transformation: options.transformation || [
        { quality: 'auto', fetch_format: 'auto' }
      ],
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    const readableStream = new streamifier.Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Upload an image from a remote URL to Cloudinary
 * @param {string} remoteUrl - HTTP URL of the image
 * @param {Object} options - Upload options
 */
const uploadFromUrl = async (remoteUrl, options = {}) => {
  if (!isCloudinaryConfigured()) {
    return {
      secure_url: remoteUrl,
      public_id: null,
      isFallback: true
    };
  }

  const folder = options.folder || 'smartshelf/products';
  const result = await cloudinary.uploader.upload(remoteUrl, {
    folder,
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    ...options
  });

  return result;
};

/**
 * Delete an image from Cloudinary by public ID
 * @param {string} publicId - Cloudinary asset public ID
 */
const deleteImage = async (publicId) => {
  if (!publicId || !isCloudinaryConfigured()) {
    return { result: 'skipped' };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.warn(`[Cloudinary] Failed to delete image (${publicId}):`, error.message);
    return { result: 'error', error: error.message };
  }
};

/**
 * Generate an optimized Cloudinary delivery URL
 * @param {string} url - Existing image URL
 * @param {Object} transform - Transformation parameters { width, height, crop, quality, format }
 */
const getOptimizedImageUrl = (url, transform = {}) => {
  if (!url || typeof url !== 'string') return '';

  // Only apply Cloudinary transformations if it's a Cloudinary URL
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  const { width, height, crop = 'fill', quality = 'auto', format = 'auto' } = transform;
  const transformations = [];

  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (width || height) transformations.push(`c_${crop}`);

  const transformString = transformations.join(',');

  // Insert transformation after /upload/
  if (transformString && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/${transformString}/`);
  }

  return url;
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadBuffer,
  uploadFromUrl,
  deleteImage,
  getOptimizedImageUrl
};
