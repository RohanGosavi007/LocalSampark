const fs = require('fs');
const path = require('path');
const { pool, connectDB } = require('../config/database');

/**
 * Split a migration file into statements.
 *
 * The previous implementation was `sql.split(/;\s*[\r\n]+/)`, which tears a
 * CREATE TRIGGER apart: its body is a BEGIN ... END block containing its own
 * semicolons, so each inner statement was executed as though it were top level
 * and the trigger was never created. The database contained zero triggers as a
 * result — every migration that tried to define one reported success and
 * silently did nothing.
 *
 * A BEGIN ... END block is therefore treated as opaque, and only the `END;`
 * that closes it terminates the statement. Everything else splits on `;` at end
 * of line exactly as before.
 */
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let blockDepth = 0;

  for (const rawLine of sql.split(/\r?\n/)) {
    const line = rawLine;
    const bare = line.trim();

    // Ignore comment-only lines when tracking block structure, so the word
    // BEGIN inside an explanatory comment does not open a phantom block.
    const code = bare.startsWith('--') ? '' : bare;

    current += (current ? '\n' : '') + line;

    if (/\bBEGIN\b/i.test(code) && !/\bEND\b/i.test(code)) blockDepth++;
    if (/\bEND\s*;?\s*$/i.test(code) && blockDepth > 0) blockDepth--;

    if (blockDepth === 0 && /;\s*$/.test(code)) {
      const trimmed = current.trim().replace(/;$/, '');
      if (trimmed) statements.push(trimmed);
      current = '';
    }
  }

  const tail = current.trim().replace(/;$/, '');
  if (tail) statements.push(tail);
  return statements;
}

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
          const statements = splitSqlStatements(sql);
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
                // Include the statement itself. Reporting only the message made
                // failures genuinely hard to trace: "no such column: user_id"
                // gives no clue which of several hundred statements produced it.
                const snippet = statement.trim().replace(/\s+/g, ' ').slice(0, 140);
                console.log(`⚠️ Statement warning: ${err.message}\n    in: ${snippet}`);
              }
            }
          }
        } catch (err) {
          console.log(`⚠️ Migration ${file} error:`, err.message);
        }
      }

      // JavaScript migrations, run after the SQL ones.
      //
      // Some repairs cannot be expressed in SQLite's dialect. Retyping a column
      // or restoring a dropped constraint requires rebuilding the table, and a
      // rebuild that hardcodes its column list silently drops any column an
      // environment has that the file does not know about — so those read the
      // live schema instead, which needs real code. 098 is the first.
      //
      // Each exports `run()` and is expected to be idempotent, since this
      // runner has no record of what it has already applied on the SQLite path.
      const jsFiles = fs.readdirSync(__dirname)
        .filter(f => /^\d{3}_.*\.js$/.test(f) && !f.startsWith('run'))
        .sort();

      for (const file of jsFiles) {
        const mod = require(path.join(__dirname, file));
        if (typeof mod.run !== 'function') continue;
        console.log(`Running migration: ${file}...`);
        try {
          const result = await mod.run();
          if (result && result.results) {
            const rebuilt = result.results.filter(r => r.rebuilt).length;
            if (rebuilt > 0) console.log(`   ${rebuilt} table(s) rebuilt.`);
          }
        } catch (err) {
          // Consistent with the SQL loop above: a failing migration is reported
          // and the rest still run, rather than aborting the whole schema setup.
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
