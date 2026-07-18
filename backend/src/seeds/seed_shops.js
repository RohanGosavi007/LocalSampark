const { query, queryOne, queryMany } = require('../config/database');
const crypto = require('crypto');

const adjectives = ['Royal', 'Fresh', 'Happy', 'Quick', 'Prime', 'Green', 'Golden', 'Silver', 'Elite', 'Metro', 'City', 'Super', 'Mega', 'Star', 'Bright'];
const nouns = ['Mart', 'Store', 'Boutique', 'Center', 'Hub', 'Point', 'Spot', 'Corner', 'Bazaar', 'Square', 'World', 'Planet', 'Zone', 'Station'];
const names = ['Sharma', 'Gupta', 'Patil', 'Deshmukh', 'Reddy', 'Singh', 'Kumar', 'Jain', 'Verma', 'Khan', 'Ali'];

function getRandomName(categoryName) {
  const isNameBased = Math.random() > 0.5;
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const person = names[Math.floor(Math.random() * names.length)];
  
  // Extract a keyword from category, e.g. "Grocery & Supermarkets" -> "Grocery"
  const catKeyword = categoryName.split(' ')[0].replace(',', '');

  if (isNameBased) {
    return `${person} ${catKeyword} ${noun}`;
  } else {
    return `${adj} ${catKeyword} ${noun}`;
  }
}

function getRandomLocation(baseLat, baseLng, radiusInKm) {
  const radiusInDegrees = radiusInKm / 111;
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  
  const newLng = x / Math.cos(baseLat * (Math.PI / 180));
  
  return {
    lat: baseLat + y,
    lng: baseLng + newLng
  };
}

async function seedDemoShops() {
  try {
    console.log('🌱 Starting mock shops seed...');

    // Clear existing shops to start fresh
    await query("DELETE FROM local_shops");
    await query("DELETE FROM shop_products");
    await query("DELETE FROM shop_staff");
    await query("DELETE FROM shop_offers");
    console.log('🗑️ Cleared existing shops.');

    // 1. Get or create a region
    let region = await queryOne("SELECT id, latitude, longitude FROM regions LIMIT 1");
    let regionId;
    let baseLat = 18.5786;
    let baseLng = 73.8967;
    
    if (!region) {
      regionId = crypto.randomUUID();
      await query(
        `INSERT INTO regions (id, name, state, country, latitude, longitude, radius_km)
         VALUES ($1, 'Dhanori', 'Maharashtra', 'India', 18.5786, 73.8967, 5.0)`,
        [regionId]
      );
    } else {
      regionId = region.id;
      if (region.latitude) baseLat = region.latitude;
      if (region.longitude) baseLng = region.longitude;
    }

    // 2. Get or create an owner user
    let owner = await queryOne("SELECT id FROM users WHERE role = 'shop_owner' LIMIT 1");
    let ownerId;
    if (!owner) {
      ownerId = crypto.randomUUID();
      await query(
        `INSERT INTO users (id, phone_number, full_name, role, is_verified, is_active, region_id)
         VALUES ($1, '+919876543210', 'Mock Owner', 'shop_owner', true, true, $2)`,
        [ownerId, regionId]
      );
    } else {
      ownerId = owner.id;
    }

    // 3. Get all categories
    const categories = await queryMany("SELECT id, name, slug FROM shop_categories");
    
    if (!categories || categories.length === 0) {
      console.log('⚠️ No categories found. Please seed categories first.');
      process.exit(1);
    }

    // 4. Insert 2 random shops for each category
    let shopCount = 0;
    for (const cat of categories) {
      for (let i = 0; i < 2; i++) {
        const shopName = getRandomName(cat.name);
        console.log(`Adding shop: ${shopName} for category ${cat.name}...`);
        
        const shopId = crypto.randomUUID();
        const loc = getRandomLocation(baseLat, baseLng, 5); // 5km radius
        const geom = `ST_GeomFromText('POINT(${loc.lng} ${loc.lat})', 4326)`;
        const shopType = (cat.slug.includes('service') || cat.slug.includes('salon') || cat.slug.includes('repair')) ? 'appointment' : 'retail';
        
        await query(
          `INSERT INTO local_shops (id, owner_id, region_id, category_id, name, description, category, phone_number, address, coordinate, latitude, longitude, opening_hours, photo_urls, shop_type, approval_status, is_verified, is_active, delivery_available)
           VALUES ($1, $2, $3, $4, $5, $6, $7, '+919999999999', $8, ${geom}, $9, $10, '{"open":"09:00","close":"21:00"}', '[]', $11, 'approved', 1, 1, 1)`,
          [shopId, ownerId, regionId, cat.id, shopName, `Best ${cat.name} in the neighborhood.`, cat.name, `Random Address, Near Landmark, Pune`, loc.lat, loc.lng, shopType]
        );

        // Add products if retail
        if (shopType === 'retail') {
          for (let p = 1; p <= 3; p++) {
            const productId = crypto.randomUUID();
            await query(
              `INSERT INTO shop_products (id, shop_id, name, description, price, is_available)
               VALUES ($1, $2, $3, 'Fresh items in stock', $4, 1)`,
              [productId, shopId, `${cat.name.split(' ')[0]} Item ${p}`, Math.floor(Math.random() * 500) + 50]
            );
          }
        }

        // Add staff if appointment
        if (shopType === 'appointment') {
          for (let s = 1; s <= 2; s++) {
            const staffId = crypto.randomUUID();
            await query(
              `INSERT INTO shop_staff (id, shop_id, name, role, is_active)
               VALUES ($1, $2, $3, $4, 1)`,
              [staffId, shopId, `Expert ${s}`, 'Specialist']
            );

            // Add standard staff availability (Mon-Fri 09:00 - 18:00)
            for (let day = 1; day <= 5; day++) {
              await query(
                `INSERT INTO staff_availability (id, staff_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available)
                 VALUES ($1, $2, $3, '09:00', '18:00', 30, 1)`,
                [crypto.randomUUID(), staffId, day]
              );
            }
          }
        }

        // Add an offer
        const offerId = crypto.randomUUID();
        await query(
          `INSERT INTO shop_offers (id, shop_id, title, description, discount_percentage, valid_until, is_active)
           VALUES ($1, $2, 'Grand Opening Special Offer', 'Get discount on our services or stock today!', 15, '2026-12-31T00:00:00.000Z', 1)`,
          [offerId, shopId]
        );
        
        shopCount++;
      }
    }

    console.log(`✅ Mock shops seed completed successfully! Created ${shopCount} shops.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDemoShops();
