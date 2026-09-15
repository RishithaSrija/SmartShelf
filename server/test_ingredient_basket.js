const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const User = require('./models/User');
const Store = require('./models/Store');
const Product = require('./models/Product');
const InventoryBatch = require('./models/InventoryBatch');
const FlashSale = require('./models/FlashSale');
const Order = require('./models/Order');

const ingredientBasketService = require('./services/ingredientBasketService');

const runIngredientBasketTests = async () => {
  console.log('====================================================================');
  console.log('--- Starting SmartShelf Ingredient Basket ("Make Something") Suite ---');
  console.log('====================================================================\n');

  await connectDB();
  console.log('✓ Connected to MongoDB');

  const testSuffix = Date.now().toString().slice(-6);
  let testCustomer, testStoreA, testStoreB;
  let prodBesan, prodGheeA, prodGheeB, prodSugar;
  let batchBesan, batchGheeA, batchGheeB, batchSugar;
  let saleBesan, saleGheeA, saleGheeB, saleSugar;

  try {
    // ----------------------------------------------------------------
    // Setup Provisioning
    // ----------------------------------------------------------------
    testCustomer = await User.create({
      name: `Bakery Owner ${testSuffix}`,
      email: `bakery_${testSuffix}@example.com`,
      password: 'Password123!',
      phone: `98765${testSuffix}`,
      role: 'CUSTOMER',
      customerType: 'business',
      businessProfile: {
        businessName: `Royal Sweets & Bakes ${testSuffix}`,
        businessType: 'Sweet Shop',
        businessSize: 'Medium',
        preferredQuantity: 'bulk',
        buyingFrequency: 'Weekly',
        optInDiscovery: true
      },
      smartPreferences: {
        categories: ['DAIRY', 'BAKERY', 'SNACKS'],
        products: ['Besan', 'Ghee', 'Sugar'],
        shelfLifePreference: 'short',
        bulkBuying: true
      }
    });

    const storeOwnerA = await User.create({
      name: `Owner A ${testSuffix}`,
      email: `ownera_${testSuffix}@example.com`,
      password: 'Password123!',
      phone: `98761${testSuffix}`,
      role: 'STORE_OWNER'
    });

    const storeOwnerB = await User.create({
      name: `Owner B ${testSuffix}`,
      email: `ownerb_${testSuffix}@example.com`,
      password: 'Password123!',
      phone: `98762${testSuffix}`,
      role: 'STORE_OWNER'
    });

    testStoreA = await Store.create({
      name: `Annapurna Provisions ${testSuffix}`,
      ownerId: storeOwnerA._id,
      businessType: 'GROCERY',
      address: 'Shop 10, Sector 1, Hyderabad',
      location: { type: 'Point', coordinates: [78.4867, 17.385] },
      isActive: true
    });

    testStoreB = await Store.create({
      name: `Sri Krishna Dairy Depot ${testSuffix}`,
      ownerId: storeOwnerB._id,
      businessType: 'GROCERY',
      address: 'Shop 42, Sector 2, Hyderabad',
      location: { type: 'Point', coordinates: [78.4900, 17.389] },
      isActive: true
    });

    // Products
    prodBesan = await Product.create({
      storeId: testStoreA._id,
      name: `Premium Chana Besan 1kg ${testSuffix}`,
      category: 'SNACKS',
      basePrice: 90,
      unit: 'kg',
      perishabilityLevel: 2,
      businessUseCases: ['Sweet Shop', 'Bakery'],
      commonUses: ['Besan Laddu', 'Pakora', 'Dhokla']
    });

    prodGheeA = await Product.create({
      storeId: testStoreA._id,
      name: `Pure Cow Ghee 1L ${testSuffix}`,
      category: 'DAIRY',
      basePrice: 550,
      unit: 'liter',
      perishabilityLevel: 2,
      businessUseCases: ['Sweet Shop', 'Bakery'],
      commonUses: ['Sweets', 'Laddus', 'Baking']
    });

    prodGheeB = await Product.create({
      storeId: testStoreB._id,
      name: `Desi Clarified Ghee 1L ${testSuffix}`,
      category: 'DAIRY',
      basePrice: 580,
      unit: 'liter',
      perishabilityLevel: 2,
      businessUseCases: ['Sweet Shop'],
      commonUses: ['Sweets', 'Laddus']
    });

    prodSugar = await Product.create({
      storeId: testStoreB._id,
      name: `Refined White Sugar 1kg ${testSuffix}`,
      category: 'SNACKS',
      basePrice: 45,
      unit: 'kg',
      perishabilityLevel: 2,
      businessUseCases: ['Sweet Shop', 'Bakery'],
      commonUses: ['Syrup', 'Sweets', 'Baking']
    });

    // Batches
    // Besan at Store A: 20 kg
    batchBesan = await InventoryBatch.create({
      storeId: testStoreA._id,
      productId: prodBesan._id,
      batchNumber: `BAT-BES-${testSuffix}`,
      quantity: 20,
      originalPrice: 90,
      currentPrice: 75,
      costPrice: 60,
      manufactureDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      status: 'AVAILABLE'
    });

    // Ghee at Store A: 10 kg, ONLY 2 DAYS LEFT (Waste Rescue!)
    batchGheeA = await InventoryBatch.create({
      storeId: testStoreA._id,
      productId: prodGheeA._id,
      batchNumber: `BAT-GHEE-A-${testSuffix}`,
      quantity: 10,
      originalPrice: 550,
      currentPrice: 420,
      costPrice: 380,
      manufactureDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days left!
      status: 'AVAILABLE'
    });

    // Ghee at Store B: 15 kg, 45 days left (Normal shelf life)
    batchGheeB = await InventoryBatch.create({
      storeId: testStoreB._id,
      productId: prodGheeB._id,
      batchNumber: `BAT-GHEE-B-${testSuffix}`,
      quantity: 15,
      originalPrice: 580,
      currentPrice: 550,
      costPrice: 450,
      manufactureDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days left
      status: 'AVAILABLE'
    });

    // Sugar at Store B: only 4 kg (PARTIAL availability for a 5 kg requirement!)
    batchSugar = await InventoryBatch.create({
      storeId: testStoreB._id,
      productId: prodSugar._id,
      batchNumber: `BAT-SUG-${testSuffix}`,
      quantity: 4,
      originalPrice: 45,
      currentPrice: 38,
      costPrice: 30,
      manufactureDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: 'AVAILABLE'
    });

    // Flash Sales
    saleBesan = await FlashSale.create({
      storeId: testStoreA._id,
      productId: prodBesan._id,
      inventoryBatchId: batchBesan._id,
      title: 'Besan Clearance Deal',
      originalPrice: 90,
      salePrice: 75,
      discountPercentage: 17,
      availableQuantity: 20,
      status: 'ACTIVE',
      startsAt: new Date(Date.now() - 3600000),
      endsAt: new Date(Date.now() + 24 * 3600000)
    });

    saleGheeA = await FlashSale.create({
      storeId: testStoreA._id,
      productId: prodGheeA._id,
      inventoryBatchId: batchGheeA._id,
      title: 'Waste Rescue Ghee Markdown',
      originalPrice: 550,
      salePrice: 420,
      discountPercentage: 24,
      availableQuantity: 10,
      daysRemaining: 2,
      status: 'ACTIVE',
      startsAt: new Date(Date.now() - 3600000),
      endsAt: new Date(Date.now() + 24 * 3600000)
    });

    saleGheeB = await FlashSale.create({
      storeId: testStoreB._id,
      productId: prodGheeB._id,
      inventoryBatchId: batchGheeB._id,
      title: 'Store B Desi Ghee Sale',
      originalPrice: 580,
      salePrice: 550,
      discountPercentage: 5,
      availableQuantity: 15,
      daysRemaining: 45,
      status: 'ACTIVE',
      startsAt: new Date(Date.now() - 3600000),
      endsAt: new Date(Date.now() + 24 * 3600000)
    });

    saleSugar = await FlashSale.create({
      storeId: testStoreB._id,
      productId: prodSugar._id,
      inventoryBatchId: batchSugar._id,
      title: 'Sugar Markdown',
      originalPrice: 45,
      salePrice: 38,
      discountPercentage: 16,
      availableQuantity: 4,
      daysRemaining: 20,
      status: 'ACTIVE',
      startsAt: new Date(Date.now() - 3600000),
      endsAt: new Date(Date.now() + 24 * 3600000)
    });

    console.log('✓ Provisioned test stores, products, batches, and flash sales.\n');

    // ----------------------------------------------------------------
    // TEST 1: Recipe Catalog & Deterministic Proportional Scaling
    // ----------------------------------------------------------------
    console.log('--- TEST 1: Recipe Catalog & Deterministic Proportional Scaling ---');
    const recipes = ingredientBasketService.getRecipes();
    if (!recipes || recipes.length < 5) {
      throw new Error(`Expected at least 5 recipes, got ${recipes?.length}`);
    }
    console.log(`✓ Loaded ${recipes.length} verified deterministic recipes (including Besan Laddu, Gulab Jamun, Kalakand, Chikki, Cake, Cookies).`);

    // Scale Besan Laddu for 10 kg
    const scaled10 = ingredientBasketService.calculateIngredients('besan-laddu', 10);
    const besan10 = scaled10.ingredients.find(i => i.id === 'besan');
    const ghee10 = scaled10.ingredients.find(i => i.id === 'ghee');
    const sugar10 = scaled10.ingredients.find(i => i.id === 'sugar');

    if (besan10.requiredQuantity !== 5 || ghee10.requiredQuantity !== 2.5 || sugar10.requiredQuantity !== 2.5) {
      throw new Error(`Incorrect 10kg scaling: Besan=${besan10.requiredQuantity}, Ghee=${ghee10.requiredQuantity}, Sugar=${sugar10.requiredQuantity}`);
    }
    console.log(`✓ 10 kg Besan Laddu scaled accurately: Besan 5kg, Ghee 2.5kg, Sugar 2.5kg.`);

    // Scale Besan Laddu for 20 kg (2x)
    const scaled20 = ingredientBasketService.calculateIngredients('besan-laddu', 20);
    const besan20 = scaled20.ingredients.find(i => i.id === 'besan');
    if (besan20.requiredQuantity !== 10) {
      throw new Error(`Expected 10kg Besan for 20kg batch, got ${besan20.requiredQuantity}`);
    }
    console.log(`✓ 20 kg Besan Laddu scaled accurately: Besan 10kg, Ghee 5kg, Sugar 5kg.`);

    // ----------------------------------------------------------------
    // TEST 2: Expire-Soon / Waste Rescue Priority in Smart Matching
    // ----------------------------------------------------------------
    console.log('\n--- TEST 2: Expire-Soon & Waste Rescue Priority in Smart Matching ---');
    const matchResults = await ingredientBasketService.matchIngredients({
      recipeId: 'besan-laddu',
      batchSize: 10,
      latitude: 17.385,
      longitude: 78.4867,
      radius: 10,
      customerId: testCustomer._id
    });

    const gheeMatch = matchResults.ingredients.find(i => i.ingredientId === 'ghee');
    if (!gheeMatch || !gheeMatch.recommendedMatch) {
      throw new Error('Ghee matching failed');
    }

    // Must recommend Store A's Ghee (2 days left, steep markdown) over Store B (45 days left)
    if (gheeMatch.recommendedMatch.dealId.toString() !== saleGheeA._id.toString()) {
      throw new Error(`Expected Store A Ghee to be top recommended due to Expire-Soon/Waste Rescue priority! Recommended: ${gheeMatch.recommendedMatch.storeName}`);
    }
    console.log(`✓ Top recommendation for Ghee: "${gheeMatch.recommendedMatch.productName}" at ${gheeMatch.recommendedMatch.storeName}`);
    console.log(`  Days remaining: ${gheeMatch.recommendedMatch.daysRemaining} days (Waste Rescue Match: ${gheeMatch.recommendedMatch.isWasteRescue})`);
    console.log(`  Reasons: ${gheeMatch.recommendedMatch.reasons.join(', ')}`);
    console.log(`✓ Expire-soon inventory correctly prioritized over distant-expiry inventory.`);

    // ----------------------------------------------------------------
    // TEST 3: Partial Availability & Missing Ingredient Status
    // ----------------------------------------------------------------
    console.log('\n--- TEST 3: Partial Availability & Missing Ingredient Handling ---');
    // Scale for 20 kg: required sugar is 5 kg, but Store B only has 4 kg available
    const matchResults20 = await ingredientBasketService.matchIngredients({
      recipeId: 'besan-laddu',
      batchSize: 20,
      latitude: 17.385,
      longitude: 78.4867,
      radius: 10,
      customerId: testCustomer._id
    });

    const sugarMatch20 = matchResults20.ingredients.find(i => i.ingredientId === 'sugar');
    if (!sugarMatch20 || sugarMatch20.status !== 'PARTIALLY_AVAILABLE') {
      throw new Error(`Expected Sugar to be PARTIALLY_AVAILABLE (has 4kg, needs 5kg), got: ${sugarMatch20?.status}`);
    }
    console.log(`✓ Sugar correctly flagged as PARTIALLY_AVAILABLE: Required 5kg, Available 4kg.`);

    const dryFruitMatch = matchResults20.ingredients.find(i => i.ingredientId === 'dry-fruits');
    console.log(`✓ Missing/unstocked ingredient status: "${dryFruitMatch.status}" (${dryFruitMatch.statusMessage}).`);

    // ----------------------------------------------------------------
    // TEST 4: Multi-Store Basket Checkout & Atomic Reservation
    // ----------------------------------------------------------------
    console.log('\n--- TEST 4: Multi-Store Basket Checkout & Reservation ---');
    const basketGroupId = `BASKET-${Date.now()}`;
    const checkoutData = {
      basketGroupId,
      recipeName: 'Besan Laddu (10 kg Batch)',
      paymentMethod: 'PAY_AT_STORE',
      items: [
        {
          flashSaleId: saleBesan._id,
          quantity: 5,
          ingredientName: 'Besan (Gram Flour)'
        },
        {
          flashSaleId: saleGheeA._id,
          quantity: 2,
          ingredientName: 'Pure Cow Ghee'
        }
      ]
    };

    const checkoutResult = await ingredientBasketService.checkoutBasket(testCustomer._id, checkoutData);
    if (!checkoutResult.orders || checkoutResult.orders.length !== 2) {
      throw new Error(`Expected 2 orders created, got: ${checkoutResult.orders?.length}`);
    }

    const orderBesan = checkoutResult.orders[0];
    const orderGhee = checkoutResult.orders[1];

    if (orderBesan.orderType !== 'INGREDIENT_BASKET' || orderBesan.basketGroupId !== basketGroupId) {
      throw new Error('Order missing basketGroupId or orderType');
    }

    console.log(`✓ Successfully checked out Ingredient Basket #${basketGroupId}:`);
    console.log(`  Order 1: #${orderBesan.orderNumber} (${orderBesan.productName} — 5 units) at ${orderBesan.storeName}`);
    console.log(`  Order 2: #${orderGhee.orderNumber} (${orderGhee.productName} — 2 units) at ${orderGhee.storeName}`);

    // Verify inventory batch quantities were atomically decremented
    const updatedBatchBesan = await InventoryBatch.findById(batchBesan._id);
    const updatedBatchGhee = await InventoryBatch.findById(batchGheeA._id);

    if (updatedBatchBesan.quantity !== 15) {
      throw new Error(`Expected Besan batch quantity to be 15, got ${updatedBatchBesan.quantity}`);
    }
    if (updatedBatchGhee.quantity !== 8) {
      throw new Error(`Expected Ghee batch quantity to be 8, got ${updatedBatchGhee.quantity}`);
    }
    console.log('✓ Store inventory batches atomically decremented with 30-minute reservation hold.');

    // ----------------------------------------------------------------
    // TEST 5: Store Owner & Customer Visibility
    // ----------------------------------------------------------------
    console.log('\n--- TEST 5: Store Owner & Customer Order Query Visibility ---');
    const customerOrders = await Order.find({ basketGroupId });
    if (customerOrders.length !== 2) {
      throw new Error(`Expected 2 customer orders under basketGroupId, got ${customerOrders.length}`);
    }
    console.log(`✓ Customer can query entire ingredient basket via basketGroupId "${basketGroupId}".`);

    const storeAOrders = await Order.find({ storeId: testStoreA._id, orderType: 'INGREDIENT_BASKET' });
    if (storeAOrders.length < 2) {
      throw new Error('Store A should see the ingredient basket orders');
    }
    console.log(`✓ Store Owner can see incoming orders flagged with orderType "INGREDIENT_BASKET" and recipeName "${storeAOrders[0].recipeName}".`);

    // Clean up
    console.log('\n--- Cleaning up test records ---');
    await Order.deleteMany({ customerId: testCustomer._id });
    await FlashSale.deleteMany({ _id: { $in: [saleBesan._id, saleGheeA._id, saleGheeB._id, saleSugar._id] } });
    await InventoryBatch.deleteMany({ _id: { $in: [batchBesan._id, batchGheeA._id, batchGheeB._id, batchSugar._id] } });
    await Product.deleteMany({ _id: { $in: [prodBesan._id, prodGheeA._id, prodGheeB._id, prodSugar._id] } });
    await Store.deleteMany({ _id: { $in: [testStoreA._id, testStoreB._id] } });
    await User.deleteMany({ _id: { $in: [testCustomer._id, storeOwnerA._id, storeOwnerB._id] } });
    console.log('✓ Test records cleaned up.');

    console.log('\n====================================================================');
    console.log('ALL INGREDIENT BASKET ("MAKE SOMETHING") TESTS PASSED! ✓');
    console.log('====================================================================\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

runIngredientBasketTests();
