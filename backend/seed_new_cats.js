const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'src', 'data', 'localsampark.db');
const db = new sqlite3.Database(dbPath);

const PILOT_LAT = 18.5913;
const PILOT_LNG = 73.8987;
const dummyOwnerId = 'usr_000000000000000000000';

const categoriesToSeed = [
  { id: 'cat-hosp', slug: 'hospitals-clinics', name: 'Hospitals & Clinics', model: 'appointment' },
  { id: 'cat-2w', slug: '2-wheeler-garage', name: '2-Wheeler Garage', model: 'appointment' },
  { id: 'cat-4w', slug: '4-wheeler-garage', name: '4-Wheeler Garage', model: 'appointment' }
];

const names = {
  'cat-hosp': ['Lifeline Multi-Specialty Hospital', 'City Care Clinic', 'Sai Polyclinic'],
  'cat-2w': ['Metro 2W Repair Shop', 'Quick Fix Bike Service', 'Royal Enfield Garage'],
  'cat-4w': ['Highway 4W Service Center', 'Pro Car Mechanics', 'Shine Auto Garage']
};

db.serialize(() => {
  categoriesToSeed.forEach(cat => {
    const shopNames = names[cat.id];
    
    shopNames.forEach((shopName, index) => {
      const shopId = uuidv4();
      const lat = PILOT_LAT + (Math.random() * 0.04 - 0.02);
      const lng = PILOT_LNG + (Math.random() * 0.04 - 0.02);
      
      const sql = `
        INSERT INTO local_shops (
          id, name, description, address, owner_id,
          approval_status, is_active, latitude, longitude, category_id, category,
          is_premium, delivery_available, pickup_available, 
          estimated_delivery_time, phone_number, coordinate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        shopId, shopName, `Welcome to ${shopName}. The best ${cat.name} in town.`, '123 Main Road, Dhanori, Pune', dummyOwnerId,
        'approved', 1, lat, lng, cat.id, cat.slug,
        index === 0 ? 1 : 0, 0, 1,
        '30-45 mins', '9876543210', `POINT(${lng} ${lat})`
      ];

      db.run(sql, params, function(err) {
        if (err) console.error("Error inserting shop:", err.message);
        else console.log(`Inserted shop ${shopName} for ${cat.name}`);
      });
    });
  });
});
