const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const db = new sqlite3.Database(path.join(__dirname, '../src/data/localsampark.db'));
const migrationSql = fs.readFileSync(path.join(__dirname, '../src/migrations/010_shop_phase2_upgrade.sqlite.sql'), 'utf-8');

const queries = migrationSql.split(';').filter(q => q.trim().length > 0);

db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    let hasError = false;

    for (const query of queries) {
        db.run(query, (err) => {
            if (err) {
                // Ignore duplicate column errors for ALTER TABLE since SQLite doesn't support IF NOT EXISTS for ADD COLUMN
                if (err.message.includes("duplicate column name")) {
                    console.log("Column already exists, ignoring.");
                } else {
                    console.error("Migration error:", err.message, "in query:", query);
                    hasError = true;
                }
            }
        });
    }

    db.run("COMMIT", (err) => {
        if (err || hasError) {
            console.error("Migration failed.");
        } else {
            console.log("Migration successful!");
        }
        db.close();
    });
});
