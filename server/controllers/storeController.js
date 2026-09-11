const Store = require('../models/Store');

// @desc    Create a new store for logged-in store owner
// @route   POST /api/stores
// @access  Private (STORE_OWNER, ADMIN)
const createStore = async (req, res) => {
  try {
    const {
      name,
      description,
      phone,
      email,
      address,
      businessType,
      openingHours,
      latitude,
      longitude
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Store name is required'
      });
    }

    if (!businessType) {
      return res.status(400).json({
        success: false,
        message: 'Business type is required'
      });
    }

    const validBusinessTypes = ['GROCERY', 'BAKERY', 'RESTAURANT', 'SUPERMARKET', 'OTHER'];
    if (!validBusinessTypes.includes(businessType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid business type specified'
      });
    }

    // Check if store owner already owns a store
    const existingStore = await Store.findOne({ ownerId: req.user._id });
    if (existingStore) {
      return res.status(400).json({
        success: false,
        message: 'You already own a registered store',
        data: existingStore
      });
    }

    // Parse location coordinates
    let locationObj = {
      type: 'Point',
      coordinates: [0, 0]
    };

    if (longitude !== undefined && latitude !== undefined && longitude !== '' && latitude !== '') {
      const parsedLng = parseFloat(longitude);
      const parsedLat = parseFloat(latitude);
      if (isNaN(parsedLng) || isNaN(parsedLat)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid location coordinates'
        });
      }
      if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Latitude must be between -90 and 90, Longitude between -180 and 180'
        });
      }
      locationObj.coordinates = [parsedLng, parsedLat];
    }

    const store = await Store.create({
      name: name.trim(),
      ownerId: req.user._id,
      description: description ? description.trim() : '',
      phone: phone ? phone.trim() : '',
      email: email ? email.trim().toLowerCase() : req.user.email,
      address: address ? address.trim() : '',
      businessType: businessType.toUpperCase(),
      openingHours: openingHours ? openingHours.trim() : '',
      location: locationObj,
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message: 'Store created successfully',
      data: store
    });
  } catch (error) {
    console.error('[StoreController] createStore error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating store'
    });
  }
};

// @desc    Get store belonging to the logged-in store owner
// @route   GET /api/stores/mystore
// @access  Private (STORE_OWNER, ADMIN)
const getMyStore = async (req, res) => {
  try {
    const store = await Store.findOne({ ownerId: req.user._id }).populate(
      'ownerId',
      'name email phone role'
    );

    if (!store) {
      return res.status(200).json({
        success: true,
        message: 'No store registered for this owner',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error('[StoreController] getMyStore error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching store profile'
    });
  }
};

// @desc    Get single store by ID
// @route   GET /api/stores/:id
// @access  Public
const getStoreById = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id).populate(
      'ownerId',
      'name email phone'
    );

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error('[StoreController] getStoreById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching store'
    });
  }
};

// @desc    Update store belonging to logged-in store owner
// @route   PUT /api/stores/mystore
// @access  Private (STORE_OWNER, ADMIN)
const updateStore = async (req, res) => {
  try {
    let store = await Store.findOne({ ownerId: req.user._id });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found for this owner'
      });
    }

    const {
      name,
      description,
      phone,
      email,
      address,
      businessType,
      openingHours,
      latitude,
      longitude
    } = req.body;

    if (name !== undefined) store.name = name.trim();
    if (description !== undefined) store.description = description.trim();
    if (phone !== undefined) store.phone = phone.trim();
    if (email !== undefined) store.email = email.trim().toLowerCase();
    if (address !== undefined) store.address = address.trim();
    if (openingHours !== undefined) store.openingHours = openingHours.trim();

    if (businessType) {
      const validBusinessTypes = ['GROCERY', 'BAKERY', 'RESTAURANT', 'SUPERMARKET', 'OTHER'];
      if (!validBusinessTypes.includes(businessType.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid business type specified'
        });
      }
      store.businessType = businessType.toUpperCase();
    }

    if (longitude !== undefined || latitude !== undefined) {
      if (longitude === undefined || latitude === undefined || longitude === '' || latitude === '') {
        return res.status(400).json({
          success: false,
          message: 'Both latitude and longitude are required to update store location'
        });
      }
      const parsedLng = parseFloat(longitude);
      const parsedLat = parseFloat(latitude);
      if (isNaN(parsedLng) || isNaN(parsedLat)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid location coordinates'
        });
      }
      if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Latitude must be between -90 and 90, Longitude between -180 and 180'
        });
      }
      store.location = {
        type: 'Point',
        coordinates: [parsedLng, parsedLat]
      };
    }

    const updatedStore = await store.save();

    return res.status(200).json({
      success: true,
      message: 'Store updated successfully',
      data: updatedStore
    });
  } catch (error) {
    console.error('[StoreController] updateStore error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating store'
    });
  }
};

// @desc    Toggle store active/inactive status
// @route   PATCH /api/stores/mystore/status
// @access  Private (STORE_OWNER, ADMIN)
const toggleStoreStatus = async (req, res) => {
  try {
    const store = await Store.findOne({ ownerId: req.user._id });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found for this owner'
      });
    }

    store.isActive = !store.isActive;
    await store.save();

    return res.status(200).json({
      success: true,
      message: `Store ${store.isActive ? 'activated' : 'deactivated'} successfully`,
      data: store
    });
  } catch (error) {
    console.error('[StoreController] toggleStoreStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while toggling store status'
    });
  }
};

module.exports = {
  createStore,
  getMyStore,
  getStoreById,
  updateStore,
  toggleStoreStatus
};
