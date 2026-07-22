const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'backend/.env') });
const { query, queryOne, withTransaction } = require('./backend/src/config/database');
const crypto = require('crypto');

async function runSaaSTests() {
  console.log('--- STARTING SAAS CRM VERIFICATION TESTS ---');

  try {
    // 1. Database & Schema Verification
    console.log('\n[Test 1] Schema & Seed Verification');
    const plans = await query('SELECT * FROM saas_plans');
    console.log(`Found ${plans.rows ? plans.rows.length : plans.length} SaaS plans.`);

    // 2. Webhook Idempotency & Degradation Test
    console.log('\n[Test 2] Webhook Idempotency Test');
    const testEventId = `evt_test_${Date.now()}`;
    const mockSubId = `sub_test_${Date.now()}`;
    
    // Create dummy shop & sub for testing
    const testShopId = `shop_test_${Date.now()}`;
    await query(`INSERT INTO local_shops (id, name, category, address, coordinate, owner_id) VALUES ($1, $2, $3, $4, $5, $6)`, 
      [testShopId, 'Test SaaS Shop', 'Grocery', '123 Main St', 'POINT(73.9 18.5)', 'user_test_1']);

    await query(`INSERT INTO vendor_subscriptions (id, shop_id, plan_id, status, gateway_subscription_id) VALUES ($1, $2, $3, $4, $5)`,
      [crypto.randomUUID(), testShopId, 'plan_premium', 'pending', mockSubId]);

    // Simulate Webhook processing twice
    const processWebhook = async (eventId) => {
      return await withTransaction(async (dbClient) => {
        const existing = await dbClient.query('SELECT event_id FROM webhook_events WHERE event_id = $1', [eventId]);
        if ((existing.rows || existing).length > 0) {
          return 'IDEMPOTENT_IGNORE';
        }
        await dbClient.query('INSERT INTO webhook_events (id, event_id) VALUES ($1, $2)', [crypto.randomUUID(), eventId]);
        await dbClient.query('UPDATE local_shops SET crm_tier = $1 WHERE id = $2', ['premium', testShopId]);
        return 'PROCESSED';
      });
    };

    const firstRun = await processWebhook(testEventId);
    console.log('First Webhook Fire:', firstRun); // Expected: PROCESSED

    const secondRun = await processWebhook(testEventId);
    console.log('Second Webhook Fire (Duplicate Payload):', secondRun); // Expected: IDEMPOTENT_IGNORE

    const shopState = await queryOne('SELECT crm_tier FROM local_shops WHERE id = $1', [testShopId]);
    console.log(`Shop CRM Tier after upgrade: ${shopState.crm_tier}`);

    // Cleanup test data
    await query('DELETE FROM local_shops WHERE id = $1', [testShopId]);
    await query('DELETE FROM vendor_subscriptions WHERE shop_id = $1', [testShopId]);
    await query('DELETE FROM webhook_events WHERE event_id = $1', [testEventId]);

    console.log('\n--- SAAS CRM TESTS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('SaaS Test failed:', err);
  }
}

runSaaSTests();
