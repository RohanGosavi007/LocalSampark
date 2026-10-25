import pg from 'pg';
const { Client } = pg;

async function check() {
  const c = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'postgres',
    ssl: false,
  });

  await c.connect();
  const res = await c.query("SELECT 1 FROM pg_database WHERE datname = 'localsampark'");
  if (res.rows.length === 0) {
    console.log('Creating database localsampark...');
    await c.query('CREATE DATABASE localsampark');
    console.log('✅ Database localsampark created!');
  } else {
    console.log('✅ Database localsampark already exists!');
  }
  await c.end();

  // Test connecting to localsampark database directly
  const cDb = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'localsampark',
    ssl: false,
  });
  await cDb.connect();
  console.log('✅ Connected to localsampark database successfully!');
  await cDb.end();
}

check().catch(err => {
  console.error('Check failed:', err);
  process.exit(1);
});
