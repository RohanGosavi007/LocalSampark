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

async function seedDemoShops() {
  console.log('Seeding 1 demo shop per category...');
  
  try {
    const { rows: categories } = await query('SELECT * FROM shop_categories');
    console.log(`Found ${categories.length} categories.`);
    
    const dummyOwnerId = 'usr_000000000000000000000'; 
    
    let count = 0;
    
    for (const category of categories) {
      const shopId = uuidv4();
      
      const lat = PILOT_LAT + (Math.random() * 0.04 - 0.02);
      const lng = PILOT_LNG + (Math.random() * 0.04 - 0.02);
      
      const shopName = `Demo ${category.name}`;
      
      const { rows: existing } = await query('SELECT id FROM local_shops WHERE category_id = ? AND name LIKE ?', [category.id, 'Demo %']);
      if (existing.length > 0) {
         continue; 
      }

      await query(`
        INSERT INTO local_shops (
          id, name, description, address, owner_id,
          approval_status, is_active, latitude, longitude, category_id, category,
          is_premium, delivery_available, pickup_available, 
          estimated_delivery_time, phone_number, coordinate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        shopId,
        shopName,
        `This is a demo shop for the ${category.name} category to test functionality.`,
        'Demo Address, Dhanori, Pune',
        dummyOwnerId,
        'approved',
        1,
        lat,
        lng,
        category.id,
        category.slug,
        category.business_model === 'appointment' ? 1 : 0, 
        category.business_model === 'product' || category.business_model === 'hybrid' ? 1 : 0,
        1,
        '30-45 mins',
        '9876543210',
        `POINT(${lng} ${lat})`
      ]);

      if (category.business_model === 'product' || category.business_model === 'hybrid') {
         // await query(`
         //   INSERT INTO products (id, shop_id, name, description, price, original_price, stock_quantity, category, image_url, is_active)
         //   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         // `, [
         //   uuidv4(), shopId, `Demo Item 1`, `A generic item from ${shopName}`, 99.0, 150.0, 50, 'Essentials', null, 1
         // ]);
      }
      
      // if (category.business_model === 'appointment' || category.business_model === 'hybrid') {
      //    const serviceId = uuidv4();
      //    await query(`
      //      INSERT INTO shop_services (id, shop_id, name, description, duration_minutes, price, is_available)
      //      VALUES (?, ?, ?, ?, ?, ?, ?)
      //    `, [
      //      serviceId, shopId, `Demo Service`, `Standard 30 min service`, 30, 299.0, 1
      //    ]);
      //    
      //    const staffId = uuidv4();
      //    await query(`
      //      INSERT INTO shop_staff (id, shop_id, name, specialization, phone_number)
      //      VALUES (?, ?, ?, ?, ?)
      //    `, [
      //      staffId, shopId, 'Demo Expert', 'Senior Specialist', '9999999999'
      //    ]);
      //    
      //    for (let i = 1; i <= 5; i++) {
      //      await query(`
      //        INSERT INTO staff_availability (id, staff_id, day_of_week, start_time, end_time, slot_duration_minutes)
      //        VALUES (?, ?, ?, ?, ?, ?)
      //      `, [
      //        uuidv4(), staffId, i, '09:00', '18:00', 30
      //      ]);
      //    }
      // }
      
      count++;
    }
    
    console.log(`Successfully seeded ${count} new demo shops!`);
  } catch (err) {
    console.error('Error seeding shops:', err);
  } finally {
    db.close();
  }
}

seedDemoShops();
