const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./src/data/localsampark.db');
db.run("CREATE TABLE IF NOT EXISTS local_property_listings ( id TEXT PRIMARY KEY, owner_id TEXT, title TEXT, property_type TEXT, listing_type TEXT, price REAL, deposit REAL, address TEXT, latitude REAL, longitude REAL, images_json TEXT, status TEXT DEFAULT 'available', created_at TEXT DEFAULT CURRENT_TIMESTAMP )", (err) => {
  if(err) console.error(err); else console.log('Table created');
  db.close();
});
