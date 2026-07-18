const fs = require('fs');
const path = require('path');
const { query, queryOne } = require('../config/database');
const crypto = require('crypto');

async function run() {
  try {
    const filePath = path.join(__dirname, '../../../apps/web/src/app/data/locations.js');
    console.log(`Reading locations from ${filePath}...`);
    const file = fs.readFileSync(filePath, 'utf-8');
    
    // Extract TERRITORIES array
    // The array goes until the end of the file basically, but it's terminated by semi-colon or just EOF.
    // Given it's a very large array with comments, eval might be tricky if we don't grab it all.
    // Since it's the last export in the file, we can just split by "export const TERRITORIES = "
    const parts = file.split('export const TERRITORIES = ');
    if (parts.length < 2) {
      console.error("Could not find TERRITORIES in file");
      return;
    }
    
    let territoriesStr = parts[1];
    // Remove any trailing semicolons or exports if any
    territoriesStr = territoriesStr.trim().replace(/;$/, '');
    
    let TERRITORIES;
    try {
      TERRITORIES = eval('(' + territoriesStr + ')');
    } catch(e) {
      console.error("Error evaluating array. Trying alternative parse...");
      // Sometimes there are comments or missing things that break eval.
      // But it's valid JS.
      const vm = require('vm');
      const context = {};
      vm.createContext(context);
      TERRITORIES = vm.runInContext('(' + territoriesStr + ')', context);
    }

    console.log(`Found ${TERRITORIES.length} territories. Commencing migration...`);

    let inserted = 0;
    let skipped = 0;

    for (const t of TERRITORIES) {
      const id = crypto.randomUUID();
      const isActive = t.status === 'Active' ? 1 : 0;
      
      const existing = await queryOne('SELECT * FROM regions WHERE name = $1', [t.zone]);
      if (!existing) {
        // Approximate latitude/longitude based on district just so they aren't 0,0
        let lat = 18.5204;
        let lng = 73.8567;
        
        if (t.district === 'Mumbai City' || t.district === 'Mumbai Suburban') { lat = 19.0760; lng = 72.8777; }
        if (t.district === 'Nagpur') { lat = 21.1458; lng = 79.0882; }
        
        await queryOne(`
          INSERT INTO regions (id, name, pincode, state, country, latitude, longitude, radius_km, district, is_active)
          VALUES ($1, $2, $3, 'Maharashtra', 'India', $4, $5, 5.0, $6, $7)
        `, [id, t.zone, t.pin, lat, lng, t.district || 'Pune', isActive]);
        inserted++;
      } else {
        skipped++;
      }
    }

    console.log(`Migration complete! Inserted: ${inserted}, Skipped (already exist): ${skipped}`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
