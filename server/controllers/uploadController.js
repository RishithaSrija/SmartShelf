const {
  isCloudinaryConfigured,
  uploadBuffer,
  uploadFromUrl,
  deleteImage
} = require('../config/cloudinary');

const ALLOWED_FOLDERS = [
  'smartshelf/products',
  'smartshelf/stores',
  'smartshelf/categories',
  'smartshelf/banners'
];

/**
 * @desc    Upload single image (via file or remote URL) to Cloudinary
 * @route   POST /api/upload/image
 * @access  Private (Store Owner / Admin)
 */
const handleImageUpload = async (req, res) => {
  try {
    const rawFolder = req.body.folder || req.query.folder || 'smartshelf/products';
    const folder = ALLOWED_FOLDERS.includes(rawFolder) ? rawFolder : 'smartshelf/products';

    // 1. File Upload via Multer
    if (req.file) {
      if (!isCloudinaryConfigured()) {
        // Fallback for development without Cloudinary credentials:
        // Convert buffer to data URI so dev preview still works completely without crashing
        const base64Data = req.file.buffer.toString('base64');
        const dataUri = `data:${req.file.mimetype};base64,${base64Data}`;
        return res.status(200).json({
          success: true,
          message: 'Image received (Cloudinary unconfigured: using development data URI)',
          data: {
            imageUrl: dataUri,
            imagePublicId: `local-dev-${Date.now()}`,
            isFallback: true
          }
        });
      }

      const result = await uploadBuffer(req.file.buffer, { folder });
      return res.status(200).json({
        success: true,
        message: 'Image uploaded to Cloudinary successfully',
        data: {
          imageUrl: result.secure_url,
          imagePublicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes
        }
      });
    }

    // 2. Upload from external Image URL
    if (req.body.imageUrl) {
      const url = req.body.imageUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image URL format. Must start with http:// or https://'
        });
      }

      if (!isCloudinaryConfigured()) {
        return res.status(200).json({
          success: true,
          message: 'External image URL registered (Cloudinary unconfigured)',
          data: {
            imageUrl: url,
            imagePublicId: null,
            isFallback: true
          }
        });
      }

      const result = await uploadFromUrl(url, { folder });
      return res.status(200).json({
        success: true,
        message: 'Image imported to Cloudinary successfully',
        data: {
          imageUrl: result.secure_url,
          imagePublicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height
        }
      });
    }

    return res.status(400).json({
      success: false,
      message: 'No file uploaded or imageUrl provided'
    });
  } catch (error) {
    console.error('[UploadController] Upload error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error occurred while uploading image'
    });
  }
};

/**
 * @desc    Delete an image from Cloudinary
 * @route   DELETE /api/upload/image
 * @access  Private (Store Owner / Admin)
 */
const handleImageDelete = async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'imagePublicId is required'
      });
    }

    const result = await deleteImage(publicId);
    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('[UploadController] Delete error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error occurred while deleting image'
    });
  }
};

/**
 * @desc    Get Cloudinary status / configuration info (Safe: never exposes secrets!)
 * @route   GET /api/upload/status
 * @access  Private (Store Owner / Admin)
 */
const getUploadStatus = (req, res) => {
  const configured = isCloudinaryConfigured();
  return res.status(200).json({
    success: true,
    data: {
      provider: 'Cloudinary',
      isConfigured: configured,
      cloudName: configured ? process.env.CLOUDINARY_CLOUD_NAME : null,
      allowedFolders: ALLOWED_FOLDERS
    }
  });
};

module.exports = {
  handleImageUpload,
  handleImageDelete,
  getUploadStatus
};
