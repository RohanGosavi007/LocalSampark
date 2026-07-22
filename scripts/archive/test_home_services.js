const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'backend/.env') });
const FeatureFlagService = require('./backend/src/services/FeatureFlagService');
const { query, queryOne } = require('./backend/src/config/database');
const crypto = require('crypto');

async function runHomeServicesTests() {
  console.log('--- STARTING HOME SERVICES VERTICAL & GTM LOCK TESTS ---');

  try {
    // 1. Verify GTM Lock Behavior (home_services is locked by default in Phase 2)
    console.log('\n[Test 1] GTM Lock Evaluation (home_services)');
    const evalLocked = await FeatureFlagService.isFeatureAvailable('home_services');
    console.log('Default State:', evalLocked.available ? 'UNLOCKED' : 'LOCKED (Expected)');
    console.log('Dynamic Lock Payload:', evalLocked.comingSoon);

    // 2. Unlock home_services temporarily for integration testing
    console.log('\n[Test 2] Unlocking Home Services in Feature Matrix');
    await query(`UPDATE feature_flags SET is_enabled = 1 WHERE feature_key = 'home_services'`);
    FeatureFlagService.invalidateCache();

    const evalUnlocked = await FeatureFlagService.isFeatureAvailable('home_services');
    console.log('Unlocked State:', evalUnlocked.available ? 'UNLOCKED (Expected)' : 'LOCKED');

    // 3. Test Categories Retrieval
    console.log('\n[Test 3] Categories Query');
    const categories = await query('SELECT * FROM home_service_categories');
    const catRows = categories.rows || categories;
    console.log(`Found ${catRows.length} active service categories (e.g. ${catRows[0].name}).`);

    // 4. Test Technician Creation & Booking
    console.log('\n[Test 4] Technician Onboarding & Booking Flow');
    const provId = `prov_${Date.now()}`;
    await query(`
      INSERT INTO home_service_providers (id, name, phone, category_id, experience_years, hourly_rate, serviced_pincodes_json, is_verified) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
    `, [provId, 'Ramesh Plumber', '9876543210', 'cat_plumbing', 5, 299.00, JSON.stringify(['411001'])]);

    const bookingId = crypto.randomUUID();
    const bookingRef = `HS-${Math.floor(100000 + Math.random() * 900000)}`;

    await query(`
      INSERT INTO home_service_bookings (id, booking_ref, user_id, provider_id, category_id, booking_date, time_slot, service_address, pincode, inspection_fee)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [bookingId, bookingRef, 'user_test_1', provId, 'cat_plumbing', '2026-07-25', '10:00 AM', 'Flat 402, Sunshine Apts', '411001', 199.00]);

    const booking = await queryOne('SELECT * FROM home_service_bookings WHERE id = $1', [bookingId]);
    console.log(`Booking Created! Ref: ${booking.booking_ref}, Status: ${booking.status}, Fee: ₹${booking.inspection_fee}`);

    // Cleanup test data
    await query('DELETE FROM home_service_bookings WHERE id = $1', [bookingId]);
    await query('DELETE FROM home_service_providers WHERE id = $1', [provId]);

    // Restore feature lock
    await query(`UPDATE feature_flags SET is_enabled = 0 WHERE feature_key = 'home_services'`);
    FeatureFlagService.invalidateCache();

    console.log('\n--- HOME SERVICES TESTS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Home Services Test Failed:', err);
  }
}

runHomeServicesTests();
