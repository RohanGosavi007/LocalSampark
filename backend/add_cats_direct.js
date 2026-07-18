const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src', 'data', 'localsampark.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("INSERT INTO shop_categories (id, name, slug, icon, business_model, created_at, updated_at) VALUES ('cat-hosp', 'Hospitals & Clinics', 'hospitals-clinics', '🏥', 'appointment', datetime('now'), datetime('now'))", function(err) {
    if (err) console.error("Hosp error:", err.message);
    else console.log("Hosp added");
  });
  db.run("INSERT INTO shop_categories (id, name, slug, icon, business_model, created_at, updated_at) VALUES ('cat-2w', '2-Wheeler Garage', '2-wheeler-garage', '🏍️', 'appointment', datetime('now'), datetime('now'))", function(err) {
    if (err) console.error("2w error:", err.message);
    else console.log("2w added");
  });
  db.run("INSERT INTO shop_categories (id, name, slug, icon, business_model, created_at, updated_at) VALUES ('cat-4w', '4-Wheeler Garage', '4-wheeler-garage', '🚘', 'appointment', datetime('now'), datetime('now'))", function(err) {
    if (err) console.error("4w error:", err.message);
    else console.log("4w added");
  });
  
  db.all("SELECT slug, name FROM shop_categories", (err, rows) => {
    console.log("Total categories:", rows.length);
  });
});
