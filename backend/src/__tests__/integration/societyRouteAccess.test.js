/**
 * Who may call the older society routes.
 *
 * society.routes.js and society-admin.routes.js began as `authenticate` and a
 * society id read from the request. Signed in as anyone, a caller could create
 * a society, announce a visitor at another society's gate, bill any flat, read
 * another society's document vault and resident directory, and issue
 * themselves a gate pass — the code a guard admits people on — for a society
 * they had never been to. The CCTV webhook took no credentials at all.
 *
 * Each case here is a request that used to succeed.
 */

process.env.USE_SQLITE = 'true';

const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const SOC_A = 'sra-society-a';
const SOC_B = 'sra-society-b';
const RESIDENT = 'sra-resident-101';
const NEIGHBOUR = 'sra-resident-102';
const GUARD = 'sra-guard-a';
const COMMITTEE = 'sra-admin-a';
const OUTSIDER = 'sra-outsider-b';
const STAFF = 'sra-platform-admin';

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });

let app;

async function cleanup() {
  for (const table of ['ai_cctv_alerts', 'utility_meters', 'maintenance_bills', 'visitor_logs', 'intercom_logs',
    'society_visitors', 'society_bookings', 'society_complaints', 'society_notices', 'society_vault', 'resident_directory']) {
    await query(`DELETE FROM ${table} WHERE society_id LIKE 'sra-society-%'`);
  }
  await query("DELETE FROM society_admin_roles WHERE user_id LIKE 'sra-%'");
  await query("DELETE FROM society_members WHERE user_id LIKE 'sra-%'");
  await query("DELETE FROM societies WHERE id LIKE 'sra-society-%' OR name = 'SRA Staff Created'");
  await query("DELETE FROM users WHERE id LIKE 'sra-%'");
}

beforeAll(async () => {
  await cleanup();

  const people = [
    [RESIDENT, '9866000001', 'user'], [NEIGHBOUR, '9866000002', 'user'], [GUARD, '9866000003', 'user'],
    [COMMITTEE, '9866000004', 'user'], [OUTSIDER, '9866000005', 'user'], [STAFF, '9866000006', 'super_admin'],
  ];
  for (const [id, phone, role] of people) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, `SRA ${id}`, phone, role]);
  }
  for (const [id, name] of [[SOC_A, 'SRA Green Acres'], [SOC_B, 'SRA Blue Meadows']]) {
    await query("INSERT INTO societies (id, name, address, is_active) VALUES ($1, $2, '1 Society Road, Pune', 1)", [id, name]);
  }
  const members = [
    [RESIDENT, SOC_A, 'resident', '101'], [NEIGHBOUR, SOC_A, 'resident', '102'], [GUARD, SOC_A, 'guard', null],
    [COMMITTEE, SOC_A, 'society_admin', null], [OUTSIDER, SOC_B, 'resident', '101'],
  ];
  for (const [userId, societyId, role, flat] of members) {
    await query(
      `INSERT INTO society_members (id, society_id, user_id, flat_number, role, is_active, status)
       VALUES ($1, $2, $3, $4, $5, 1, 'active')`,
      [crypto.randomUUID(), societyId, userId, flat, role]
    );
  }

  await query("INSERT INTO utility_meters (id, society_id, flat_number, meter_type, current_balance) VALUES ('sra-meter-a101', $1, '101', 'electricity', 420)", [SOC_A]);
  await query("INSERT INTO utility_meters (id, society_id, flat_number, meter_type, current_balance) VALUES ('sra-meter-b101', $1, '101', 'electricity', 77)", [SOC_B]);
  await query("INSERT INTO society_notices (id, society_id, posted_by, title, content) VALUES ('sra-notice-1', $1, $2, 'Water tank cleaning', 'Saturday, 10 am')", [SOC_A, COMMITTEE]);
  await query("INSERT INTO society_vault (id, society_id, document_name, file_url) VALUES ('sra-vault-1', $1, 'Audit report', 'https://example.org/audit.pdf')", [SOC_A]);
  await query("INSERT INTO resident_directory (id, society_id, user_id, profession) VALUES ('sra-dir-1', $1, $2, 'Doctor')", [SOC_A, RESIDENT]);

  app = express();
  app.use(express.json({
    verify: (req, _res, buf) => { if (/\/webhooks?(\/|$)/.test(req.originalUrl)) req.rawBody = buf; },
  }));
  app.use('/societies', require('../../modules/community/routes/society.routes'));
  app.use('/society-admin', require('../../modules/community/routes/society-admin.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

afterAll(cleanup);

describe('creating a society', () => {
  test('is for platform staff; a resident is pointed at registration', async () => {
    const refused = await request(app).post('/societies/admin/create').set(as(RESIDENT)).send({ name: 'Mine', subscription_fee: 0 });
    expect(refused.status).toBe(403);
    expect(await queryOne("SELECT id FROM societies WHERE name = 'Mine'")).toBeNull();

    const created = await request(app).post('/societies/admin/create').set(as(STAFF)).send({ name: 'SRA Staff Created' });
    expect(created.status).toBe(200);
    expect((await request(app).post('/societies/admin/create').set(as(STAFF)).send({})).status).toBe(400);
  });
});

describe('the gate desk', () => {
  const entry = (userId, body) => request(app).post('/societies/gate/request-entry').set(as(userId)).send(body);

  test('a guard announces a visitor at their own society', async () => {
    const res = await entry(GUARD, { flat_number: '101', visitor_name: 'Courier', purpose: 'delivery' });
    expect(res.status).toBe(200);
    const row = await queryOne('SELECT society_id, guard_id FROM visitor_logs WHERE id = $1', [res.body.logId]);
    expect(row).toEqual({ society_id: SOC_A, guard_id: GUARD });
  });

  test('a resident cannot, and a guard cannot at another society', async () => {
    expect((await entry(RESIDENT, { flat_number: '102', visitor_name: 'Friend' })).status).toBe(403);
    expect((await entry(GUARD, { society_id: SOC_B, flat_number: '101', visitor_name: 'Friend' })).status).toBe(403);
    expect((await request(app).post('/societies/intercom/call').set(as(OUTSIDER)).send({ society_id: SOC_A, flat_number: '101' })).status).toBe(403);
    expect(await queryMany('SELECT id FROM visitor_logs WHERE society_id = $1', [SOC_B])).toEqual([]);
  });
});

describe('maintenance bills', () => {
  const bill = (userId, body) => request(app).post('/societies/maintenance/generate').set(as(userId)).send(body);

  test('are issued by the committee, in their own society, for a real amount', async () => {
    expect((await bill(RESIDENT, { flat_number: '102', amount: 99999, billing_month: '2026-10' })).status).toBe(403);
    expect((await bill(COMMITTEE, { society_id: SOC_B, flat_number: '101', amount: 500, billing_month: '2026-10' })).status).toBe(403);
    expect((await bill(COMMITTEE, { flat_number: '101', amount: -5, billing_month: '2026-10' })).status).toBe(400);

    const ok = await bill(COMMITTEE, { flat_number: '101', amount: 2500, billing_month: '2026-10' });
    expect(ok.status).toBe(200);
    const row = await queryOne('SELECT society_id, amount FROM maintenance_bills WHERE id = $1', [ok.body.billId]);
    expect(row).toEqual({ society_id: SOC_A, amount: 2500 });
  });
});

describe('meters', () => {
  const meters = (userId, flat, societyId) =>
    request(app).get(`/societies/meters/${flat}`).query(societyId ? { society_id: societyId } : {}).set(as(userId));

  test('a resident sees their own flat, in their own society only', async () => {
    const own = await meters(RESIDENT, '101');
    expect(own.status).toBe(200);
    // Flat 101 exists in both societies; only this society's meter comes back.
    expect(own.body.meters.map((m) => m.id)).toEqual(['sra-meter-a101']);

    expect((await meters(NEIGHBOUR, '101')).status).toBe(403);
    expect((await meters(OUTSIDER, '101', SOC_A)).status).toBe(403);
    expect((await meters(COMMITTEE, '101')).status).toBe(200);
  });
});

describe('the module reader', () => {
  const read = (userId, name, societyId) =>
    request(app).get(`/societies/module/${name}`).query(societyId ? { society_id: societyId } : {}).set(as(userId));

  test("another society's records are not readable by naming its id", async () => {
    for (const name of ['society_notices', 'resident_directory', 'society_vault']) {
      expect((await read(OUTSIDER, name, SOC_A)).status).toBe(403);
    }
  });

  test('members read the notice board and directory; the vault is for the office and the desk', async () => {
    const notices = await read(RESIDENT, 'society_notices');
    expect(notices.status).toBe(200);
    expect(notices.body.data.map((n) => n.id)).toEqual(['sra-notice-1']);

    // No created_at on this table; it used to answer "Server error".
    const directory = await read(RESIDENT, 'resident_directory');
    expect(directory.status).toBe(200);
    expect(directory.body.data).toHaveLength(1);

    expect((await read(RESIDENT, 'society_vault')).status).toBe(403);
    expect((await read(COMMITTEE, 'society_vault')).status).toBe(200);
    expect((await read(RESIDENT, 'users')).status).toBe(400);
  });
});

describe('the CCTV webhook', () => {
  const body = { society_id: SOC_A, camera_id: 'gate-1', threat_level: 'HIGH', snapshot_url: 'https://cam.example.org/1.jpg' };
  const deliver = (payload, signature) => {
    const raw = JSON.stringify(payload);
    const req = request(app).post('/societies/cctv/webhook').set('Content-Type', 'application/json');
    if (signature !== null) req.set('X-Webhook-Signature', signature);
    return req.send(raw);
  };
  const sign = (payload, secret) => crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  const alerts = () => queryMany('SELECT camera_id, threat_level FROM ai_cctv_alerts WHERE society_id = $1', [SOC_A]);

  afterEach(() => { delete process.env.CCTV_WEBHOOK_SECRET; });

  test('is refused outright when no secret is configured', async () => {
    expect((await deliver(body, 'anything')).status).toBe(503);
    expect(await alerts()).toEqual([]);
  });

  test('is refused without a valid signature', async () => {
    process.env.CCTV_WEBHOOK_SECRET = 'camera-secret';
    expect((await deliver(body, null)).status).toBe(401);
    expect((await deliver(body, sign(body, 'wrong-secret'))).status).toBe(401);
    expect(await alerts()).toEqual([]);
  });

  test('records a signed alert, and keeps only an https snapshot address', async () => {
    process.env.CCTV_WEBHOOK_SECRET = 'camera-secret';
    expect((await deliver(body, sign(body, 'camera-secret'))).status).toBe(200);
    expect(await alerts()).toEqual([{ camera_id: 'gate-1', threat_level: 'high' }]);

    const scripted = { ...body, camera_id: 'gate-2', snapshot_url: 'javascript:alert(1)' };
    expect((await deliver(scripted, sign(scripted, 'camera-secret'))).status).toBe(200);
    const row = await queryOne("SELECT snapshot_url FROM ai_cctv_alerts WHERE society_id = $1 AND camera_id = 'gate-2'", [SOC_A]);
    expect(row.snapshot_url).toBeNull();

    const nowhere = { ...body, society_id: 'sra-society-nope' };
    expect((await deliver(nowhere, sign(nowhere, 'camera-secret'))).status).toBe(404);
  });
});

describe('visitor passes, bookings and complaints', () => {
  test('a pass cannot be issued for a society the caller does not live in', async () => {
    const res = await request(app).post('/society-admin/visitors').set(as(OUTSIDER))
      .send({ societyId: SOC_A, residentId: RESIDENT, visitorName: 'Let me in' });
    expect(res.status).toBe(403);
    expect(await queryMany('SELECT id FROM society_visitors WHERE society_id = $1', [SOC_A])).toEqual([]);
  });

  test('a resident issues a pass as themselves, whoever the request names', async () => {
    const res = await request(app).post('/society-admin/visitors').set(as(RESIDENT))
      .send({ societyId: SOC_A, residentId: NEIGHBOUR, visitorName: 'Aunt' });
    expect(res.status).toBe(201);
    expect(res.body.visitor.resident_id).toBe(RESIDENT);
    expect(res.body.visitor.qr_code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  test('a resident sees their own guests; the desk sees everyone; an outsider sees nothing', async () => {
    await request(app).post('/society-admin/visitors').set(as(NEIGHBOUR)).send({ societyId: SOC_A, visitorName: 'Plumber' });

    const mine = await request(app).get(`/society-admin/visitors/${SOC_A}`).set(as(RESIDENT));
    expect(mine.body.map((v) => v.visitor_name)).toEqual(['Aunt']);

    const desk = await request(app).get(`/society-admin/visitors/${SOC_A}`).set(as(GUARD));
    expect(desk.body.map((v) => v.visitor_name).sort()).toEqual(['Aunt', 'Plumber']);

    expect((await request(app).get(`/society-admin/visitors/${SOC_A}`).set(as(OUTSIDER))).status).toBe(403);
  });

  test('a booking and a complaint are filed as the caller, in the caller\'s society', async () => {
    const booking = await request(app).post('/society-admin/bookings').set(as(RESIDENT))
      .send({ societyId: SOC_A, userId: NEIGHBOUR, facility: 'Clubhouse', bookingDate: '2026-11-01', startTime: '18:00', endTime: '20:00' });
    expect(booking.status).toBe(201);
    expect(booking.body.booking.user_id).toBe(RESIDENT);

    const complaint = await request(app).post('/society-admin/complaints').set(as(RESIDENT))
      .send({ societyId: SOC_A, userId: NEIGHBOUR, title: 'Lift not working', category: 'maintenance' });
    expect(complaint.status).toBe(201);
    expect(complaint.body.complaint.user_id).toBe(RESIDENT);

    expect((await request(app).post('/society-admin/complaints').set(as(OUTSIDER)).send({ societyId: SOC_A, title: 'Spam' })).status).toBe(403);
    expect((await request(app).post('/society-admin/bookings').set(as(RESIDENT)).send({ societyId: SOC_A, facility: 'Clubhouse' })).status).toBe(400);
  });
});
