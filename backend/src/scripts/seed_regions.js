const { query } = require('../config/database');
const crypto = require('crypto');

const maharashtraRegions = [
  {
    name: 'Maharashtra',
    type: 'state',
    pincode: null,
    children: [
      {
        name: 'Pune District',
        type: 'district',
        pincode: '411000',
        children: [
          { name: 'Pune City', type: 'taluka', pincode: '411001', children: [
            { name: 'Kothrud', type: 'locality', pincode: '411038' },
            { name: 'Shivajinagar', type: 'locality', pincode: '411005' },
            { name: 'Viman Nagar', type: 'locality', pincode: '411014' },
            { name: 'Kharadi', type: 'locality', pincode: '411014' },
            { name: 'Wakad', type: 'locality', pincode: '411057' }
          ]},
          { name: 'Haveli', type: 'taluka', pincode: '411028', children: [] },
          { name: 'Khed', type: 'taluka', pincode: '410505', children: [] },
          { name: 'Baramati', type: 'taluka', pincode: '413102', children: [] }
        ]
      },
      {
        name: 'Mumbai Suburban',
        type: 'district',
        pincode: '400000',
        children: [
          { name: 'Andheri', type: 'taluka', pincode: '400053', children: [
            { name: 'Andheri West', type: 'locality', pincode: '400053' },
            { name: 'Andheri East', type: 'locality', pincode: '400069' }
          ]},
          { name: 'Borivali', type: 'taluka', pincode: '400092', children: [
            { name: 'Borivali West', type: 'locality', pincode: '400092' }
          ]},
          { name: 'Kurla', type: 'taluka', pincode: '400070', children: [
            { name: 'Bandra', type: 'locality', pincode: '400050' },
            { name: 'Powai', type: 'locality', pincode: '400076' }
          ]}
        ]
      },
      {
        name: 'Thane District',
        type: 'district',
        pincode: '400600',
        children: [
          { name: 'Thane City', type: 'taluka', pincode: '400601', children: [
            { name: 'Majiwada', type: 'locality', pincode: '400601' },
            { name: 'Kolshet', type: 'locality', pincode: '400607' }
          ]},
          { name: 'Kalyan', type: 'taluka', pincode: '421301', children: [] },
          { name: 'Ulhasnagar', type: 'taluka', pincode: '421001', children: [] }
        ]
      },
      {
        name: 'Nagpur District',
        type: 'district',
        pincode: '440000',
        children: [
          { name: 'Nagpur City', type: 'taluka', pincode: '440001', children: [
            { name: 'Dharampeth', type: 'locality', pincode: '440010' },
            { name: 'Sitabuldi', type: 'locality', pincode: '440012' }
          ]}
        ]
      },
      {
        name: 'Nashik District',
        type: 'district',
        pincode: '422000',
        children: [
          { name: 'Nashik City', type: 'taluka', pincode: '422001', children: [
            { name: 'Panchavati', type: 'locality', pincode: '422003' },
            { name: 'Indira Nagar', type: 'locality', pincode: '422009' }
          ]}
        ]
      }
    ]
  }
];

async function insertRegion(region, parentId) {
  try {
    // Check if exists
    let existing = await query(`SELECT id FROM regions WHERE name = $1`, [region.name]);
    let regionId;
    
    if (existing.rowCount > 0 || (existing.rows && existing.rows.length > 0)) {
      regionId = existing.rows ? existing.rows[0].id : existing[0].id;
      // Update missing hierarchy details
      await query(`UPDATE regions SET region_type = $1, parent_id = $2, pincode = $3, is_active = true WHERE id = $4`, [
        region.type, parentId || null, region.pincode || null, regionId
      ]);
      console.log(`Updated region: ${region.name} (${region.type})`);
    } else {
      regionId = crypto.randomUUID();
      await query(`
        INSERT INTO regions (id, name, region_type, parent_id, pincode, state, country, latitude, longitude, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)
      `, [
        regionId, 
        region.name, 
        region.type, 
        parentId || null, 
        region.pincode || null, 
        'Maharashtra', 
        'India', 
        0, 0 // Placeholder coords, could geocode later
      ]);
      console.log(`Inserted region: ${region.name} (${region.type})`);
    }

    if (region.children) {
      for (const child of region.children) {
        await insertRegion(child, regionId);
      }
    }
  } catch (err) {
    console.error(`Error inserting region ${region.name}:`, err.message);
  }
}

async function runSeed() {
  console.log('Seeding Maharashtra regions...');
  for (const state of maharashtraRegions) {
    await insertRegion(state, null);
  }
  console.log('Finished seeding regions.');
  process.exit(0);
}

runSeed();
