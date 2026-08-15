const { queryMany } = require('./src/config/database');

async function test() {
  try {
    const res = await queryMany(`
      SELECT a.*, l.title, l.category, l.condition, l.photo_urls, u.full_name as seller_name
      FROM marketplace_auctions a 
      LEFT JOIN marketplace_listings l ON a.listing_id = l.id 
      LEFT JOIN users u ON l.seller_id = u.id
      WHERE a.status = 'active' ORDER BY a.ends_at ASC LIMIT 30
    `);
    console.log('Query Success:', res);
  } catch (err) {
    console.error('Query Error:', err);
  }
  process.exit(0);
}

test();
