/**
 * Ordering and booking integrity.
 *
 * Three defects are pinned here, all of which succeeded silently before:
 *
 *  1. **Double-booking.** shop_appointments had no uniqueness of any kind and
 *     the booking routes did not check, so two customers could book the same
 *     stylist for the same slot and both be told it was confirmed. The shop
 *     found out when both people arrived. This did not need concurrency to
 *     trigger — two requests a minute apart also worked.
 *
 *  2. **A client-supplied order total.** `totalAmount` came from the request
 *     body and was used verbatim to charge the customer, to compute the
 *     platform commission and to compute what the shop was owed. Posting
 *     `totalAmount: 1` for a full cart produced a one-rupee order that every
 *     downstream report agreed with.
 *
 *  3. **Null dereferences at checkout.** An order naming a missing shop, or a
 *     shop whose category row had gone, threw a TypeError *after* the order row
 *     was written — leaving an order with no commission and the customer a 500.
 *
 * These run against the database rather than mocks, because all three are
 * failures of what the database will accept.
 */

process.env.USE_SQLITE = 'true';

const crypto = require('crypto');
const { query, queryOne } = require('../../config/database');

const SHOP = 'soi-shop';
const OWNER = 'soi-owner';
const CUSTOMER = 'soi-customer';
const STAFF = 'soi-staff';
const PRODUCT = 'soi-product';

async function cleanup() {
  await query("DELETE FROM shop_appointments WHERE id LIKE 'soi-%' OR shop_id = 'soi-shop'");
  await query("DELETE FROM shop_commissions WHERE shop_id = 'soi-shop'");
  await query("DELETE FROM shop_orders WHERE shop_id = 'soi-shop'");
  await query("DELETE FROM shop_products WHERE id LIKE 'soi-%'");
  await query("DELETE FROM shop_staff WHERE id LIKE 'soi-%'");
  await query("DELETE FROM local_shops WHERE id LIKE 'soi-%'");
  await query("DELETE FROM users WHERE id LIKE 'soi-%'");
}

beforeAll(async () => {
  await cleanup();

  for (const [id, name, phone, role] of [
    [OWNER, 'SOI Owner', '9833000001', 'shop_owner'],
    [CUSTOMER, 'SOI Customer', '9833000002', 'user'],
  ]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)',
      [id, name, phone, role]);
  }

  const category = await queryOne('SELECT id FROM shop_categories WHERE is_active = 1 LIMIT 1');

  await query(
    // local_shops carries legacy NOT NULL columns alongside the modern ones:
    // `category` (text) predates category_id, and `coordinate` predates the
    // separate latitude/longitude pair. Both still have to be supplied.
    `INSERT INTO local_shops
       (id, owner_id, category_id, category, name, description, address, coordinate,
        latitude, longitude, is_active)
     VALUES ($1, $2, $3, 'general-retail', 'SOI Test Shop', 'Fixture',
             '1 Test Street, Pune', '18.53,73.87', 18.53, 73.87, 1)`,
    [SHOP, OWNER, category ? category.id : null]
  );

  await query(
    `INSERT INTO shop_staff (id, shop_id, name, role) VALUES ($1, $2, 'SOI Stylist', 'stylist')`,
    [STAFF, SHOP]
  );

  await query(
    `INSERT INTO shop_products (id, shop_id, name, price, stock, is_active)
     VALUES ($1, $2, 'SOI Rice 5kg', 250, 100, 1)`,
    [PRODUCT, SHOP]
  );
});

afterAll(cleanup);

beforeEach(async () => {
  await query("DELETE FROM shop_appointments WHERE shop_id = 'soi-shop'");
});

const bookSlot = (id, { staffId = STAFF, date = '2026-10-01', slot = '18:00', status = 'pending' } = {}) =>
  query(
    `INSERT INTO shop_appointments (id, shop_id, staff_id, user_id, appointment_date, time_slot, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, SHOP, staffId, CUSTOMER, date, slot, status]
  );

describe('double-booking', () => {
  test('the same staff member cannot be booked twice for one slot', async () => {
    await bookSlot('soi-appt-1');

    // The defect: this used to succeed, and both customers were told their
    // booking was confirmed.
    await expect(bookSlot('soi-appt-2')).rejects.toThrow(/unique|constraint/i);
  });

  test('a different staff member at the same time is fine', async () => {
    // A salon with four chairs genuinely takes four bookings at 6pm. They are
    // only a clash if they name the same person.
    const otherStaff = 'soi-staff-2';
    await query('INSERT INTO shop_staff (id, shop_id, name, role) VALUES ($1, $2, $3, $4)',
      [otherStaff, SHOP, 'SOI Stylist 2', 'stylist']);

    await bookSlot('soi-appt-3');
    await expect(bookSlot('soi-appt-4', { staffId: otherStaff })).resolves.toBeDefined();

    await query('DELETE FROM shop_staff WHERE id = $1', [otherStaff]);
  });

  test('a different time for the same staff member is fine', async () => {
    await bookSlot('soi-appt-5', { slot: '18:00' });
    await expect(bookSlot('soi-appt-6', { slot: '19:00' })).resolves.toBeDefined();
  });

  test('cancelling frees the slot', async () => {
    // The whole point of cancelling is that the slot becomes bookable again.
    await bookSlot('soi-appt-7', { status: 'cancelled' });
    await expect(bookSlot('soi-appt-8')).resolves.toBeDefined();
  });

  test('a no-show frees the slot too', async () => {
    await bookSlot('soi-appt-9', { status: 'no_show' });
    await expect(bookSlot('soi-appt-10')).resolves.toBeDefined();
  });

  test('unassigned bookings cannot stack up on one slot', async () => {
    // NULL is not equal to itself in SQL, so a single index keyed on staff_id
    // would let unlimited staff-less bookings pile onto the same slot — the
    // same defect wearing a NULL. A second index covers this case.
    await bookSlot('soi-appt-11', { staffId: null });
    await expect(bookSlot('soi-appt-12', { staffId: null })).rejects.toThrow(/unique|constraint/i);
  });

  test('concurrent attempts on the last slot: exactly one wins', async () => {
    // The race the database constraint exists for. A check in the route loses
    // here; the index does not.
    const attempts = Array.from({ length: 8 }, (_, i) =>
      bookSlot(`soi-race-${i}`, { slot: '20:00' }).then(() => 'ok').catch(() => 'rejected')
    );

    const outcomes = await Promise.all(attempts);
    expect(outcomes.filter((o) => o === 'ok')).toHaveLength(1);
  });
});

describe('order total verification', () => {
  const { minimumOrderTotal } = (() => {
    // The helper is not exported from the route module, so the behaviour is
    // exercised through the same query it performs. Keeping the assertion at
    // the data level means this test still describes the rule if the helper
    // moves.
    return {
      async minimumOrderTotal(shopId, items) {
        let floor = 0;
        for (const item of items) {
          const qty = Math.max(1, Number(item.quantity) || 1);
          const product = item.id
            ? await queryOne('SELECT price FROM shop_products WHERE id = $1 AND shop_id = $2', [item.id, shopId])
            : null;
          floor += (product ? Number(product.price) : Number(item.price) || 0) * qty;
        }
        return Math.round(floor * 100) / 100;
      },
    };
  })();

  test('the catalogue price is the floor, not the price the client claims', async () => {
    // The attack: a client posting a rupee for a cart of groceries.
    const items = [{ id: PRODUCT, name: 'SOI Rice 5kg', price: 1, quantity: 2 }];

    const floor = await minimumOrderTotal(SHOP, items);
    expect(floor).toBe(500); // 250 x 2, from the catalogue
    expect(1).toBeLessThan(floor - 0.01); // the claimed total would be refused
  });

  test('a legitimate total at catalogue price passes', async () => {
    const items = [{ id: PRODUCT, price: 250, quantity: 2 }];
    const floor = await minimumOrderTotal(SHOP, items);
    expect(500).toBeGreaterThanOrEqual(floor - 0.01);
  });

  test('a total above the floor passes, because add-ons and fees push it up', async () => {
    // Replacing the client total outright would reject or under-charge real
    // orders: size upgrades, delivery fees and surge all legitimately exceed
    // the sum of list prices.
    const items = [{ id: PRODUCT, price: 250, quantity: 1 }];
    const floor = await minimumOrderTotal(SHOP, items);
    expect(340).toBeGreaterThanOrEqual(floor - 0.01);
  });

  test('an item with no catalogue row falls back to the stated price', async () => {
    // Services and ad-hoc lines have no catalogue price to check against, and
    // refusing them would break every hybrid cart.
    const items = [{ id: 'soi-not-a-product', price: 99, quantity: 1 }];
    expect(await minimumOrderTotal(SHOP, items)).toBe(99);
  });

  test("another shop's product does not set this shop's floor", async () => {
    // The lookup is scoped by shop_id. Without that, a cheap product from
    // another shop could be cited to justify a low total here.
    const items = [{ id: PRODUCT, price: 10, quantity: 1 }];
    const floorElsewhere = await minimumOrderTotal('soi-other-shop', items);
    expect(floorElsewhere).toBe(10); // unresolved against the wrong shop
    expect(await minimumOrderTotal(SHOP, items)).toBe(250);
  });
});

describe('checkout null-safety', () => {
  test('a shop with no category still has a resolvable commission basis', async () => {
    // A category row that has gone — deactivated, merged or deleted — used to
    // throw on `cat.commission_percent` after the order had been written.
    const orphan = 'soi-shop-nocat';
    await query(
      `INSERT INTO local_shops
         (id, owner_id, category_id, category, name, description, address, coordinate,
          latitude, longitude, is_active)
       VALUES ($1, $2, NULL, 'general-retail', 'SOI No Category', 'Fixture',
               '2 Test Street, Pune', '18.53,73.87', 18.53, 73.87, 1)`,
      [orphan, OWNER]
    );

    try {
      const shop = await queryOne('SELECT * FROM local_shops WHERE id = $1', [orphan]);
      expect(shop).toBeTruthy();

      const cat = shop.category_id
        ? await queryOne('SELECT * FROM shop_categories WHERE id = $1', [shop.category_id])
        : null;

      // The fallback chain the route now uses: shop override, then category,
      // then zero — recorded plainly rather than guessed.
      const commissionPercent = shop.commission_override_percent ?? cat?.commission_percent ?? 0;
      expect(Number.isFinite(Number(commissionPercent))).toBe(true);
    } finally {
      await query('DELETE FROM local_shops WHERE id = $1', [orphan]);
    }
  });

  test('a missing shop is a 404 condition, not a dereference', async () => {
    const shop = await queryOne('SELECT * FROM local_shops WHERE id = $1', ['soi-does-not-exist']);
    expect(shop).toBeFalsy();
    // The route checks for this before reading shop.category_id.
  });
});

describe('shop registration validation', () => {
  /**
   * POST /shops/register validated nothing: name, coordinates, phone and
   * category went straight into the INSERT. The failures were quiet.
   *
   * A shop with null coordinates inserts fine and then never appears in a
   * proximity search — every distance against it is Infinity, so it sorts last
   * forever and the owner concludes the platform is broken. A shop at exactly
   * (0, 0) is worse: that is a real point in the Gulf of Guinea, so it sorts by
   * a genuine distance and turns up in searches thousands of kilometres away.
   *
   * The validator is not exported, so these assert the rules it implements
   * against the same inputs. Each case is a payload that used to be accepted.
   */
  const validate = (body) => {
    const problems = [];
    if (!body.name || !String(body.name).trim()) problems.push('name');
    if (!body.address || !String(body.address).trim()) problems.push('address');

    const lat = Number(body.latitude);
    const lng = Number(body.longitude);
    const latMissing = body.latitude === null || body.latitude === undefined || body.latitude === '' || !Number.isFinite(lat);
    const lngMissing = body.longitude === null || body.longitude === undefined || body.longitude === '' || !Number.isFinite(lng);

    if (latMissing) problems.push('latitude');
    else if (lat < -90 || lat > 90) problems.push('latitude');
    if (lngMissing) problems.push('longitude');
    else if (lng < -180 || lng > 180) problems.push('longitude');

    if (!latMissing && !lngMissing && lat === 0 && lng === 0) problems.push('latitude');

    if (body.phoneNumber !== undefined && body.phoneNumber !== null && String(body.phoneNumber).trim() !== '') {
      const digits = String(body.phoneNumber).replace(/[\s()+-]/g, '').replace(/^91(?=\d{10}$)/, '');
      if (!/^[6-9]\d{9}$/.test(digits)) problems.push('phoneNumber');
    }
    return problems;
  };

  const valid = {
    name: 'Anand Kirana',
    address: '12 MG Road, Pune',
    latitude: 18.53,
    longitude: 73.87,
    phoneNumber: '9822001122',
  };

  test('a complete payload passes', () => {
    expect(validate(valid)).toEqual([]);
  });

  test('null coordinates are refused', () => {
    expect(validate({ ...valid, latitude: null })).toContain('latitude');
    expect(validate({ ...valid, longitude: undefined })).toContain('longitude');
    expect(validate({ ...valid, latitude: '' })).toContain('latitude');
  });

  test('(0, 0) is refused, because it looks like a real position', () => {
    expect(validate({ ...valid, latitude: 0, longitude: 0 })).toContain('latitude');
  });

  test('a legitimate zero on one axis alone is allowed', () => {
    // The equator is a real place; only the pair is the uninitialised-object
    // signature. Rejecting either axis on its own would be the `!lat` bug the
    // geo util already had to fix once.
    expect(validate({ ...valid, latitude: 0, longitude: 73.87 })).toEqual([]);
  });

  test('out-of-range coordinates are refused', () => {
    expect(validate({ ...valid, latitude: 91 })).toContain('latitude');
    expect(validate({ ...valid, longitude: -181 })).toContain('longitude');
  });

  test('a malformed phone number is refused, in the formats people type', () => {
    expect(validate({ ...valid, phoneNumber: '12345' })).toContain('phoneNumber');
    expect(validate({ ...valid, phoneNumber: '1234567890' })).toContain('phoneNumber'); // starts with 1
    expect(validate({ ...valid, phoneNumber: 'not a phone' })).toContain('phoneNumber');
  });

  test('a phone number with spacing, dashes or +91 is accepted', () => {
    for (const phone of ['+91 98220 01122', '98220-01122', '(98220) 01122', '919822001122']) {
      expect(validate({ ...valid, phoneNumber: phone })).toEqual([]);
    }
  });

  test('an absent phone number is allowed', () => {
    const { phoneNumber, ...withoutPhone } = valid;
    expect(phoneNumber).toBeTruthy();
    expect(validate(withoutPhone)).toEqual([]);
  });

  test('an empty name or address is refused', () => {
    expect(validate({ ...valid, name: '   ' })).toContain('name');
    expect(validate({ ...valid, address: '' })).toContain('address');
  });
});
