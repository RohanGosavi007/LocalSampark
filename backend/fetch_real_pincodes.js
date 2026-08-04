const https = require('https');
const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'src/data/localsampark.db');
const db = new sqlite3.Database(dbPath);

async function fetchPincodes() {
  return new Promise((resolve, reject) => {
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

function normalizeDistrict(d) {
  if (!d) return 'Unknown';
  let name = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
  
  // Map old names to new standard 36 districts
  if (name.includes('Aurangabad')) return 'Chhatrapati Sambhajinagar';
  if (name.includes('Osmanabad')) return 'Dharashiv';
  if (name.includes('Mumbai')) {
    if (name.includes('Suburban')) return 'Mumbai Suburban';
    return 'Mumbai City';
  }
  if (name.includes('Ahmadnagar')) return 'Ahmednagar';
  if (name.includes('Gondiya')) return 'Gondia';
  if (name.includes('Buldana')) return 'Buldhana';
  return name;
}

async function run() {
  console.log('Fetching Indian Pincodes dataset...');
  let data;
  try {
    data = await fetchPincodes();
  } catch (e) {
    console.error('Failed to fetch from API:', e.message);
    return;
  }
  
  let mhData = [];
  if (Array.isArray(data)) {
    mhData = data.filter(d => 
      (d.stateName && d.stateName.toLowerCase() === 'maharashtra') || 
      (d.State && d.State.toLowerCase() === 'maharashtra')
    );
  }
  
  if (mhData.length === 0) {
    console.log('Could not find Maharashtra data.');
    return;
  }
  
  let insertedPins = new Set();
  let finalSelection = [];
  
  // Insert all unique pincodes
  for (const item of mhData) {
    const rawDist = item.districtName || item.District;
    const pin = item.pincode || item.Pincode;
    const office = item.officeName || item.Office || item.Name;
    
    if (rawDist && pin && office && !insertedPins.has(pin.toString())) {
      const dist = normalizeDistrict(rawDist);
      
      // Filter out small branch post offices to keep it "major" (Head offices, sub-offices)
      // Usually BO = Branch Office, SO = Sub Office, HO = Head Office
      // We will only insert HO, SO, or if it doesn't have an indicator.
      if (office.includes(' B.O') || office.endsWith(' BO')) {
          continue; 
      }
      
      let cleanOffice = office.replace(/ H\.O| S\.O| B\.O| HO| SO| BO/g, '').trim();
      
      finalSelection.push({ pin: pin.toString(), area: cleanOffice, dist: dist });
      insertedPins.add(pin.toString());
    }
  }
  
  // If we ended up filtering too many, let's just grab all unique pincodes regardless of BO/SO status
  if (finalSelection.length < 1000) {
      insertedPins.clear();
      finalSelection = [];
      for (const item of mhData) {
        const rawDist = item.districtName || item.District;
        const pin = item.pincode || item.Pincode;
        const office = item.officeName || item.Office || item.Name;
        
        if (rawDist && pin && office && !insertedPins.has(pin.toString())) {
          let cleanOffice = office.replace(/ H\.O| S\.O| B\.O| HO| SO| BO/g, '').trim();
          finalSelection.push({ pin: pin.toString(), area: cleanOffice, dist: normalizeDistrict(rawDist) });
          insertedPins.add(pin.toString());
        }
      }
  }
  
  const distCounts = {};
  for(const f of finalSelection) {
      distCounts[f.dist] = (distCounts[f.dist] || 0) + 1;
  }
  
  console.log(`Selected ${finalSelection.length} unique major pincodes across ${Object.keys(distCounts).length} districts.`);
  
  db.serialize(() => {
    db.run('DELETE FROM regions');
    db.run('BEGIN TRANSACTION');
    const stmt = db.prepare('INSERT INTO regions (name, state, district, city, pincode, latitude, longitude, country, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    
    for (const zone of finalSelection) {
      const uniqueName = zone.area + ' - ' + zone.pin;
      const lat = 15 + Math.random() * 5; 
      const lng = 72 + Math.random() * 8; 
      stmt.run(uniqueName, 'Maharashtra', zone.dist, zone.dist, zone.pin, lat, lng, 'India', 1);
    }
    
    stmt.finalize();
    db.run('COMMIT', () => {
      db.get('SELECT count(*) as count FROM regions', (err, row) => {
        console.log('Successfully inserted ' + row.count + ' regions/pincodes into the database.');
      });
    });
  });
}

run();
