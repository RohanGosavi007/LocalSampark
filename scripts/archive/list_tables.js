const db = require('./backend/src/config/database');

async function run() {
  try {
    const res = await db.query("SELECT name FROM sqlite_master WHERE type='table';");
    console.log(res.rows || res);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
