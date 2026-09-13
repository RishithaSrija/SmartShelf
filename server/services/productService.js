const Product = require('../models/Product');
const Store = require('../models/Store');
const InventoryBatch = require('../models/InventoryBatch');
const { deleteImage } = require('../config/cloudinary');

// Helper to get authenticated store owner's store
const getOwnerStore = async (ownerId) => {
  const store = await Store.findOne({ ownerId });
  if (!store) {
    const error = new Error('No store registered for this store owner');
    error.statusCode = 400;
    throw error;
  }
  return store;
};

const productService = {
  // Create a new product for store owner
  createProduct: async (ownerId, productData) => {
    const store = await getOwnerStore(ownerId);

    const {
      name,
      category,
      description,
      brand,
      unit,
      image,
      imageUrl,
      imagePublicId,
      additionalImages
    } = productData;

    const normalizedName = name.toLowerCase().trim();

    // Check duplicate product in the same store
    const existingProduct = await Product.findOne({
      storeId: store._id,
      normalizedName
    });

    if (existingProduct) {
      const error = new Error('A product with this name already exists in your store');
      error.statusCode = 400;
      throw error;
    }

    const resolvedImage = imageUrl ? imageUrl.trim() : (image ? image.trim() : '');

    const product = await Product.create({
      name: name.trim(),
      normalizedName,
      category: category.toUpperCase(),
      description: description ? description.trim() : '',
      brand: brand ? brand.trim() : '',
      unit: unit ? unit.trim() : 'piece',
      image: resolvedImage,
      imageUrl: resolvedImage,
      imagePublicId: imagePublicId ? imagePublicId.trim() : undefined,
      additionalImages: Array.isArray(additionalImages) ? additionalImages : [],
      storeId: store._id,
      isActive: true
    });

    return product;
  },

  // Get products for store owner with search, filtering, and pagination
  getStoreProducts: async (ownerId, queryParams = {}) => {
    const store = await getOwnerStore(ownerId);

    const page = Math.max(1, parseInt(queryParams.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { storeId: store._id };

    // Search filter (name or brand)
    if (queryParams.search && queryParams.search.trim()) {
      const searchTerm = queryParams.search.trim();
      filter.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { brand: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Category filter
    if (queryParams.category && queryParams.category.toUpperCase() !== 'ALL') {
      filter.category = queryParams.category.toUpperCase();
    }

    // Status filter (active | inactive | all)
    if (queryParams.status) {
      const statusLower = queryParams.status.toLowerCase();
      if (statusLower === 'active') {
        filter.isActive = true;
      } else if (statusLower === 'inactive') {
        filter.isActive = false;
      }
      // if 'all', do not filter by isActive
    } else {
      // Default to active products if not specified
      filter.isActive = true;
    }

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (queryParams.sort) {
      if (queryParams.sort === 'name') sortOptions = { name: 1 };
      else if (queryParams.sort === '-name') sortOptions = { name: -1 };
      else if (queryParams.sort === 'category') sortOptions = { category: 1 };
      else if (queryParams.sort === 'createdAt') sortOptions = { createdAt: 1 };
    }

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortOptions).skip(skip).limit(limit),
      Product.countDocuments(filter)
    ]);

    // Also get overall counts for active vs inactive
    const [totalProducts, activeProducts, inactiveProducts] = await Promise.all([
      Product.countDocuments({ storeId: store._id }),
      Product.countDocuments({ storeId: store._id, isActive: true }),
      Product.countDocuments({ storeId: store._id, isActive: false })
    ]);

    return {
      products,
      counts: {
        total: totalProducts,
        active: activeProducts,
        inactive: inactiveProducts
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  },

  // Get single product by ID (Verifies store ownership)
  getProductById: async (ownerId, productId) => {
    const store = await getOwnerStore(ownerId);

    const product = await Product.findById(productId);
    if (!product || product.storeId.toString() !== store._id.toString()) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    return product;
  },

  // Update product details
  updateProduct: async (ownerId, productId, updateData) => {
    const store = await getOwnerStore(ownerId);

    const product = await Product.findById(productId);
    if (!product || product.storeId.toString() !== store._id.toString()) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    const {
      name,
      category,
      description,
      brand,
      unit,
      image,
      imageUrl,
      imagePublicId,
      additionalImages
    } = updateData;

    if (name && name.trim()) {
      const newNormalizedName = name.toLowerCase().trim();
      if (newNormalizedName !== product.normalizedName) {
        // Check for name collision
        const duplicate = await Product.findOne({
          storeId: store._id,
          normalizedName: newNormalizedName,
          _id: { $ne: productId }
        });
        if (duplicate) {
          const error = new Error('A product with this name already exists in your store');
          error.statusCode = 400;
          throw error;
        }
        product.name = name.trim();
        product.normalizedName = newNormalizedName;
      }
    }

    if (category) product.category = category.toUpperCase();
    if (description !== undefined) product.description = description.trim();
    if (brand !== undefined) product.brand = brand.trim();
    if (unit) product.unit = unit.trim();

    // Check if image is being replaced
    const newImageUrl = imageUrl !== undefined ? imageUrl.trim() : (image !== undefined ? image.trim() : undefined);
    if (newImageUrl !== undefined) {
      // If replacing an existing Cloudinary image with a different one, delete the old Cloudinary asset
      if (
        product.imagePublicId &&
        imagePublicId &&
        product.imagePublicId !== imagePublicId
      ) {
        // Async cleanup (non-blocking)
        deleteImage(product.imagePublicId).catch((err) => {
          console.warn('[ProductService] Could not delete old Cloudinary image:', err.message);
        });
      }

      product.image = newImageUrl;
      product.imageUrl = newImageUrl;
    }

    if (imagePublicId !== undefined) {
      product.imagePublicId = imagePublicId ? imagePublicId.trim() : undefined;
    }

    if (additionalImages !== undefined && Array.isArray(additionalImages)) {
      product.additionalImages = additionalImages;
    }

    const updatedProduct = await product.save();
    return updatedProduct;
  },

  // Toggle active/inactive status
  updateProductStatus: async (ownerId, productId, isActive) => {
    const store = await getOwnerStore(ownerId);

    const product = await Product.findById(productId);
    if (!product || product.storeId.toString() !== store._id.toString()) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    product.isActive = Boolean(isActive);
    await product.save();
    return product;
  },

  // Delete product (Blocks deletion if inventory batches exist)
  deleteProduct: async (ownerId, productId) => {
    const store = await getOwnerStore(ownerId);

    const product = await Product.findById(productId);
    if (!product || product.storeId.toString() !== store._id.toString()) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if inventory history exists
    const batchCount = await InventoryBatch.countDocuments({ productId });
    if (batchCount > 0) {
      const error = new Error(
        'This product has inventory history and cannot be deleted. Deactivate it instead.'
      );
      error.statusCode = 400;
      throw error;
    }

    // Delete associated Cloudinary image if it exists
    if (product.imagePublicId) {
      deleteImage(product.imagePublicId).catch((err) => {
        console.warn('[ProductService] Could not delete Cloudinary image on product deletion:', err.message);
      });
    }

    // Also delete any additional images
    if (product.additionalImages && product.additionalImages.length > 0) {
      product.additionalImages.forEach((img) => {
        if (img.imagePublicId) {
          deleteImage(img.imagePublicId).catch(() => {});
        }
      });
    }

    await Product.findByIdAndDelete(productId);
    return { success: true, message: 'Product deleted successfully' };
  }
};

module.exports = productService;
