const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure data directory exists
const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'localsampark.db');
const db = new sqlite3.Database(dbPath);

// Helper function to translate PG query to SQLite
function translateQuery(sql, params = []) {
  let cleanSql = sql;
  
  // Replace ST_GeomFromText('POINT(lng lat)', 4326) with 'POINT(lng lat)'
  cleanSql = cleanSql.replace(/ST_GeomFromText\(\s*'POINT\(([^)]+)\)'\s*,\s*4326\)/gi, "'POINT($1)'");
  
  // Replace next_delivery_date + INTERVAL '1 day' with date(next_delivery_date, '+1 day')
  cleanSql = cleanSql.replace(/(?:([\w]+)\.)?next_delivery_date\s*\+\s*INTERVAL\s*'1 day'/gi, (match, prefix) => {
    return prefix ? `date(${prefix}.next_delivery_date, '+1 day')` : `date(next_delivery_date, '+1 day')`;
  });

  // Remove FOR UPDATE (unsupported in SQLite)
  cleanSql = cleanSql.replace(/\s+FOR\s+UPDATE\b/gi, "");

  // If no params, return as is
  if (!params || params.length === 0) {
    return { sql: cleanSql, params: [] };
  }

  const paramRegex = /\$([0-9]+)/g;
  const newParams = [];

  cleanSql = cleanSql.replace(paramRegex, (match, numStr) => {
    const idx = parseInt(numStr, 10) - 1;
    newParams.push(params[idx]);
    return '?';
  });

  return { sql: cleanSql, params: newParams };
}

// Intercept INSERT statements to inject UUIDs if necessary
// This is because SQLite doesn't automatically generate UUIDs for PKs unless configured,
// and we want to ensure inserting rows generates valid UUIDs in JS
function prepareInsert(sql, params) {
  const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)/i);
  if (insertMatch && params) {
    const tableName = insertMatch[1].toLowerCase();
    const columns = insertMatch[2].split(',').map(c => c.trim().toLowerCase());
    
    // If the table has an id primary key, and 'id' is not in the columns being inserted,
    // we can prepend a generated UUID to the params and insert it.
    if (!columns.includes('id')) {
      const id = uuidv4();
      const newSql = sql
        .replace(/(INSERT\s+INTO\s+\w+\s*\()([^)]+\))/i, `$1id, $2`)
        .replace(/VALUES\s*\(([^)]+)\)/i, (m, valGroup) => {
          // Re-index all existing $1, $2 to $2, $3...
          const newValGroup = valGroup.replace(/\$([0-9]+)/g, (m, n) => `$${parseInt(n, 10) + 1}`);
          return `VALUES ($1, ${newValGroup})`;
        });

      return { sql: newSql, params: [id, ...params] };
    }
  }
  return { sql, params };
}

async function connectDB() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check database connection
      db.get('SELECT 1', (err) => {
        if (err) {
          console.error('❌ SQLite connection failed:', err.message);
          reject(err);
        } else {
          console.log(`📂 SQLite connected. Database location: ${dbPath}`);
          resolve();
        }
      });
    });
  });
}

// Standard query execution helper
async function query(text, params = []) {
  let { sql, params: processedParams } = prepareInsert(text, params);
  const translated = translateQuery(sql, processedParams);
  
  return new Promise((resolve, reject) => {
    // Determine query type (SELECT vs INSERT/UPDATE/DELETE)
    const isSelect = translated.sql.trim().toUpperCase().startsWith('SELECT');
    
    if (isSelect) {
      db.all(translated.sql, translated.params, (err, rows) => {
        if (err) {
          console.error(`❌ SQLite Select Query Error:`, translated.sql, err.message);
          reject(err);
        } else {
          resolve({ rows, rowCount: rows.length });
        }
      });
    } else {
      db.run(translated.sql, translated.params, function(err) {
        if (err) {
          console.error(`❌ SQLite Run Query Error:`, translated.sql, err.message);
          reject(err);
        } else {
          resolve({ rows: [], rowCount: this.changes, lastID: this.lastID });
        }
      });
    }
  });
}

async function queryOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

async function queryMany(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

// Transaction helper
async function withTransaction(callback) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', async (err) => {
        if (err) return reject(err);
        
        const client = {
          query: async (text, params = []) => {
            const res = await query(text, params);
            return res;
          }
        };

        try {
          const result = await callback(client);
          db.run('COMMIT', (commitErr) => {
            if (commitErr) reject(commitErr);
            else resolve(result);
          });
        } catch (error) {
          db.run('ROLLBACK', () => {
            reject(error);
          });
        }
      });
    });
  });
}

// Transaction compatibility function matching Postgres transaction signature
async function transaction(callback) {
  return withTransaction(callback);
}

let connectionQueue = Promise.resolve();

const poolCompat = {
  query: query,
  exec: (sql, callback) => {
    db.exec(sql, callback);
  },
  connect: async () => {
    let releaseLock;
    const currentLock = new Promise((resolve) => {
      releaseLock = resolve;
    });

    const previousQueue = connectionQueue;
    connectionQueue = connectionQueue.then(() => currentLock);

    await previousQueue;

    return {
      query: query,
      release: () => {
        releaseLock();
      }
    };
  },
  end: async () => {
    return new Promise((resolve) => {
      db.close(() => resolve());
    });
  }
};

module.exports = {
  pool: poolCompat,
  connectDB,
  query,
  queryOne,
  queryMany,
  withTransaction,
  transaction
};
