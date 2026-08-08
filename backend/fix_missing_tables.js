const { query } = require('./src/config/database');

async function fixMissingTables() {
  console.log("Fixing missing tables and columns...");

  // 1. Create shop_qa table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS shop_qa (
        id TEXT PRIMARY KEY,
        shop_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("shop_qa table ensured.");
  } catch(e) {
    console.log("Error with shop_qa:", e.message);
  }

  // 2. Add is_available column to shop_products
  try {
    await query(`ALTER TABLE shop_products ADD COLUMN is_available INTEGER DEFAULT 1`);
    console.log("Added is_available to shop_products.");
  } catch(e) {
    console.log("Failed to add is_available to shop_products (might already exist).");
  }

  // 3. Create platform_settings table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
    console.log("platform_settings table ensured.");
  } catch(e) {
    console.log("Error with platform_settings:", e.message);
  }

  console.log("Done!");
  process.exit(0);
}

fixMissingTables();
