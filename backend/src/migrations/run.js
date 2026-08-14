const fs = require('fs');
const path = require('path');
const { pool, connectDB } = require('../config/database');

async function runMigration() {
  try {
    await connectDB();
    console.log('🔄 Running migrations...');
    const isSqlite = process.env.USE_SQLITE === 'true';
    if (isSqlite) {
      // Run init.sqlite.sql first
      const initSql = fs.readFileSync(path.join(__dirname, 'init.sqlite.sql'), 'utf8');
      await new Promise((resolve, reject) => {
        pool.exec(initSql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Get all 0*.sqlite.sql files
      const files = fs.readdirSync(__dirname)
        .filter(f => f.startsWith('0') && f.endsWith('.sqlite.sql'))
        .sort();

      for (const file of files) {
        console.log(`Running migration: ${file}...`);
        const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        try {
          const statements = sql.split(/;\s*[\r\n]+/).map(s => s.trim()).filter(s => s.length > 0);
          for (let statement of statements) {
            try {
              await new Promise((resolve, reject) => {
                pool.exec(statement + ';', (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              });
            } catch (err) {
              if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
                console.log(`⚠️ Statement warning:`, err.message);
              }
            }
          }
        } catch (err) {
          console.log(`⚠️ Migration ${file} error:`, err.message);
        }
      }
    } else {
      const sqlPath = path.join(__dirname, 'init.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await pool.query(sql);

      // Numbered Postgres migrations were never applied here: this branch ran
      // init.sql and stopped, so every NNN_*.sql file was inert. They are
      // applied in order and recorded, so a re-run is a no-op.
      await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          filename    TEXT PRIMARY KEY,
          applied_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const applied = new Set(
        (await pool.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename)
      );

      const numbered = fs.readdirSync(__dirname)
        .filter((f) => /^\d{3}_.*\.sql$/.test(f) && !f.includes('.sqlite.'))
        .sort();

      // init.sql is a consolidated dump that already contains the content of
      // the pre-054 migrations, and this runner never executed them. Record
      // them as applied rather than re-running them against a schema that
      // already reflects their changes.
      const BASELINE_BEFORE = '054';
      for (const f of numbered) {
        if (f.slice(0, 3) < BASELINE_BEFORE && !applied.has(f)) {
          await pool.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
            [f]
          );
          applied.add(f);
          console.log(`   baselined ${f} (already contained in init.sql)`);
        }
      }

      const pending = numbered.filter((f) => !applied.has(f));

      if (pending.length === 0) {
        console.log('✅ No pending migrations');
      }

      for (const file of pending) {
        const body = fs.readFileSync(path.join(__dirname, file), 'utf8');
        console.log(`🔄 Applying ${file}`);
        try {
          // Each file wraps itself in BEGIN/COMMIT, so it either applies whole
          // or not at all.
          await pool.query(body);
          await pool.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
            [file]
          );
          console.log(`   applied ${file}`);
        } catch (err) {
          // Stop rather than continue: later migrations may depend on this one.
          console.error(`❌ ${file} failed: ${err.message}`);
          throw err;
        }
      }
    }
    console.log('✅ Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
