const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data/localsampark.db');
const sqlPath = path.join(__dirname, '034_society_mega_upgrade.sqlite.sql');

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found:', dbPath);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

// Split queries by semicolon, ignoring empty lines
const queries = sqlContent
  .split(';')
  .map(q => q.trim())
  .filter(q => q.length > 0);

db.serialize(() => {
  db.run('BEGIN TRANSACTION;');
  
  let successCount = 0;
  let failCount = 0;

  for (const query of queries) {
    db.run(query, function (err) {
      if (err) {
        // Ignore duplicate column errors or table doesn't exist for ALTER
        if (err.message.includes('duplicate column name') || err.message.includes('no such table')) {
          console.log(`[IGNORED] ${err.message} for query: ${query.substring(0, 50).replace(/\n/g, ' ')}...`);
        } else {
          console.error(`[ERROR] ${err.message} for query: ${query.substring(0, 50).replace(/\n/g, ' ')}...`);
          failCount++;
        }
      } else {
        successCount++;
      }
    });
  }

  db.run('COMMIT;', (err) => {
    if (err) {
      console.error('Failed to commit transaction:', err);
    } else {
      console.log(`Migration 034 completed. Success: ${successCount}, Failed: ${failCount} (Errors other than duplicate columns/missing tables).`);
    }
    db.close();
  });
});
