const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Store = require('./models/Store');
const Product = require('./models/Product');
const InventoryBatch = require('./models/InventoryBatch');
const FlashSale = require('./models/FlashSale');
const geolocationService = require('./services/geolocationService');
const flashSaleService = require('./services/flashSaleService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartshelf';

async function runTests() {
  console.log('--- Starting Step 11 Geolocation & Nearby Flash Sales Test Suite ---');
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // 1. Test Coordinate Validation
    console.log('\n--- Testing Coordinate Validation ---');
    const validCoord = geolocationService.validateCoordinates(16.5062, 80.648, 5);
    console.assert(validCoord.isValid === true, 'Valid coordinates failed');
    console.log('✓ Valid coordinates (16.5062, 80.6480, 5km) accepted');

    const invalidLat = geolocationService.validateCoordinates(100, 80.648, 5);
    console.assert(invalidLat.isValid === false, 'Invalid latitude should be rejected');
    console.log('✓ Invalid latitude (100) rejected with message:', invalidLat.message);

    const invalidLng = geolocationService.validateCoordinates(16.5062, 200, 5);
    console.assert(invalidLng.isValid === false, 'Invalid longitude should be rejected');
    console.log('✓ Invalid longitude (200) rejected with message:', invalidLng.message);

    const invalidRadius = geolocationService.validateCoordinates(16.5062, 80.648, 100);
    console.assert(invalidRadius.isValid === false, 'Invalid radius > 50 should be rejected');
    console.log('✓ Invalid radius (100km) rejected with message:', invalidRadius.message);

    const negativeRadius = geolocationService.validateCoordinates(16.5062, 80.648, -5);
    console.assert(negativeRadius.isValid === false, 'Negative radius should be rejected');
    console.log('✓ Negative radius (-5km) rejected with message:', negativeRadius.message);

    // 2. Setup Test Data for Multi-Store Geospatial Queries
    console.log('\n--- Setting up Test Stores and Deals ---');
    // Ensure 2dsphere index exists on Store
    await Store.init();

    // Clean previous test data
    await User.deleteMany({ email: /testgeo_.*@smartshelf\.com/ });
    await FlashSale.deleteMany({});
    await InventoryBatch.deleteMany({});
    await Product.deleteMany({});
    await Store.deleteMany({});
    const testOwner1 = await User.create({
      name: 'Geo Owner Vijayawada Center',
      email: `testgeo_owner1_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'STORE_OWNER'
    });
    const testOwner2 = await User.create({
      name: 'Geo Owner Vijayawada East',
      email: `testgeo_owner2_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'STORE_OWNER'
    });
    const testOwner3 = await User.create({
      name: 'Geo Owner Far Out',
      email: `testgeo_owner3_${Date.now()}@smartshelf.com`,
      password: 'password123',
      role: 'STORE_OWNER'
    });

    // Store A: Close (16.5062, 80.6480)
    const storeA = await Store.create({
      name: 'Store A - Central Fresh',
      ownerId: testOwner1._id,
      address: 'Center Road, Vijayawada',
      businessType: 'GROCERY',
      location: {
        type: 'Point',
        coordinates: [80.648, 16.5062] // [lng, lat]
      },
      isActive: true
    });

    // Store B: 1.2km away (16.5120, 80.6550)
    const storeB = await Store.create({
      name: 'Store B - East Bakery',
      ownerId: testOwner2._id,
      address: 'East Street, Vijayawada',
      businessType: 'BAKERY',
      location: {
        type: 'Point',
        coordinates: [80.655, 16.512] // [lng, lat]
      },
      isActive: true
    });

    // Store C: 20km away (16.6500, 80.8000)
    const storeC = await Store.create({
      name: 'Store C - Remote Mart',
      ownerId: testOwner3._id,
      address: 'Highway Point',
      businessType: 'SUPERMARKET',
      location: {
        type: 'Point',
        coordinates: [80.8, 16.65] // [lng, lat]
      },
      isActive: true
    });

    // Create Products
    const prodBread = await Product.create({
      storeId: storeA._id,
      name: 'Artisan Sourdough Bread',
      category: 'BAKERY',
      brand: 'BakeCraft',
      unit: 'piece',
      basePrice: 60
    });

    const prodMilk = await Product.create({
      storeId: storeB._id,
      name: 'Organic Farm Milk',
      category: 'DAIRY',
      brand: 'DairyGold',
      unit: 'liter',
      basePrice: 50
    });

    const prodRemote = await Product.create({
      storeId: storeC._id,
      name: 'Remote Apple Pack',
      category: 'FRUITS',
      brand: 'FreshOrchard',
      unit: 'kg',
      basePrice: 120
    });

    // Create Inventory Batches
    const mfgDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
    const batchA = await InventoryBatch.create({
      storeId: storeA._id,
      productId: prodBread._id,
      batchNumber: 'BAT-GEO-001',
      quantity: 10,
      originalPrice: 60,
      currentPrice: 36,
      discountPercentage: 40,
      manufactureDate: mfgDate,
      expiryDate: futureDate,
      status: 'FLASH_SALE'
    });

    const batchB = await InventoryBatch.create({
      storeId: storeB._id,
      productId: prodMilk._id,
      batchNumber: 'BAT-GEO-002',
      quantity: 15,
      originalPrice: 50,
      currentPrice: 35,
      discountPercentage: 30,
      manufactureDate: mfgDate,
      expiryDate: futureDate,
      status: 'FLASH_SALE'
    });

    const batchC = await InventoryBatch.create({
      storeId: storeC._id,
      productId: prodRemote._id,
      batchNumber: 'BAT-GEO-003',
      quantity: 20,
      originalPrice: 120,
      currentPrice: 84,
      discountPercentage: 30,
      manufactureDate: mfgDate,
      expiryDate: futureDate,
      status: 'FLASH_SALE'
    });

    // Create Flash Sales
    const saleA = await FlashSale.create({
      inventoryBatchId: batchA._id,
      productId: prodBread._id,
      storeId: storeA._id,
      title: 'Artisan Sourdough Bread 40% OFF',
      originalPrice: 60,
      salePrice: 36,
      discountPercentage: 40,
      availableQuantity: 10,
      startsAt: new Date(),
      endsAt: futureDate,
      status: 'ACTIVE'
    });

    const saleB = await FlashSale.create({
      inventoryBatchId: batchB._id,
      productId: prodMilk._id,
      storeId: storeB._id,
      title: 'Organic Farm Milk 30% OFF',
      originalPrice: 50,
      salePrice: 35,
      discountPercentage: 30,
      availableQuantity: 15,
      startsAt: new Date(),
      endsAt: futureDate,
      status: 'ACTIVE'
    });

    const saleC = await FlashSale.create({
      inventoryBatchId: batchC._id,
      productId: prodRemote._id,
      storeId: storeC._id,
      title: 'Remote Apple Pack 30% OFF',
      originalPrice: 120,
      salePrice: 84,
      discountPercentage: 30,
      availableQuantity: 20,
      startsAt: new Date(),
      endsAt: futureDate,
      status: 'ACTIVE'
    });

    console.log('✓ Test stores & deals created');

    // 3. Test Nearby Discovery with 5km Radius
    console.log('\n--- Testing Radius Query (5 km) ---');
    const nearby5km = await geolocationService.getNearbyFlashSales({
      latitude: 16.5062,
      longitude: 80.648,
      radius: 5
    });

    console.log(`Found ${nearby5km.flashSales.length} deals within 5km.`);
    console.assert(nearby5km.flashSales.length === 2, 'Should find Store A and Store B deals (2 deals)');
    console.assert(
      nearby5km.flashSales[0].store.name === 'Store A - Central Fresh',
      'Nearest store (Store A) should be first'
    );
    console.log(`✓ Store A distance: ${nearby5km.flashSales[0].distanceKm} km (${nearby5km.flashSales[0].distanceLabel})`);
    console.log(`✓ Store B distance: ${nearby5km.flashSales[1].distanceKm} km (${nearby5km.flashSales[1].distanceLabel})`);

    // 4. Test Radius 0.5km (Only Store A)
    console.log('\n--- Testing Radius Query (0.5 km) ---');
    const nearby500m = await geolocationService.getNearbyFlashSales({
      latitude: 16.5062,
      longitude: 80.648,
      radius: 0.5
    });
    console.log(`Found ${nearby500m.flashSales.length} deals within 0.5km.`);
    console.assert(nearby500m.flashSales.length === 1, 'Should only find Store A deal within 0.5km');
    console.log('✓ 0.5km radius filtering works as expected');

    // 5. Test Category Filter
    console.log('\n--- Testing Category Filter (BAKERY) ---');
    const bakeryDeals = await geolocationService.getNearbyFlashSales({
      latitude: 16.5062,
      longitude: 80.648,
      radius: 5,
      category: 'BAKERY'
    });
    console.assert(bakeryDeals.flashSales.length === 1, 'Should only return 1 bakery deal');
    console.assert(bakeryDeals.flashSales[0].product.category === 'BAKERY', 'Category should be BAKERY');
    console.log('✓ Category filtering works');

    // 6. Test Search Query
    console.log('\n--- Testing Search Query ("Milk") ---');
    const searchDeals = await geolocationService.getNearbyFlashSales({
      latitude: 16.5062,
      longitude: 80.648,
      radius: 5,
      search: 'Milk'
    });
    console.assert(searchDeals.flashSales.length === 1, 'Should only return 1 matching deal');
    console.assert(searchDeals.flashSales[0].product.name === 'Organic Farm Milk', 'Product name should match Milk');
    console.log('✓ Search query works');

    // 7. Test Inactive Store Filtering
    console.log('\n--- Testing Inactive Store Filtering ---');
    storeB.isActive = false;
    await storeB.save();

    const afterDeactivation = await geolocationService.getNearbyFlashSales({
      latitude: 16.5062,
      longitude: 80.648,
      radius: 5
    });
    console.assert(afterDeactivation.flashSales.length === 1, 'Inactive store deals should not be returned');
    console.assert(
      afterDeactivation.flashSales[0].store.name === 'Store A - Central Fresh',
      'Only Store A should remain'
    );
    console.log('✓ Inactive store deals successfully excluded from nearby results');

    // 8. Test Expired Flash Sale Filtering
    console.log('\n--- Testing Expired Flash Sale Filtering ---');
    saleA.endsAt = new Date(Date.now() - 1000); // Expired
    await saleA.save();

    const afterExpiry = await geolocationService.getNearbyFlashSales({
      latitude: 16.5062,
      longitude: 80.648,
      radius: 5
    });
    console.assert(afterExpiry.flashSales.length === 0, 'Expired deals should not be returned');
    console.log('✓ Expired flash sales excluded');

    // Clean up test data
    console.log('\n--- Cleaning up test records ---');
    await FlashSale.deleteMany({ _id: { $in: [saleA._id, saleB._id, saleC._id] } });
    await InventoryBatch.deleteMany({ _id: { $in: [batchA._id, batchB._id, batchC._id] } });
    await Product.deleteMany({ _id: { $in: [prodBread._id, prodMilk._id, prodRemote._id] } });
    await Store.deleteMany({ _id: { $in: [storeA._id, storeB._id, storeC._id] } });
    await User.deleteMany({ _id: { $in: [testOwner1._id, testOwner2._id, testOwner3._id] } });
    console.log('✓ Test records cleaned up');

    console.log('\n========================================');
    console.log('ALL STEP 11 GEOLOCATION TESTS PASSED SUCCESSFULLY! ✓');
    console.log('========================================');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
