const { query } = require('./src/config/database');
async function run() {
  const result = await query("SELECT sql FROM sqlite_master WHERE name='regions'");
  console.log(result.rows || result);
  process.exit(0);
}
run();
