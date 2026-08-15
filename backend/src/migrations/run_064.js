const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, '../data/localsampark.db');
const db = new sqlite3.Database(dbPath);
const sql = fs.readFileSync(path.join(__dirname, '064_tri_category_upgrade.sqlite.sql'), 'utf8');
const stmts = sql.split(/;\s*[\r\n]+/).map(s => s.trim()).filter(s => s.length > 0);

db.serialize(() => {
  let ok = 0, skip = 0;
  for (const stmt of stmts) {
    try {
      db.run(stmt + ';', function(err) {
        if (err) {
          if (err.message.includes('duplicate column') || err.message.includes('already exists')) {
            skip++;
          } else {
            console.log('Warn:', err.message.substring(0, 80));
          }
        } else {
          ok++;
        }
      });
    } catch(e) {}
  }
  db.run('SELECT 1', () => {
    console.log(`Migration 064 complete. ${stmts.length} statements processed.`);
    db.close();
  });
});
