const { query } = require('../config/database');
const crypto = require('crypto');

async function verifyPhase2Engine() {
  console.log('--- 🚀 Testing Phase 2 Multi-Vertical Super-App Engine ---');

  // 1. Test Home Services
  console.log('\n[1] Testing Home Services Schema & Queries...');
  const catId = crypto.randomUUID();
  await query(`
    INSERT INTO home_service_categories (id, name, icon, base_inspection_fee)
    VALUES ($1, 'Plumbing & Water Leakage', 'Wrench', 199.0)
  `, [catId]);

  const categories = await query('SELECT * FROM home_service_categories WHERE id = $1', [catId]);
  console.log('  [+] Inserted Home Service Category:', (categories.rows || categories)[0]?.name);

  // 2. Test Local Events
  console.log('\n[2] Testing Local Events & Meetups Schema & Queries...');
  const eventId = crypto.randomUUID();
  await query(`
    INSERT INTO local_events (id, organizer_id, title, category, event_date, event_time, venue, ticket_price, geohash)
    VALUES ($1, 'org_101', 'Dhanori Society Cultural Fest', 'Cultural', '2026-08-15', '18:00', 'Dhanori Ground', 150.0, 'tek3z2')
  `, [eventId]);

  const events = await query('SELECT * FROM local_events WHERE id = $1', [eventId]);
  console.log('  [+] Inserted Local Event:', (events.rows || events)[0]?.title);

  // 3. Test Community Hub Posts
  console.log('\n[3] Testing Community Hub Posts Schema & Queries...');
  const postId = crypto.randomUUID();
  await query(`
    INSERT INTO community_posts (id, author_id, author_name, category, content, geohash)
    VALUES ($1, 'user_55', 'Rahul Varma', 'alert', 'Heavy waterlogging reported near Porwal Road underpass! Stay safe.', 'tek3z2')
  `, [postId]);

  const posts = await query('SELECT * FROM community_posts WHERE id = $1', [postId]);
  console.log('  [+] Inserted Community Post:', (posts.rows || posts)[0]?.content);

  console.log('\n✅ All Phase 2 Multi-Vertical Schemas and Queries Verified Successfully!');
  process.exit(0);
}

verifyPhase2Engine();
