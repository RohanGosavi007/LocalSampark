const fs = require('fs');
const path = require('path');
const { pool, connectDB } = require('./src/config/database');

const schema = `
-- Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('icon_theme', 'lucide');
`;

const schemaPg = `
-- Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO platform_settings (key, value) VALUES ('icon_theme', 'lucide') ON CONFLICT (key) DO NOTHING;
`;

async function apply() {
    await connectDB();
    const isSqlite = process.env.USE_SQLITE === 'true';
    console.log('Adding platform_settings to DB...');
    if (isSqlite) {
        await new Promise((resolve, reject) => {
            pool.exec(schema, err => err ? reject(err) : resolve());
        });
    } else {
        await pool.query(schemaPg);
    }
    
    // Append to init.sqlite.sql
    fs.appendFileSync(path.join(__dirname, 'src/migrations/init.sqlite.sql'), '\n' + schema);
    fs.appendFileSync(path.join(__dirname, 'src/migrations/init.sql'), '\n' + schemaPg);
    
    console.log('Done!');
    process.exit(0);
}

apply().catch(err => { console.error(err); process.exit(1); });
