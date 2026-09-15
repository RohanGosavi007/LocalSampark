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

    // Clear existing shops to start fresh.
    //
    // Children first. This deleted local_shops before its dependants, which
    // works exactly once — on an empty catalogue. shop_products.shop_id is
    // declared ON DELETE NO ACTION (unlike shop_offers and shop_staff, which
    // cascade), so as soon as a single product existed the first statement
    // failed with a foreign-key error and the whole re-seed aborted.
    //
    // staff_availability hangs off shop_staff rather than off a shop, so it is
    // removed before its parent for the same reason.
    await query("DELETE FROM staff_availability");
    await query("DELETE FROM shop_products");
    await query("DELETE FROM shop_staff");
    await query("DELETE FROM shop_offers");
    await query("DELETE FROM local_shops");
    console.log('🗑️ Cleared existing shops.');

    // 1. Anchor the demo catalogue to the coordinates the app actually opens at.
    //
    // This used to take `SELECT ... FROM regions LIMIT 1` — an arbitrary row,
    // since there is no ORDER BY — and adopt its latitude and longitude,
    // discarding the Dhanori defaults declared just below. The first row that
    // came back was "Aurangabad City - 431001" at 16.81, 73.09, so all 124 demo
    // shops were scattered around a point roughly 200 km from Pune.
    //
    // Nothing reported a problem, but the shop feed was empty for the demo:
    // /shops/nearby and /ml/recommendations/home both fall back to 18.59, 73.90
    // when the client sends no location, and a 10 km radius around Pune
    // contains none of the seeded shops. Opening the app without granting
    // location permission — which is exactly what happens on a fresh install
    // during a demo — showed nothing at all.
    //
    // The regions table cannot be trusted for this: its coordinates are
    // randomly generated and do not match the place names attached to them
    // ("Botanical Garden (Pune)" is recorded at 15.05, 78.31, in Andhra
    // Pradesh). The demo anchors on the app's own default centre instead, and
    // a Dhanori region is created with matching coordinates if one is missing.
    const DEMO_LAT = 18.5786;
    const DEMO_LNG = 73.8967;
    let baseLat = DEMO_LAT;
    let baseLng = DEMO_LNG;

    let region = await queryOne(
      "SELECT id, latitude, longitude FROM regions WHERE name LIKE 'Dhanori%' AND id IS NOT NULL LIMIT 1"
    );
    let regionId;

    if (!region) {
      regionId = crypto.randomUUID();
      await query(
        `INSERT INTO regions (id, name, state, country, latitude, longitude, radius_km)
         VALUES ($1, 'Dhanori', 'Maharashtra', 'India', $2, $3, 5.0)`,
        [regionId, DEMO_LAT, DEMO_LNG]
      );
    } else {
      regionId = region.id;
      // Only adopt the stored coordinates when they are plausibly the same
      // place. Anything further than ~50 km from the app's default centre is
      // the corrupted-coordinate case above, and following it would empty the
      // demo feed again.
      const lat = Number(region.latitude);
      const lng = Number(region.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)
          && Math.abs(lat - DEMO_LAT) < 0.5 && Math.abs(lng - DEMO_LNG) < 0.5) {
        baseLat = lat;
        baseLng = lng;
      }
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
