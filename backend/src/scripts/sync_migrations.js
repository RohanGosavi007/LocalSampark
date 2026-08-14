const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../migrations');
const initSqlPath = path.join(migrationsDir, 'init.sql');

function convertSQLiteToPostgres(sql) {
  let pgSql = sql;
  
  // Replace SQLite specific types and keywords
  pgSql = pgSql.replace(/\bDATETIME\b/gi, 'TIMESTAMP');
  pgSql = pgSql.replace(/\bINTEGER PRIMARY KEY AUTOINCREMENT\b/gi, 'SERIAL PRIMARY KEY');
  
  // In Postgres, REAL is valid, but sometimes BOOLEAN is needed. 
  // We will leave INTEGER DEFAULT 1/0 as is since Postgres handles it.
  
  return pgSql;
}

async function syncMigrations() {
  console.log('🔄 Starting SQLite to Postgres Schema Sync...');
  
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.startsWith('0') && f.endsWith('.sqlite.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found to sync.');
    return;
  }

  // Backup init.sql just in case
  fs.copyFileSync(initSqlPath, initSqlPath + '.bak');

  let mergedContent = '\n\n-- =========================================================================\n';
  mergedContent += '-- AUTO-SYNCED POSTGRES MIGRATIONS (Appended by sync_migrations.js)\n';
  mergedContent += '-- =========================================================================\n\n';

  for (const file of files) {
    console.log(`Processing: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    mergedContent += `\n-- =======================================\n`;
    mergedContent += `-- MIGRATION: ${file}\n`;
    mergedContent += `-- =======================================\n\n`;
    mergedContent += convertSQLiteToPostgres(sqlContent) + '\n';
  }

  fs.appendFileSync(initSqlPath, mergedContent, 'utf8');
  console.log(`✅ Successfully appended ${files.length} missing migrations to init.sql`);
}

syncMigrations().catch(console.error);
