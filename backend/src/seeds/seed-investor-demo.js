/**
 * Investor demo seeder.
 *
 * Creates the twelve demo personas and a coherent dataset behind them, so the
 * app can be walked end to end without a single empty screen.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * The twelve `+9190000000NN` demo logins did not work. `/auth/verify-otp`
 * short-circuits those numbers and *synthesises* a user object with an id like
 * `mock-user-1789749865283`, which it never persists. `authenticate` then does
 *
 *     queryOne('SELECT * FROM users WHERE id = $1', [decoded.userId])
 *
 * against the users table, finds nothing, and returns `401 User not found.` —
 * verified by hand against a running server: a valid society_admin token was
 * rejected by all 25 society endpoints.
 *
 * So the demo accounts could sign in and then do nothing at all. Seeding them
 * as real rows is what makes the personas usable, and it is why this seeder
 * writes through `config/database` (the same layer `authenticate` reads) rather
 * than through Prisma, which points at a different datasource entirely.
 *
 * ── Idempotency ───────────────────────────────────────────────────────────
 *
 * Every row this seeder owns carries a deterministic `demo-` prefixed id. A run
 * deletes its own rows and reinserts them, so running it twice is the same as
 * running it once, and it never touches a row it did not create.
 *
 * Usage:
 *     npm run seed:demo --workspace=backend
 *     node backend/src/seeds/seed-investor-demo.js --verify
 */

const crypto = require('crypto');
const { query, queryOne, connectDB } = require('../config/database');
const { seedId, seedLike } = require('../utils/fixtureIds');

// Every 'demo-…' label below is stored as its deterministic UUID (seedId), so
// the same demo seeds SQLite and PostgreSQL (whose id columns are mostly UUID),
// and teardown/verify select the seeder's rows by the UUID's leading segments.
const asId = (v) => (typeof v === 'string' && /^demo-[A-Za-z0-9_-]+$/.test(v) ? seedId(v) : v);

const VERIFY_ONLY = process.argv.includes('--verify');

// ─── Personas ───────────────────────────────────────────────────────────────
// The phone numbers and roles mirror the roleMap in
// modules/core/routes/auth.routes.js exactly. If that map changes, this must
// change with it, or a demo login mints a token for a role with no row.
const PERSONAS = [
  { n: 1, role: 'user', name: 'Sunita Bhosale', flat: null, headline: 'Consumer / resident' },
  { n: 2, role: 'resident_member', name: 'Abhijeet Kulkarni', flat: 'B-404', headline: 'Society resident' },
  { n: 3, role: 'society_admin', name: 'Meera Joshi', flat: 'A-101', headline: 'Society committee' },
  { n: 4, role: 'security_guard', name: 'Ramesh Yadav', flat: null, headline: 'Gate guard' },
  { n: 5, role: 'shop_owner', name: 'Vikas Sharma', flat: null, headline: 'Merchant' },
  { n: 6, role: 'service_provider', name: 'Imran Shaikh', flat: null, headline: 'Home services pro' },
  { n: 7, role: 'delivery_agent', name: 'Rohan Patil', flat: null, headline: 'Delivery runner' },
  { n: 8, role: 'field_agent', name: 'Kiran More', flat: null, headline: 'Field agent' },
  { n: 9, role: 'area_agent', name: 'Snehal Pawar', flat: null, headline: 'Area agent' },
  { n: 10, role: 'territory_admin', name: 'Sunil Deshmukh', flat: null, headline: 'Franchise partner' },
  { n: 11, role: 'moderator', name: 'Anjali Nair', flat: null, headline: 'Community moderator' },
  { n: 12, role: 'super_admin', name: 'Platform Admin', flat: null, headline: 'Super admin' },
];

const phoneFor = (n) => `+9190000000${String(n).padStart(2, '0')}`;
const userId = (n) => `demo-user-${String(n).padStart(2, '0')}`;

// ─── Catalogue ──────────────────────────────────────────────────────────────
// One shop per category the platform actually ships, each with a real product
// list. Generic filler reads as filler on a projector; these are the kinds of
// items a Pune neighbourhood shop stocks.
const SHOPS = [
  {
    id: 'demo-shop-01', name: 'Sharma Fresh Supermarket', category: 'grocery',
    archetype: 'retail', desc: 'Daily groceries, fresh produce and household essentials.',
    address: 'Shop 4, Dhanori Road, Pune', lat: 18.5913, lng: 73.8987, rating: 4.6,
    hours: { open: '07:00', close: '22:00' },
    products: [
      ['Amul Taaza Toned Milk 1L', 68, 72, 120, 'Dairy', 'litre'],
      ['Fresh Paneer 200g', 80, 90, 24, 'Dairy', 'pack'],
      ['Aashirvaad Atta 5kg', 265, 285, 40, 'Staples', 'pack'],
      ['Tata Salt 1kg', 28, 30, 90, 'Staples', 'pack'],
      ['Fortune Sunflower Oil 1L', 145, 160, 55, 'Staples', 'litre'],
      ['Onion 1kg', 34, 40, 200, 'Vegetables', 'kg'],
      ['Tomato 1kg', 42, 48, 150, 'Vegetables', 'kg'],
      ['Alphonso Mango 1kg', 320, 360, 18, 'Fruits', 'kg'],
      ['Britannia Brown Bread', 45, 48, 32, 'Bakery', 'pack'],
      ['Surf Excel Easy Wash 1kg', 118, 130, 45, 'Household', 'pack'],
    ],
  },
  {
    id: 'demo-shop-02', name: 'Dhanori Medico Pharmacy', category: 'pharmacy',
    archetype: 'directory', desc: '24x7 chemist with prescription fulfilment and home delivery.',
    address: 'Near Vishrantwadi Chowk, Pune', lat: 18.5896, lng: 73.8901, rating: 4.8,
    hours: { open: '00:00', close: '23:59' },
    products: [
      ['Crocin Advance 500mg (15 tab)', 32, 35, 200, 'OTC', 'strip'],
      ['Dolo 650 (15 tab)', 30, 33, 180, 'OTC', 'strip'],
      ['Vitamin C 1000mg (10 tab)', 95, 110, 60, 'Supplements', 'strip'],
      ['Digital Thermometer', 199, 249, 25, 'Devices', 'unit'],
      ['Omron BP Monitor', 1899, 2200, 8, 'Devices', 'unit'],
      ['Dettol Antiseptic 250ml', 140, 155, 40, 'First aid', 'bottle'],
      ['Surgical Mask (50 pc)', 180, 220, 70, 'First aid', 'box'],
      ['Glucometer Strips (25)', 450, 499, 30, 'Devices', 'pack'],
      ['ORS Sachet', 22, 25, 300, 'OTC', 'sachet'],
      ['Volini Spray 55g', 210, 235, 35, 'OTC', 'unit'],
    ],
  },
  {
    id: 'demo-shop-03', name: 'Golden Crumb Bakery', category: 'food',
    archetype: 'food', desc: 'Fresh breads, cakes and savouries baked through the day.',
    address: 'Lane 3, Tingre Nagar, Pune', lat: 18.5847, lng: 73.8823, rating: 4.7,
    hours: { open: '08:00', close: '21:30' },
    products: [
      ['Chocolate Truffle Cake 500g', 420, 460, 12, 'Cakes', 'unit'],
      ['Black Forest Pastry', 75, 85, 30, 'Pastry', 'piece'],
      ['Veg Puff', 25, 30, 60, 'Savouries', 'piece'],
      ['Khari Biscuit 250g', 60, 70, 45, 'Bakes', 'pack'],
      ['Whole Wheat Bread', 48, 52, 40, 'Bread', 'loaf'],
      ['Garlic Bread Sticks', 95, 110, 25, 'Bread', 'pack'],
      ['Plum Cake 400g', 280, 320, 15, 'Cakes', 'unit'],
      ['Chicken Patty', 55, 65, 35, 'Savouries', 'piece'],
      ['Blueberry Muffin', 70, 80, 28, 'Pastry', 'piece'],
      ['Rusk Toast 300g', 55, 62, 50, 'Bakes', 'pack'],
    ],
  },
  {
    id: 'demo-shop-04', name: 'Pune Electronics Hub', category: 'electronics',
    archetype: 'retail', desc: 'Mobile accessories, small appliances and repairs.',
    address: 'Airport Road, Lohegaon, Pune', lat: 18.5971, lng: 73.9089, rating: 4.4,
    hours: { open: '10:00', close: '20:30' },
    products: [
      ['boAt Rockerz 255 Earphones', 1299, 1999, 22, 'Audio', 'unit'],
      ['Mi 20000mAh Power Bank', 1899, 2299, 15, 'Power', 'unit'],
      ['USB-C Fast Charger 33W', 749, 999, 40, 'Power', 'unit'],
      ['HDMI Cable 2m', 299, 399, 35, 'Cables', 'unit'],
      ['Logitech Wireless Mouse', 849, 1095, 18, 'Computer', 'unit'],
      ['Philips LED Bulb 9W', 110, 140, 120, 'Lighting', 'unit'],
      ['Extension Board 6 Socket', 499, 620, 26, 'Power', 'unit'],
      ['Bluetooth Speaker 10W', 1499, 1899, 12, 'Audio', 'unit'],
      ['Screen Guard (Universal)', 149, 249, 80, 'Mobile', 'unit'],
      ['Laptop Cooling Pad', 1099, 1399, 9, 'Computer', 'unit'],
    ],
  },
  {
    id: 'demo-shop-05', name: 'Krishi Direct Farm Store', category: 'krishi',
    archetype: 'rentals', desc: 'Produce bought direct from growers around Pune district.',
    address: 'Bhairav Nagar, Pune', lat: 18.5762, lng: 73.8901, rating: 4.9,
    hours: { open: '06:00', close: '19:00' },
    products: [
      ['Organic Spinach Bunch', 30, 40, 60, 'Greens', 'bunch'],
      ['Farm Eggs (12)', 88, 96, 55, 'Poultry', 'dozen'],
      ['Desi Cow Ghee 500ml', 640, 720, 20, 'Dairy', 'bottle'],
      ['Indrayani Rice 5kg', 380, 420, 30, 'Grains', 'pack'],
      ['Groundnut 1kg', 160, 180, 40, 'Pulses', 'kg'],
      ['Jaggery Block 1kg', 90, 105, 45, 'Staples', 'kg'],
      ['Fresh Coriander', 15, 20, 90, 'Greens', 'bunch'],
      ['Alphonso Crate 2 dozen', 2400, 2800, 6, 'Fruits', 'crate'],
      ['Turmeric Powder 200g', 85, 95, 50, 'Spices', 'pack'],
      ['Honey (Raw) 500g', 420, 480, 18, 'Staples', 'bottle'],
    ],
  },
  {
    id: 'demo-shop-06', name: 'Glow & Glamour Salon', category: 'beauty',
    archetype: 'beauty', desc: 'Unisex salon — hair, skin and bridal packages.',
    address: 'Viman Nagar, Pune', lat: 18.5679, lng: 73.9143, rating: 4.5,
    hours: { open: '09:30', close: '20:00' },
    products: [
      ['Premium Haircut', 450, 550, 99, 'Hair', 'service'],
      ['Hair Spa Treatment', 1200, 1500, 99, 'Hair', 'service'],
      ['Beard Styling', 250, 300, 99, 'Grooming', 'service'],
      ['Classic Facial', 900, 1100, 99, 'Skin', 'service'],
      ['Full Arms Waxing', 600, 700, 99, 'Skin', 'service'],
      ['Bridal Package', 12000, 15000, 20, 'Bridal', 'service'],
      ['Manicure', 400, 500, 99, 'Nails', 'service'],
      ['Pedicure', 550, 650, 99, 'Nails', 'service'],
      ['Hair Colour (Global)', 2200, 2800, 40, 'Hair', 'service'],
      ['Threading', 60, 80, 99, 'Grooming', 'service'],
    ],
  },
  {
    id: 'demo-shop-07', name: 'QuickFix Home Services', category: 'services',
    archetype: 'services', desc: 'Plumbers, electricians and appliance repair on call.',
    address: 'Kharadi, Pune', lat: 18.5515, lng: 73.9476, rating: 4.3,
    hours: { open: '08:00', close: '20:00' },
    products: [
      ['Plumbing Visit (inspection)', 199, 250, 99, 'Plumbing', 'visit'],
      ['Tap / Mixer Replacement', 450, 550, 99, 'Plumbing', 'job'],
      ['Electrical Fault Check', 249, 300, 99, 'Electrical', 'visit'],
      ['Fan Installation', 350, 420, 99, 'Electrical', 'job'],
      ['AC Service (split)', 599, 750, 99, 'Appliance', 'job'],
      ['Washing Machine Repair', 499, 650, 99, 'Appliance', 'job'],
      ['Geyser Installation', 550, 700, 99, 'Appliance', 'job'],
      ['Deep Home Cleaning 2BHK', 2499, 3200, 40, 'Cleaning', 'job'],
      ['Sofa Shampooing', 899, 1100, 40, 'Cleaning', 'job'],
      ['Pest Control (1BHK)', 1299, 1600, 30, 'Cleaning', 'job'],
    ],
  },
  {
    id: 'demo-shop-08', name: 'Annapurna Family Restaurant', category: 'restaurant',
    archetype: 'food', desc: 'Maharashtrian thalis, North Indian curries and evening chaat.',
    address: 'Tingre Nagar Main Road, Pune', lat: 18.5861, lng: 73.8852, rating: 4.6,
    hours: { open: '11:00', close: '23:00' },
    products: [
      ['Maharashtrian Veg Thali', 220, 250, 99, 'Thali', 'plate'],
      ['Misal Pav', 90, 100, 99, 'Breakfast', 'plate'],
      ['Paneer Butter Masala', 240, 270, 99, 'Main course', 'plate'],
      ['Butter Naan', 45, 50, 99, 'Breads', 'piece'],
      ['Veg Biryani', 210, 240, 99, 'Rice', 'plate'],
      ['Sabudana Khichdi', 80, 90, 99, 'Breakfast', 'plate'],
      ['Pani Puri (6 pc)', 50, 60, 99, 'Chaat', 'plate'],
      ['Masala Chaas', 35, 40, 99, 'Beverages', 'glass'],
      ['Gulab Jamun (2 pc)', 60, 70, 99, 'Desserts', 'plate'],
    ],
  },
  {
    id: 'demo-shop-09', name: 'Vastra Fashion House', category: 'fashion',
    archetype: 'retail', desc: 'Ethnic and everyday wear for the family, with in-house alterations.',
    address: 'Vishrantwadi, Pune', lat: 18.5835, lng: 73.8794, rating: 4.4,
    hours: { open: '10:30', close: '21:00' },
    products: [
      ['Cotton Kurta (Men)', 799, 999, 30, 'Men', 'piece'],
      ['Printed Kurti (Women)', 649, 899, 40, 'Women', 'piece'],
      ['Paithani Silk Saree', 6499, 7999, 6, 'Women', 'piece'],
      ['Kids Ethnic Set', 899, 1199, 18, 'Kids', 'set'],
      ['Formal Shirt', 999, 1299, 25, 'Men', 'piece'],
      ['Leggings (Pack of 2)', 399, 499, 50, 'Women', 'pack'],
      ['Denim Jeans', 1199, 1599, 28, 'Men', 'piece'],
      ['Dupatta (Bandhani)', 349, 449, 35, 'Women', 'piece'],
      ['Alteration Service', 150, 200, 99, 'Services', 'job'],
    ],
  },
  {
    id: 'demo-shop-10', name: 'Shree Stationery & Gifts', category: 'stationery',
    archetype: 'retail', desc: 'School supplies, office stationery, printing and gift wrapping.',
    address: 'Near Dhanori School, Pune', lat: 18.5928, lng: 73.9012, rating: 4.5,
    hours: { open: '08:30', close: '21:00' },
    products: [
      ['Classmate Notebook (6 pack)', 240, 270, 60, 'School', 'pack'],
      ['Geometry Box', 120, 150, 40, 'School', 'unit'],
      ['A4 Paper Ream (500)', 320, 360, 30, 'Office', 'ream'],
      ['Gel Pens (10 pack)', 100, 120, 80, 'Writing', 'pack'],
      ['School Bag', 899, 1199, 15, 'School', 'unit'],
      ['Colour Printout (per page)', 10, 15, 999, 'Printing', 'page'],
      ['Spiral Binding', 40, 50, 999, 'Printing', 'job'],
      ['Gift Wrapping', 50, 60, 999, 'Gifts', 'job'],
      ['Photo Frame 8x10', 299, 399, 20, 'Gifts', 'unit'],
    ],
  },
  {
    id: 'demo-shop-11', name: 'Patil Hardware & Sanitary', category: 'hardware',
    archetype: 'retail', desc: 'Plumbing, electrical fittings, paint and tools for home repairs.',
    address: 'Porwal Road, Lohegaon, Pune', lat: 18.5998, lng: 73.9031, rating: 4.3,
    hours: { open: '09:00', close: '20:30' },
    products: [
      ['PVC Pipe 1 inch (10 ft)', 180, 210, 60, 'Plumbing', 'length'],
      ['Health Faucet Set', 549, 699, 20, 'Sanitary', 'set'],
      ['Wall Paint 4L (White)', 1150, 1350, 18, 'Paint', 'tin'],
      ['Drill Machine 13mm', 2499, 2999, 6, 'Tools', 'unit'],
      ['Screwdriver Set (6 pc)', 299, 399, 25, 'Tools', 'set'],
      ['Copper Wire 1.5mm (90 m)', 1890, 2150, 10, 'Electrical', 'coil'],
      ['Door Lock (Mortise)', 899, 1150, 14, 'Hardware', 'unit'],
      ['Teflon Tape (5 pack)', 60, 75, 90, 'Plumbing', 'pack'],
      ['Wall Plugs & Screws (100)', 90, 110, 70, 'Hardware', 'pack'],
    ],
  },
  {
    id: 'demo-shop-12', name: 'ClearView Opticians', category: 'optician',
    archetype: 'retail', desc: 'Free eye tests, prescription glasses and contact lenses.',
    address: 'Phoenix Market City, Viman Nagar, Pune', lat: 18.5622, lng: 73.9167, rating: 4.7,
    hours: { open: '10:00', close: '21:30' },
    products: [
      ['Computerised Eye Test', 0, 200, 999, 'Services', 'test'],
      ['Single Vision Lenses (pair)', 1200, 1500, 50, 'Lenses', 'pair'],
      ['Blue-cut Lenses (pair)', 1800, 2200, 40, 'Lenses', 'pair'],
      ['Full-rim Metal Frame', 1499, 1999, 25, 'Frames', 'unit'],
      ['Rimless Titanium Frame', 3499, 4299, 10, 'Frames', 'unit'],
      ['Monthly Contact Lenses (6)', 1350, 1600, 30, 'Contacts', 'box'],
      ['Lens Solution 360ml', 399, 450, 40, 'Contacts', 'bottle'],
      ['Polarised Sunglasses', 1999, 2599, 15, 'Sunglasses', 'unit'],
    ],
  },
  {
    id: 'demo-shop-13', name: 'Happy Paws Pet Store', category: 'pets',
    archetype: 'retail', desc: 'Pet food, accessories and weekend grooming.',
    address: 'Kalyani Nagar, Pune', lat: 18.5480, lng: 73.9030, rating: 4.8,
    hours: { open: '09:30', close: '21:00' },
    products: [
      ['Dog Food Adult 3kg', 1150, 1300, 20, 'Food', 'bag'],
      ['Cat Food Kitten 1.2kg', 540, 620, 25, 'Food', 'bag'],
      ['Dog Leash (Nylon)', 349, 449, 30, 'Accessories', 'unit'],
      ['Chew Toy (Rubber)', 199, 249, 45, 'Toys', 'unit'],
      ['Cat Litter 5kg', 450, 520, 20, 'Hygiene', 'bag'],
      ['Tick & Flea Shampoo', 299, 350, 30, 'Hygiene', 'bottle'],
      ['Pet Bed (Medium)', 1299, 1599, 8, 'Accessories', 'unit'],
      ['Full Grooming Session', 999, 1299, 99, 'Grooming', 'session'],
    ],
  },
  {
    id: 'demo-shop-14', name: 'Green Petals Florist & Nursery', category: 'florist',
    archetype: 'fresh_perishable', desc: 'Fresh bouquets, festival garlands and indoor plants.',
    address: 'Airport Road, Pune', lat: 18.5806, lng: 73.9061, rating: 4.6,
    hours: { open: '07:00', close: '21:00' },
    products: [
      ['Red Rose Bouquet (12)', 599, 699, 15, 'Bouquets', 'bunch'],
      ['Mixed Flower Basket', 899, 1099, 10, 'Bouquets', 'unit'],
      ['Marigold Garland (5 ft)', 120, 150, 40, 'Pooja', 'unit'],
      ['Money Plant (Pot)', 249, 299, 30, 'Indoor plants', 'pot'],
      ['Snake Plant (Medium)', 449, 549, 18, 'Indoor plants', 'pot'],
      ['Tulsi Plant', 99, 120, 50, 'Outdoor plants', 'pot'],
      ['Organic Potting Mix 5kg', 199, 249, 40, 'Gardening', 'bag'],
      ['Ceramic Planter', 399, 499, 20, 'Gardening', 'unit'],
    ],
  },
  {
    id: 'demo-shop-15', name: 'TechCare Mobile & Laptop Repair', category: 'repair',
    archetype: 'services', desc: 'Same-day screen and battery replacement for phones and laptops.',
    address: 'Kharadi Bypass, Pune', lat: 18.5534, lng: 73.9399, rating: 4.5,
    hours: { open: '10:00', close: '20:30' },
    products: [
      ['Phone Screen Replacement', 2499, 2999, 99, 'Mobile', 'job'],
      ['Phone Battery Replacement', 1299, 1599, 99, 'Mobile', 'job'],
      ['Charging Port Repair', 599, 799, 99, 'Mobile', 'job'],
      ['Laptop Diagnosis', 299, 399, 99, 'Laptop', 'visit'],
      ['Laptop SSD Upgrade 512GB', 3999, 4799, 15, 'Laptop', 'job'],
      ['Laptop Keyboard Replacement', 1999, 2499, 99, 'Laptop', 'job'],
      ['OS Reinstall & Data Backup', 799, 999, 99, 'Software', 'job'],
      ['Tempered Glass Fitting', 199, 299, 99, 'Mobile', 'job'],
    ],
  },
];

/**
 * Each demo shop's place in the shop_categories taxonomy.
 *
 * The demo shops carried a free-text `category` ('grocery', 'pharmacy') and no
 * category_id, but /shops/nearby — category browsing on both apps — filters on
 * category_id. So not one demo shop appeared under any category: tap "Grocery"
 * in the demo and the supermarket the seeder made was not there. The id and
 * the display name are resolved from the table at seed time.
 */
const CATEGORY_SLUG = {
  grocery: 'grocery-supermarkets', pharmacy: 'pharmacy-healthcare', food: 'dairy-sweets-bakery',
  electronics: 'electricians-electronics', krishi: 'fresh-produce-meat', beauty: 'salon-beauty-spa',
  services: 'home-services-plumbers', restaurant: 'restaurants-cafes', fashion: 'clothing-fashion',
  stationery: 'stationery-gifts-books', hardware: 'hardware-sanitary', optician: 'eyewear-opticians',
  pets: 'pet-care-supplies', florist: 'florists-nurseries', repair: 'mobile-computer-repair',
};

// ─── Jobs ───────────────────────────────────────────────────────────────────
const JOBS = [
  ['Delivery Executive (Dhanori)', 'Two-wheeler and licence required. Fuel allowance plus per-delivery incentive.', '₹18,000 - ₹24,000/month'],
  ['Store Manager — Supermarket', 'Run daily operations, stock planning and a team of six. Retail experience preferred.', '₹28,000 - ₹35,000/month'],
  ['Licensed Electrician', 'Residential and society call-outs across Viman Nagar and Kharadi.', '₹600 - ₹900/job'],
  ['Accountant (Part-time)', 'GST filing, monthly reconciliation and vendor payouts for a 40-shop franchise.', '₹22,000/month'],
  ['Facility Supervisor', 'Housekeeping and maintenance oversight for a 240-flat society.', '₹26,000/month'],
  ['Pharmacy Assistant', 'D.Pharm preferred. Prescription handling and inventory.', '₹17,000 - ₹21,000/month'],
  ['Bakery Counter Staff', 'Morning shift, customer billing and display upkeep.', '₹15,000/month'],
  ['Security Guard (Night)', 'Gate duty, visitor logging via the LocalSampark app.', '₹19,000/month'],
  ['Maths Tutor (Class 10)', 'Three evenings a week, at the student’s home in Lohegaon.', '₹3,000/month'],
  ['Field Sales Agent', 'Onboard neighbourhood shops onto the platform. Incentive-led.', '₹20,000 + commission'],
];

const APPLICATION_STAGES = ['applied', 'screening', 'interview', 'offered'];

// Board metadata per job, in JOBS order: [category, min years, skills].
const JOB_META = [
  ['Logistics', 0, ['Two-wheeler licence', 'Navigation', 'Cash handling']],
  ['Retail', 3, ['Team management', 'Inventory', 'Billing software']],
  ['Facilities', 2, ['Wiring', 'Safety compliance']],
  ['Administration', 2, ['Tally', 'GST filing', 'Excel']],
  ['Facilities', 4, ['Housekeeping supervision', 'Vendor management']],
  ['Retail', 1, ['D.Pharm', 'Prescription handling']],
  ['Retail', 0, ['Customer service', 'Billing']],
  ['Security', 1, ['Visitor management', 'Night duty']],
  ['Administration', 2, ['Mathematics', 'Teaching']],
  ['Logistics', 0, ['Field sales', 'Marathi', 'Two-wheeler licence']],
];

// ─── Properties ─────────────────────────────────────────────────────────────
const PROPERTIES = [
  ['1 BHK in Pride Aashiyana', 'Dhanori', 'rent', 14500, 60000, 1, 1, 620, 'Semi-furnished, covered parking, 24x7 water.'],
  ['2 BHK in Ganga Aria', 'Dhanori', 'rent', 24000, 100000, 2, 2, 1080, 'Fully furnished, east-facing, club access.'],
  ['3 BHK in Kumar Prospera', 'Viman Nagar', 'rent', 42000, 200000, 3, 3, 1560, 'Premium tower, two covered parkings.'],
  ['2 BHK Resale — Tingre Nagar', 'Tingre Nagar', 'sale', 7800000, 0, 2, 2, 1010, 'Nine-year-old building, lift, borewell.'],
  ['3 BHK Resale — Kharadi', 'Kharadi', 'sale', 12500000, 0, 3, 3, 1490, 'Corner flat, IT-park adjacent.'],
  ['Commercial Shop — Airport Road', 'Lohegaon', 'rent', 38000, 300000, 0, 1, 450, 'Ground floor, main-road frontage.'],
  ['Commercial Office — Kharadi', 'Kharadi', 'rent', 65000, 400000, 0, 2, 900, 'Furnished, 12 workstations, backup power.'],
  ['1 BHK Studio — Bhairav Nagar', 'Bhairav Nagar', 'rent', 11000, 40000, 1, 1, 480, 'Compact, ideal for a single tenant.'],
];

// ─── Carpool ────────────────────────────────────────────────────────────────
// from/to carry real coordinates: from_coordinate and to_coordinate are NOT
// NULL, and the column format is 'POINT(lng lat)' — the same WKT string
// local_shops.coordinate uses, so the spatial filters treat them alike.
const RIDES = [
  ['Dhanori', 'Hinjewadi Phase 1', '08:45', 3, 120, 'Hatchback', 'MH-12-AB-1234', [73.8987, 18.5913], [73.7389, 18.5912]],
  ['Viman Nagar', 'Magarpatta', '09:15', 2, 90, 'Sedan', 'MH-14-CD-5678', [73.9143, 18.5679], [73.9260, 18.5158]],
  ['Tingre Nagar', 'Kharadi EON IT Park', '08:30', 4, 80, 'SUV', 'MH-12-EF-9012', [73.8823, 18.5847], [73.9476, 18.5515]],
  ['Lohegaon', 'Baner', '09:00', 2, 150, 'Sedan', 'MH-12-GH-3456', [73.9089, 18.5971], [73.7769, 18.5590]],
  ['Kharadi', 'Dhanori', '18:45', 3, 100, 'Hatchback', 'MH-14-IJ-7890', [73.9476, 18.5515], [73.8987, 18.5913]],
  ['Dhanori', 'Pune Station', '07:30', 3, 70, 'Sedan', 'MH-12-KL-2468', [73.8987, 18.5913], [73.8740, 18.5286]],
  ['Kalyani Nagar', 'Hinjewadi Phase 3', '08:15', 4, 160, 'SUV', 'MH-12-MN-1357', [73.9030, 18.5480], [73.6886, 18.5868]],
];

const point = ([lng, lat]) => `POINT(${lng} ${lat})`;

// ─── Society population ─────────────────────────────────────────────────────
// Neighbours beyond the personas, so the directory, the bill ledger and the
// gate register look like a building rather than six flats. They are real
// `users` rows (demo-user-rNN) because society_members has an FK onto users;
// their numbers sit in the +919000 demo range, never a real subscriber's.
const RESIDENTS = [
  ['Prakash Deshpande', 'A-201', 'owner', 'Chartered accountant'],
  ['Kavita Iyer', 'A-202', 'tenant', 'Software engineer'],
  ['Nikhil Jadhav', 'A-301', 'owner', 'Doctor (paediatrics)'],
  ['Farah Sayyed', 'A-302', 'tenant', 'Architect'],
  ['Suresh Gaikwad', 'A-401', 'owner', 'Retired, ex-railways'],
  ['Pooja Mehta', 'B-101', 'owner', 'School teacher'],
  ['Arjun Rao', 'B-102', 'tenant', 'Product manager'],
  ['Lata Shinde', 'B-201', 'owner', 'Homemaker'],
  ['Manoj Pillai', 'B-202', 'tenant', 'Bank officer'],
  ['Deepa Chavan', 'B-301', 'owner', 'Lawyer'],
  ['Rahul Bhatt', 'B-302', 'tenant', 'Data analyst'],
  ['Shweta Kale', 'C-101', 'owner', 'Physiotherapist'],
  ['Vinod Naik', 'C-102', 'owner', 'Electrical contractor'],
  ['Ayesha Khan', 'C-201', 'tenant', 'Journalist'],
  ['Girish Kulkarni', 'C-301', 'owner', 'Civil engineer'],
  ['Neha Wagh', 'C-401', 'tenant', 'UX designer'],
];

// The rest of the gate team. With the guard persona this is five guards, one
// per shift slot on today's roster.
const GUARDS = [
  ['Balu Pawar', 'morning'], ['Shankar Mane', 'afternoon'],
  ['Dinesh Thorat', 'night'], ['Ganesh Salunkhe', 'morning'],
];

const residentId = (i) => `demo-user-r${String(i + 1).padStart(2, '0')}`;
const guardId = (i) => `demo-user-g${String(i + 1).padStart(2, '0')}`;

// ─── Helpers ────────────────────────────────────────────────────────────────

const uuid = () => crypto.randomUUID();
const isSqlite = () => process.env.USE_SQLITE === 'true';
const NOW = () => (isSqlite() ? 'CURRENT_TIMESTAMP' : 'NOW()');

let inserted = 0;
let skipped = [];

/**
 * Insert, tolerating a table this deployment's schema does not have.
 *
 * 167 migrations have run against this database over time and not every
 * environment has every table. A seeder that dies on the first missing one
 * leaves the demo half-populated, which is worse than a seeder that reports
 * what it could not fill.
 */
async function insert(table, row) {
  const cols = Object.keys(row);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
  try {
    await query(sql, Object.values(row).map(asId));
    inserted += 1;
    return true;
  } catch (e) {
    skipped.push(`${table}: ${e.message.split('\n')[0]}`);
    return false;
  }
}

/**
 * Remove only rows this seeder owns.
 *
 * A missing table is fine and silent — 167 migrations have run and not every
 * environment has every table. A DELETE that the database *refuses* is not
 * fine: that is how the first version left stale users behind (foreign keys
 * from society_members blocked the delete, the error was swallowed, and the
 * re-insert then collided on a unique index). Those are reported.
 */
async function clearOwned(table, column, prefix) {
  if (!(await tableExists(table))) return;
  try {
    await query(`DELETE FROM ${table} WHERE CAST(${column} AS TEXT) LIKE $1`, [seedLike(prefix)]);
  } catch (e) {
    skipped.push(`${table} (teardown): ${e.message.split('\n')[0]}`);
  }
}

/**
 * Children before parents. Foreign keys point upward, so users and
 * local_shops have to go last or their DELETE is refused and the run stops
 * being idempotent.
 */
const TEARDOWN_ORDER = [
  // What a rehearsal leaves on the demo's own records — an order placed at a
  // demo shop, a seat booked, a job applied for, a vote cast — so re-seeding
  // before the real pitch puts every screen back where the script expects it.
  // (orders.shop_id is ON DELETE SET NULL, so these would otherwise survive
  // as orphans in the customer's history.)
  ['order_items', 'product_id', 'demo-prod-'],
  ['orders', 'shop_id', 'demo-shop-'],
  ['carpool_bookings', 'ride_id', 'demo-ride-'],
  ['job_applications', 'job_id', 'demo-job-'],
  ['society_poll_votes', 'poll_id', 'demo-'],
  ['society_event_rsvps', 'event_id', 'demo-'],
  ['society_poll_votes', 'id', 'demo-'],
  ['society_event_rsvps', 'id', 'demo-'],
  ['society_events', 'id', 'demo-'],
  ['society_visitors', 'id', 'demo-'],
  ['society_guard_shifts', 'id', 'demo-'],
  ['order_items', 'id', 'demo-item-'],
  ['delivery_agents', 'id', 'demo-agent-'],
  ['orders', 'id', 'demo-order-'],
  ['job_applications', 'id', 'demo-app-'],
  ['society_visitor_preapprovals', 'id', 'demo-'],
  ['society_parking_slots', 'id', 'demo-'],
  ['society_packages', 'id', 'demo-'],
  ['society_polls', 'id', 'demo-'],
  ['society_notices', 'id', 'demo-'],
  ['society_amenities', 'id', 'demo-'],
  // society_complaint_activity has an FK onto society_complaints, so the
  // child rows have to go first or the complaints DELETE is refused.
  ['society_complaint_activity', 'complaint_id', 'demo-'],
  ['society_complaints', 'id', 'demo-'],
  ['society_maintenance_bills', 'id', 'demo-'],
  ['society_domestic_staff', 'id', 'demo-'],
  ['society_members', 'id', 'demo-'],
  ['shop_products', 'id', 'demo-prod-'],
  ['carpool_rides', 'id', 'demo-ride-'],
  ['properties', 'id', 'demo-prop-'],
  ['local_job_postings', 'id', 'demo-job-'],
  ['job_vacancies', 'id', 'demo-job-'],
  ['admin_jobs', 'id', 'demo-job-'],
  ['local_shops', 'id', 'demo-shop-'],
  ['societies', 'id', 'demo-society-'],
  ['users', 'id', 'demo-user-'],
];

async function teardown() {
  for (const [table, column, prefix] of TEARDOWN_ORDER) {
    await clearOwned(table, column, prefix);
  }
}

async function tableExists(name) {
  try {
    await query(`SELECT 1 FROM ${name} LIMIT 1`);
    return true;
  } catch {
    return false;
  }
}

// ─── Seeders ────────────────────────────────────────────────────────────────

async function seedPersonas() {
  for (const p of PERSONAS) {
    const phone = phoneFor(p.n);
    // Another account may already hold this number from a previous manual
    // login; the demo row is authoritative, so clear the collision first.
    try {
      await query('DELETE FROM users WHERE phone_number = $1 OR phone = $1', [phone]);
    } catch { /* column set differs; the insert will tell us */ }

    await insert('users', {
      id: userId(p.n),
      phone_number: phone,
      phone,
      full_name: p.name,
      email: `demo${p.n}@localsampark.test`,
      role: p.role,
      is_active: 1,
      is_verified: 1,
      token_version: 0,
      language_preference: 'en',
      my_referral_code: `DEMO${String(p.n).padStart(2, '0')}`,
    });
  }
  return PERSONAS.length;
}

async function seedShops() {
  const owner = userId(5); // the shop_owner persona
  let productCount = 0;

  for (const s of SHOPS) {
    const cat = await queryOne(
      'SELECT id, name FROM shop_categories WHERE slug = $1',
      [CATEGORY_SLUG[s.category]]
    ).catch(() => null);
    if (!cat) skipped.push(`shop_categories: no '${CATEGORY_SLUG[s.category]}' for ${s.name}; it will not appear in category browsing`);

    await insert('local_shops', {
      id: s.id,
      owner_id: owner,
      name: s.name,
      description: s.desc,
      // The display name, as every other shop stores it, and the id that
      // /shops/nearby filters on.
      category: cat ? cat.name : s.category,
      ...(cat ? { category_id: cat.id } : {}),
      address: s.address,
      pincode: '411015',
      latitude: s.lat,
      longitude: s.lng,
      // NOT NULL on any database built from the migrations. Leaving it out
      // meant no demo shop was created on a fresh environment — and, every
      // other table here hanging off a shop, no products, vacancies or orders
      // either. It only worked on databases old enough to predate the
      // constraint, which is the one place a demo is never set up.
      coordinate: point([s.lng, s.lat]),
      phone: phoneFor(5),
      phone_number: phoneFor(5),
      is_verified: 1,
      is_active: 1,
      rating: s.rating,
      management_archetype: s.archetype,
      approval_status: 'approved',
      delivery_available: 1,
      pickup_available: 1,
      estimated_delivery_time: 35,
      opening_hours: JSON.stringify(s.hours),
      // Every demo shop carries a real photo set. A catalogue of grey
      // placeholders is the fastest way to make a live demo look unfinished.
      photo_urls: JSON.stringify([
        `https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80`,
        `https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80`,
      ]),
      tags: JSON.stringify(['verified', 'demo']),
    });

    let i = 0;
    for (const [name, price, mrp, stock, category, unit] of s.products) {
      i += 1;
      const ok = await insert('shop_products', {
        id: `demo-prod-${s.id.slice(-2)}-${String(i).padStart(2, '0')}`,
        shop_id: s.id,
        name,
        description: `${name} — stocked at ${s.name}.`,
        price,
        mrp,
        stock,
        stock_quantity: stock,
        inventory_count: stock,
        category,
        unit,
        is_active: 1,
        is_available: 1,
        image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80',
      });
      if (ok) productCount += 1;
    }
  }
  return { shops: SHOPS.length, products: productCount };
}

async function seedJobs() {
  let count = 0;
  for (let i = 0; i < JOBS.length; i += 1) {
    const [title, description, salary] = JOBS[i];
    const id = `demo-job-${String(i + 1).padStart(2, '0')}`;
    const shop = SHOPS[i % SHOPS.length];

    // Two tables, on purpose. job_vacancies is what the seeker-facing board
    // reads and what job_applications.job_id points at; admin_jobs is the
    // console's own list. Seeding only one left the applicant tracker empty.
    await insert('job_vacancies', {
      id,
      shop_id: shop.id,
      title,
      description,
      salary_range: salary,
      job_type: i % 3 === 0 ? 'part_time' : 'full_time',
      is_active: 1,
    });

    // The board the app shows job seekers (GET /jobs/postings) reads
    // local_job_postings. The seeder filled only the two shop tables, so the
    // demo's job board showed nothing it had created.
    const [category, expMin, skills] = JOB_META[i];
    await insert('local_job_postings', {
      id, shop_id: shop.id, employer_id: userId(5), title, description,
      category, salary_range: salary, job_type: i % 3 === 0 ? 'Part-Time' : 'Full-Time',
      status: 'active', experience_min: expMin, skills_required: JSON.stringify(skills),
      address: shop.address, latitude: shop.lat, longitude: shop.lng,
      urgency: i < 2 ? 'urgent' : 'normal', applications_count: 3,
      contact_phone: phoneFor(5),
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    });

    const ok = await insert('admin_jobs', {
      id,
      title,
      description,
      salary,
      shop_name: shop.name,
      shop_id: shop.id,
      status: 'open',
      admin_id: userId(12),
    });
    if (!ok) continue;
    count += 1;

    // Applicants spread across the pipeline, so the tracker has something to
    // show in every column rather than a single "Applied" stack.
    for (let a = 0; a < 3; a += 1) {
      const persona = PERSONAS[(i + a) % 4];
      await insert('job_applications', {
        id: `demo-app-${String(i + 1).padStart(2, '0')}-${a + 1}`,
        job_id: id,
        applicant_id: userId(persona.n),
        user_id: userId(persona.n),
        applicant_name: persona.name,
        cover_note: `Interested in ${title}. Available to start immediately.`,
        status: APPLICATION_STAGES[(i + a) % APPLICATION_STAGES.length],
        stage: APPLICATION_STAGES[(i + a) % APPLICATION_STAGES.length],
        match_score: 60 + ((i * 7 + a * 11) % 38),
      });
    }
  }
  return count;
}

/**
 * Orders across the delivery lifecycle.
 *
 * "My Orders" was empty for every persona, which is the first tab a consumer
 * opens. One order is left `out_for_delivery` and assigned to the delivery
 * persona, so the live tracking screen has something real to subscribe to
 * rather than the random-walk MockSocket it used to render.
 */
/**
 * The rider persona's delivery-partner record.
 *
 * Every delivery route sits behind requireRider, which wants a delivery_agents
 * row with an approved KYC. The seeder made the user and assigned them an
 * order, but never the partner record — so the demo rider signed in to a
 * dashboard that answered 403 NOT_A_RIDER on every call.
 */
async function seedRider() {
  const ok = await insert('delivery_agents', {
    id: 'demo-agent-07', user_id: userId(7), full_name: 'Demo Rider', vehicle_type: 'bike',
    vehicle_number: 'MH-12-RP-0707', dl_number: 'MH1220190007777', kyc_status: 'active', status: 'active',
    is_online: 1, coordinate: point([73.8987, 18.5913]), current_lat: 18.5913, current_lng: 73.8987,
    region_id: 'zone_kothrud', rating: 4.8,
  });
  // The name a customer sees on the tracking screen is the user's.
  await query('UPDATE delivery_agents SET full_name = (SELECT full_name FROM users WHERE id = $1) WHERE id = $2', [asId(userId(7)), asId('demo-agent-07')]).catch(() => {});
  return ok ? 1 : 0;
}

async function seedOrders() {
  // [status, payment, shop index, customer persona, note]. Spread over three
  // shops so the merchant's queue, the rider's run and the customer's history
  // each have something in every state, not one shop's worth.
  const rows = [
    ['delivered', 'paid', 0, 1, 'Delivered yesterday'],
    ['out_for_delivery', 'paid', 0, 1, 'On the way now'],
    ['preparing', 'paid', 0, 2, 'Being packed'],
    ['pending', 'pending', 0, 1, 'Awaiting confirmation'],
    ['confirmed', 'paid', 7, 2, 'Accepted by the restaurant'],
    ['ready', 'paid', 1, 3, 'Packed, waiting for a rider'],
  ];

  let count = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const [orderStatus, paymentStatus, shopIndex, customer, note] = rows[i];
    const shop = SHOPS[shopIndex];
    const id = `demo-order-${String(i + 1).padStart(2, '0')}`;
    const items = shop.products.slice(i % 4, (i % 4) + 2);
    const total = items.reduce((sum, [, price], j) => sum + price * (j + 1), 0) + 25;

    const ok = await insert('orders', {
      id,
      user_id: userId(customer),
      shop_id: shop.id,
      total_amount: total,
      delivery_fee: 25,
      payment_method: paymentStatus === 'pending' ? 'cod' : 'upi',
      payment_status: paymentStatus,
      order_status: orderStatus,
      status: orderStatus,
      delivery_address: 'B-404, Pride Aashiyana, Dhanori, Pune 411015',
      delivery_coordinate: 'POINT(73.8987 18.5913)',
      // Only the in-flight order has a rider; the others are done or not yet
      // dispatched, and a delivered order with a live rider reads as a bug.
      assigned_agent_id: orderStatus === 'out_for_delivery' ? userId(7) : null,
      // The handover code the customer reads to the rider (proof of delivery).
      // Fixed per order so it can be read off the screen during the demo.
      otp_code: ['out_for_delivery', 'ready'].includes(orderStatus) ? String(4821 + i) : null,
      delivery_lat: 18.5913,
      delivery_lng: 73.8987,
      special_instructions: note,
    });
    if (!ok) continue;
    count += 1;

    for (let j = 0; j < items.length; j += 1) {
      const [name, price] = items[j];
      await insert('order_items', {
        id: `demo-item-${String(i + 1).padStart(2, '0')}-${j + 1}`,
        order_id: id,
        product_id: `demo-prod-${shop.id.slice(-2)}-${String((i % 4) + j + 1).padStart(2, '0')}`,
        name,
        price,
        price_at_buy: price,
        quantity: j + 1,
      });
    }
  }
  return count;
}

async function seedProperties() {
  let count = 0;
  for (let i = 0; i < PROPERTIES.length; i += 1) {
    const [title, location, listing_type, price, deposit, beds, baths, sqft, description] = PROPERTIES[i];
    const ok = await insert('properties', {
      id: `demo-prop-${String(i + 1).padStart(2, '0')}`,
      user_id: userId(10),
      title,
      location,
      listing_type,
      price,
      deposit,
      beds,
      baths,
      sqft,
      description,
      status: 'active',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
      ]),
    });
    if (ok) count += 1;
  }
  return count;
}

async function seedCarpool() {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  let count = 0;
  for (let i = 0; i < RIDES.length; i += 1) {
    const [from, to, time, seats, price, vehicle, plate, fromXY, toXY] = RIDES[i];
    const ok = await insert('carpool_rides', {
      id: `demo-ride-${String(i + 1).padStart(2, '0')}`,
      driver_id: userId(7),
      from_location: from,
      from_coordinate: point(fromXY),
      to_coordinate: point(toXY),
      to_location: to,
      departure_date: tomorrow,
      departure_time: time,
      total_seats: seats,
      available_seats: Math.max(1, seats - 1),
      price_per_seat: price,
      vehicle_type: vehicle,
      vehicle_number: plate,
      is_recurring: i % 2,
    });
    if (ok) count += 1;
  }
  return count;
}

async function seedSociety() {
  // The demo owns its society, so an empty database (a fresh migration, which
  // the dual-engine seed check starts from) gets one too. It used to borrow
  // whichever society already existed and seeded no society data without one.
  const demoSociety = asId('demo-society-1');
  if (!(await queryOne('SELECT id FROM societies WHERE id = $1', [demoSociety]))) {
    await insert('societies', {
      id: 'demo-society-1',
      name: 'Green Valley Residency',
      address: 'Dhanori, Pune 411015',
      is_active: '1',
    });
  }
  const society = await queryOne('SELECT id FROM societies WHERE id = $1', [demoSociety]);
  if (!society) {
    skipped.push('societies: the demo society could not be created');
    return {};
  }
  const sid = society.id;
  const month = new Date().toISOString().slice(0, 7);
  const due = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);

  const flats = ['A-101', 'A-102', 'B-401', 'B-404', 'C-203', 'C-302'];
  const out = {};

  // Members
  // society_members is UNIQUE on (society_id, user_id), so each flat needs its
  // own persona rather than the same three cycled across six flats.
  //
  // The `role` here is not decoration: middleware/society-capability.js maps it
  // to capabilities, and only the roles in its ROLE_CAPABILITIES table grant
  // anything. An earlier version of this seeder used 'committee', which is not
  // in that table — so the society_admin persona held a membership that
  // granted nothing, and the guard was not a member at all, which is why the
  // gatekeeper socket room refused them.
  const MEMBERS = [
    { persona: 3, role: 'society_admin', occupancy: 'owner' },   // full rights
    { persona: 4, role: 'guard', occupancy: 'staff' },           // LOG_GATE_ENTRY
    { persona: 2, role: 'resident', occupancy: 'owner' },
    { persona: 1, role: 'resident', occupancy: 'tenant' },
    { persona: 5, role: 'owner', occupancy: 'owner' },
    { persona: 6, role: 'tenant', occupancy: 'tenant' },
  ];

  let n = 0;
  for (let i = 0; i < MEMBERS.length; i += 1) {
    const m = MEMBERS[i];
    if (await insert('society_members', {
      id: `demo-member-${i + 1}`, society_id: sid, user_id: userId(m.persona),
      flat_number: flats[i], role: m.role,
      is_active: 1, occupancy_type: m.occupancy, status: 'approved',
    })) n += 1;
  }

  // The neighbours. Every fourth one hides their number, so the directory
  // shows the show_phone rule doing its job.
  for (let i = 0; i < RESIDENTS.length; i += 1) {
    const [name, flat, occupancy, profession] = RESIDENTS[i];
    const phone = `+91900010${String(i + 1).padStart(4, '0')}`;
    await query('DELETE FROM users WHERE phone_number = $1 OR phone = $1', [phone]).catch(() => {});
    await insert('users', {
      id: residentId(i), phone_number: phone, phone, full_name: name,
      email: `resident${i + 1}@localsampark.test`, role: 'resident_member',
      is_active: 1, is_verified: 1, token_version: 0, language_preference: 'en',
      my_referral_code: `DEMOR${String(i + 1).padStart(2, '0')}`,
    });
    if (await insert('society_members', {
      id: `demo-member-r${String(i + 1).padStart(2, '0')}`, society_id: sid, user_id: residentId(i),
      flat_number: flat, role: occupancy === 'owner' ? 'owner' : 'tenant', is_active: 1,
      occupancy_type: occupancy, status: 'approved', profession, show_phone: i % 4 === 3 ? 0 : 1,
    })) n += 1;
  }

  // The gate team, on today's roster alongside the guard persona.
  const today = new Date().toISOString().slice(0, 10);
  const SLOTS = { morning: ['06:00', '14:00'], afternoon: ['14:00', '22:00'], night: ['22:00', '06:00'] };
  for (let i = 0; i < GUARDS.length; i += 1) {
    const [name, shift] = GUARDS[i];
    const phone = `+91900020${String(i + 1).padStart(4, '0')}`;
    await query('DELETE FROM users WHERE phone_number = $1 OR phone = $1', [phone]).catch(() => {});
    await insert('users', {
      id: guardId(i), phone_number: phone, phone, full_name: name,
      email: `guard${i + 1}@localsampark.test`, role: 'security_guard',
      is_active: 1, is_verified: 1, token_version: 0, language_preference: 'en',
      my_referral_code: `DEMOG${String(i + 1).padStart(2, '0')}`,
    });
    if (await insert('society_members', {
      id: `demo-member-g${String(i + 1).padStart(2, '0')}`, society_id: sid, user_id: guardId(i),
      flat_number: null, role: 'guard', is_active: 1, occupancy_type: 'staff', status: 'approved',
    })) n += 1;
  }
  const roster = [[userId(4), 'Ramesh Yadav', 'morning', 'GATE-1'],
    ...GUARDS.map(([name, shift], i) => [guardId(i), name, shift, i % 2 ? 'GATE-2' : 'GATE-1'])];
  let shifts = 0;
  for (let i = 0; i < roster.length; i += 1) {
    const [gid, , shift, gate] = roster[i];
    const [start, end] = SLOTS[shift];
    const hour = new Date().getHours();
    const onNow = shift === 'morning' ? hour >= 6 && hour < 14 : shift === 'afternoon' ? hour >= 14 && hour < 22 : hour >= 22 || hour < 6;
    if (await insert('society_guard_shifts', {
      id: `demo-shift-${i + 1}`, society_id: sid, guard_id: gid, gate_id: gate,
      shift_type: shift, shift_name: `${shift[0].toUpperCase()}${shift.slice(1)} shift`, shift_date: today,
      // Full timestamps: start_time/end_time are TIMESTAMP on PostgreSQL, which
      // refused a bare '06:00'. A shift that ends before it starts ends tomorrow.
      start_time: `${today} ${start}:00`,
      end_time: `${end <= start ? new Date(Date.now() + 86400000).toISOString().slice(0, 10) : today} ${end}:00`,
      status: onNow ? 'active' : 'scheduled',
      actual_start: onNow ? new Date().toISOString() : null, created_by: userId(3),
    })) shifts += 1;
  }
  out.members = n;
  out.guardShifts = shifts;

  const allFlats = [...flats, ...RESIDENTS.map(([, flat]) => flat)];

  // Bills — a mix of paid and pending so the ledger is not uniformly green.
  n = 0;
  for (let i = 0; i < allFlats.length; i += 1) {
    const paid = i % 3 !== 0;
    if (await insert('society_maintenance_bills', {
      id: `demo-bill-${i + 1}`, society_id: sid, flat_number: allFlats[i], month,
      year: new Date().getFullYear(), base_amount: 2800, water_charges: 350,
      parking_charges: 300, other_charges: 150, late_fee: paid ? 0 : 100,
      total_amount: paid ? 3600 : 3700, due_date: due,
      paid_amount: paid ? 3600 : 0, payment_status: paid ? 'paid' : 'pending',
      generated_by: userId(3),
    })) n += 1;
  }
  out.bills = n;

  // Complaints across the workflow.
  const complaints = [
    ['Lift making noise in B wing', 'maintenance', 'open', 'high'],
    ['Water leakage in C-203 bathroom', 'plumbing', 'in_progress', 'medium'],
    ['Corridor light out on 4th floor', 'electrical', 'resolved', 'low'],
    ['Stray dogs near parking gate', 'security', 'open', 'medium'],
  ];
  n = 0;
  for (let i = 0; i < complaints.length; i += 1) {
    const [title, category, status, priority] = complaints[i];
    if (await insert('society_complaints', {
      id: `demo-complaint-${i + 1}`, society_id: sid, user_id: userId(2),
      flat_number: flats[i % flats.length], category, title,
      description: `${title}. Reported by a resident through the app.`,
      status, priority, sla_hours: 48,
    })) n += 1;
  }
  out.complaints = n;

  // Amenities
  const amenities = [
    ['Clubhouse', 80, 500], ['Swimming Pool', 40, 0],
    ['Gym', 25, 0], ['Party Lawn', 150, 2500],
  ];
  n = 0;
  for (let i = 0; i < amenities.length; i += 1) {
    const [name, capacity, rate] = amenities[i];
    if (await insert('society_amenities', {
      id: `demo-amenity-${i + 1}`, society_id: sid, name,
      description: `${name} available to all residents on booking.`,
      capacity, hourly_rate: rate, booking_advance_days: 7, is_active: 1,
      rules: 'Booking must be cancelled at least 6 hours in advance.',
    })) n += 1;
  }
  out.amenities = n;

  // Notices
  const notices = [
    ['Water tanker schedule revised', 'Tankers will now arrive at 07:00 and 17:00 daily.', 0],
    ['AGM on Saturday 6 PM', 'Annual General Meeting at the clubhouse. Quorum required.', 1],
    ['Lift maintenance — B wing', 'B wing lift will be unavailable 10:00-13:00 on Thursday.', 1],
  ];
  n = 0;
  for (let i = 0; i < notices.length; i += 1) {
    const [title, content, urgent] = notices[i];
    if (await insert('society_notices', {
      id: `demo-notice-${i + 1}`, society_id: sid, posted_by: userId(3),
      created_by: userId(3), title, content, is_urgent: urgent,
      priority: urgent ? 'high' : 'normal', is_active: 1,
    })) n += 1;
  }
  out.notices = n;

  // Polls
  n = 0;
  if (await insert('society_polls', {
    id: 'demo-poll-1', society_id: sid, created_by: userId(3),
    question: 'Should we install EV charging points in the basement?',
    title: 'EV charging points', options: JSON.stringify(['Yes', 'No', 'Need more detail']),
    poll_type: 'single', status: 'open', min_quorum_percent: 30,
  })) n += 1;
  out.polls = n;

  // Packages waiting at the gate
  n = 0;
  for (let i = 0; i < 4; i += 1) {
    if (await insert('society_packages', {
      id: `demo-package-${i + 1}`, society_id: sid, flat_number: flats[i],
      resident_id: userId(2), logged_by: userId(4),
      courier_name: ['Amazon', 'Flipkart', 'Blue Dart', 'Delhivery'][i],
      package_description: 'Parcel held at gate', status: 'pending',
    })) n += 1;
  }
  out.packages = n;

  // Parking
  n = 0;
  for (let i = 0; i < flats.length; i += 1) {
    if (await insert('society_parking_slots', {
      id: `demo-parking-${i + 1}`, society_id: sid, slot_number: `P-${i + 1}`,
      slot_type: 'car', flat_number: flats[i],
      vehicle_number: `MH-12-${['AB', 'CD', 'EF', 'GH', 'IJ', 'KL'][i]}-${1000 + i}`,
      // FK is society_members.id, not users.id.
      vehicle_type: 'car', is_occupied: 1, assigned_to: `demo-member-${i + 1}`,
    })) n += 1;
  }
  out.parking = n;

  // Domestic staff
  const staff = [
    ['Lakshmi Bai', 'maid'], ['Ganesh Kamble', 'driver'],
    ['Sunil Jadhav', 'housekeeping'], ['Ramesh Yadav', 'security'],
  ];
  n = 0;
  for (let i = 0; i < staff.length; i += 1) {
    const [staff_name, staff_type] = staff[i];
    if (await insert('society_domestic_staff', {
      id: `demo-staff-${i + 1}`, society_id: sid, staff_name, staff_type,
      staff_phone: `+9198765432${10 + i}`, assigned_flats: JSON.stringify(flats.slice(0, 3)),
      is_active: 1, added_by: userId(3),
    })) n += 1;
  }
  out.staff = n;

  // Pre-approved visitors — the flow that is currently local-state-only on
  // mobile, so the gate has something real to check against.
  //
  // Each pass belongs to the resident of the flat it is for, so "My gate
  // passes" shows a resident their own guests, not the whole society's.
  const residentOf = Object.fromEntries([
    ...MEMBERS.map((m, i) => [flats[i], userId(m.persona)]),
    ...RESIDENTS.map(([, flat], i) => [flat, residentId(i)]),
  ]);
  const visitors = [
    ['Rajesh Sharma', 'service', 'B-401'], ['Priya Menon', 'guest', 'A-101'],
    ['Swiggy Delivery', 'delivery', 'C-203'], ['Anand Kulkarni', 'guest', 'B-401'],
    ['Urban Company Cleaner', 'service', 'A-202'], ['Sana Qureshi', 'guest', 'B-101'],
    ['Zepto Delivery', 'delivery', 'C-301'], ['Uber — MH12 QX 4471', 'cab', 'A-301'],
    ['Carpenter (Mohan)', 'service', 'B-302'], ['Ritu & family', 'guest', 'C-401'],
  ];
  n = 0;
  const from = new Date().toISOString();
  const until = new Date(Date.now() + 86400000).toISOString();
  for (let i = 0; i < visitors.length; i += 1) {
    const [visitor_name, purpose, flat] = visitors[i];
    if (await insert('society_visitor_preapprovals', {
      id: `demo-preapproval-${i + 1}`, society_id: sid, resident_id: residentOf[flat] || userId(2),
      flat_number: flat, visitor_name, visitor_phone: `+9190003000${String(i).padStart(2, '0')}`,
      // Six digits, distinct, and easy to read aloud on stage: 482101, 482102 …
      passcode: `4821${String(i + 1).padStart(2, '0')}`, purpose, valid_from: from, valid_until: until,
      max_uses: 1, used_count: 0, status: 'active', is_revoked: 0,
    })) n += 1;
  }
  out.preapprovals = n;

  // Today's gate register, in every state the guard's screen distinguishes:
  // inside now, already left, approved and on the way in, and one waiting at
  // the gate for the resident's answer — the one to approve live on stage.
  const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
  const register = [
    ['Amazon Delivery', 'delivery', 'A-201', 'checked_out', 190, 175, 'MH-12-RT-4410'],
    ['Lakshmi Bai (maid)', 'service', 'A-101', 'checked_out', 240, 120, null],
    ['Vijay Electricals', 'service', 'B-202', 'checked_in', 55, null, 'MH-14-BX-9021'],
    ['Meenal Joshi', 'guest', 'C-102', 'checked_in', 35, null, null],
    ['Blinkit Delivery', 'delivery', 'B-401', 'checked_out', 80, 72, 'MH-12-ZP-1187'],
    ['Ola — MH12 KT 9930', 'cab', 'A-302', 'approved', 6, null, 'MH-12-KT-9930'],
    ['Courier (DTDC)', 'delivery', 'C-201', 'checked_in', 12, null, null],
    ['Santosh Patil', 'guest', 'B-401', 'pending', 2, null, null],
  ];
  n = 0;
  for (let i = 0; i < register.length; i += 1) {
    const [visitor_name, purpose, flat, status, inMin, outMin, vehicle] = register[i];
    if (await insert('society_visitors', {
      id: `demo-visitor-${String(i + 1).padStart(2, '0')}`, society_id: sid, guard_id: userId(4),
      resident_id: residentOf[flat] || null, visitor_name, purpose, flat_number: flat, status,
      visitor_phone: `+9190004000${String(i).padStart(2, '0')}`, vehicle_number: vehicle, gate_id: 'GATE-1',
      created_at: ago(inMin),
      checked_in_at: ['checked_in', 'checked_out'].includes(status) ? ago(inMin) : null,
      checked_out_at: outMin ? ago(outMin) : null,
      approved_at: status === 'pending' ? null : ago(inMin),
    })) n += 1;
  }
  out.gateRegister = n;

  // Events, with RSVPs from neighbours so the counts are not all zero.
  const day = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
  const events = [
    ['Navratri Garba Night', 'festival', day(3), '19:30', 'Central Lawn', 'Dandiya sticks provided. Traditional dress encouraged.'],
    ['Annual General Meeting', 'meeting', day(6), '18:00', 'Clubhouse', 'Budget 2026-27, lift AMC renewal and EV charging proposal.'],
    ['Kids Summer Art Camp', 'kids', day(9), '10:00', 'Activity Room', 'Ages 5–12. Materials included.'],
  ];
  n = 0;
  for (let i = 0; i < events.length; i += 1) {
    const [title, event_type, event_date, start_time, venue, description] = events[i];
    const id = `demo-event-${i + 1}`;
    if (!(await insert('society_events', {
      id, society_id: sid, created_by: userId(3), title, description, event_date, start_time, venue,
      event_type, max_attendees: event_type === 'kids' ? 25 : null, is_active: 1,
    }))) continue;
    n += 1;
    for (let r = 0; r < 4 + i * 3; r += 1) {
      await insert('society_event_rsvps', {
        id: `demo-rsvp-${i + 1}-${r + 1}`, event_id: id, user_id: residentId(r),
        flat_number: RESIDENTS[r][1], status: r % 5 === 4 ? 'maybe' : 'going',
      });
    }
  }
  out.events = n;

  // A second, livelier poll, with votes cast.
  if (await insert('society_polls', {
    id: 'demo-poll-2', society_id: sid, created_by: userId(3),
    question: 'Which day should the weekly water-tank cleaning move to?',
    title: 'Water-tank cleaning day', options: JSON.stringify(['Tuesday', 'Wednesday', 'Saturday']),
    poll_type: 'single', status: 'active', min_quorum_percent: 25,
    ends_at: new Date(Date.now() + 4 * 86400000).toISOString(),
  })) {
    out.polls = (out.polls || 0) + 1;
    for (let v = 0; v < 11; v += 1) {
      await insert('society_poll_votes', {
        id: `demo-vote-2-${v + 1}`, poll_id: 'demo-poll-2', voter_id: residentId(v), selected_option: [2, 0, 2, 1, 2, 2, 0, 2, 1, 2, 0][v],
      });
    }
  }
  for (let v = 0; v < 7; v += 1) {
    await insert('society_poll_votes', {
      id: `demo-vote-1-${v + 1}`, poll_id: 'demo-poll-1', voter_id: residentId(v + 5), selected_option: [0, 0, 2, 0, 1, 0, 0][v],
    });
  }

  return out;
}

// ─── Verification ───────────────────────────────────────────────────────────

async function verify() {
  const checks = [
    ['users (demo personas)', `SELECT COUNT(*) AS c FROM users WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-user-')}'`, PERSONAS.length],
    ['local_shops', `SELECT COUNT(*) AS c FROM local_shops WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-shop-')}'`, SHOPS.length],
    ['shop_products', `SELECT COUNT(*) AS c FROM shop_products WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-prod-')}'`, SHOPS.reduce((n, s) => n + s.products.length, 0)],
    ['shops in a category', `SELECT COUNT(*) AS c FROM local_shops WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-shop-')}' AND category_id IS NOT NULL`, SHOPS.length],
    ['admin_jobs', `SELECT COUNT(*) AS c FROM admin_jobs WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-job-')}'`, JOBS.length],
    ['job_vacancies', `SELECT COUNT(*) AS c FROM job_vacancies WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-job-')}'`, JOBS.length],
    ['job board postings', `SELECT COUNT(*) AS c FROM local_job_postings WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-job-')}'`, JOBS.length],
    ['job_applications', `SELECT COUNT(*) AS c FROM job_applications WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-app-')}'`, JOBS.length * 3],
    ['properties', `SELECT COUNT(*) AS c FROM properties WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-prop-')}'`, PROPERTIES.length],
    ['carpool_rides', `SELECT COUNT(*) AS c FROM carpool_rides WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-ride-')}'`, RIDES.length],
    ['orders', `SELECT COUNT(*) AS c FROM orders WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-order-')}'`, 6],
    ['approved rider', `SELECT COUNT(*) AS c FROM delivery_agents WHERE id = '${seedId('demo-agent-07')}' AND kyc_status = 'active'`, 1],
    ['society members', `SELECT COUNT(*) AS c FROM society_members WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-member-')}'`, 6 + RESIDENTS.length + GUARDS.length],
    ['guards on today\'s roster', `SELECT COUNT(*) AS c FROM society_guard_shifts WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-shift-')}'`, GUARDS.length + 1],
    ['gate passes', `SELECT COUNT(*) AS c FROM society_visitor_preapprovals WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-preapproval-')}'`, 10],
    ['gate register', `SELECT COUNT(*) AS c FROM society_visitors WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-visitor-')}'`, 8],
    ['society events', `SELECT COUNT(*) AS c FROM society_events WHERE CAST(id AS TEXT) LIKE '${seedLike('demo-event-')}'`, 3],
  ];

  let ok = true;
  console.log('\nVerification');
  console.log('─'.repeat(58));
  for (const [label, sql, expected] of checks) {
    let actual = 0;
    try {
      const row = await queryOne(sql);
      actual = Number((row && (row.c ?? row.count ?? row.COUNT)) || 0);
    } catch (e) {
      console.log(`  ${'✗'} ${label.padEnd(26)} table unavailable (${e.message.split('\n')[0]})`);
      ok = false;
      continue;
    }
    const pass = actual >= expected;
    if (!pass) ok = false;
    console.log(`  ${pass ? '✓' : '✗'} ${label.padEnd(26)} ${actual} / ${expected}`);
  }
  return ok;
}

// ─── Entry point ────────────────────────────────────────────────────────────

async function main() {
  await connectDB();

  if (VERIFY_ONLY) {
    const ok = await verify();
    process.exit(ok ? 0 : 1);
  }

  console.log('Seeding investor demo data…\n');

  // One ordered teardown for the whole run. Doing it per-seeder meant users
  // were deleted while society_members still referenced them.
  await teardown();

  const personas = await seedPersonas();
  console.log(`  personas         ${personas}`);

  const shops = await seedShops();
  console.log(`  shops            ${shops.shops} with ${shops.products} catalogue items`);

  const jobs = await seedJobs();
  console.log(`  jobs             ${jobs} with applicants across 4 pipeline stages`);

  const props = await seedProperties();
  console.log(`  properties       ${props}`);

  const riders = await seedRider();
  console.log(`  rider profile    ${riders}`);

  const orders = await seedOrders();
  console.log(`  orders           ${orders} across the delivery lifecycle`);

  const rides = await seedCarpool();
  console.log(`  carpool rides    ${rides}`);

  const society = await seedSociety();
  console.log(`  society          ${Object.entries(society).map(([k, v]) => `${k}=${v}`).join(', ') || 'skipped'}`);

  console.log(`\n  ${inserted} rows written.`);

  if (skipped.length) {
    // Surfaced rather than swallowed: a demo that silently missed a module is
    // how you find out on stage.
    const unique = [...new Set(skipped)];
    console.log(`\n  ${skipped.length} insert(s) could not be written (${unique.length} distinct causes):`);
    unique.slice(0, 12).forEach((s) => console.log(`    - ${s}`));
  }

  console.log('\nDemo logins — OTP is always 123456 (non-production only):');
  console.log('─'.repeat(58));
  for (const p of PERSONAS) {
    console.log(`  ${phoneFor(p.n)}  ${p.role.padEnd(17)} ${p.name} — ${p.headline}`);
  }

  const ok = await verify();
  process.exit(ok ? 0 : 1);
}

// Only run when invoked directly. Without this guard, `require`ing the module
// for its PERSONAS list — as the test suite does — kicked off a full seed and
// then called process.exit() out from under the test runner.
if (require.main === module) {
  main().catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  });
}

module.exports = { PERSONAS, phoneFor, userId };
