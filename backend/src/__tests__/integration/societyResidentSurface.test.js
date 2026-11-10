/**
 * The resident and office surface of /society-management.
 *
 * The web society page and the mobile society tabs call ~50 paths under this
 * prefix; the router had eight. Members, bills, polls, amenities, complaints,
 * parking, events, the guard inbox and the emergency board all answered 404 on
 * web and were never called on mobile. These cases pin the rules the new
 * handlers enforce — mostly, that a society's data stays inside it and a
 * resident acts for their own flat.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const SOC_A = fx('srs-society-a');
const SOC_B = fx('srs-society-b');
const RESIDENT = fx('srs-resident-101');
const NEIGHBOUR = fx('srs-resident-102');
const GUARD = fx('srs-guard-a');
const COMMITTEE = fx('srs-admin-a');
const OUTSIDER = fx('srs-outsider-b');

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });

let app;

async function cleanup() {
  await query(`DELETE FROM shop_notifications WHERE CAST(recipient_id AS TEXT) LIKE '${fxLike('srs')}'`);
  await query(`DELETE FROM society_poll_votes WHERE CAST(voter_id AS TEXT) LIKE '${fxLike('srs')}'`);
  await query(`DELETE FROM society_event_rsvps WHERE CAST(user_id AS TEXT) LIKE '${fxLike('srs')}'`);
  await query(`DELETE FROM society_amenity_bookings WHERE CAST(society_id AS TEXT) LIKE '${fxLike('srs')}'`);
  await query(`DELETE FROM society_staff_attendance WHERE CAST(society_id AS TEXT) LIKE '${fxLike('srs')}'`);
  for (const table of ['society_visitors', 'society_complaints', 'society_maintenance_bills', 'society_packages',
    'society_polls', 'society_events', 'society_amenities', 'society_parking_slots', 'society_domestic_staff',
    'society_guard_messages', 'society_emergency_alerts', 'society_settings']) {
    await query(`DELETE FROM ${table} WHERE CAST(society_id AS TEXT) LIKE '${fxLike('srs')}'`);
  }
  await query(`DELETE FROM society_members WHERE CAST(user_id AS TEXT) LIKE '${fxLike('srs')}'`);
  await query(`DELETE FROM societies WHERE CAST(id AS TEXT) LIKE '${fxLike('srs')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('srs')}'`);
}

beforeAll(async () => {
  await cleanup();

  const people = [
    [RESIDENT, '9877000001'], [NEIGHBOUR, '9877000002'], [GUARD, '9877000003'],
    [COMMITTEE, '9877000004'], [OUTSIDER, '9877000005'],
  ];
  for (const [id, phone] of people) {
    await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, 'user')", [id, `SRS ${id}`, `+91${phone}`]);
  }
  for (const [id, name] of [[SOC_A, 'SRS Green Acres'], [SOC_B, 'SRS Blue Meadows']]) {
    await query("INSERT INTO societies (id, name, address, is_active) VALUES ($1, $2, 'Pune', '1')", [id, name]);
  }
  const members = [
    [RESIDENT, SOC_A, 'resident', '101', 1], [NEIGHBOUR, SOC_A, 'resident', '102', 0], [GUARD, SOC_A, 'guard', null, 1],
    [COMMITTEE, SOC_A, 'society_admin', null, 1], [OUTSIDER, SOC_B, 'resident', '101', 1],
  ];
  for (const [userId, societyId, role, flat, showPhone] of members) {
    await query(
      `INSERT INTO society_members (id, society_id, user_id, flat_number, role, is_active, status, show_phone)
       VALUES ($1, $2, $3, $4, $5, '1', 'active', $6)`,
      [fx(`srs-m-${userId}`), societyId, userId, flat, role, showPhone]
    );
  }
  for (const [id, soc, flat, status] of [[fx('srs-bill-101'), SOC_A, '101', 'pending'], [fx('srs-bill-102'), SOC_A, '102', 'pending'], [fx('srs-bill-b101'), SOC_B, '101', 'pending']]) {
    await query(
      `INSERT INTO society_maintenance_bills (id, society_id, flat_number, month, base_amount, total_amount, due_date, payment_status)
       VALUES ($1, $2, $3, '2026-10', 3000, 3000, '2026-10-10', $4)`,
      [id, soc, flat, status]
    );
  }
  await query(`INSERT INTO society_amenities (id, society_id, name, hourly_rate, is_active) VALUES ('${fx('srs-hall')}', $1, 'Hall', 500, '1')`, [SOC_A]);

  app = express();
  app.use(express.json());
  app.use('/sm', require('../../modules/community/routes/society-visitor.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

describe('every path the clients call exists', () => {
  test.each([
    '/context', '/members', '/directory', '/staff', '/my-bills', '/parking', '/my-parking', '/amenities',
    '/my-bookings', '/my-complaints', '/my-packages', '/polls', '/emergency/active', '/events', '/settings', '/my-visitors',
  ])('GET %s answers a resident with data', async (path) => {
    const res = await request(app).get(`/sm${path}`).set(as(RESIDENT));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('a society stays inside itself', () => {
  test('a member of another society reads none of this one', async () => {
    const members = await request(app).get('/sm/members').set(as(OUTSIDER));
    expect(members.status).toBe(200);
    expect(members.body.data.map((m) => m.user_id)).toEqual([OUTSIDER]);

    const bills = await request(app).get('/sm/my-bills').set(as(OUTSIDER));
    expect(bills.body.data.map((b) => b.id)).toEqual([fx('srs-bill-b101')]);
  });

  test("a bill in another society cannot be paid, even for a flat with the same number", async () => {
    const res = await request(app).put(`/sm/bills/${fx('srs-bill-101')}/pay`).set(as(OUTSIDER)).send({});
    expect(res.status).toBe(404);
    expect((await queryOne(`SELECT payment_status FROM society_maintenance_bills WHERE id = '${fx('srs-bill-101')}'`)).payment_status).toBe('pending');
  });

  test('naming a society you do not belong to is refused', async () => {
    const res = await request(app).get('/sm/members').query({ societyId: SOC_A }).set(as(OUTSIDER));
    expect(res.status).toBe(403);
  });
});

describe('a resident acts for their own flat', () => {
  test("pays their own bill, not their neighbour's", async () => {
    expect((await request(app).put(`/sm/bills/${fx('srs-bill-102')}/pay`).set(as(RESIDENT)).send({})).status).toBe(403);
    const paid = await request(app).put(`/sm/bills/${fx('srs-bill-101')}/pay`).set(as(RESIDENT)).send({ paymentReference: 'UPI-1' });
    expect(paid.status).toBe(200);
    expect((await request(app).put(`/sm/bills/${fx('srs-bill-101')}/pay`).set(as(RESIDENT)).send({})).status).toBe(409);
  });

  test("decides about their own flat's visitor only", async () => {
    const id = crypto.randomUUID();
    await query(
      "INSERT INTO society_visitors (id, society_id, visitor_name, flat_number, status) VALUES ($1, $2, 'Guest', '102', 'pending')",
      [id, SOC_A]
    );
    expect((await request(app).put(`/sm/visitors/${id}/approve`).set(as(RESIDENT))).status).toBe(403);
    expect((await request(app).put(`/sm/visitors/${id}/approve`).set(as(NEIGHBOUR))).status).toBe(200);
    const row = await queryOne('SELECT status, approved_at FROM society_visitors WHERE id = $1', [id]);
    expect(row.status).toBe('approved');
    expect(row.approved_at).toBeTruthy();
    // The gate moves them in; a resident cannot.
    expect((await request(app).put(`/sm/visitors/${id}/check-in`).set(as(NEIGHBOUR))).status).toBe(403);
    expect((await request(app).put(`/sm/visitors/${id}/check-in`).set(as(GUARD))).status).toBe(200);
  });

  test('a complaint is filed against the filer\'s flat, whatever the body says', async () => {
    const res = await request(app).post('/sm/complaints').set(as(RESIDENT)).send({ title: 'Leak', flatNumber: '999' });
    expect(res.status).toBe(201);
    expect((await queryOne('SELECT flat_number FROM society_complaints WHERE id = $1', [res.body.data.id])).flat_number).toBe('101');
  });
});

describe('the directory respects show_phone', () => {
  test('a neighbour who hid their number is listed without it; the office still sees it', async () => {
    const asResident = (await request(app).get('/sm/directory').set(as(RESIDENT))).body.data;
    expect(asResident.find((m) => m.user_id === NEIGHBOUR).phone_number).toBeNull();
    const asOffice = (await request(app).get('/sm/directory').set(as(COMMITTEE))).body.data;
    expect(asOffice.find((m) => m.user_id === NEIGHBOUR).phone_number).toBe('+919877000002');
  });
});

describe('office-only actions', () => {
  test.each([
    ['get', '/bills'], ['get', '/bills/summary'], ['get', '/complaints/all'], ['get', '/visitors/all'],
    ['post', '/polls'], ['post', '/events'], ['post', '/bills/generate'], ['put', '/settings'],
  ])('%s %s is refused to a resident', async (method, path) => {
    const res = await request(app)[method](`/sm${path}`).set(as(RESIDENT)).send({});
    expect(res.status).toBe(403);
  });

  test('generating a month twice bills each flat once', async () => {
    const body = { month: '2031-02', baseAmount: 2500, dueDate: '2031-02-10' };
    const first = await request(app).post('/sm/bills/generate').set(as(COMMITTEE)).send(body);
    expect(first.status).toBe(201);
    expect(first.body.data.created).toBe(2); // flats 101 and 102; the guard has no flat
    const again = await request(app).post('/sm/bills/generate').set(as(COMMITTEE)).send(body);
    expect(again.body.data.created).toBe(0);
  });
});

describe('polls', () => {
  test('one vote per person, inside the option range, only while open', async () => {
    const created = await request(app).post('/sm/polls').set(as(COMMITTEE)).send({ title: 'Paint colour', options: ['Blue', 'Green'] });
    const id = created.body.data.id;
    expect((await request(app).post(`/sm/polls/${id}/vote`).set(as(RESIDENT)).send({ selectedOption: 5 })).status).toBe(400);
    expect((await request(app).post(`/sm/polls/${id}/vote`).set(as(RESIDENT)).send({ selectedOption: 1 })).status).toBe(201);
    expect((await request(app).post(`/sm/polls/${id}/vote`).set(as(RESIDENT)).send({ selectedOption: 0 })).status).toBe(409);

    const results = (await request(app).get(`/sm/polls/${id}/results`).set(as(NEIGHBOUR))).body.data;
    expect(results).toEqual([
      { option: 'Blue', votes: 0, percentage: 0 },
      { option: 'Green', votes: 1, percentage: 100 },
    ]);

    await request(app).put(`/sm/polls/${id}/close`).set(as(COMMITTEE));
    expect((await request(app).post(`/sm/polls/${id}/vote`).set(as(NEIGHBOUR)).send({ selectedOption: 0 })).status).toBe(409);
  });
});

describe('amenity bookings', () => {
  const day = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

  test('overlapping slots are refused; adjacent ones are not; the charge is by the hour', async () => {
    const first = await request(app).post(`/sm/amenities/${fx('srs-hall')}/book`).set(as(RESIDENT))
      .send({ bookingDate: day, startTime: '10:00', endTime: '12:00' });
    expect(first.status).toBe(201);
    expect(first.body.data.total_charge).toBe(1000);

    const overlap = await request(app).post(`/sm/amenities/${fx('srs-hall')}/book`).set(as(NEIGHBOUR))
      .send({ bookingDate: day, startTime: '11:00', endTime: '13:00' });
    expect(overlap.status).toBe(409);

    const adjacent = await request(app).post(`/sm/amenities/${fx('srs-hall')}/book`).set(as(NEIGHBOUR))
      .send({ bookingDate: day, startTime: '12:00', endTime: '13:00' });
    expect(adjacent.status).toBe(201);

    // Someone else's booking is not yours to cancel.
    expect((await request(app).put(`/sm/bookings/${first.body.data.id}/cancel`).set(as(NEIGHBOUR))).status).toBe(403);
  });

  test('past dates and inverted times are refused', async () => {
    expect((await request(app).post(`/sm/amenities/${fx('srs-hall')}/book`).set(as(RESIDENT))
      .send({ bookingDate: '2020-01-01', startTime: '10:00', endTime: '11:00' })).status).toBe(400);
    expect((await request(app).post(`/sm/amenities/${fx('srs-hall')}/book`).set(as(RESIDENT))
      .send({ bookingDate: day, startTime: '15:00', endTime: '14:00' })).status).toBe(400);
  });
});

describe('the gate', () => {
  test('a visitor logged with the web form field names is recorded', async () => {
    const res = await request(app).post('/sm/visitors').set(as(GUARD))
      .send({ visitorName: 'Plumber', visitorPhone: '9000000000', flatNumber: '101', purpose: 'service' });
    expect(res.status).toBe(201);
    expect((await queryOne('SELECT visitor_name, flat_number FROM society_visitors WHERE id = $1', [res.body.id])))
      .toEqual({ visitor_name: 'Plumber', flat_number: '101' });

    // The resident's inbox gets it. visitor_alert is not a type the
    // notifications table's CHECK constraint accepts, and the insert used to
    // fail — with no push token on the phone, the visitor reached nobody.
    let note = null;
    for (let i = 0; i < 20 && !note; i += 1) {
      note = await queryOne(
        "SELECT type, data FROM shop_notifications WHERE recipient_id = $1 AND data LIKE $2",
        [RESIDENT, `%${res.body.id}%`]
      );
      if (!note) await new Promise((r) => setTimeout(r, 50));
    }
    expect(note).not.toBeNull();
    expect(JSON.parse(note.data)).toMatchObject({ type: 'visitor_alert', visitorId: res.body.id, flat: '101' });
    expect((await queryOne("SELECT id FROM shop_notifications WHERE recipient_id = $1 AND data LIKE $2", [NEIGHBOUR, `%${res.body.id}%`]))).toBeNull();
  });

  test("packages logged as 'pending' are in the guard's queue", async () => {
    await query(
      `INSERT INTO society_packages (id, society_id, flat_number, courier_name, status) VALUES ('${fx('srs-pkg-1')}', $1, '101', 'Amazon', 'pending')`,
      [SOC_A]
    );
    const queue = (await request(app).get('/sm/packages/pending').set(as(GUARD))).body.data;
    expect(queue.map((p) => p.id)).toContain(fx('srs-pkg-1'));
    // The neighbour cannot mark the resident's parcel collected.
    expect((await request(app).put(`/sm/packages/${fx('srs-pkg-1')}/collect`).set(as(NEIGHBOUR))).status).toBe(403);
    expect((await request(app).put(`/sm/packages/${fx('srs-pkg-1')}/collect`).set(as(RESIDENT))).status).toBe(200);
  });

  test('an SOS carries who raised it and from which flat, and the gate can stand it down', async () => {
    await request(app).post('/sm/emergency').set(as(RESIDENT)).send({ alertType: 'medical', description: 'Fainted' });
    const active = (await request(app).get('/sm/emergency/active').set(as(GUARD))).body.data;
    const sos = active.find((e) => e.description === 'Fainted');
    expect(sos).toMatchObject({ alert_type: 'medical', flat_number: '101', triggered_by_name: `SRS ${RESIDENT}` });
    expect((await request(app).put(`/sm/emergency/${sos.id}/resolve`).set(as(RESIDENT))).status).toBe(403);
    expect((await request(app).put(`/sm/emergency/${sos.id}/resolve`).set(as(GUARD))).status).toBe(200);
  });
});
