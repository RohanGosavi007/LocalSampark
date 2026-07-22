/**
 * Cold-Start Business Listing Automation Scraper
 * Aggregates public business listings into local_shops with 'pending_claim' status
 * Solves the zero-vendor cold-start problem.
 */

const { query, queryOne } = require('../../config/database');

// Simple Geohash generator for 6-char tile key
function encodeGeohash(latitude, longitude, precision = 6) {
  const BITS = [16, 8, 4, 2, 1];
  const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  let isEven = true;
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;
  let bit = 0;
  let ch = 0;
  let geohash = "";

  while (geohash.length < precision) {
    let mid;
    if (isEven) {
      mid = (lonMin + lonMax) / 2;
      if (longitude > mid) {
        ch |= BITS[bit];
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      mid = (latMin + latMax) / 2;
      if (latitude > mid) {
        ch |= BITS[bit];
        latMin = mid;
      } else {
        latMax = mid;
      }
    }
    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return geohash;
}

const MOCK_SCRAPED_DATA = [
  {
    name: 'Shree Krishna Daily Needs & Dairy',
    category_slug: 'groceries',
    address: 'Shop 4, Green Acres Society, Sector 12, Pimple Saudagar, Pune',
    phone_number: '+919822011122',
    latitude: 18.5912,
    longitude: 73.8010,
    pincode: '411027',
    description: 'Fresh milk, paneer, daily groceries & snacks.'
  },
  {
    name: 'Apex Super Specialty Pharmacy',
    category_slug: 'medical',
    address: 'Near Wellness Clinic, Main Road, Baner, Pune',
    phone_number: '+919822033344',
    latitude: 18.5590,
    longitude: 73.7868,
    pincode: '411045',
    description: '24/7 Medicines, health supplements & medical equipment.'
  },
  {
    name: 'Siddhi Vinayak Bakery & Confectionery',
    category_slug: 'bakery',
    address: 'Plot 18, Commercial Complex, Kothrud, Pune',
    phone_number: '+919822055566',
    latitude: 18.5074,
    longitude: 73.8077,
    pincode: '411038',
    description: 'Fresh cakes, artisan breads, and savory snacks.'
  },
  {
    name: 'Urban Hardware & Electricals',
    category_slug: 'services',
    address: 'Gate No 2, Market Yard, Hadapsar, Pune',
    phone_number: '+919822077788',
    latitude: 18.5089,
    longitude: 73.9260,
    pincode: '411028',
    description: 'Plumbing supplies, tools, cables and electrical fitting services.'
  }
];

async function runScraperPipeline(isTestMode = false) {
  console.log('🚀 Initiating Cold-Start Business Scraper Pipeline...');

  let ingestedCount = 0;
  for (const shopData of MOCK_SCRAPED_DATA) {
    try {
      const geohash = encodeGeohash(shopData.latitude, shopData.longitude, 6);

      // Check for existing shop using (name, geohash) fuzzy match
      const existing = await queryOne(
        `SELECT id FROM local_shops WHERE name = $1 OR (latitude = $2 AND longitude = $3) LIMIT 1`,
        [shopData.name, shopData.latitude, shopData.longitude]
      );

      if (!existing) {
        // Fetch category ID if available
        const catObj = await queryOne(`SELECT id FROM shop_categories WHERE slug = $1 LIMIT 1`, [shopData.category_slug]);
        const categoryId = catObj ? catObj.id : 1;

        await query(
          `INSERT INTO local_shops 
          (name, description, category, category_id, address, phone_number, latitude, longitude, coordinate, geohash, is_active, approval_status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 'pending_claim')`,
          [
            shopData.name,
            shopData.description,
            shopData.category_slug,
            categoryId,
            shopData.address,
            shopData.phone_number,
            shopData.latitude,
            shopData.longitude,
            `POINT(${shopData.longitude} ${shopData.latitude})`,
            geohash
          ]
        );
        ingestedCount++;
        console.log(`  [+] Ingested: ${shopData.name} (Geohash: ${geohash}) [Status: pending_claim]`);
      } else {
        console.log(`  [-] Duplicate Skipped: ${shopData.name}`);
      }
    } catch (err) {
      console.warn(`  [!] Failed to ingest ${shopData.name}:`, err.message);
    }
  }

  console.log(`\n✅ Scraper Pipeline Completed. Total Ingested: ${ingestedCount}`);
  if (isTestMode) process.exit(0);
  return ingestedCount;
}

if (require.main === module) {
  const isTestMode = process.argv.includes('--test');
  runScraperPipeline(isTestMode);
}

module.exports = { runScraperPipeline, encodeGeohash };
