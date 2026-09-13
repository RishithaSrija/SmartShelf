const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');
const InventoryBatch = require('../models/InventoryBatch');
const FlashSale = require('../models/FlashSale');
const PricingRule = require('../models/PricingRule');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartshelf';

// Realistic Bangalore coordinates within 4km radius
const DEMO_STORES = [
  {
    name: 'FreshMart Supermarket - Indiranagar',
    email: 'owner.freshmart@smartshelf.com',
    ownerName: 'Rajesh Sharma',
    phone: '+91 98450 12345',
    address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
    businessType: 'SUPERMARKET',
    openingHours: '7:00 AM - 10:30 PM',
    coordinates: [77.6412, 12.9716],
    imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80',
    description: 'Modern neighborhood supermarket stocking dairy, farm-fresh produce, and packaged daily staples.'
  },
  {
    name: 'GreenGrocer Organic Hub - Koramangala',
    email: 'owner.greengrocer@smartshelf.com',
    ownerName: 'Ananya Deshmukh',
    phone: '+91 98450 67890',
    address: '4th Block, 80 Feet Road, Koramangala, Bengaluru, Karnataka 560034',
    businessType: 'GROCERY',
    openingHours: '8:00 AM - 9:30 PM',
    coordinates: [77.6245, 12.9352],
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    description: 'Certified organic vegetables, fresh cold-pressed beverages, seasonal fruits, and pantry goods.'
  },
  {
    name: 'The Daily Artisan Bakery - Indiranagar',
    email: 'owner.dailybaker@smartshelf.com',
    ownerName: 'Vikram Mehta',
    phone: '+91 98450 54321',
    address: '12th Main Road, Indiranagar, Bengaluru, Karnataka 560008',
    businessType: 'BAKERY',
    openingHours: '6:30 AM - 10:00 PM',
    coordinates: [77.6387, 12.9784],
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    description: 'Artisanal sourdough breads, French viennoiserie, cookies, and gourmet evening bakery specials.'
  }
];

// 26 Realistic Products with stable curated imagery
const DEMO_PRODUCTS = [
  // DAIRY (FreshMart)
  {
    name: 'Amul Taaza Homogenised Toned Milk',
    category: 'DAIRY',
    brand: 'Amul',
    unit: 'liter',
    basePrice: 54,
    description: 'Fresh toned milk processed through UHT technology for long-lasting freshness and superior nutrition.',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
    storeIndex: 0,
    shelfLifeDays: 2,
    discountPct: 40
  },
  {
    name: 'Mother Dairy Classic Dahi Curd',
    category: 'DAIRY',
    brand: 'Mother Dairy',
    unit: 'pack',
    basePrice: 45,
    description: 'Thick, creamy and naturally set dahi prepared from pasteurized double toned milk.',
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
    storeIndex: 0,
    shelfLifeDays: 1,
    discountPct: 50
  },
  {
    name: 'Britannia Cheese Slices (10 Slices)',
    category: 'DAIRY',
    brand: 'Britannia',
    unit: 'pack',
    basePrice: 165,
    description: 'Delicious processed cheese slices rich in calcium and protein. Ideal for toast and sandwiches.',
    imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80',
    storeIndex: 0,
    shelfLifeDays: 5,
    discountPct: 20
  },
  {
    name: 'Amul Salted Butter (500g)',
    category: 'DAIRY',
    brand: 'Amul',
    unit: 'pack',
    basePrice: 275,
    description: 'Iconic wholesome pasteurized cream butter with a touch of salt. A breakfast favorite.',
    imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80',
    storeIndex: 0,
    shelfLifeDays: 3,
    discountPct: 25
  },
  {
    name: 'Farm Fresh Organic Brown Eggs (Pack of 6)',
    category: 'DAIRY',
    brand: 'Eggoz',
    unit: 'box',
    basePrice: 85,
    description: 'Cruelty-free, nutritious brown eggs enriched with natural herbal feed and omega-3.',
    imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=600&q=80',
    storeIndex: 1,
    shelfLifeDays: 2,
    discountPct: 35
  },

  // BAKERY (The Daily Artisan Bakery)
  {
    name: 'Harvest Gold 100% Whole Wheat Bread',
    category: 'BAKERY',
    brand: 'Harvest Gold',
    unit: 'pack',
    basePrice: 55,
    description: 'Nutritious brown bread baked with whole wheat flour and dietary fiber with zero maida.',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
    storeIndex: 2,
    shelfLifeDays: 1,
    discountPct: 50
  },
  {
    name: 'Artisan Rustic French Sourdough Loaf',
    category: 'BAKERY',
    brand: 'The Daily Baker',
    unit: 'piece',
    basePrice: 190,
    description: 'Slow-fermented wild yeast sourdough with a caramelized crisp crust and open airy crumb.',
    imageUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=600&q=80',
    storeIndex: 2,
    shelfLifeDays: 1,
    discountPct: 45
  },
  {
    name: 'English Oven Golden Sesame Burger Buns (Pack of 4)',
    category: 'BAKERY',
    brand: 'English Oven',
    unit: 'pack',
    basePrice: 50,
    description: 'Extra soft, pillowy burger buns topped with roasted sesame seeds.',
    imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
    storeIndex: 2,
    shelfLifeDays: 2,
    discountPct: 30
  },
  {
    name: 'Britannia Good Day Cashew Cookies',
    category: 'BAKERY',
    brand: 'Britannia',
    unit: 'pack',
    basePrice: 40,
    description: 'Crunchy butter cookies packed with rich handpicked cashew nuts and creamy delight.',
    imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80',
    storeIndex: 2,
    shelfLifeDays: 10,
    discountPct: 15
  },
  {
    name: 'Freshly Baked All-Butter Flaky Croissant',
    category: 'BAKERY',
    brand: 'The Daily Baker',
    unit: 'piece',
    basePrice: 120,
    description: 'Authentic French laminated pastry with layered honeycomb texture and rich European butter aroma.',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
    storeIndex: 2,
    shelfLifeDays: 1,
    discountPct: 60
  },

  // FRUITS (GreenGrocer & FreshMart)
  {
    name: 'Himachal Royal Delicious Apples (1 kg)',
    category: 'FRUITS',
    brand: 'FarmSelect',
    unit: 'kg',
    basePrice: 180,
    description: 'Crisp, sweet, juicy red apples harvested straight from the high orchards of Shimla.',
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80',
    storeIndex: 1,
    shelfLifeDays: 3,
    discountPct: 30
  },
  {
    name: 'Fresh Robusta Golden Bananas (1 Dozen)',
    category: 'FRUITS',
    brand: 'GreenGrocer',
    unit: 'dozen',
    basePrice: 60,
    description: 'Naturally ripened nutrient-rich bananas loaded with potassium and sustained energy.',
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80',
    storeIndex: 1,
    shelfLifeDays: 1,
    discountPct: 50
  },
  {
    name: 'Nagpur Sweet Mandarin Oranges (1 kg)',
    category: 'FRUITS',
    brand: 'GreenGrocer',
    unit: 'kg',
    basePrice: 110,
    description: 'Tangy-sweet citrus mandarins brimming with natural Vitamin C and rejuvenating juice.',
    imageUrl: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&w=600&q=80',
    storeIndex: 1,
    shelfLifeDays: 2,
    discountPct: 40
  },
  {
    name: 'Ratnagiri Alphonso Mangoes (Box of 6)',
    category: 'FRUITS',
    brand: 'Devgad Special',
    unit: 'box',
    basePrice: 650,
    description: 'The undisputed King of Mangoes. Intense saffron aroma, fiberless pulp, and rich tropical sweetness.',
    imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80',
    storeIndex: 1,
    shelfLifeDays: 2,
    discountPct: 35
  },
  {
    name: 'Imported Thompson Seedless Green Grapes (500g)',
    category: 'FRUITS',
    brand: 'FreshMart',
    unit: 'pack',
    basePrice: 120,
    description: 'Crisp, seedless green grapes with an invigorating sweet-tart crunch and antioxidant power.',
    imageUrl: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=600&q=80',
    storeIndex: 0,
    shelfLifeDays: 2,
    discountPct: 35
  },

  // VEGETABLES (GreenGrocer & FreshMart)
  {
    name: 'Farm Fresh Hybrid Red Tomatoes (1 kg)',
    category: 'VEGETABLES',
    brand: 'GreenGrocer',
    unit: 'kg',
    basePrice: 40,
    description: 'Firm, sun-ripened red tomatoes ideal for salads, curries, and fresh homemade soups.',
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
    storeIndex: 1,
    shelfLifeDays: 2,
    discountPct: 45
  },
  {
    name: 'Hydroponic English Cucumber (500g)',
    category: 'VEGETABLES',
    brand: 'GreenGrocer',
    unit: 'pack',
    basePrice: 45,
    description: 'Pesticide-free crunchy European salad cucumber with thin edible skin and zero bitterness.',
    imageUrl: 'https://images.unsplash.com/photo-1449339854873-750e6913301b?auto=format&fit=crop&w=600&q=80',
    storeIndex: 1,
    shelfLifeDays: 1,
    discountPct: 50
  },
  {
    name: 'Tender Baby Spinach Leaves / Palak (250g)',
    category: 'VEGETABLES',
    brand: 'GreenGrocer',
    unit: 'pack',
    basePrice: 35,
    description: 'Hydroponically harvested tender baby spinach, pre-cleaned and rich in iron and folates.',
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80',
    storeIndex: 1,
    shelfLifeDays: 1,
    discountPct: 60
  },
  {
    name: 'Golden Jyoti Potatoes (1 kg)',
    category: 'VEGETABLES',
    brand: 'FreshMart',
    unit: 'kg',
    basePrice: 38,
    description: 'Clean, thin-skinned everyday potatoes suitable for boiling, baking, and roasting.',
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
    storeIndex: 0,
    shelfLifeDays: 7,
    discountPct: 15
  },
  {
    name: 'Crisp Ooty Carrots (500g)',
    category: 'VEGETABLES',
    brand: 'GreenGrocer',
    unit: 'pack',
    basePrice: 50,
    description: 'Sweet, vibrant orange mountain carrots grown in the cool Nilgiri hills.',
    imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80',
    storeIndex: 1,
    shelfLifeDays: 2,
    discountPct: 30
  },

  // BEVERAGES (FreshMart & GreenGrocer)
  {
    name: 'Tropicana 100% Real Orange Juice (1L)',
    category: 'BEVERAGES',
    brand: 'Tropicana',
    unit: 'liter',
    basePrice: 140,
    description: 'Refreshing pure orange juice with zero added sugar and natural citrus pulp.',
    imageUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=600&q=80',
    storeIndex: 0,
    shelfLifeDays: 2,
    discountPct: 40
  },
  {
    name: 'Raw Pressery Tender Coconut Water (200ml)',
    category: 'BEVERAGES',
    brand: 'Raw Pressery',
    unit: 'bottle',
    basePrice: 65,
    description: 'Pure, bio-available electrolytes bottled straight from fresh coastal coconuts.',
    imageUrl: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?auto=format&fit=crop&w=600&q=80',
    storeIndex: 1,
    shelfLifeDays: 1,
    discountPct: 45
  },
  {
    name: 'Brooke Bond Red Label Natural Care Tea (500g)',
    category: 'BEVERAGES',
    brand: 'Brooke Bond',
    unit: 'pack',
    basePrice: 295,
    description: 'Premium black tea blended with 5 Ayurvedic herbs: Tulsi, Ashwagandha, Mulethi, Ginger and Cardamom.',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    storeIndex: 0,
    shelfLifeDays: 30,
    discountPct: 10
  },
  {
    name: 'Nescafe Classic Instant Coffee Jar (100g)',
    category: 'BEVERAGES',
    brand: 'Nescafe',
    unit: 'bottle',
    basePrice: 340,
    description: '100% pure Robusta and Arabica coffee beans carefully roasted for a bold, invigorating aroma.',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    storeIndex: 0,
    shelfLifeDays: 30,
    discountPct: 15
  },

  // SNACKS & PANTRY (FreshMart)
  {
    name: "Lay's India's Magic Masala Potato Chips (90g)",
    category: 'SNACKS',
    brand: "Lay's",
    unit: 'pack',
    basePrice: 30,
    description: 'Crunchy ridged potato chips coated in an irresistible blend of authentic Indian spices.',
    imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80',
    storeIndex: 0,
    shelfLifeDays: 8,
    discountPct: 20
  },
  {
    name: 'Daawat Rozana Super Basmati Rice (5 kg)',
    category: 'OTHER',
    brand: 'Daawat',
    unit: 'pack',
    basePrice: 460,
    description: 'Aged long-grain Basmati rice offering delicate aroma and fluffy non-sticky grains.',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    storeIndex: 0,
    shelfLifeDays: 60,
    discountPct: 10
  }
];

async function seedDemoData() {
  console.log('====================================================');
  console.log('      SMARTSHELF REALISTIC DEMO DATA SEEDING       ');
  console.log('====================================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✓ Connected to MongoDB at ${MONGO_URI}`);

    // 1. SEED DEFAULT PRICING RULES IF NONE EXIST
    const existingRules = await PricingRule.countDocuments();
    if (existingRules === 0) {
      console.log('Seeding default smart markdown pricing rules...');
      await PricingRule.create([
        { daysBeforeExpiry: 1, discountPercentage: 50, description: '1 Day Left Markdown' },
        { daysBeforeExpiry: 2, discountPercentage: 35, description: '2 Days Left Markdown' },
        { daysBeforeExpiry: 3, discountPercentage: 25, description: '3 Days Left Markdown' },
        { daysBeforeExpiry: 5, discountPercentage: 15, description: '5 Days Left Markdown' },
        { daysBeforeExpiry: 7, discountPercentage: 10, description: '1 Week Markdown' }
      ]);
      console.log('✓ Default pricing rules created');
    }

    // 2. SEED DEMO CUSTOMER & ADMIN USERS (Idempotent)
    const demoPasswordHash = await bcrypt.hash('password123', 10);

    const customerUser = await User.findOneAndUpdate(
      { email: 'customer.demo@smartshelf.com' },
      {
        $setOnInsert: {
          name: 'Priya Sharma',
          email: 'customer.demo@smartshelf.com',
          password: demoPasswordHash,
          role: 'CUSTOMER',
          phone: '+91 98765 43210'
        }
      },
      { upsert: true, new: true }
    );

    const adminUser = await User.findOneAndUpdate(
      { email: 'admin.demo@smartshelf.com' },
      {
        $setOnInsert: {
          name: 'System Administrator',
          email: 'admin.demo@smartshelf.com',
          password: demoPasswordHash,
          role: 'ADMIN',
          phone: '+91 90000 00001'
        }
      },
      { upsert: true, new: true }
    );
    console.log('✓ Demo Customer & Admin users ensured');

    // 3. SEED DEMO STORE OWNERS & STORES (Idempotent)
    const storeDocuments = [];

    for (const storeData of DEMO_STORES) {
      // Find or create store owner user
      const ownerUser = await User.findOneAndUpdate(
        { email: storeData.email },
        {
          $setOnInsert: {
            name: storeData.ownerName,
            email: storeData.email,
            password: demoPasswordHash,
            role: 'STORE_OWNER',
            phone: storeData.phone
          }
        },
        { upsert: true, new: true }
      );

      // Find or create store
      let store = await Store.findOne({ ownerId: ownerUser._id });
      if (!store) {
        store = await Store.create({
          name: storeData.name,
          ownerId: ownerUser._id,
          description: storeData.description,
          phone: storeData.phone,
          email: storeData.email,
          address: storeData.address,
          businessType: storeData.businessType,
          openingHours: storeData.openingHours,
          location: {
            type: 'Point',
            coordinates: storeData.coordinates
          },
          imageUrl: storeData.imageUrl,
          isActive: true
        });
        console.log(`  + Created store: ${store.name}`);
      } else {
        // Update store details and image
        store.imageUrl = storeData.imageUrl;
        store.description = storeData.description;
        store.openingHours = storeData.openingHours;
        store.location = {
          type: 'Point',
          coordinates: storeData.coordinates
        };
        await store.save();
        console.log(`  ~ Updated store: ${store.name}`);
      }
      storeDocuments.push(store);
    }

    // 4. SEED PRODUCTS, INVENTORY BATCHES, AND FLASH SALES
    console.log(`\nSeeding ${DEMO_PRODUCTS.length} realistic grocery products...`);
    let productsCreated = 0;
    let productsUpdated = 0;
    let flashSalesCreated = 0;

    for (const prod of DEMO_PRODUCTS) {
      const targetStore = storeDocuments[prod.storeIndex] || storeDocuments[0];
      const normalizedName = prod.name.toLowerCase().trim();

      let product = await Product.findOne({
        storeId: targetStore._id,
        normalizedName
      });

      if (!product) {
        product = await Product.create({
          name: prod.name,
          normalizedName,
          category: prod.category,
          brand: prod.brand,
          unit: prod.unit,
          description: prod.description,
          image: prod.imageUrl,
          imageUrl: prod.imageUrl,
          storeId: targetStore._id,
          isActive: true
        });
        productsCreated++;
      } else {
        product.imageUrl = prod.imageUrl;
        product.image = prod.imageUrl;
        product.description = prod.description;
        product.brand = prod.brand;
        product.unit = prod.unit;
        await product.save();
        productsUpdated++;
      }

      // Check if an inventory batch already exists for this product
      let batch = await InventoryBatch.findOne({ productId: product._id });
      const now = new Date();
      const manufactureDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const expiryDate = new Date(now.getTime() + prod.shelfLifeDays * 24 * 60 * 60 * 1000);
      const discountPercentage = prod.discountPct || 30;
      const originalPrice = prod.basePrice;
      const discountedPrice = Math.max(1, Math.round(originalPrice * (1 - discountPercentage / 100)));
      const batchStatus = prod.shelfLifeDays <= 3 ? 'FLASH_SALE' : 'AVAILABLE';

      if (!batch) {
        batch = await InventoryBatch.create({
          productId: product._id,
          storeId: targetStore._id,
          batchNumber: `BATCH-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 900 + 100)}`,
          quantity: 20,
          originalPrice: originalPrice,
          currentPrice: discountedPrice,
          discountPercentage: discountPercentage,
          manufactureDate: manufactureDate,
          expiryDate: expiryDate,
          status: batchStatus
        });
      } else {
        // Ensure dates and pricing are kept realistic
        batch.manufactureDate = manufactureDate;
        batch.expiryDate = expiryDate;
        batch.currentPrice = discountedPrice;
        batch.discountPercentage = discountPercentage;
        batch.originalPrice = originalPrice;
        batch.status = batchStatus;
        if (batch.quantity <= 0) batch.quantity = 15;
        await batch.save();
      }

      // If batch expires in <= 3 days and has discount > 0, ensure an active FlashSale exists
      if (prod.shelfLifeDays <= 3 && discountPercentage > 0) {
        let flashSale = await FlashSale.findOne({ inventoryBatchId: batch._id });
        if (!flashSale) {
          flashSale = await FlashSale.create({
            title: `${prod.name} - Special Markdown`,
            description: `Fresh batch markdown at ${discountPercentage}% off. Limited units available before expiry.`,
            productId: product._id,
            storeId: targetStore._id,
            inventoryBatchId: batch._id,
            originalPrice: originalPrice,
            salePrice: discountedPrice,
            discountPercentage: discountPercentage,
            availableQuantity: batch.quantity,
            startsAt: new Date(),
            endsAt: expiryDate,
            status: 'ACTIVE'
          });
          flashSalesCreated++;
        } else {
          flashSale.originalPrice = originalPrice;
          flashSale.salePrice = discountedPrice;
          flashSale.discountPercentage = discountPercentage;
          flashSale.availableQuantity = batch.quantity;
          flashSale.endsAt = expiryDate;
          flashSale.status = 'ACTIVE';
          await flashSale.save();
        }
      }
    }

    console.log(`\n✓ Seed completed successfully:`);
    console.log(`   Stores: ${storeDocuments.length}`);
    console.log(`   Products: ${productsCreated} created, ${productsUpdated} updated`);
    console.log(`   Active Flash Sales Created/Synced: ${flashSalesCreated}`);
    console.log('\nDemo Logins:');
    console.log('   Customer:    customer.demo@smartshelf.com / password123');
    console.log('   Store Owner: owner.freshmart@smartshelf.com / password123');
    console.log('   Admin:       admin.demo@smartshelf.com / password123');

  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ MongoDB disconnected.');
    process.exit(0);
  }
}

seedDemoData();
