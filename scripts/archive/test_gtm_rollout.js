const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'backend/.env') });
const FeatureFlagService = require('./backend/src/services/FeatureFlagService');
const { query } = require('./backend/src/config/database');

async function runGTMTests() {
  console.log('--- STARTING 10X GTM FEATURE ENGINE TESTS ---');

  try {
    // 1. Fetch All Flags
    console.log('\n[Test 1] Service Cache & Matrix Loading');
    const flags = await FeatureFlagService.getAllFlags(true);
    console.log(`Loaded ${Object.keys(flags).length} feature flags.`);

    // 2. Test Phase 1 Feature (Active by default)
    console.log('\n[Test 2] Phase 1 Active Evaluation (Neighborhood Shops)');
    const shopEval = await FeatureFlagService.isFeatureAvailable('neighborhood_shops');
    console.log('Neighborhood Shops Evaluation:', shopEval.available ? 'AVAILABLE (Expected)' : 'LOCKED');

    // 3. Test Phase 2 Feature (Locked by default)
    console.log('\n[Test 3] Phase 2 Locked Evaluation (Medical)');
    const medicalEval = await FeatureFlagService.isFeatureAvailable('medical');
    console.log('Medical Evaluation (Default):', medicalEval.available ? 'AVAILABLE' : 'LOCKED (Expected)');
    console.log('Coming Soon Payload:', medicalEval.comingSoon);

    // 4. Test Hyperlocal Pincode Whitelisting (Soft-launch test)
    console.log('\n[Test 4] Hyperlocal Beta Pincode Soft-Launch Test');
    // Enable pincode 411001 for Medical
    await query(`UPDATE feature_flags SET allowed_pincodes_json = $1 WHERE feature_key = $2`, [JSON.stringify(['411001']), 'medical']);
    FeatureFlagService.invalidateCache();

    const medicalPincodeEval = await FeatureFlagService.isFeatureAvailable('medical', '411001');
    console.log('Medical Evaluation for Pincode 411001:', medicalPincodeEval.available ? 'AVAILABLE via BETA (Expected)' : 'LOCKED');
    console.log('Is Beta Access?', medicalPincodeEval.isBeta);

    const medicalOtherPincodeEval = await FeatureFlagService.isFeatureAvailable('medical', '400001');
    console.log('Medical Evaluation for Pincode 400001:', medicalOtherPincodeEval.available ? 'AVAILABLE' : 'LOCKED (Expected)');

    // Reset test data
    await query(`UPDATE feature_flags SET allowed_pincodes_json = '[]' WHERE feature_key = 'medical'`);
    FeatureFlagService.invalidateCache();

    console.log('\n--- 10X GTM FEATURE ENGINE TESTS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('GTM Test Failed:', err);
  }
}

runGTMTests();
