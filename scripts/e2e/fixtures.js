/**
 * E2E fixtures layered on the standard seed (backend/src/seeds/run.js).
 *
 * The seed creates the pilot zone, the super admin (+919999999991), the
 * vendor and their shop (+919999999992), a customer (+919999999993) and a
 * rider (+919999999994). These rows give every console screen something real
 * to act on. IDs are fixed so specs can address them; names carry an
 * "E2E" marker so they are easy to tell apart on screen.
 */
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const { query, queryOne } = require(path.join(ROOT, 'backend/src/config/database'));

const IDS = {
  orderPlaced: 'e2e00000-0000-4000-8000-000000000001',
  orderDelivered: 'e2e00000-0000-4000-8000-000000000002',
  orderPreparing: 'e2e00000-0000-4000-8000-000000000003',
  dispute: 'e2e00000-0000-4000-8000-000000000010',
  grievance: 'e2e00000-0000-4000-8000-000000000020',
  supportTicket: 'e2e00000-0000-4000-8000-000000000021',
  restrictedProduct: 'e2e00000-0000-4000-8000-000000000030',
  waitlist: 'e2e00000-0000-4000-8000-000000000040',
  kycShop: 'e2e00000-0000-4000-8000-000000000050',
  kycOwner: 'e2e00000-0000-4000-8000-000000000051',
  kyc: 'e2e00000-0000-4000-8000-000000000052',
  returnRequest: 'e2e00000-0000-4000-8000-000000000060',
  consentingCustomer: 'e2e00000-0000-4000-8000-000000000070',
  consent: 'e2e00000-0000-4000-8000-000000000071',
  payout: 'e2e00000-0000-4000-8000-000000000080',
  shopper: 'e2e00000-0000-4000-8000-0000000000b0',
  shopperOrder: 'e2e00000-0000-4000-8000-0000000000b1',
  shopperConfirmed: 'e2e00000-0000-4000-8000-0000000000c1',
  shopperPreparing: 'e2e00000-0000-4000-8000-0000000000c5',
  shopperLive: 'e2e00000-0000-4000-8000-0000000000c6',
  // C6: a second shop, so a cart can hold two shops' items (D6).
  chemistShop: 'e2e00000-0000-4000-8000-0000000000d0',
  chemistOwner: 'e2e00000-0000-4000-8000-0000000000d1',
  chemistSoap: 'e2e00000-0000-4000-8000-0000000000d2',
  vendorRice: 'e2e00000-0000-4000-8000-0000000000d3',
  // C11: a review of the vendor's shop that a customer has reported.
  reportedReview: 'e2e00000-0000-4000-8000-0000000000e0',
  reviewReport: 'e2e00000-0000-4000-8000-0000000000e1',
  // C10: two delivered orders of the shopper's, one for each return spec.
  shopperReturnWeb: 'e2e00000-0000-4000-8000-0000000000f0',
  shopperReturnAdmin: 'e2e00000-0000-4000-8000-0000000000f2',
};

const PHONES = {
  admin: '+919999999991',
  vendor: '+919999999992',
  customer: '+919999999993',
  rider: '+919999999994',
  shopper: '+919000000001',
};

const HOURS = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

async function one(sql, params) {
  const row = await queryOne(sql, params);
  if (!row) throw new Error(`fixtures: expected a row for ${sql.slice(0, 60)}…`);
  return row;
}

async function seedE2eFixtures() {
  let created = 0;
  const run = async (sql, params) => { await query(sql, params); created += 1; };

  const region = await one("SELECT id FROM regions WHERE name = 'Dhanori'");
  const customer = await one('SELECT id FROM users WHERE phone_number = $1', [PHONES.customer]);
  const vendor = await one('SELECT id FROM users WHERE phone_number = $1', [PHONES.vendor]);
  const rider = await one('SELECT id FROM users WHERE phone_number = $1', [PHONES.rider]);
  const shop = await one('SELECT id, name FROM local_shops WHERE owner_id = $1', [vendor.id]);
  const product = await one('SELECT id, name, price FROM shop_products WHERE shop_id = $1 ORDER BY price ASC LIMIT 1', [shop.id]);

  // Rider: online, holding cash over the default 3000 limit (A10).
  await run(
    `UPDATE delivery_agents SET is_online = '1', status = 'available', cash_in_hand = 3500,
            current_lat = 18.5790, current_lng = 73.8970, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1`,
    [rider.id]
  );
  await run(
    `INSERT INTO rider_cash_ledger (id, rider_user_id, order_id, entry_type, amount, recorded_by, note)
     VALUES ($1, $2, $3, 'collected', 3500, $2, 'E2E COD collections')`,
    ['e2e00000-0000-4000-8000-000000000090', rider.id, IDS.orderDelivered]
  );

  // Orders: one past its SLA, one delivered, one in the kitchen (A1, A4).
  const order = (orderId, status, ageHours, extra = {}) => run(
    `INSERT INTO orders (id, user_id, shop_id, subtotal, total_amount, delivery_fee, delivery_address,
                         payment_method, payment_status, order_status, status, fulfillment_method,
                         delivery_lat, delivery_lng, created_at, updated_at, delivered_at)
     VALUES ($1, $2, $3, $4, $5, 20, 'E2E Flat 12, Ganga Aria, Dhanori', $6, $7, $8, $8, 'delivery',
             18.5790, 73.8970, $9, $9, $10)`,
    [orderId, customer.id, shop.id, extra.subtotal, extra.subtotal + 20, extra.method || 'cod',
      extra.paid || 'pending', status, HOURS(ageHours), status === 'delivered' ? HOURS(ageHours - 1) : null]
  );
  await order(IDS.orderPlaced, 'placed', 2, { subtotal: 240, method: 'razorpay', paid: 'paid' });
  await order(IDS.orderDelivered, 'delivered', 30, { subtotal: 480, paid: 'paid' });
  await order(IDS.orderPreparing, 'preparing', 0.1, { subtotal: 160 });
  for (const [orderId, qty] of [[IDS.orderPlaced, 2], [IDS.orderDelivered, 4], [IDS.orderPreparing, 1]]) {
    await run(
      'INSERT INTO order_items (id, order_id, product_id, name, price, quantity, price_at_buy) VALUES ($1, $2, $3, $4, $5, $6, $5)',
      [`${orderId.slice(0, 30)}aa${qty}`, orderId, product.id, product.name, product.price, qty]
    );
  }

  // A5: an open dispute and a return with photo evidence.
  await run(
    `INSERT INTO disputes (id, user_id, order_id, shop_id, type, description, status, created_at)
     VALUES ($1, $2, $3, $4, 'quality_issue', 'E2E: milk packet was leaking', 'open', $5)`,
    [IDS.dispute, customer.id, IDS.orderDelivered, shop.id, HOURS(20)]
  );
  await run(
    `INSERT INTO order_returns (id, order_id, user_id, shop_id, return_type, reason, items, evidence_urls, refund_amount, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'return', 'E2E: wrong brand delivered', '[]', $5, 120, 'pending_review', $6, $6)`,
    [IDS.returnRequest, IDS.orderDelivered, customer.id, shop.id, JSON.stringify(['https://example.com/e2e-evidence.jpg']), HOURS(10)]
  );

  // A11: a statutory grievance past the 48h acknowledgement deadline, and a support ticket.
  await run(
    `INSERT INTO support_tickets (id, user_id, subject, description, category, priority, status, is_statutory, created_at)
     VALUES ($1, $2, 'E2E grievance: charged above MRP', 'Paneer billed at 95, MRP 80', 'billing', 'high', 'open', true, $3)`,
    [IDS.grievance, customer.id, HOURS(60)]
  );
  await run(
    `INSERT INTO support_tickets (id, user_id, subject, description, category, priority, status, is_statutory, created_at)
     VALUES ($1, $2, 'E2E support: change delivery address', 'Please deliver to gate 2', 'delivery', 'normal', 'open', false, $3)`,
    [IDS.supportTicket, customer.id, HOURS(1)]
  );

  // A3: a listing that trips the restricted-goods filter.
  await run(
    `INSERT INTO shop_products (id, shop_id, name, description, price, is_active, is_available, inventory_count)
     VALUES ($1, $2, 'E2E Cigarette Pack', 'Should never be listed', 300, 1, 1, 10)`,
    [IDS.restrictedProduct, shop.id]
  );

  // C7: a coupon any E2E customer can use at checkout, as often as the specs need.
  await run(
    `INSERT INTO coupons (id, code, discount_type, discount_value, min_order_amount, max_uses, current_uses, per_user_limit, first_order_only, is_active, description)
     VALUES ('e2e-coupon-flat20', 'E2EFLAT20', 'fixed', 20, 0, 1000000, 0, 1000, 0, 1, '₹20 off (E2E)')`,
    []
  );

  // A9: someone outside every zone asked to be told when we arrive.
  await run(
    `INSERT INTO unserviceable_waitlist (id, phone_number, email, latitude, longitude, pincode, address, created_at)
     VALUES ($1, '+919800000001', 'e2e-waitlist@example.com', 18.6298, 73.7997, '411033', 'E2E Pimpri waitlist', $2)`,
    [IDS.waitlist, HOURS(5)]
  );

  // A2: a new seller waiting on KYC review.
  await run(
    `INSERT INTO users (id, phone_number, full_name, role, is_verified, is_active, region_id)
     VALUES ($1, '+919800000050', 'E2E New Seller', 'shop_owner', '1', '1', $2)`,
    [IDS.kycOwner, region.id]
  );
  await run(
    `INSERT INTO local_shops (id, owner_id, region_id, name, category, phone, address, latitude, longitude,
                              coordinate, is_active, is_verified, approval_status, pincode)
     VALUES ($1, $2, $3, 'E2E Fresh Bakery', 'Bakery', '+919800000050', 'Dhanori Chowk, Pune', 18.5800, 73.8980, 'POINT(73.8980 18.5800)',
             '0', '0', 'pending', '411015')`,
    [IDS.kycShop, IDS.kycOwner, region.id]
  );
  await run(
    `INSERT INTO vendor_kyc (id, shop_id, owner_id, pan_number, pan_url, aadhaar_front_url, gst_number, kyc_status, submitted_at, created_at)
     VALUES ($1, $2, $3, 'ABCDE1234F', 'https://example.com/e2e-pan.jpg', 'https://example.com/e2e-aadhaar.jpg', '27ABCDE1234F1Z5', 'submitted', $4, $4)`,
    [IDS.kyc, IDS.kycShop, IDS.kycOwner, HOURS(3)]
  );

  // A14: one customer in the pilot zone who agreed to marketing; the seeded
  // customer has not, so a zone broadcast reaches exactly one person.
  await run(
    `INSERT INTO users (id, phone_number, full_name, role, is_verified, is_active, region_id)
     VALUES ($1, '+919800000070', 'E2E Consenting Customer', 'user', '1', '1', $2)`,
    [IDS.consentingCustomer, region.id]
  );
  await run(
    `INSERT INTO user_consents (id, user_id, consent_type, consent_purpose, granted, granted_at, consent_version)
     VALUES ($1, $2, 'marketing', 'Promotional communications via push, SMS, and email', 1, CURRENT_TIMESTAMP, '1.0')`,
    [IDS.consent, IDS.consentingCustomer]
  );

  // A6: a calculated payout batch awaiting approval.
  await run(
    `INSERT INTO shop_payouts (id, shop_id, period_start, period_end, gross_gmv, total_orders, platform_commission,
                               commission_rate, net_payout, payout_status, created_at)
     VALUES ($1, $2, '2026-11-01', '2026-11-07', 480, 1, 0, 0, 480, 'calculated', CURRENT_TIMESTAMP)`,
    [IDS.payout, shop.id]
  );

  // The customer the web specs sign in as. +91 9000… numbers are the
  // backend's development test numbers (fixed OTP, never in production), so
  // the specs go through the real send-otp / verify-otp flow. One delivered
  // order to ask for help with (C14).
  await run(
    `INSERT INTO users (id, phone_number, full_name, role, is_verified, is_active, region_id)
     VALUES ($1, $2, 'E2E Shopper', 'user', '1', '1', $3)`,
    [IDS.shopper, PHONES.shopper, region.id]
  );
  await run(
    `INSERT INTO orders (id, user_id, shop_id, subtotal, total_amount, delivery_fee, delivery_address,
                         payment_method, payment_status, order_status, status, fulfillment_method,
                         delivery_lat, delivery_lng, created_at, updated_at, delivered_at)
     VALUES ($1, $2, $3, 136, 156, 20, 'E2E Flat 3, Prasanna Goldfields, Dhanori', 'cod', 'paid', 'delivered', 'delivered',
             'delivery', 18.5790, 73.8970, $4, $4, $4)`,
    [IDS.shopperOrder, IDS.shopper, shop.id, HOURS(26)]
  );
  await run(
    'INSERT INTO order_items (id, order_id, product_id, name, price, quantity, price_at_buy) VALUES ($1, $2, $3, $4, $5, 1, $5)',
    ['e2e00000-0000-4000-8000-0000000000b2', IDS.shopperOrder, product.id, product.name, product.price]
  );

  // C9: one order the shopper may still cancel, one the shop is preparing
  // (past the cancellation window), and one for the live-update check.
  for (const [orderId, status, itemId] of [
    [IDS.shopperConfirmed, 'confirmed', 'e2e00000-0000-4000-8000-0000000000c2'],
    [IDS.shopperPreparing, 'preparing', 'e2e00000-0000-4000-8000-0000000000c3'],
    [IDS.shopperLive, 'confirmed', 'e2e00000-0000-4000-8000-0000000000c4'],
  ]) {
    await run(
      `INSERT INTO orders (id, user_id, shop_id, subtotal, total_amount, delivery_fee, delivery_address,
                           payment_method, payment_status, order_status, status, fulfillment_method,
                           delivery_lat, delivery_lng, created_at, updated_at)
       VALUES ($1, $2, $3, 112, 132, 20, 'E2E Flat 3, Prasanna Goldfields, Dhanori', 'cod', 'pending', $4, $4,
               'delivery', 18.5790, 73.8970, $5, $5)`,
      [orderId, IDS.shopper, shop.id, status, HOURS(0.2)]
    );
    await run(
      'INSERT INTO order_items (id, order_id, product_id, name, price, quantity, price_at_buy) VALUES ($1, $2, $3, $4, $5, 2, $5)',
      [itemId, orderId, product.id, product.name, product.price]
    );
  }

  // C6: a second, open shop in the pilot zone with its own owner (open all
  // day, so it offers C8 time slots whenever the suite runs), and a
  // product in each shop for cart specs to use (plenty of stock, so parallel
  // specs cannot run each other out).
  await run(
    `INSERT INTO users (id, phone_number, full_name, role, is_verified, is_active, region_id)
     VALUES ($1, '+919800000060', 'E2E Chemist Owner', 'shop_owner', '1', '1', $2)`,
    [IDS.chemistOwner, region.id]
  );
  await run(
    `INSERT INTO local_shops (id, owner_id, region_id, name, category, phone, address, latitude, longitude,
                              coordinate, is_active, is_verified, approval_status, pincode, delivery_available, opening_hours)
     VALUES ($1, $2, $3, 'E2E Corner Chemist', 'Pharmacy', '+919800000060', 'Dhanori Road, Pune', 18.5795, 73.8975, 'POINT(73.8975 18.5795)',
             '1', '1', 'approved', '411015', '1', '{"open":"00:00","close":"00:00"}')`,
    [IDS.chemistShop, IDS.chemistOwner, region.id]
  );
  await run(
    `INSERT INTO shop_products (id, shop_id, name, description, price, is_active, is_available, inventory_count, stock_quantity, track_inventory)
     VALUES ($1, $2, 'E2E Glycerine Soap', 'Cart fixture', 45, 1, '1', 0, 0, 0)`,
    [IDS.chemistSoap, IDS.chemistShop]
  );
  await run(
    `INSERT INTO shop_products (id, shop_id, name, description, price, is_active, is_available, inventory_count, stock_quantity, track_inventory)
     VALUES ($1, $2, 'E2E Basmati Rice 1kg', 'Cart fixture', 64, 1, '1', 500, 500, 1)`,
    [IDS.vendorRice, shop.id]
  );
  // C4: the soap's page has an MRP, most of the Legal Metrology declarations
  // (consumer care and best before are left out, so the page must say so), a
  // per-order limit and two sizes.
  await run(
    `UPDATE shop_products SET mrp = 50, generic_name = 'Toilet soap', net_quantity = '75 g',
            manufacturer_details = 'E2E Soaps Pvt Ltd, Plot 7, Chakan MIDC, Pune 410501', country_of_origin = 'India',
            max_order_quantity = 4
      WHERE id = $1`,
    [IDS.chemistSoap]
  );
  for (const [id, value, modifier] of [['e2e00000-0000-4000-8000-0000000000d4', '75 g', 0], ['e2e00000-0000-4000-8000-0000000000d5', '125 g', 20]]) {
    await run(
      `INSERT INTO product_variants (id, product_id, variant_name, variant_value, price_modifier, inventory_count)
       VALUES ($1, $2, 'Size', $3, $4, 100)`,
      [id, IDS.chemistSoap, value, modifier]
    );
  }

  for (const [orderId, itemId] of [[IDS.shopperReturnWeb, 'e2e00000-0000-4000-8000-0000000000f1'], [IDS.shopperReturnAdmin, 'e2e00000-0000-4000-8000-0000000000f3']]) {
    await run(
      `INSERT INTO orders (id, user_id, shop_id, subtotal, total_amount, delivery_fee, delivery_address,
                           payment_method, payment_status, order_status, status, fulfillment_method,
                           delivery_lat, delivery_lng, created_at, updated_at, delivered_at)
       VALUES ($1, $2, $3, 112, 112, 0, 'E2E Flat 3, Prasanna Goldfields, Dhanori', 'cod', 'paid', 'delivered', 'delivered',
               'pickup', 18.5790, 73.8970, $4, $4, $5)`,
      [orderId, IDS.shopper, shop.id, HOURS(5), HOURS(3)]
    );
    await run(
      'INSERT INTO order_items (id, order_id, product_id, name, price, quantity, price_at_buy) VALUES ($1, $2, $3, $4, $5, 1, $5)',
      [itemId, orderId, product.id, product.name, product.price]
    );
  }

  // C11: the seeded customer (who has a delivered order from the vendor's
  // shop) reviewed it; the shopper reported the review. The console's
  // moderation queue acts on this.
  await run(
    `INSERT INTO shop_reviews (id, shop_id, user_id, rating, review_text, is_society_verified, status, created_at, updated_at)
     VALUES ($1, $2, $3, 1, 'E2E reported review: call 98xxxxxx for cheaper stock', 1, 'Published', $4, $4)`,
    [IDS.reportedReview, shop.id, customer.id, HOURS(4)]
  );
  await run(
    `INSERT INTO review_reports (id, review_id, reporter_id, reason, details, status, created_at)
     VALUES ($1, $2, $3, 'spam', 'Advertises another seller', 'open', $4)`,
    [IDS.reviewReport, IDS.reportedReview, IDS.shopper, HOURS(2)]
  );

  // A9: a second, inactive zone the console can switch without taking the
  // pilot zone (which the web specs order from) offline mid-run.
  await run(
    `INSERT INTO regions (id, name, state, district, city, pincode, country, latitude, longitude, radius_km, is_active)
     VALUES ($1, 'E2E Pimpri', 'Maharashtra', 'Pune', 'Pune', '411018', 'India', 18.6298, 73.7997, 3, '0')`,
    ['e2e00000-0000-4000-8000-0000000000a0']
  );

  return { created, ids: IDS, shopId: shop.id, shopName: shop.name, riderId: rider.id, customerId: customer.id };
}

module.exports = { seedE2eFixtures, IDS, PHONES };
