const productService = require('../services/productService');

// @desc    Create a new product
// @route   POST /api/products
// @access  Private (STORE_OWNER)
const createProduct = async (req, res) => {
  try {
    const product = await productService.createProduct(req.user._id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('[ProductController] createProduct error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while creating product'
    });
  }
};

// @desc    Get products for store owner (with search, filter, pagination)
// @route   GET /api/products
// @access  Private (STORE_OWNER)
const getProducts = async (req, res) => {
  try {
    const result = await productService.getStoreProducts(req.user._id, req.query);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[ProductController] getProducts error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while fetching products'
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Private (STORE_OWNER)
const getProductById = async (req, res) => {
  try {
    const product = await productService.getProductById(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('[ProductController] getProductById error:', error.message);
    return res.status(error.statusCode || 404).json({
      success: false,
      message: error.message || 'Product not found'
    });
  }
};

// @desc    Update product details
// @route   PUT /api/products/:id
// @access  Private (STORE_OWNER)
const updateProduct = async (req, res) => {
  try {
    const product = await productService.updateProduct(
      req.user._id,
      req.params.id,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('[ProductController] updateProduct error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while updating product'
    });
  }
};

// @desc    Update product active status
// @route   PATCH /api/products/:id/status
// @access  Private (STORE_OWNER)
const updateProductStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const product = await productService.updateProductStatus(
      req.user._id,
      req.params.id,
      isActive
    );
    return res.status(200).json({
      success: true,
      message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
      data: product
    });
  } catch (error) {
    console.error('[ProductController] updateProductStatus error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error while toggling product status'
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (STORE_OWNER)
const deleteProduct = async (req, res) => {
  try {
    const result = await productService.deleteProduct(req.user._id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[ProductController] deleteProduct error:', error.message);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Unable to delete product'
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  updateProductStatus,
  deleteProduct
};
