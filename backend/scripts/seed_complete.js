const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '../src/data/localsampark.db');
const db = new sqlite3.Database(dbPath);

const PILOT_LAT = 18.5913;
const PILOT_LNG = 73.8987;

async function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
    if (isSelect) {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows });
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve();
      });
    }
  });
}

// Extensive realistic data generator
const generateShopNames = (categoryId) => {
  const names = {
    'cat_001': ['Sharma Kirana Store', 'Daily Needs Mart', 'Fresh Basket Supermarket'],
    'cat_002': ['Spice Garden Family Restaurant', 'Chai Point Café', 'Punjabi Tadka Dhaba'],
    'cat_003': ['Lifeline Pharmacy', 'Sanjeevani Medico', 'Wellness Medical Store'],
    'cat_004': ['Fresh Cut Meat Shop', 'Green Leaf Veggies', 'Farmer Direct Produce'],
    'cat_005': ['Amul Milk Point', 'Shree Krishna Sweets', 'New Bakery & Cakes'],
    'cat_006': ['Saraswati Book Depot', 'Creative Gifts & Stationers', 'Student Point'],
    'cat_007': ['Pushpa Florist', 'Green Earth Nursery', 'Floral Boutique'],
    'cat_008': ['Paws & Claws Pet Shop', 'Happy Tails Clinic & Store', 'Pet Paradise'],
    'cat_009': ['Om Pooja Bhandar', 'Shree Ram Samagri', 'Divine Devotional Store'],
    'cat_010': ['Clear Vision Opticals', 'Lens & Frames Center', 'City Eye Care'],
    'cat_011': ['QuickFix Plumbing & Home', 'Reliable Home Services', 'A to Z Maintenance'],
    'cat_012': ['Glamour Cuts Unisex Salon', 'Style Studio Beauty Spa', 'Royal Men\'s Parlour'],
    'cat_013': ['Bright Spark Electricians', 'Modern Electronics Repair', 'Shreeji Electricals'],
    'cat_014': ['Success Point Tutorials', 'Excel Education Academy', 'Bright Future Classes'],
    'cat_015': ['Vishwakarma Hardware', 'BuildWell Sanitary & Paints', 'Steel & Tools Mart'],
    'cat_016': ['Fashion Hub', 'Trendz Clothing', 'Shree Boutique'],
    'cat_017': ['Gold\'s Fitness Gym', 'Powerhouse Health Club', 'Fit & Fine Yoga Studio'],
    'cat_018': ['Prime Properties', 'Dream Home Realtors', 'Cityscape Estate Agents'],
    'cat_019': ['Speed Auto Garage', 'Royal Bike Service Center', 'CarFix 4W Workshop'],
    'cat_020': ['Smile Dental Clinic', 'Painless Tooth Care', 'City Orthodontics'],
    'cat_021': ['Accurate Pathology Lab', 'Care Diagnostics Center', 'HealthCheck Labs'],
    'cat_022': ['Relief Physiotherapy Clinic', 'Active Rehab Center', 'HealWell Chiropractic'],
    'cat_023': ['Dhanvantari Ayurveda', 'Nature Cure Homeopathy', 'Holistic Healing Center'],
    'cat_024': ['Terminex Pest Control', 'Clean & Safe Pest Services', 'EcoGuard Solutions'],
    'cat_025': ['Sparkle Deep Cleaning', 'Shine Bright Home Services', 'ProClean Experts'],
    'cat_026': ['Cool Breeze AC Repair', 'FixIt Appliance Service', 'Urban Tech Support'],
    'cat_027': ['Pure Drop RO Service', 'Aqua Care Purifiers', 'Crystal Clear Water Solutions'],
    'cat_028': ['Wash & Wear Laundry', 'White Swan Dry Cleaners', 'Quick Iron & Wash'],
    'cat_029': ['Perfect Stitch Tailors', 'Elegance Designer Boutique', 'Custom Fit Alterations'],
    'cat_030': ['Express Car Wash', 'Shine & Polish Auto Care', 'Sparkling Wheels Detailing'],
    'cat_031': ['Safe Drive Motor Training', 'Maruti Driving School', 'Confidence Auto Learn'],
    'cat_032': ['Royal Feast Caterers', 'Delicious Party Services', 'Annapurna Food Providers'],
    'cat_033': ['Celebration Event Planners', 'Dream Decorators', 'Festive Occasions Management'],
    'cat_034': ['Candid Moments Photography', 'Focus Video & Photo Studio', 'Memories Digital Labs'],
    'cat_035': ['Gupta & Associates CA', 'TaxPro Consultants', 'Clear Accounts Financial Services'],
    'cat_036': ['Justice Legal Associates', 'Legal Shield Advocates', 'Trust Law Chamber'],
    'cat_037': ['Secure Life Insurance Agency', 'Max Protect Advisors', 'Future Safe Insurance Services'],
    'cat_038': ['Prana Yoga Studio', 'Mind & Body Wellness', 'Aura Healing Center'],
    'cat_039': ['NutriFit Diet Clinic', 'Health Balance Nutritionist', 'Slim & Smart Diet Center'],
    'cat_040': ['Lifeline Multi-Specialty Hospital', 'City Care OPD Clinic', 'Sai Polyclinic'],
    'cat_041': ['Metro 2W Repair Shop', 'Highway 4W Service Center', 'Quick Fix Auto Garage']
  };
  return names[categoryId] || [`Shop 1 ${categoryId}`, `Shop 2 ${categoryId}`, `Shop 3 ${categoryId}`];
};

const getProducts = (categoryId) => {
  const genericProducts = [
    { name: 'Standard Item 1', price: 100 },
    { name: 'Premium Item', price: 500 }
  ];
  
  const products = {
    'cat_001': [
      { name: 'Amul Taaza Milk 1L', price: 68 },
      { name: 'Aashirvaad Atta 5kg', price: 230 },
      { name: 'Tata Salt 1kg', price: 25 },
      { name: 'Fortune Sunflower Oil 1L', price: 155 },
      { name: 'India Gate Basmati Rice 1kg', price: 110 }
    ],
    'cat_002': [
      { name: 'Butter Chicken Full', price: 350 },
      { name: 'Paneer Tikka Masala', price: 280 },
      { name: 'Veg Biryani', price: 180 },
      { name: 'Masala Dosa', price: 90 },
      { name: 'Cold Coffee', price: 120 }
    ],
    'cat_003': [
      { name: 'Dolo 650 Strip', price: 30 },
      { name: 'Vicks Vaporub 25g', price: 95 },
      { name: 'Band-Aid Washproof 10s', price: 25 },
      { name: 'Eno Lemon Pack', price: 50 },
      { name: 'Dettol Antiseptic Liquid', price: 199 }
    ],
    'cat_015': [
      { name: 'Asian Paints White 1L', price: 250 },
      { name: 'Nylon Rope 10m', price: 80 },
      { name: 'LED Bulb 9W', price: 120 },
      { name: 'Screwdriver Set', price: 350 }
    ],
    'cat_016': [
      { name: 'Men Casual Shirt', price: 699 },
      { name: 'Women Cotton Kurti', price: 850 },
      { name: 'Kids Denim Jeans', price: 499 },
      { name: 'Sports T-Shirt', price: 350 }
    ]
  };
  
  return products[categoryId] || genericProducts;
};

const getServices = (categoryId) => {
  const genericServices = [
    { name: 'Basic Consultation', price: 300, duration: 30 },
    { name: 'Advanced Service', price: 1000, duration: 60 }
  ];

  const services = {
    'cat_012': [
      { name: 'Men Haircut', price: 150, duration: 30 },
      { name: 'Women Hair Trimming', price: 250, duration: 30 },
      { name: 'Fruit Facial', price: 600, duration: 45 },
      { name: 'Hair Color', price: 800, duration: 60 },
      { name: 'Bridal Makeup', price: 5000, duration: 120 }
    ],
    'cat_020': [
      { name: 'Dental Checkup', price: 300, duration: 15 },
      { name: 'Teeth Cleaning (Scaling)', price: 1000, duration: 45 },
      { name: 'Root Canal Treatment', price: 4500, duration: 60 },
      { name: 'Tooth Extraction', price: 800, duration: 30 }
    ],
    'cat_040': [
      { name: 'General Physician Consultation', price: 400, duration: 15 },
      { name: 'Specialist Consultation', price: 700, duration: 20 },
      { name: 'Blood Test Package', price: 1200, duration: 15 },
      { name: 'ECG', price: 350, duration: 15 }
    ],
    'cat_041': [
      { name: 'Two-Wheeler Paid Service', price: 450, duration: 60 },
      { name: 'Car Basic Service', price: 2500, duration: 120 },
      { name: 'Car Wash & Polish', price: 600, duration: 45 },
      { name: 'Engine Oil Change', price: 850, duration: 30 }
    ],
    'cat_011': [
      { name: 'Tap/Pipe Repair', price: 250, duration: 30 },
      { name: 'Bathroom Fitting Install', price: 400, duration: 60 },
      { name: 'Water Tank Cleaning', price: 800, duration: 90 }
    ]
  };

  return services[categoryId] || genericServices;
};

const getStaff = (categoryId) => {
  const genericStaff = [
    { name: 'Ravi Kumar', role: 'Expert' },
    { name: 'Priya Singh', role: 'Specialist' }
  ];

  const staff = {
    'cat_012': [
      { name: 'Amit Sharma', role: 'Senior Stylist' },
      { name: 'Neha Patel', role: 'Makeup Artist' },
      { name: 'Sunil Verma', role: 'Barber' }
    ],
    'cat_020': [
      { name: 'Dr. Rahul Desai', role: 'Orthodontist' },
      { name: 'Dr. Sneha Joshi', role: 'Endodontist' }
    ],
    'cat_040': [
      { name: 'Dr. Ramesh Patil', role: 'General Physician' },
      { name: 'Dr. Meera Iyer', role: 'Pediatrician' },
      { name: 'Sister Anita', role: 'Head Nurse' }
    ],
    'cat_041': [
      { name: 'Bablu Mechanic', role: 'Senior Mechanic' },
      { name: 'Chotu', role: 'Helper' }
    ]
  };

  return staff[categoryId] || genericStaff;
};

async function seedComplete() {
  console.log('🚀 Starting Complete Seed Process...');
  const dummyOwnerId = 'usr_000000000000000000000'; 
  const dummyUserId = 'usr_111111111111111111111'; // Mock customer

  try {
    // 1. CLEAR EXISTING DEMO DATA
    console.log('🧹 Clearing old demo data...');
    await query("DELETE FROM shop_orders");
    await query("DELETE FROM shop_appointments");
    await query("DELETE FROM staff_availability");
    await query("DELETE FROM shop_staff");
    await query("DELETE FROM shop_services");
    await query("DELETE FROM shop_products");
    await query("DELETE FROM local_shops"); // Nuke all shops for a clean slate
    
    // Create a dummy user if not exists
    const { rows: users } = await query("SELECT id FROM users WHERE id = ?", [dummyUserId]);
    if (users.length === 0) {
        await query("INSERT INTO users (id, phone_number, full_name, role) VALUES (?, ?, ?, ?)", [dummyUserId, '9999999999', 'Demo Customer', 'user']);
    }

    // 2. FETCH CATEGORIES
    const { rows: categories } = await query('SELECT * FROM shop_categories WHERE is_active = 1');
    console.log(`📦 Found ${categories.length} active categories.`);

    let shopsCount = 0;
    let productsCount = 0;
    let servicesCount = 0;
    let staffCount = 0;

    // 3. GENERATE SHOPS & DATA
    for (const category of categories) {
      const names = generateShopNames(category.id);
      
      for (let i = 0; i < names.length; i++) {
        const shopId = uuidv4();
        const lat = PILOT_LAT + (Math.random() * 0.04 - 0.02);
        const lng = PILOT_LNG + (Math.random() * 0.04 - 0.02);
        
        // Insert Shop
        await query(`
          INSERT INTO local_shops (
            id, name, description, address, owner_id,
            approval_status, is_active, latitude, longitude, category_id, category,
            is_premium, delivery_available, pickup_available, 
            estimated_delivery_time, phone_number, coordinate
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          shopId, names[i], `Welcome to ${names[i]}. The best ${category.name} in town.`, '123 Main Road, Dhanori, Pune', dummyOwnerId,
          'approved', 1, lat, lng, category.id, category.slug,
          i === 0 ? 1 : 0, // Make first shop premium
          category.business_model === 'product' || category.business_model === 'hybrid' ? 1 : 0, 1,
          '30-45 mins', '9876543210', `POINT(${lng} ${lat})`
        ]);
        shopsCount++;

        // Insert Products (if applicable)
        if (category.business_model === 'product' || category.business_model === 'hybrid') {
          const prods = getProducts(category.id);
          for (const p of prods) {
            await query(`INSERT INTO shop_products (id, shop_id, name, description, price, is_available) VALUES (?, ?, ?, ?, ?, 1)`,
              [uuidv4(), shopId, p.name, `Premium quality ${p.name}`, p.price]);
            productsCount++;
          }
          
          // Seed 1 Order
          if (i === 0) {
             await query(`INSERT INTO shop_orders (id, shop_id, user_id, total_amount, items, payment_method, delivery_address, customer_name, customer_phone, tracking_otp, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                 uuidv4(), shopId, dummyUserId, prods[0].price, JSON.stringify([{name: prods[0].name, quantity: 1, price: prods[0].price}]),
                 'cod', 'Sample Address, Dhanori', 'Demo Customer', '9999999999', '1234', 'delivered'
             ]);
          }
        }

        // Insert Services & Staff (if applicable)
        if (category.business_model === 'appointment' || category.business_model === 'hybrid') {
          const servs = getServices(category.id);
          for (const s of servs) {
            await query(`INSERT INTO shop_services (id, shop_id, name, description, duration_minutes, price, is_available) VALUES (?, ?, ?, ?, ?, ?, 1)`,
              [uuidv4(), shopId, s.name, `Expert ${s.name} service`, s.duration, s.price]);
            servicesCount++;
          }

          const staffMembers = getStaff(category.id);
          for (const st of staffMembers) {
            const staffId = uuidv4();
            await query(`INSERT INTO shop_staff (id, shop_id, name, role, phone_number, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
              [staffId, shopId, st.name, st.role, '9876543210']);
            staffCount++;

            // Seed Staff Availability
            for (let day = 1; day <= 6; day++) { // Mon-Sat
              await query(`INSERT INTO staff_availability (id, staff_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available) VALUES (?, ?, ?, ?, ?, ?, 1)`,
                [uuidv4(), staffId, day, '09:00', '18:00', 30]);
            }
            
            // Seed 1 Appointment
            if (i === 0 && st === staffMembers[0]) {
               await query(`INSERT INTO shop_appointments (id, shop_id, staff_id, user_id, appointment_date, time_slot, status, payment_method, final_price)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                   uuidv4(), shopId, staffId, dummyUserId, new Date().toISOString().split('T')[0], '10:00', 'completed', 'cod', servs[0].price
               ]);
            }
          }
        }
      }
    }

    console.log(`✅ Success! Seeded:`);
    console.log(`  - ${shopsCount} Shops`);
    console.log(`  - ${productsCount} Products`);
    console.log(`  - ${servicesCount} Services`);
    console.log(`  - ${staffCount} Staff Members with schedules`);
    console.log(`  - Mock Orders & Appointments created`);

  } catch (err) {
    console.error('❌ Error seeding complete database:', err);
  } finally {
    db.close();
  }
}

seedComplete();
