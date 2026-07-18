const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/src/data/localsampark.db');
db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='local_shops'", [], (err, rows) => {
    console.log("SCHEMA:", rows);
});
db.all("SELECT id, name, category, category_id, latitude, longitude FROM local_shops LIMIT 5", [], (err, rows) => {
    console.log("SHOPS:", rows);
});
