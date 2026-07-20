const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(process.cwd(), 'src/data/localsampark.db'));
db.all("SELECT count(*) as count FROM local_shops", (err, rows) => {
    console.log('Demo shops count:', rows ? rows.length : 0);
    if(rows && rows.length > 0) {
        console.log('Sample demo shop:', rows[0]);
    }
    if(err) console.error(err);
});
