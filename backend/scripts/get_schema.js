const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../src/data/localsampark.db'));

db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name IN ('shop_products', 'products', 'shop_services', 'shop_staff', 'staff_availability', 'shop_appointments')", [], (err, rows) => {
    if (err) console.error(err);
    else {
        rows.forEach(r => console.log(r.sql));
    }
});
