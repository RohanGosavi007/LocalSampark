require('dotenv').config();
const { query } = require('./src/config/database');
query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").then(t => {
  const names = t.map(r => r.name);
  const phase_a = names.filter(n => {
    return n.includes('escrow') || n.includes('auction') || n.includes('alert') ||
      n.includes('carbon') || n.includes('otp') || n.includes('trust') ||
      n.includes('walkin') || n.includes('referral') || n.includes('assessment') ||
      n.includes('carpool_group') || n.includes('carpool_live') ||
      n.includes('employer_job') || n.includes('file_upload');
  });
  console.log('Phase A tables (' + phase_a.length + '):');
  phase_a.forEach(n => console.log('  ✅', n));
  process.exit(0);
});
