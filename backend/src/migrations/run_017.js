const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function runMigration() {
    try {
        console.log('Running 017 migration...');
        const sql = fs.readFileSync(path.join(__dirname, '017_scrap_pickups.sqlite.sql'), 'utf8');
        
        // SQLite doesn't support executing multiple statements at once easily with the pg-like wrapper sometimes, 
        // but let's try.
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (let stmt of statements) {
            await db.query(stmt);
        }
        
        console.log('017 Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
