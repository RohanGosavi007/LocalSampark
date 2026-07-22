const { query } = require('../config/database');

async function testPhase4Ecosystem() {
  console.log('--- 🧪 Verifying Phase 4 Ecosystem & AI Analytics ---');

  try {
    // 1. Check Orders table readiness
    console.log('\n[1] Testing Orders Table Schema...');
    const orderRes = await query('SELECT COUNT(*) as cnt FROM orders');
    console.log('  [+] Total Existing Orders:', (orderRes.rows || orderRes)[0]?.cnt || 0);

    // 2. Check Wallet Transactions
    console.log('\n[2] Testing Wallet Transactions Ledger...');
    const txRes = await query('SELECT COUNT(*) as cnt FROM wallet_transactions');
    console.log('  [+] Total Ledger Transactions:', (txRes.rows || txRes)[0]?.cnt || 0);

    // 3. Test Territory AI Analytics Aggregation
    console.log('\n[3] Testing Territory AI Analytics Aggregation Query...');
    const gmvRes = await query('SELECT COALESCE(SUM(total_amount), 0) as total_gmv FROM orders');
    console.log('  [+] Aggregated Gross Merchandise Value (GMV): ₹', (gmvRes.rows || gmvRes)[0]?.total_gmv || 0);

    console.log('\n✅ Phase 4 Ecosystem Architecture Verified Cleanly!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Phase 4 verification failed:', err);
    process.exit(1);
  }
}

testPhase4Ecosystem();
