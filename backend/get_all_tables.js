const { query } = require('./src/config/database');
async function run() {
  try {
    const result = await query("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("Tables:");
    console.log(result.rows ? result.rows.map(r => r.name) : result.map(r => r.name));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
