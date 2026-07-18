const { Database } = require('sqlite3');
const db = new Database('./src/data/localsampark.db');
db.exec("UPDATE regions SET district='Pune', city='Pune', pincode='411015', is_active=1 WHERE name='Dhanori'; UPDATE local_shops SET approval_status='approved', is_active=1;", (err) => {
  if (err) console.error('Error:', err);
  else console.log('Database updated successfully!');
});
