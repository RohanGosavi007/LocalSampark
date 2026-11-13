/**
 * C2 Location & Serviceability, C3 Discovery & Shop Listings — API proof.
 *
 * Runs on both engines (G2 SQLite, G3 PostgreSQL). Fixtures live in their own
 * corner of the map and use pincodes nothing else seeds, so other suites'
 * rows cannot change what these assertions see.
 */
const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const { query, queryOne } = require('../../config/database');
const { pointSql } = require('../../utils/sqlPoint');
const zoneRouter = require('../../modules/core/routes/zone.routes');
const shopRouter = require('../../modules/ecommerce/routes/shop.routes');
const { isOpenNow } = require('../../utils/shopHours');

const IDS = {
  state: crypto.randomUUID(),
  district: crypto.randomUUID(),
  taluka: crypto.randomUUID(),
  territory: crypto.randomUUID(),
  owner: crypto.randomUUID(),
  shopNear: crypto.randomUUID(),
  shopMid: crypto.randomUUID(),
  shopFar: crypto.randomUUID(),
};
const SUFFIX = IDS.state.slice(0, 8);
// A live pilot zone: a verified square boundary around this centre.
const ZONE = { lat: 18.6, lng: 73.9, half: 0.02, pincode: '799991' };
const OUTSIDE = { lat: 19.5, lng: 75.5, pincode: '799992' };
// Discovery fixtures sit in an empty spot so only they are within radius.
const HERE = { lat: 21.1234, lng: 79.0123 };
const kmNorth = (km) => HERE.lat + km / 111.32;

let app;

const boundary = JSON.stringify({
  type: 'Polygon',
  coordinates: [[
    [ZONE.lng - ZONE.half, ZONE.lat - ZONE.half],
    [ZONE.lng + ZONE.half, ZONE.lat - ZONE.half],
    [ZONE.lng + ZONE.half, ZONE.lat + ZONE.half],
    [ZONE.lng - ZONE.half, ZONE.lat + ZONE.half],
    [ZONE.lng - ZONE.half, ZONE.lat - ZONE.half],
  ]],
});

async function cleanup() {
  await query('DELETE FROM unserviceable_waitlist WHERE pincode IN ($1, $2) OR email LIKE $3', [ZONE.pincode, OUTSIDE.pincode, `%c2-${SUFFIX}%`]);
  await query('DELETE FROM local_shops WHERE id IN ($1, $2, $3)', [IDS.shopNear, IDS.shopMid, IDS.shopFar]);
  await query('DELETE FROM users WHERE id = $1', [IDS.owner]);
  await query('DELETE FROM territories WHERE id = $1 OR pincode = $2', [IDS.territory, ZONE.pincode]);
  await query('DELETE FROM location_talukas WHERE id = $1', [IDS.taluka]);
  await query('DELETE FROM location_districts WHERE id = $1', [IDS.district]);
  await query('DELETE FROM location_states WHERE id = $1', [IDS.state]);
}

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/zones', zoneRouter);
  app.use('/shops', shopRouter);

  await cleanup();

  await query('INSERT INTO location_states (id, name, code) VALUES ($1, $2, $3)', [IDS.state, `C2 State ${SUFFIX}`, `C2${SUFFIX}`]);
  await query('INSERT INTO location_districts (id, state_id, name) VALUES ($1, $2, $3)', [IDS.district, IDS.state, 'C2 District']);
  await query('INSERT INTO location_talukas (id, district_id, name) VALUES ($1, $2, $3)', [IDS.taluka, IDS.district, 'C2 Taluka']);
  await query(
    `INSERT INTO territories (id, taluka_id, name, pincode, centroid_lat, centroid_lng, boundary_geojson, is_active, boundary_verified, centroid_verified)
     VALUES ($1, $2, 'C2 Pilot Zone', $3, $4, $5, $6, 1, TRUE, TRUE)`,
    [IDS.territory, IDS.taluka, ZONE.pincode, ZONE.lat, ZONE.lng, boundary]
  );

  await query(
    `INSERT INTO users (id, phone_number, full_name, role, is_active)
     VALUES ($1, $2, 'C3 Shop Owner', 'shop_owner', true)`,
    [IDS.owner, `97${String(Date.now()).slice(-8)}`]
  );
  const shop = (id, name, lat, hours) => query(
    `INSERT INTO local_shops (id, owner_id, name, description, category, address, is_active, is_verified, latitude, longitude, coordinate, opening_hours)
     VALUES ($1, $2, $3, 'C3 fixture', 'grocery', 'C3 Road', true, true, $4, $5, ${pointSql(lat, HERE.lng)}, $6)`,
    [id, IDS.owner, name, lat, HERE.lng, hours]
  );
  await shop(IDS.shopNear, `C3 Near ${SUFFIX}`, kmNorth(0.3), JSON.stringify({ open: '00:00', close: '24:00' }));
  await shop(IDS.shopMid, `C3 Mid ${SUFFIX}`, kmNorth(3), null);
  await shop(IDS.shopFar, `C3 Far ${SUFFIX}`, kmNorth(15), JSON.stringify({ open: '09:00', close: '21:00' }));
});

afterAll(cleanup);

describe('[C2.1] location: pilot zone boundary check', () => {
  test('[C2.1] a point inside a verified pilot-zone boundary resolves to that zone', async () => {
    const res = await request(app).get('/zones/resolve').query({ lat: ZONE.lat + 0.005, lng: ZONE.lng - 0.005 });
    expect(res.status).toBe(200);
    expect(res.body.outOfBounds).toBe(false);
    expect(res.body.territory).toMatchObject({ id: IDS.territory, pincode: ZONE.pincode });
  });

  test('[C2.1] a point outside every boundary is out of bounds, with the nearest zone suggested', async () => {
    const res = await request(app).get('/zones/resolve').query({ lat: OUTSIDE.lat, lng: OUTSIDE.lng });
    expect(res.status).toBe(200);
    expect(res.body.outOfBounds).toBe(true);
    expect(res.body.territory).toBeUndefined();
    expect(res.body.nearest).toBeTruthy();
    expect(typeof res.body.nearest.distance_km).toBe('number');
  });

  test('[C2.1] just past the boundary edge is out of bounds', async () => {
    const res = await request(app).get('/zones/resolve').query({ lat: ZONE.lat, lng: ZONE.lng + ZONE.half + 0.001 });
    expect(res.status).toBe(200);
    expect(res.body.outOfBounds).toBe(true);
  });

  test('[C2.1] a live pincode resolves, an unknown one is out of bounds', async () => {
    const live = await request(app).get('/zones/resolve').query({ pincode: ZONE.pincode });
    expect(live.body).toMatchObject({ outOfBounds: false, territory: { id: IDS.territory } });
    const unknown = await request(app).get('/zones/resolve').query({ pincode: OUTSIDE.pincode });
    expect(unknown.body.outOfBounds).toBe(true);
  });

  test('[C2.1] no location at all is a 400, not a guess', async () => {
    const res = await request(app).get('/zones/resolve');
    expect(res.status).toBe(400);
  });
});

describe('[C2.2] location: unserviceable waitlist capture', () => {
  test('[C2.2] an out-of-zone visitor joins the waitlist and the row is stored', async () => {
    const email = `c2-${SUFFIX}@example.com`;
    const res = await request(app).post('/zones/waitlist').send({
      latitude: OUTSIDE.lat, longitude: OUTSIDE.lng, pincode: OUTSIDE.pincode, phone: '+91 98765-43210', email,
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const row = await queryOne('SELECT * FROM unserviceable_waitlist WHERE id = $1', [res.body.id]);
    expect(row).toBeTruthy();
    expect(row.pincode).toBe(OUTSIDE.pincode);
    expect(row.phone_number).toBe('+919876543210');
    expect(row.email).toBe(email);
    expect(Number(row.latitude)).toBeCloseTo(OUTSIDE.lat, 4);
  });

  test('[C2.2] a location that is already served is refused with 409 and nothing is stored', async () => {
    const byPoint = await request(app).post('/zones/waitlist').send({ latitude: ZONE.lat, longitude: ZONE.lng, phone: '9876543211' });
    expect(byPoint.status).toBe(409);
    expect(byPoint.body.territory.id).toBe(IDS.territory);

    const byPin = await request(app).post('/zones/waitlist').send({ latitude: OUTSIDE.lat, longitude: OUTSIDE.lng, pincode: ZONE.pincode, phone: '9876543211' });
    expect(byPin.status).toBe(409);

    const rows = await query('SELECT id FROM unserviceable_waitlist WHERE phone_number = $1', ['9876543211']);
    expect((rows.rows || rows).length).toBe(0);
  });

  test.each([
    ['missing coordinates', { phone: '9876543212' }],
    ['coordinates off the globe', { latitude: 95, longitude: 10, phone: '9876543212' }],
    ['no way to reach the person', { latitude: OUTSIDE.lat, longitude: OUTSIDE.lng }],
    ['a malformed pincode', { latitude: OUTSIDE.lat, longitude: OUTSIDE.lng, pincode: '01234', phone: '9876543212' }],
    ['a malformed phone', { latitude: OUTSIDE.lat, longitude: OUTSIDE.lng, phone: '12ab' }],
    ['a malformed email', { latitude: OUTSIDE.lat, longitude: OUTSIDE.lng, email: 'not-an-email' }],
  ])('[C2.2] %s is a 400', async (_label, body) => {
    const res = await request(app).post('/zones/waitlist').send(body);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('[C3.1] discovery: nearby shops within radius', () => {
  test('[C3.1] only shops inside the radius are listed, nearest first, with distances', async () => {
    const res = await request(app).get('/shops/nearby').query({ lat: HERE.lat, lng: HERE.lng, radius: 5, sortBy: 'distance' });
    expect(res.status).toBe(200);
    expect(res.body.userLocation).toEqual({ lat: HERE.lat, lng: HERE.lng });
    expect(res.body.radiusKm).toBe(5);
    expect(res.body.fallbackUsed).toBe(false);

    const mine = res.body.shops.filter((s) => [IDS.shopNear, IDS.shopMid, IDS.shopFar].includes(s.id));
    expect(mine.map((s) => s.id)).toEqual([IDS.shopNear, IDS.shopMid]);
    expect(mine[0].distance_km).toBeCloseTo(0.3, 1);
    expect(mine[1].distance_km).toBeCloseTo(3, 1);
    for (const s of res.body.shops) expect(s.distance_km).toBeLessThanOrEqual(5);
  });

  test('[C3.1] widening the radius brings the farther shop in', async () => {
    const res = await request(app).get('/shops/nearby').query({ lat: HERE.lat, lng: HERE.lng, radius: 20 });
    const ids = res.body.shops.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining([IDS.shopNear, IDS.shopMid, IDS.shopFar]));
  });

  test('[C3.1] without a location nothing is assumed: no distances, fallback flagged', async () => {
    const res = await request(app).get('/shops/nearby');
    expect(res.status).toBe(200);
    expect(res.body.userLocation).toBeNull();
    expect(res.body.fallbackUsed).toBe(true);
    for (const s of res.body.shops) expect(s.distance_km).toBeNull();
  });
});

describe('[C3.2] discovery: shop hours and open status', () => {
  test('[C3.2] listings carry each shop\'s hours and whether it is open now', async () => {
    const res = await request(app).get('/shops/nearby').query({ lat: HERE.lat, lng: HERE.lng, radius: 20 });
    const byId = Object.fromEntries(res.body.shops.map((s) => [s.id, s]));
    expect(byId[IDS.shopNear].is_open_now).toBe(true); // 00:00-24:00
    expect(byId[IDS.shopMid].is_open_now).toBeNull(); // no hours: unknown, not "open"
    expect(typeof byId[IDS.shopFar].is_open_now).toBe('boolean');
    expect(byId[IDS.shopNear]).toHaveProperty('opening_hours');
  });

  // 2026-11-13T06:30Z is 12:00 IST; 17:30Z is 23:00 IST.
  const at = (iso) => new Date(iso);
  test('[C3.2] open status is computed in IST, not server time', () => {
    const hours = { open: '09:00', close: '21:00' };
    expect(isOpenNow(hours, at('2026-11-13T06:30:00Z'))).toBe(true);
    expect(isOpenNow(hours, at('2026-11-13T17:30:00Z'))).toBe(false);
    // 03:00 UTC is 08:30 IST: open in IST, though 03:00 server time would be outside the window.
    expect(isOpenNow({ open: '08:00', close: '09:00' }, at('2026-11-13T03:00:00Z'))).toBe(true);
  });

  test('[C3.2] shops open past midnight, and minute-precise closing times', () => {
    const late = JSON.stringify({ opens: '18:00', closes: '02:00' });
    expect(isOpenNow(late, at('2026-11-13T17:30:00Z'))).toBe(true); // 23:00 IST
    expect(isOpenNow(late, at('2026-11-13T06:30:00Z'))).toBe(false); // 12:00 IST
    expect(isOpenNow({ open: '09:00', close: '12:00' }, at('2026-11-13T06:29:00Z'))).toBe(true); // 11:59
    expect(isOpenNow({ open: '09:00', close: '12:00' }, at('2026-11-13T06:30:00Z'))).toBe(false); // 12:00
  });

  test('[C3.2] missing or unreadable hours are unknown (null)', () => {
    for (const h of [null, '', 'not json', {}, { open: '9am', close: '5pm' }]) {
      expect(isOpenNow(h, at('2026-11-13T06:30:00Z'))).toBeNull();
    }
  });

  test('[C3.2] equal opening and closing times are a 24-hour shop, as the catalogue stores them', () => {
    for (const iso of ['2026-11-13T06:30:00Z', '2026-11-13T20:30:00Z']) {
      expect(isOpenNow({ open: '00:00', close: '00:00' }, at(iso))).toBe(true);
    }
  });
});
