const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '../src/data/localsampark.db');
const db = new sqlite3.Database(dbPath);

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

async function seedShopDetails() {
  console.log('Seeding products, services, and staff for Demo Shops...');
  
  try {
    const { rows: shops } = await query("SELECT s.id as shop_id, s.name as shop_name, c.business_model, c.name as category_name FROM local_shops s JOIN shop_categories c ON s.category_id = c.id WHERE s.name LIKE 'Demo %'");
    console.log(`Found ${shops.length} Demo shops to populate.`);
    
    for (const shop of shops) {
      const { shop_id, shop_name, business_model, category_name } = shop;
      
      console.log(`Processing [${shop_name}] - Model: ${business_model}`);
      
      // Populate Products
      if (business_model === 'product' || business_model === 'hybrid') {
        const { rows: existingProducts } = await query("SELECT id FROM shop_products WHERE shop_id = ?", [shop_id]);
        if (existingProducts.length === 0) {
          // Add 3 dummy products
          for (let i = 1; i <= 3; i++) {
            await query(`
              INSERT INTO shop_products (id, shop_id, name, description, price, is_available, image_url)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              uuidv4(), 
              shop_id, 
              `${category_name} Item ${i}`, 
              `Premium quality ${category_name.toLowerCase()} item for your everyday needs.`, 
              199.0 + (i * 50), 
              1, 
              `https://ui-avatars.com/api/?name=${encodeURIComponent(category_name)}+${i}&background=random`
            ]);
          }
          console.log(`  - Added 3 products`);
        }
      }
      
      // Populate Services and Staff
      if (business_model === 'appointment' || business_model === 'hybrid') {
        const { rows: existingServices } = await query("SELECT id FROM shop_services WHERE shop_id = ?", [shop_id]);
        if (existingServices.length === 0) {
          // Add 2 dummy services
          for (let i = 1; i <= 2; i++) {
            await query(`
              INSERT INTO shop_services (id, shop_id, name, description, duration_minutes, price, is_available, category)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              uuidv4(), 
              shop_id, 
              `Standard ${category_name} Service ${i}`, 
              `A 30-minute professional service.`, 
              30, 
              299.0 + (i * 100), 
              1,
              'General'
            ]);
          }
          console.log(`  - Added 2 services`);
        }
        
        const { rows: existingStaff } = await query("SELECT id FROM shop_staff WHERE shop_id = ?", [shop_id]);
        if (existingStaff.length === 0) {
          // Add 1 staff member
          const staffId = uuidv4();
          await query(`
            INSERT INTO shop_staff (id, shop_id, name, role, phone_number, experience_years)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            staffId, 
            shop_id, 
            'John Expert', 
            'Senior Professional', 
            '9876543210',
            5
          ]);
          
          // Add availability (Mon-Sun)
          for (let day = 0; day <= 6; day++) {
            await query(`
              INSERT INTO staff_availability (id, staff_id, day_of_week, start_time, end_time, slot_duration_minutes)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [
              uuidv4(), 
              staffId, 
              day, 
              '09:00', 
              '18:00', 
              30
            ]);
          }
          console.log(`  - Added 1 staff member with 7-day availability`);
        }
      }
    }
    
    console.log(`Successfully populated details for all demo shops!`);
  } catch (err) {
    console.error('Error seeding details:', err);
  } finally {
    db.close();
  }
}

seedShopDetails();
