const { query } = require('./src/config/database');

async function run() {
  await query("INSERT OR IGNORE INTO shop_categories (id, name, slug, icon, created_at, updated_at) VALUES ('cat-hosp', 'Hospitals & Clinics', 'hospitals-clinics', '🏥', datetime('now'), datetime('now'))");
  await query("INSERT OR IGNORE INTO shop_categories (id, name, slug, icon, created_at, updated_at) VALUES ('cat-2w', '2-Wheeler Garage', '2-wheeler-garage', '🏍️', datetime('now'), datetime('now'))");
  await query("INSERT OR IGNORE INTO shop_categories (id, name, slug, icon, created_at, updated_at) VALUES ('cat-4w', '4-Wheeler Garage', '4-wheeler-garage', '🚘', datetime('now'), datetime('now'))");
  console.log('Categories added!');
}

run();
