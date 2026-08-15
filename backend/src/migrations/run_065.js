const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');

async function runMigration065() {
  const sqlPath = path.join(__dirname, '065_phase_a_advanced.sqlite.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let success = 0, skipped = 0;
  for (const stmt of statements) {
    try {
      await query(stmt);
      success++;
    } catch (err) {
      if (err.message && (err.message.includes('duplicate column') || err.message.includes('already exists'))) {
        skipped++;
      } else {
        console.warn(`⚠️ Statement skipped: ${err.message?.substring(0, 80)}`);
        skipped++;
      }
    }
  }
  console.log(`✅ Migration 065 complete: ${success} applied, ${skipped} skipped (total ${statements.length})`);
}

runMigration065().then(() => process.exit(0)).catch(err => { console.error('❌ Migration failed:', err); process.exit(1); });
