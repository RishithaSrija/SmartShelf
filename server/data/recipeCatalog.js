/**
 * Deterministic Recipe Catalog for SmartShelf Ingredient Basket ("Make Something")
 * All ingredient ratios are deterministic per base batch size (10 kg).
 * Proportional scaling multiplies or divides these ratios precisely without using LLMs.
 */

const recipeCatalog = [
  // --- Indian Sweets ---
  {
    id: 'besan-laddu',
    name: 'Besan Laddu',
    category: 'Indian Sweets',
    description: 'Traditional roasted gram flour sweet balls infused with aromatic cow ghee and cardamom.',
    icon: '🍬',
    baseBatchSize: 10,
    unit: 'kg',
    popularWith: ['Sweet Shop', 'Caterer', 'Cloud Kitchen'],
    ingredients: [
      {
        id: 'besan',
        name: 'Besan (Gram Flour)',
        ratioPer10Kg: 5.0,
        unit: 'kg',
        keywords: ['besan', 'gram flour', 'chana flour'],
        categories: ['SNACKS', 'BAKERY', 'OTHER']
      },
      {
        id: 'ghee',
        name: 'Pure Cow Ghee',
        ratioPer10Kg: 2.5,
        unit: 'kg',
        keywords: ['ghee', 'clarified butter', 'butter'],
        categories: ['DAIRY', 'OTHER']
      },
      {
        id: 'sugar',
        name: 'Refined Sugar / Bura',
        ratioPer10Kg: 2.5,
        unit: 'kg',
        keywords: ['sugar', 'bura', 'sweetener'],
        categories: ['SNACKS', 'OTHER', 'BAKERY']
      },
      {
        id: 'dry-fruits',
        name: 'Cashews & Cardamom',
        ratioPer10Kg: 0.2,
        unit: 'kg',
        optional: true,
        keywords: ['cashew', 'kaju', 'cardamom', 'elaichi', 'almond', 'badam'],
        categories: ['SNACKS', 'OTHER']
      }
    ]
  },
  {
    id: 'gulab-jamun',
    name: 'Gulab Jamun',
    category: 'Indian Sweets',
    description: 'Soft milk-solid dough balls fried in ghee and soaked in fragrant rose-cardamom sugar syrup.',
    icon: '🍯',
    baseBatchSize: 10,
    unit: 'kg',
    popularWith: ['Sweet Shop', 'Restaurant', 'Caterer'],
    ingredients: [
      {
        id: 'khoya-dairy',
        name: 'Khoya / Fresh Milk',
        ratioPer10Kg: 4.0,
        unit: 'kg',
        keywords: ['khoya', 'mawa', 'milk', 'buffalo milk', 'dairy'],
        categories: ['DAIRY']
      },
      {
        id: 'flour',
        name: 'Maida (Refined Flour)',
        ratioPer10Kg: 1.0,
        unit: 'kg',
        keywords: ['maida', 'flour', 'all purpose flour'],
        categories: ['BAKERY', 'OTHER']
      },
      {
        id: 'sugar',
        name: 'Sugar (for Syrup)',
        ratioPer10Kg: 4.5,
        unit: 'kg',
        keywords: ['sugar', 'sweetener'],
        categories: ['SNACKS', 'OTHER', 'BAKERY']
      },
      {
        id: 'ghee-oil',
        name: 'Ghee / Cooking Oil',
        ratioPer10Kg: 0.5,
        unit: 'kg',
        keywords: ['ghee', 'oil', 'cooking oil'],
        categories: ['DAIRY', 'OTHER']
      }
    ]
  },
  {
    id: 'kalakand',
    name: 'Kalakand',
    category: 'Indian Sweets',
    description: 'Rich, moist and granular Indian milk fudge made from reduced whole milk, chenna and sugar.',
    icon: '🥛',
    baseBatchSize: 10,
    unit: 'kg',
    popularWith: ['Sweet Shop', 'Dairy Shop'],
    ingredients: [
      {
        id: 'whole-milk',
        name: 'Whole Milk / Chenna',
        ratioPer10Kg: 7.0,
        unit: 'liter',
        keywords: ['milk', 'chenna', 'paneer', 'whole milk'],
        categories: ['DAIRY']
      },
      {
        id: 'sugar',
        name: 'Sugar',
        ratioPer10Kg: 2.5,
        unit: 'kg',
        keywords: ['sugar', 'sweetener'],
        categories: ['SNACKS', 'OTHER', 'BAKERY']
      },
      {
        id: 'pistachio-cardamom',
        name: 'Pistachios & Cardamom',
        ratioPer10Kg: 0.5,
        unit: 'kg',
        optional: true,
        keywords: ['pista', 'pistachio', 'cardamom', 'elaichi'],
        categories: ['SNACKS', 'OTHER']
      }
    ]
  },
  {
    id: 'peda',
    name: 'Dharwad / Mathura Peda',
    category: 'Indian Sweets',
    description: 'Caramelized reduced milk solids blended with ghee and dusted with fine sugar crystals.',
    icon: '✨',
    baseBatchSize: 10,
    unit: 'kg',
    popularWith: ['Sweet Shop', 'Caterer'],
    ingredients: [
      {
        id: 'khoya',
        name: 'Khoya / Reduced Milk',
        ratioPer10Kg: 6.5,
        unit: 'kg',
        keywords: ['khoya', 'mawa', 'milk', 'dairy'],
        categories: ['DAIRY']
      },
      {
        id: 'sugar',
        name: 'Fine Sugar / Boora',
        ratioPer10Kg: 3.0,
        unit: 'kg',
        keywords: ['sugar', 'bura', 'boora', 'sweetener'],
        categories: ['SNACKS', 'OTHER']
      },
      {
        id: 'ghee-aromatics',
        name: 'Cow Ghee & Spices',
        ratioPer10Kg: 0.5,
        unit: 'kg',
        keywords: ['ghee', 'cardamom', 'butter'],
        categories: ['DAIRY', 'OTHER']
      }
    ]
  },
  {
    id: 'kaju-katli',
    name: 'Kaju Katli',
    category: 'Indian Sweets',
    description: 'Diamond-shaped royal fudge prepared with pulverized cashews, sugar syrup and ghee.',
    icon: '💎',
    baseBatchSize: 10,
    unit: 'kg',
    popularWith: ['Sweet Shop', 'Luxury Confectionery'],
    ingredients: [
      {
        id: 'cashews',
        name: 'Cashews (Kaju)',
        ratioPer10Kg: 6.0,
        unit: 'kg',
        keywords: ['cashew', 'kaju', 'dry fruit'],
        categories: ['SNACKS', 'OTHER']
      },
      {
        id: 'sugar',
        name: 'Refined Sugar',
        ratioPer10Kg: 3.5,
        unit: 'kg',
        keywords: ['sugar', 'sweetener'],
        categories: ['SNACKS', 'OTHER']
      },
      {
        id: 'ghee',
        name: 'Pure Ghee',
        ratioPer10Kg: 0.5,
        unit: 'kg',
        keywords: ['ghee', 'butter'],
        categories: ['DAIRY', 'OTHER']
      }
    ]
  },

  // --- Traditional Snacks / Sweets ---
  {
    id: 'chikki',
    name: 'Peanut Chikki',
    category: 'Traditional Snacks / Sweets',
    description: 'Crispy, crunchy brittle slab made with roasted peanuts and caramelized sugarcane jaggery.',
    icon: '🥜',
    baseBatchSize: 10,
    unit: 'kg',
    popularWith: ['Sweet Shop', 'Snack Manufacturer', 'Caterer'],
    ingredients: [
      {
        id: 'peanuts',
        name: 'Roasted Peanuts',
        ratioPer10Kg: 5.0,
        unit: 'kg',
        keywords: ['peanut', 'groundnut', 'peanuts'],
        categories: ['SNACKS', 'OTHER']
      },
      {
        id: 'jaggery',
        name: 'Jaggery (Gud) / Sugar',
        ratioPer10Kg: 5.0,
        unit: 'kg',
        keywords: ['jaggery', 'gud', 'sugar'],
        categories: ['SNACKS', 'OTHER']
      }
    ]
  },
  {
    id: 'peanut-laddu',
    name: 'Peanut Laddu',
    category: 'Traditional Snacks / Sweets',
    description: 'Nutritious energy spheres made from crushed peanuts, jaggery and pure ghee.',
    icon: '🌰',
    baseBatchSize: 10,
    unit: 'kg',
    popularWith: ['Sweet Shop', 'Health Café'],
    ingredients: [
      {
        id: 'peanuts',
        name: 'Roasted Peanuts',
        ratioPer10Kg: 5.0,
        unit: 'kg',
        keywords: ['peanut', 'groundnut'],
        categories: ['SNACKS', 'OTHER']
      },
      {
        id: 'jaggery',
        name: 'Organic Jaggery (Gud)',
        ratioPer10Kg: 4.0,
        unit: 'kg',
        keywords: ['jaggery', 'gud', 'sugar'],
        categories: ['SNACKS', 'OTHER']
      },
      {
        id: 'ghee',
        name: 'Desi Cow Ghee',
        ratioPer10Kg: 1.0,
        unit: 'kg',
        keywords: ['ghee', 'butter'],
        categories: ['DAIRY', 'OTHER']
      }
    ]
  },

  // --- Bakery ---
  {
    id: 'sponge-cake',
    name: 'Commercial Sponge Cake',
    category: 'Bakery',
    description: 'Light and airy bakery sponge cake base for layer cakes, pastries, and tea-time cakes.',
    icon: '🧁',
    baseBatchSize: 10,
    unit: 'kg',
    popularWith: ['Bakery', 'Café', 'Cloud Kitchen'],
    ingredients: [
      {
        id: 'flour',
        name: 'Maida / Cake Flour',
        ratioPer10Kg: 3.0,
        unit: 'kg',
        keywords: ['maida', 'flour', 'all purpose flour'],
        categories: ['BAKERY', 'OTHER']
      },
      {
        id: 'sugar',
        name: 'Fine Castor Sugar',
        ratioPer10Kg: 3.0,
        unit: 'kg',
        keywords: ['sugar', 'sweetener'],
        categories: ['SNACKS', 'OTHER', 'BAKERY']
      },
      {
        id: 'butter-fat',
        name: 'Bakery Butter / Fat',
        ratioPer10Kg: 2.0,
        unit: 'kg',
        keywords: ['butter', 'ghee', 'oil', 'margarine'],
        categories: ['DAIRY', 'OTHER']
      },
      {
        id: 'milk-eggs',
        name: 'Fresh Milk / Eggs',
        ratioPer10Kg: 2.0,
        unit: 'liter',
        keywords: ['milk', 'egg', 'dairy'],
        categories: ['DAIRY', 'BEVERAGES']
      }
    ]
  },
  {
    id: 'bakery-cookies',
    name: 'Bakery Butter Cookies',
    category: 'Bakery',
    description: 'Crisp, golden melt-in-mouth cookies crafted with churned butter, refined flour and sugar.',
    icon: '🍪',
    baseBatchSize: 10,
    unit: 'kg',
    popularWith: ['Bakery', 'Café'],
    ingredients: [
      {
        id: 'flour',
        name: 'Flour (Maida / Atta)',
        ratioPer10Kg: 4.5,
        unit: 'kg',
        keywords: ['maida', 'flour', 'atta'],
        categories: ['BAKERY', 'OTHER']
      },
      {
        id: 'butter',
        name: 'Creamery Butter / Ghee',
        ratioPer10Kg: 3.0,
        unit: 'kg',
        keywords: ['butter', 'ghee', 'fat'],
        categories: ['DAIRY', 'OTHER']
      },
      {
        id: 'sugar',
        name: 'Powdered Sugar',
        ratioPer10Kg: 2.5,
        unit: 'kg',
        keywords: ['sugar', 'bura'],
        categories: ['SNACKS', 'OTHER', 'BAKERY']
      }
    ]
  },
  {
    id: 'bakery-muffins',
    name: 'Fresh Bakery Muffins',
    category: 'Bakery',
    description: 'Moist single-portion quick breads ideal for café display counters and breakfast trays.',
    icon: '🥧',
    baseBatchSize: 10,
    unit: 'kg',
    popularWith: ['Bakery', 'Café', 'Restaurant'],
    ingredients: [
      {
        id: 'flour',
        name: 'Flour (Maida)',
        ratioPer10Kg: 3.5,
        unit: 'kg',
        keywords: ['maida', 'flour'],
        categories: ['BAKERY', 'OTHER']
      },
      {
        id: 'sugar',
        name: 'Granulated Sugar',
        ratioPer10Kg: 2.5,
        unit: 'kg',
        keywords: ['sugar', 'sweetener'],
        categories: ['SNACKS', 'OTHER', 'BAKERY']
      },
      {
        id: 'dairy-milk',
        name: 'Fresh Milk / Curd',
        ratioPer10Kg: 2.0,
        unit: 'liter',
        keywords: ['milk', 'curd', 'yogurt'],
        categories: ['DAIRY']
      },
      {
        id: 'fat',
        name: 'Butter / Oil',
        ratioPer10Kg: 2.0,
        unit: 'kg',
        keywords: ['butter', 'oil', 'ghee'],
        categories: ['DAIRY', 'OTHER']
      }
    ]
  }
];

module.exports = recipeCatalog;
