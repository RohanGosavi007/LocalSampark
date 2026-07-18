const { query } = require('./src/config/database');
async function fixSchema() {
  const columnsToAdd = [
    'pincode TEXT',
    'district TEXT',
    'city TEXT',
    'is_active INTEGER DEFAULT 0',
    'region_type TEXT DEFAULT "locality"'
  ];
  
  for (const col of columnsToAdd) {
    try {
      await query(`ALTER TABLE regions ADD COLUMN ${col}`);
      console.log(`Added ${col}`);
    } catch (e) {
      console.log(`Failed to add ${col} (might already exist)`);
    }
  }
  
  try { await query(`CREATE INDEX idx_regions_pincode ON regions (pincode)`); } catch(e){}
  try { await query(`CREATE INDEX idx_regions_district ON regions (district)`); } catch(e){}
  try { await query(`CREATE INDEX idx_regions_active ON regions (is_active)`); } catch(e){}
  
  console.log("Schema fixed!");
  process.exit(0);
}
fixSchema();
