const sqlite3 = require('sqlite3');
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'src/data/localsampark.db'));

db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%society%'", (err, rows) => {
    if (err) console.error(err);
    else console.log("Society Tables:", rows.map(r => r.name));
    
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, allRows) => {
        console.log("All Tables:", allRows.map(r => r.name).join(', '));
        db.close();
    });
});
