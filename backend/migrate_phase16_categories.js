const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'src', 'data', 'localsampark.db');
const db = new sqlite3.Database(dbPath);

const newCategories = [
  { id: 'cat_040', name: 'Tiffin & Meal Subscription', slug: 'tiffin-meal-subscription', icon: 'Soup', model: 'hybrid', commission: 8 },
  { id: 'cat_041', name: 'Mobile & Computer Repair', slug: 'mobile-computer-repair', icon: 'Smartphone', model: 'hybrid', commission: 10 },
  { id: 'cat_042', name: 'Courier & Parcel Services', slug: 'courier-parcel', icon: 'Package', model: 'product', commission: 5 },
  { id: 'cat_043', name: 'Travel Agents & Visa', slug: 'travel-visa', icon: 'Plane', model: 'appointment', commission: 5 },
  { id: 'cat_044', name: 'Printing, Xerox & DTP', slug: 'printing-xerox', icon: 'Printer', model: 'hybrid', commission: 8 },
  { id: 'cat_045', name: 'Locksmith & Key Maker', slug: 'locksmith-key', icon: 'Key', model: 'appointment', commission: 10 },
  { id: 'cat_046', name: 'Packers & Movers', slug: 'packers-movers', icon: 'Truck', model: 'appointment', commission: 5 },
  { id: 'cat_047', name: 'Water Tanker & Supply', slug: 'water-tanker', icon: 'Droplet', model: 'product', commission: 5 },
  { id: 'cat_048', name: 'Gas Cylinder & LPG', slug: 'gas-cylinder', icon: 'Flame', model: 'product', commission: 3 },
  { id: 'cat_049', name: 'Jewellery & Gold', slug: 'jewellery-gold', icon: 'Gem', model: 'product', commission: 3 },
  { id: 'cat_050', name: 'Wedding & Party Planner', slug: 'wedding-planner', icon: 'PartyPopper', model: 'appointment', commission: 8 },
  { id: 'cat_051', name: 'Interior Design & Decor', slug: 'interior-design', icon: 'Paintbrush', model: 'appointment', commission: 8 },
  { id: 'cat_052', name: 'Painting & Renovation', slug: 'painting-renovation', icon: 'PaintRoller', model: 'appointment', commission: 10 },
  { id: 'cat_053', name: 'Security & CCTV', slug: 'security-cctv', icon: 'Shield', model: 'hybrid', commission: 8 },
  { id: 'cat_054', name: 'Coaching & Test Prep', slug: 'coaching-test-prep', icon: 'BookOpen', model: 'appointment', commission: 8 },
  { id: 'cat_055', name: 'Astrologer & Pandit', slug: 'astrologer-pandit', icon: 'Star', model: 'appointment', commission: 5 }
];

db.serialize(() => {
  let completed = 0;

  newCategories.forEach(cat => {
    // We are setting 'icon' column temporarily to a Lucide string name
    const sql = `
      INSERT OR IGNORE INTO shop_categories (id, name, slug, icon, business_model, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    db.run(sql, [cat.id, cat.name, cat.slug, cat.icon, cat.model], function(err) {
      if (err) {
        console.error(`Failed to insert ${cat.name}:`, err.message);
      } else {
        if (this.changes > 0) {
          console.log(`✅ Added category: ${cat.name}`);
        } else {
          console.log(`⚠️ Skipped category: ${cat.name} (already exists)`);
        }
      }
      completed++;
      if (completed === newCategories.length) {
        db.all("SELECT COUNT(*) as count FROM shop_categories", (err, row) => {
          console.log("Total categories in DB now:", row[0].count);
          process.exit(0);
        });
      }
    });
  });
});
