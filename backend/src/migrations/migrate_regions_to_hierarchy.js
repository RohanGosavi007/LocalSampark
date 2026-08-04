/**
 * ═══════════════════════════════════════════════════════════════════════
 * Migration: Regions → 4-Tier Spatial Hierarchy
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * 1. Runs 032_spatial_hierarchy.sqlite.sql to create tables
 * 2. Fetches India Post API data to infer Talukas programmatically
 * 3. Reads existing `regions` table (1,578 pincodes)
 * 4. Populates: location_states → location_districts → location_talukas → territories
 * 5. Creates legacy_region_territory_map for backward compatibility
 * 
 * Usage: node backend/src/migrations/migrate_regions_to_hierarchy.js
 * ═══════════════════════════════════════════════════════════════════════
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '../data/localsampark.db');
const db = new sqlite3.Database(dbPath);

// ── Helper: Promisified DB operations ────────────────────────────────
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// ── Fetch India Post data for Taluka inference ───────────────────────
function fetchIndiaPostData() {
  return new Promise((resolve, reject) => {
    console.log('📡 Fetching India Post pincode dataset for Taluka inference...');
    https.get('https://raw.githubusercontent.com/mithunsasidharan/India-Pincode-Lookup/master/pincodes.json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// ── District name normalizer ─────────────────────────────────────────
function normalizeDistrict(d) {
  if (!d) return 'Unknown';
  let name = d.trim();
  // Capitalize first letter of each word
  name = name.replace(/\b\w/g, c => c.toUpperCase());
  
  // Map old/alternate names to standard 36-district names
  if (name.includes('Aurangabad')) return 'Chhatrapati Sambhajinagar';
  if (name.includes('Osmanabad')) return 'Dharashiv';
  if (name.includes('Ahmadnagar')) return 'Ahmednagar';
  if (name.includes('Gondiya') || name.includes('Gondya')) return 'Gondia';
  if (name.includes('Buldana')) return 'Buldhana';
  if (name.includes('Bid') && !name.includes('Bida')) return 'Beed';
  return name;
}

// ── Generate a simple circular GeoJSON boundary around a point ───────
function generateCircularBoundary(lat, lng, radiusKm = 3) {
  const turf = require('@turf/turf');
  try {
    const center = turf.point([lng, lat]);
    const circle = turf.circle(center, radiusKm, { steps: 32, units: 'kilometers' });
    return JSON.stringify(circle.geometry);
  } catch (e) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN MIGRATION
// ═══════════════════════════════════════════════════════════════════════
async function migrate() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  LocalSampark — 4-Tier Spatial Hierarchy Migration');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── Step 1: Run schema SQL ─────────────────────────────────────────
  console.log('📋 Step 1: Creating hierarchy tables...');
  const schemaSql = fs.readFileSync(
    path.join(__dirname, '032_spatial_hierarchy.sqlite.sql'), 'utf8'
  );
  
  // Strip comments for clean execution
  const cleanSql = schemaSql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
  
  // Use db.exec() which handles multi-statement SQL natively
  await new Promise((resolve, reject) => {
    db.exec(cleanSql, (err) => {
      if (err) {
        console.warn('  ⚠ Schema exec warning:', err.message);
        // Try to continue even if some tables already exist
        resolve();
      } else {
        resolve();
      }
    });
  });
  console.log('  ✅ Hierarchy tables created.\n');

  // ── Step 2: Fetch India Post data for Taluka mapping ───────────────
  let indiaPostData = [];
  try {
    indiaPostData = await fetchIndiaPostData();
  } catch (e) {
    console.warn('  ⚠ Could not fetch India Post data:', e.message);
    console.warn('  ⚠ Will create placeholder talukas.\n');
  }

  // Build pincode → taluka mapping from India Post
  const pincodeTalukaMap = {};
  const districtTalukaMap = {}; // { districtName: Set<talukaName> }

  if (Array.isArray(indiaPostData)) {
    const mhRecords = indiaPostData.filter(r =>
      (r.stateName && r.stateName.toLowerCase() === 'maharashtra')
    );
    console.log(`  📊 Found ${mhRecords.length} Maharashtra records in India Post data.`);

    for (const rec of mhRecords) {
      const pin = (rec.pincode || '').toString();
      const taluka = rec.taluk || rec.Taluk || rec.taluka || rec.divisionName || '';
      const district = normalizeDistrict(rec.districtName || rec.District || '');

      if (pin && taluka && district) {
        pincodeTalukaMap[pin] = { taluka: taluka.trim(), district };
        
        if (!districtTalukaMap[district]) districtTalukaMap[district] = new Set();
        districtTalukaMap[district].add(taluka.trim());
      }
    }
    console.log(`  📊 Mapped ${Object.keys(pincodeTalukaMap).length} pincodes to talukas.`);
    console.log(`  📊 Found talukas across ${Object.keys(districtTalukaMap).length} districts.\n`);
  }

  // ── Step 3: Read existing regions ──────────────────────────────────
  console.log('📋 Step 3: Reading existing regions...');
  const regions = await dbAll('SELECT * FROM regions WHERE is_active = 1');
  console.log(`  📊 Found ${regions.length} active regions.\n`);

  if (regions.length === 0) {
    console.log('  ❌ No regions found. Run the pincode seeder first.');
    db.close();
    return;
  }

  // ── Step 4: Create State ───────────────────────────────────────────
  console.log('📋 Step 4: Creating Maharashtra state...');
  const stateId = 'state_mh';
  try {
    await dbRun(
      'INSERT OR IGNORE INTO location_states (id, name, code) VALUES (?, ?, ?)',
      [stateId, 'Maharashtra', 'MH']
    );
  } catch (e) { /* already exists */ }
  console.log('  ✅ State: Maharashtra\n');

  // ── Step 5: Create Districts ───────────────────────────────────────
  console.log('📋 Step 5: Creating districts...');
  const districtIds = {};
  const uniqueDistricts = [...new Set(regions.map(r => r.district).filter(Boolean))];

  for (const distName of uniqueDistricts) {
    const distId = 'dist_' + distName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    districtIds[distName] = distId;
    try {
      await dbRun(
        'INSERT OR IGNORE INTO location_districts (id, state_id, name) VALUES (?, ?, ?)',
        [distId, stateId, distName]
      );
    } catch (e) { /* already exists */ }
  }
  console.log(`  ✅ Created ${uniqueDistricts.length} districts.\n`);

  // ── Step 6: Create Talukas (inferred from India Post) ──────────────
  console.log('📋 Step 6: Creating talukas (inferred from India Post API)...');
  const talukaIds = {}; // { "districtName|talukaName": id }
  let talukaCount = 0;

  for (const distName of uniqueDistricts) {
    const distId = districtIds[distName];
    let talukas = districtTalukaMap[distName];

    if (!talukas || talukas.size === 0) {
      // Fallback: create a default taluka named after the district
      talukas = new Set([distName + ' Taluka']);
    }

    for (const talukaName of talukas) {
      const talukaKey = `${distName}|${talukaName}`;
      const talukaId = 'tal_' + talukaName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + (talukaCount++);
      talukaIds[talukaKey] = talukaId;

      try {
        await dbRun(
          'INSERT OR IGNORE INTO location_talukas (id, district_id, name) VALUES (?, ?, ?)',
          [talukaId, distId, talukaName]
        );
      } catch (e) { /* already exists */ }
    }
  }
  console.log(`  ✅ Created ${talukaCount} talukas.\n`);

  // ── Step 7: Migrate Regions → Territories ──────────────────────────
  console.log('📋 Step 7: Migrating regions to territories...');
  await dbRun('BEGIN TRANSACTION');

  let successCount = 0;
  let failCount = 0;

  for (const region of regions) {
    try {
      const pincode = region.pincode || '';
      const distName = region.district || 'Unknown';
      const distId = districtIds[distName];

      if (!distId) {
        failCount++;
        continue;
      }

      // Find the correct taluka for this pincode
      let talukaId = null;
      const postInfo = pincodeTalukaMap[pincode];
      
      if (postInfo) {
        const talukaKey = `${distName}|${postInfo.taluka}`;
        talukaId = talukaIds[talukaKey];
      }

      // Fallback: use the first/default taluka for this district
      if (!talukaId) {
        const fallbackKey = Object.keys(talukaIds).find(k => k.startsWith(distName + '|'));
        talukaId = fallbackKey ? talukaIds[fallbackKey] : null;
      }

      if (!talukaId) {
        // Last resort: create a placeholder taluka
        talukaId = 'tal_placeholder_' + successCount;
        await dbRun(
          'INSERT OR IGNORE INTO location_talukas (id, district_id, name) VALUES (?, ?, ?)',
          [talukaId, distId, distName + ' (Default)']
        );
      }

      // Extract area name from region name (strip pincode suffix if present)
      let areaName = region.name || '';
      areaName = areaName.replace(/\s*-\s*\d{6}\s*$/, '').trim();
      if (!areaName) areaName = pincode;

      const territoryId = 'terr_' + pincode;
      const lat = region.latitude || 18.5;
      const lng = region.longitude || 73.8;

      // Generate a circular boundary polygon around the centroid
      const boundary = generateCircularBoundary(lat, lng, region.radius_km || 3);

      // Determine tier based on district
      let tier = 'tier3';
      const metroDistricts = ['Mumbai City', 'Mumbai Suburban', 'Pune', 'Nagpur', 'Thane'];
      const tier2Districts = ['Nashik', 'Kolhapur', 'Chhatrapati Sambhajinagar', 'Solapur', 'Palghar'];
      if (metroDistricts.includes(distName)) tier = 'tier1';
      else if (tier2Districts.includes(distName)) tier = 'tier2';

      await dbRun(`
        INSERT OR IGNORE INTO territories 
        (id, taluka_id, name, pincode, centroid_lat, centroid_lng, boundary_geojson, radius_km, tier, zone_type, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        territoryId, talukaId, areaName, pincode,
        lat, lng, boundary,
        region.radius_km || 5.0,
        tier,
        tier === 'tier1' ? 'urban' : tier === 'tier2' ? 'suburban' : 'rural',
        1
      ]);

      // Create legacy mapping
      await dbRun(
        'INSERT OR IGNORE INTO legacy_region_territory_map (legacy_region_id, territory_id) VALUES (?, ?)',
        [region.id, territoryId]
      );

      successCount++;
    } catch (e) {
      failCount++;
      if (!e.message.includes('UNIQUE constraint')) {
        console.warn(`  ⚠ Failed for region ${region.name}:`, e.message);
      }
    }
  }

  await dbRun('COMMIT');
  console.log(`  ✅ Migrated ${successCount} territories (${failCount} skipped).\n`);

  // ── Step 8: Verification ───────────────────────────────────────────
  console.log('📋 Step 8: Verification...');
  const stateCount = await dbGet('SELECT count(*) as c FROM location_states');
  const distCount = await dbGet('SELECT count(*) as c FROM location_districts');
  const talCount = await dbGet('SELECT count(*) as c FROM location_talukas');
  const terrCount = await dbGet('SELECT count(*) as c FROM territories');
  const mapCount = await dbGet('SELECT count(*) as c FROM legacy_region_territory_map');

  console.log(`  📊 States:      ${stateCount.c}`);
  console.log(`  📊 Districts:   ${distCount.c}`);
  console.log(`  📊 Talukas:     ${talCount.c}`);
  console.log(`  📊 Territories: ${terrCount.c}`);
  console.log(`  📊 Legacy Maps: ${mapCount.c}`);

  // Show sample
  const sample = await dbAll(`
    SELECT t.name, t.pincode, t.tier, lt.name as taluka, ld.name as district
    FROM territories t
    JOIN location_talukas lt ON t.taluka_id = lt.id
    JOIN location_districts ld ON lt.district_id = ld.id
    LIMIT 5
  `);
  console.log('\n  📋 Sample territories:');
  for (const s of sample) {
    console.log(`     ${s.name} (${s.pincode}) → ${s.taluka}, ${s.district} [${s.tier}]`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ Migration Complete!');
  console.log('═══════════════════════════════════════════════════════════════\n');

  db.close();
}

// Run
migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  db.close();
  process.exit(1);
});
