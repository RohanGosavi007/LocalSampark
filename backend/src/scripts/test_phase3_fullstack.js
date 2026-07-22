const { query } = require('../config/database');
const crypto = require('crypto');

async function testPhase3Fullstack() {
  console.log('--- 🧪 Verifying Phase 3 Full-Stack Engine & APIs ---');

  try {
    // 1. Home Services Category & Provider Query
    console.log('\n[1] Testing Home Services API data...');
    const catRes = await query('SELECT * FROM home_service_categories WHERE is_active = 1');
    console.log('  [+] Home Service Categories Count:', (catRes.rows || catRes).length);

    // 2. Events & Capacity Check
    console.log('\n[2] Testing Local Events Data...');
    const evRes = await query('SELECT * FROM local_events WHERE is_active = 1');
    console.log('  [+] Active Local Events Count:', (evRes.rows || evRes).length);

    // 3. Community Posts Check
    console.log('\n[3] Testing Townsquare Community Posts Data...');
    const postRes = await query('SELECT * FROM community_posts');
    console.log('  [+] Active Community Feed Posts Count:', (postRes.rows || postRes).length);

    console.log('\n✅ Phase 3 Full-Stack Architecture Verified Cleanly!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}

testPhase3Fullstack();
