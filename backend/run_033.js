const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');
const db = new sqlite3.Database(path.join(__dirname, 'src/data/localsampark.db'));
const sql = fs.readFileSync(path.join(__dirname, 'src/migrations/033_admin_territory_assignments.sqlite.sql'), 'utf8')
  .split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
db.exec(sql, (err) => {
  if (err) console.error('Error:', err.message);
  else console.log('033 admin_territory_assignments migration completed.');
  db.close();
});
