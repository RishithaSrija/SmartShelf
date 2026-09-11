const Store = require('../models/Store');
const FlashSale = require('../models/FlashSale');
const Product = require('../models/Product');
const pricingService = require('./pricingService');

/**
 * Validate geographic coordinates and search radius
 * Latitude: -90 to 90
 * Longitude: -180 to 180
 * Radius: > 0 to <= 50 (km)
 */
const validateCoordinates = (latitude, longitude, radius = 5) => {
  if (latitude === undefined || latitude === null || latitude === '') {
    return { isValid: false, message: 'Latitude coordinate is required' };
  }
  if (longitude === undefined || longitude === null || longitude === '') {
    return { isValid: false, message: 'Longitude coordinate is required' };
  }

  const parsedLat = parseFloat(latitude);
  const parsedLng = parseFloat(longitude);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return { isValid: false, message: 'Invalid location coordinates' };
  }

  if (parsedLat < -90 || parsedLat > 90) {
    return { isValid: false, message: 'Latitude must be between -90 and 90 degrees' };
  }

  if (parsedLng < -180 || parsedLng > 180) {
    return { isValid: false, message: 'Longitude must be between -180 and 180 degrees' };
  }

  if (radius !== undefined && radius !== null && radius !== '') {
    const parsedRadius = parseFloat(radius);
    if (isNaN(parsedRadius) || parsedRadius <= 0 || parsedRadius > 50) {
      return { isValid: false, message: 'Radius must be between 0.1 and 50 km' };
    }
  }

  return {
    isValid: true,
    latitude: parsedLat,
    longitude: parsedLng,
    radius: radius ? Math.min(50, Math.max(0.1, parseFloat(radius))) : 5
  };
};

/**
 * Format distance in kilometers for display
 * Example: 1.24 -> "1.2 km" or "1.24 km"
 */
const calculateDistanceLabel = (distanceKm) => {
  if (distanceKm === undefined || distanceKm === null || isNaN(distanceKm)) {
    return null;
  }
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
};

/**
 * Retrieve active flash sales near given customer coordinates
 * Uses MongoDB $geoNear geospatial aggregation stage on 2dsphere index of Store
 */
const getNearbyFlashSales = async (queryParams = {}) => {
  const validation = validateCoordinates(
    queryParams.latitude,
    queryParams.longitude,
    queryParams.radius
  );

  if (!validation.isValid) {
    const error = new Error(validation.message);
    error.statusCode = 400;
    throw error;
  }

  const { latitude, longitude, radius } = validation;
  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 12));
  const skip = (page - 1) * limit;
  const sortMode = queryParams.sort || 'distance';

  // 1. Perform MongoDB $geoNear aggregation on Store collection using 2dsphere index
  // Note: maxDistance is in meters for spherical queries
  const maxDistanceMeters = radius * 1000;

  const nearbyStores = await Store.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [longitude, latitude] // GeoJSON [lng, lat]
        },
        distanceField: 'distanceMeters',
        maxDistance: maxDistanceMeters,
        spherical: true,
        query: { isActive: true } // Only return active stores
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        address: 1,
        businessType: 1,
        phone: 1,
        openingHours: 1,
        location: 1,
        distanceMeters: 1
      }
    }
  ]);

  if (!nearbyStores || nearbyStores.length === 0) {
    return {
      flashSales: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0
      },
      searchCenter: { latitude, longitude, radius }
    };
  }

  // Create a fast lookup map: storeId -> storeDetails & distanceKm
  const storeMap = new Map();
  const nearbyStoreIds = [];

  for (const st of nearbyStores) {
    const distanceKm = parseFloat((st.distanceMeters / 1000).toFixed(2));
    storeMap.set(st._id.toString(), {
      _id: st._id,
      name: st.name,
      address: st.address,
      businessType: st.businessType,
      phone: st.phone,
      openingHours: st.openingHours,
      location: st.location,
      distanceKm,
      distanceLabel: calculateDistanceLabel(distanceKm)
    });
    nearbyStoreIds.push(st._id);
  }

  // 2. Build Flash Sale query for nearby stores
  const now = new Date();
  const flashSaleFilter = {
    storeId: { $in: nearbyStoreIds },
    status: 'ACTIVE',
    availableQuantity: { $gt: 0 },
    endsAt: { $gt: now }
  };

  // Category filter
  if (queryParams.category && queryParams.category.toUpperCase() !== 'ALL') {
    const matchingProducts = await Product.find({
      category: queryParams.category.toUpperCase()
    }).select('_id');
    const productIds = matchingProducts.map((p) => p._id);
    flashSaleFilter.productId = { $in: productIds };
  }

  // Search filter across title, description, or product name/brand or store name
  if (queryParams.search && queryParams.search.trim()) {
    const searchRegex = new RegExp(queryParams.search.trim(), 'i');

    const matchingProducts = await Product.find({
      $or: [{ name: searchRegex }, { brand: searchRegex }]
    }).select('_id');

    const matchingStores = await Store.find({
      _id: { $in: nearbyStoreIds },
      name: searchRegex
    }).select('_id');

    const productIds = matchingProducts.map((p) => p._id);
    const matchedStoreIds = matchingStores.map((s) => s._id);

    flashSaleFilter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { productId: { $in: productIds } },
      { storeId: { $in: matchedStoreIds } }
    ];
  }

  // Fetch all matching active flash sales within the nearby stores
  const rawFlashSales = await FlashSale.find(flashSaleFilter)
    .populate('productId', 'name category brand unit image description')
    .populate('inventoryBatchId', 'batchNumber expiryDate');

  // Attach store info & distanceKm and calculate whole calendar days remaining
  const formattedDeals = rawFlashSales
    .map((deal) => {
      const storeInfo = storeMap.get(deal.storeId.toString());
      if (!storeInfo) return null;

      const daysRemaining = deal.inventoryBatchId?.expiryDate
        ? pricingService.calculateDaysRemaining(deal.inventoryBatchId.expiryDate)
        : 0;

      return {
        id: deal._id,
        _id: deal._id,
        title: deal.title,
        description: deal.description,
        originalPrice: deal.originalPrice,
        salePrice: deal.salePrice,
        discountPercentage: deal.discountPercentage,
        availableQuantity: deal.availableQuantity,
        startsAt: deal.startsAt,
        endsAt: deal.endsAt,
        status: deal.status,
        daysRemaining,
        product: {
          id: deal.productId?._id,
          _id: deal.productId?._id,
          name: deal.productId?.name || 'Product',
          category: deal.productId?.category,
          brand: deal.productId?.brand,
          unit: deal.productId?.unit,
          image: deal.productId?.image,
          description: deal.productId?.description
        },
        store: {
          id: storeInfo._id,
          _id: storeInfo._id,
          name: storeInfo.name,
          address: storeInfo.address,
          businessType: storeInfo.businessType,
          phone: storeInfo.phone,
          openingHours: storeInfo.openingHours,
          location: storeInfo.location
        },
        distanceKm: storeInfo.distanceKm,
        distanceLabel: storeInfo.distanceLabel,
        createdAt: deal.createdAt
      };
    })
    .filter(Boolean);

  // 3. Sorting
  if (sortMode === 'expiry') {
    formattedDeals.sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt) || a.distanceKm - b.distanceKm);
  } else if (sortMode === 'discount' || sortMode === '-discount') {
    formattedDeals.sort((a, b) => b.discountPercentage - a.discountPercentage || a.distanceKm - b.distanceKm);
  } else if (sortMode === 'price') {
    formattedDeals.sort((a, b) => a.salePrice - b.salePrice || a.distanceKm - b.distanceKm);
  } else {
    // Default: sort by distance ascending (nearest stores first)
    formattedDeals.sort((a, b) => a.distanceKm - b.distanceKm || new Date(a.endsAt) - new Date(b.endsAt));
  }

  // 4. Pagination
  const total = formattedDeals.length;
  const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
  const paginatedDeals = formattedDeals.slice(skip, skip + limit);

  return {
    flashSales: paginatedDeals,
    pagination: {
      page,
      limit,
      total,
      totalPages
    },
    searchCenter: { latitude, longitude, radius }
  };
};

module.exports = {
  validateCoordinates,
  calculateDistanceLabel,
  getNearbyFlashSales
};
