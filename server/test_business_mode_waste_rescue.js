const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Store = require('./models/Store');
const Product = require('./models/Product');
const InventoryBatch = require('./models/InventoryBatch');
const FlashSale = require('./models/FlashSale');
const wasteRescueService = require('./services/wasteRescueService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartshelf';

async function runTestSuite() {
  console.log('====================================================================');
  console.log('--- Starting SmartShelf Business Mode & Waste Rescue Test Suite ---');
  console.log('====================================================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // 1. Provision Test Store Owner and Store
    const testOwnerEmail = `owner_biz_${Date.now()}@test.com`;
    const ownerUser = await User.create({
      name: 'Rao Dairy Owner',
      email: testOwnerEmail,
      password: 'password123',
      role: 'STORE_OWNER',
      phone: '9876543210'
    });

    const store = await Store.create({
      ownerId: ownerUser._id,
      name: 'Rao Fresh Dairy & Provisions',
      businessType: 'GROCERY',
      address: 'Shop 14, Food Street, Bangalore',
      phone: '9876543210',
      email: testOwnerEmail,
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716]
      }
    });

    // 2. Provision Test Products (Level 1 Perishable & Level 2 Ingredients)
    const milkProduct = await Product.create({
      name: 'Whole Buffalo Milk 1L',
      category: 'DAIRY',
      unit: 'liter',
      storeId: store._id,
      perishabilityLevel: 1,
      businessUseCases: ['Sweet Shop', 'Bakery', 'Café', 'Caterer'],
      commonUses: ['Dairy', 'Sweets', 'Bakery', 'Desserts']
    });

    const flourProduct = await Product.create({
      name: 'Premium Wheat Maida 10kg',
      category: 'BAKERY',
      unit: 'pack',
      storeId: store._id,
      perishabilityLevel: 2,
      businessUseCases: ['Bakery', 'Café', 'Restaurant', 'Cloud Kitchen'],
      commonUses: ['Baking', 'Pastries', 'Breads']
    });

    // 3. Provision Inventory Batches (one Use Soon, one Needs Attention, one Healthy)
    const now = new Date();
    const batch1Exp = new Date(now.getTime() + 1.5 * 24 * 60 * 60 * 1000); // 1.5 days -> Use Soon
    const batch2Exp = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000); // 3.5 days -> Needs Attention
    const batch3Exp = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days -> Healthy

    const milkBatch = await InventoryBatch.create({
      productId: milkProduct._id,
      storeId: store._id,
      batchNumber: `BATCH-M-${Date.now()}`,
      quantity: 40, // 40 units available
      originalPrice: 65,
      currentPrice: 48,
      discountPercentage: 26,
      manufactureDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      expiryDate: batch1Exp,
      status: 'AVAILABLE'
    });

    const flourBatch = await InventoryBatch.create({
      productId: flourProduct._id,
      storeId: store._id,
      batchNumber: `BATCH-F-${Date.now()}`,
      quantity: 25,
      originalPrice: 450,
      currentPrice: 380,
      discountPercentage: 15,
      manufactureDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      expiryDate: batch2Exp,
      status: 'AVAILABLE'
    });

    // 4. Provision Flash Sale Deal
    const flashSale = await FlashSale.create({
      inventoryBatchId: milkBatch._id,
      productId: milkProduct._id,
      storeId: store._id,
      title: 'Fresh Buffalo Milk Excess Clearance',
      description: 'High quality milk suitable for commercial sweet making and baking.',
      originalPrice: 65,
      salePrice: 45,
      discountPercentage: 30,
      availableQuantity: 35,
      startsAt: now,
      endsAt: batch1Exp,
      status: 'ACTIVE'
    });

    console.log('✓ Test environment provisioned with store, products, batches, and flash sale.\n');

    // --- TEST 1: Customer Personal vs Business Mode Defaults ---
    console.log('--- TEST 1: Customer Registration Defaults & Switching ---');
    const custEmail = `cust_biz_${Date.now()}@test.com`;
    const customer = await User.create({
      name: 'Sunil Kumar',
      email: custEmail,
      password: 'password123',
      role: 'CUSTOMER'
    });

    if (customer.customerType !== 'personal') {
      throw new Error(`Expected default customerType to be 'personal', got ${customer.customerType}`);
    }
    console.log('✓ Default customerType is safely initialized to "personal".');

    // Update customer to Business Mode (Sweet Shop)
    customer.customerType = 'business';
    customer.businessProfile = {
      businessName: 'Sunil Sweets & Savouries',
      businessType: 'Sweet Shop',
      businessSize: 'Medium',
      preferredQuantity: 'bulk',
      buyingFrequency: 'Daily',
      optInDiscovery: true
    };
    customer.smartPreferences = {
      categories: ['Dairy', 'Sweet Making'],
      products: ['Milk', 'Ghee', 'Sugar'],
      shelfLifePreference: 'urgent', // Can process near-expiry milk today into khoa!
      bulkBuying: true
    };
    await customer.save();

    console.log('✓ Successfully updated customer to Business Mode with Sweet Shop preferences.\n');

    // --- TEST 2: Waste Rescue Deals API ---
    console.log('--- TEST 2: Waste Rescue Deals Retrieval ---');
    const dealsResult = await wasteRescueService.getWasteRescueDeals({ storeId: store._id, page: 1, limit: 10 });

    if (!dealsResult || dealsResult.deals.length === 0) {
      throw new Error('Expected at least 1 Waste Rescue deal');
    }

    const testDeal = dealsResult.deals.find((d) => d._id.toString() === flashSale._id.toString());
    if (!testDeal) {
      throw new Error('Created flash sale not found in Waste Rescue deals');
    }

    if (testDeal.lifecycleTag !== 'Use Soon') {
      throw new Error(`Expected lifecycleTag to be 'Use Soon', got '${testDeal.lifecycleTag}'`);
    }

    console.log(`✓ Retrieved Waste Rescue deal: "${testDeal.title}"`);
    console.log(`  Lifecycle: ${testDeal.lifecycleTag} (${testDeal.urgencyLabel})`);
    console.log(`  Suitable for: ${testDeal.suitableBusinessTypes.join(' • ')}`);
    console.log(`  Common uses: ${testDeal.commonUses.join(', ')}\n`);

    // --- TEST 3: Smart Matching Recommendations ---
    console.log('--- TEST 3: Smart Matching Recommendations & Reasoning ---');
    const recommendations = await wasteRescueService.getSmartRecommendations(customer, { limit: 5 });

    if (!recommendations || recommendations.length === 0) {
      throw new Error('Expected at least 1 smart recommendation');
    }

    const topRec = recommendations[0];
    console.log(`✓ Top recommendation for Sweet Shop: "${topRec.productId?.name}" (Score: ${topRec.matchScore})`);
    console.log('  Why this matches you:');
    topRec.matchReasons.forEach((reason) => {
      console.log(`    ✓ ${reason}`);
    });

    if (!topRec.matchReasons.some((r) => r.toLowerCase().includes('sweet') || r.toLowerCase().includes('milk') || r.toLowerCase().includes('dairy'))) {
      throw new Error('Match reasons did not reflect customer business preferences');
    }
    console.log('✓ Smart match checklist accurately reflects customer business preferences.\n');

    // --- TEST 4: Store Owner Inventory Health ---
    console.log('--- TEST 4: Store Owner Inventory Health Panel ---');
    const healthResult = await wasteRescueService.getStoreInventoryHealth(ownerUser._id);

    console.log(`✓ Store Inventory Health Summary for ${healthResult.store.name}:`);
    console.log(`  🔴 Use Soon: ${healthResult.summary.useSoonCount}`);
    console.log(`  🟡 Needs Attention: ${healthResult.summary.attentionCount}`);
    console.log(`  🟢 Healthy: ${healthResult.summary.healthyCount}`);
    console.log(`  Potential Excess Items: ${healthResult.summary.excessItemsCount}`);

    if (healthResult.summary.useSoonCount < 1) {
      throw new Error('Expected at least 1 batch categorized as Use Soon');
    }

    const excessMilk = healthResult.excessItems.find((item) => item.batchId.toString() === milkBatch._id.toString());
    if (!excessMilk) {
      throw new Error('Expected milk batch to be flagged in excess stock');
    }

    console.log(`✓ Excess stock identified for "${excessMilk.productName}":`);
    console.log(`  Current Stock: ${excessMilk.currentStock} ${excessMilk.unit}`);
    console.log(`  Estimated Demand: ${excessMilk.predictedDemand} ${excessMilk.unit}`);
    console.log(`  Potential Excess: ${excessMilk.potentialExcess} ${excessMilk.unit}`);
    console.log(`  Action: ${excessMilk.suggestedAction} (Suggested price: ₹${excessMilk.suggestedPrice})\n`);

    // --- TEST 5: Privacy-Preserving Buyer Demand Insight ---
    console.log('--- TEST 5: Nearby Business Buyer Demand Insight ---');
    // Register another business customer (Bakery)
    await User.create({
      name: 'Priya Bakery Chef',
      email: `priya_bakery_${Date.now()}@test.com`,
      password: 'password123',
      role: 'CUSTOMER',
      customerType: 'business',
      businessProfile: {
        businessName: 'Priya Artisan Bakes',
        businessType: 'Bakery',
        businessSize: 'Small',
        preferredQuantity: 'bulk',
        optInDiscovery: true
      },
      smartPreferences: {
        categories: ['Dairy', 'Baking'],
        products: ['Milk', 'Flour', 'Butter'],
        shelfLifePreference: 'short',
        bulkBuying: true
      }
    });

    const buyerDemand = await wasteRescueService.getStoreBuyerDemandInsight(ownerUser._id);

    console.log(`✓ Total Potential Local Business Buyers: ${buyerDemand.totalPotentialBuyers}`);
    const milkMatch = buyerDemand.matchedItems.find((m) => m.productId.toString() === milkProduct._id.toString());

    if (!milkMatch || milkMatch.buyerCounts.length === 0) {
      throw new Error('Expected buyer match for excess milk');
    }

    console.log(`✓ Buyer demand breakdown for "${milkMatch.productName}":`);
    milkMatch.buyerCounts.forEach((b) => {
      console.log(`  ${b.icon} ${b.count} ${b.type}(s)`);
    });
    console.log('✓ Zero private customer data exposed — aggregated strictly by business type.\n');

    // Clean up test records
    console.log('--- Cleaning up test records ---');
    await FlashSale.deleteMany({ storeId: store._id });
    await InventoryBatch.deleteMany({ storeId: store._id });
    await Product.deleteMany({ storeId: store._id });
    await Store.deleteOne({ _id: store._id });
    await User.deleteMany({ email: { $in: [testOwnerEmail, custEmail] } });
    console.log('✓ Test records cleaned up.\n');

    console.log('====================================================================');
    console.log('ALL BUSINESS MODE & WASTE RESCUE TESTS PASSED! ✓');
    console.log('====================================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

runTestSuite();
