/**
 * Routes that changed a record chosen by the request without asking whose it
 * was.
 *
 * Each of these was guarded by `authenticate` — "is this a real user" — and
 * nothing that asked "is this theirs". Found by reading every authenticated
 * mutating handler for one that writes without consulting the caller; each
 * case below is a request that used to succeed.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const OWNER = fx('rauth-owner');
const RIVAL = fx('rauth-rival');
const CUSTOMER = fx('rauth-customer');
const RIDER = fx('rauth-rider');
const ADMIN = fx('rauth-admin');
const SHOP = fx('rauth-shop');
const RIVAL_SHOP = fx('rauth-shop-rival');

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });

let app;

async function cleanup() {
  await query(`DELETE FROM job_applications WHERE CAST(id AS TEXT) LIKE '${fxLike('rauth')}' OR CAST(applicant_id AS TEXT) LIKE '${fxLike('rauth')}'`);
  await query(`DELETE FROM local_job_postings WHERE CAST(employer_id AS TEXT) LIKE '${fxLike('rauth')}'`);
  await query(`DELETE FROM local_job_postings WHERE CAST(id AS TEXT) LIKE '${fxLike('rauth')}'`);
  await query(`DELETE FROM medical_doctors WHERE CAST(id AS TEXT) LIKE '${fxLike('rauth')}'`);
  await query(`DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE CAST(user_id AS TEXT) LIKE '${fxLike('rauth')}')`);
  await query(`DELETE FROM wallets WHERE CAST(user_id AS TEXT) LIKE '${fxLike('rauth')}'`);
  await query(`DELETE FROM orders WHERE CAST(id AS TEXT) LIKE '${fxLike('rauth')}'`);
  await query(`DELETE FROM delivery_agents WHERE CAST(user_id AS TEXT) LIKE '${fxLike('rauth')}'`);
  await query(`DELETE FROM universal_catalog_items WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('rauth')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('rauth')}'`);
  await query(`DELETE FROM admin_roles WHERE CAST(user_id AS TEXT) LIKE '${fxLike('rauth')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('rauth')}'`);
}

beforeAll(async () => {
  await cleanup();
  const people = [
    [OWNER, '9877000001', 'shop_owner'], [RIVAL, '9877000002', 'shop_owner'], [CUSTOMER, '9877000003', 'user'],
    [RIDER, '9877000004', 'delivery_agent'], [ADMIN, '9877000005', 'super_admin'],
  ];
  for (const [id, phone, role] of people) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, `RA ${id}`, phone, role]);
  }
  for (const [id, owner] of [[SHOP, OWNER], [RIVAL_SHOP, RIVAL]]) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude)
       VALUES ($1, $2, 'RA Shop', 'Grocery', 'Test Address', 'POINT(73.87 18.53)', 18.53, 73.87)`,
      [id, owner]
    );
  }

  // An approved rider: an application an administrator has set to 'active'.
  await query(
    `INSERT INTO delivery_agents (id, user_id, vehicle_type, kyc_status, status) VALUES ('${fx('rauth-agent')}', $1, 'motorcycle', 'active', 'offline')`,
    [RIDER]
  );

  app = express();
  app.use(express.json());
  app.use('/universal-catalog', require('../../routes/universal-catalog.routes'));
  app.use('/delivery', require('../../modules/services/routes/delivery.routes'));
  app.use('/medical', require('../../modules/services/routes/medical.routes'));
  app.use('/advanced', require('../../modules/services/routes/advanced.routes'));
  app.use('/jobs', require('../../modules/services/routes/jobs.routes'));
  app.use('/shops', require('../../modules/ecommerce/routes/vendor-kyc.routes'));
  app.use('/group-buy', require('../../modules/ecommerce/routes/group-buying.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

describe("a shop's catalogue", () => {
  const add = (userId, shop, body) => request(app).post(`/universal-catalog/${shop}`).set(as(userId)).send(body);
  let itemId;

  test('is added to by its owner, with a real price', async () => {
    expect((await add(RIVAL, SHOP, { title: 'Planted', price: 1 })).status).toBe(403);
    expect((await add(CUSTOMER, SHOP, { title: 'Planted', price: 1 })).status).toBe(403);
    expect((await add(OWNER, SHOP, { title: 'Kettle' })).status).toBe(400);
    expect((await add(OWNER, SHOP, { title: 'Kettle', price: -10 })).status).toBe(400);
    expect((await add(OWNER, fx('rauth-no-such-shop'), { title: 'Kettle', price: 900 })).status).toBe(404);

    const ok = await add(OWNER, SHOP, { title: 'Kettle', price: 900, inventory_count: 4 });
    expect(ok.status).toBe(200);
    itemId = ok.body.itemId;
    expect(await queryMany('SELECT title, price FROM universal_catalog_items WHERE shop_id = $1', [SHOP]))
      .toEqual([{ title: 'Kettle', price: 900 }]);
  });

  test("another shop's owner cannot reprice or remove its items", async () => {
    const reprice = await request(app).put(`/universal-catalog/item/${itemId}`).set(as(RIVAL)).send({ price: 1 });
    expect(reprice.status).toBe(403);
    const remove = await request(app).delete(`/universal-catalog/item/${itemId}`).set(as(RIVAL));
    expect(remove.status).toBe(403);

    const item = await queryOne('SELECT price FROM universal_catalog_items WHERE id = $1', [itemId]);
    expect(item.price).toBe(900);
  });

  test('changing the stock does not blank the title and price', async () => {
    const res = await request(app).put(`/universal-catalog/item/${itemId}`).set(as(OWNER)).send({ inventory_count: 9 });
    expect(res.status).toBe(200);
    const item = await queryOne('SELECT title, price, inventory_count FROM universal_catalog_items WHERE id = $1', [itemId]);
    expect(item).toEqual({ title: 'Kettle', price: 900, inventory_count: 9 });

    expect((await request(app).put(`/universal-catalog/item/${itemId}`).set(as(OWNER)).send({ price: 'free' })).status).toBe(400);
    expect((await request(app).put(`/universal-catalog/item/${itemId}`).set(as(OWNER)).send({})).status).toBe(400);
  });

  test('a bulk upload with one bad row adds nothing', async () => {
    const before = (await queryMany('SELECT id FROM universal_catalog_items WHERE shop_id = $1', [SHOP])).length;
    const res = await request(app).post(`/universal-catalog/${SHOP}/bulk`).set(as(OWNER))
      .send({ items: [{ title: 'Mug', price: 120 }, { title: 'Unpriced' }] });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Row 2/);
    expect((await queryMany('SELECT id FROM universal_catalog_items WHERE shop_id = $1', [SHOP])).length).toBe(before);

    expect((await request(app).post(`/universal-catalog/${SHOP}/bulk`).set(as(RIVAL)).send({ items: [{ title: 'Mug', price: 1 }] })).status).toBe(403);
  });

  test('without a model configured, no description is invented', async () => {
    const saved = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const res = await request(app).post('/universal-catalog/ai/generate-description').set(as(OWNER)).send({ title: 'Kettle' });
      expect(res.status).toBe(503);
      expect(res.body.description).toBeUndefined();
    } finally {
      if (saved !== undefined) process.env.GEMINI_API_KEY = saved;
    }
  });
});

describe('delivery jobs', () => {
  test('are listed and accepted by approved riders, not by any signed-in account', async () => {
    await query(
      `INSERT INTO orders (id, user_id, shop_id, total_amount, delivery_fee, payment_method, order_status, otp_code)
       VALUES ('${fx('rauth-order-ready')}', $1, $2, 200, 30, 'cod', 'ready', '1234')`,
      [CUSTOMER, SHOP]
    );

    // The list carries each customer's name, phone and address.
    expect((await request(app).get('/delivery/jobs').set(as(RIVAL))).status).toBe(403);
    const taken = await request(app).post(`/delivery/jobs/${fx('rauth-order-ready')}/accept`).set(as(RIVAL));
    expect(taken.status).toBe(403);
    expect((await queryOne(`SELECT assigned_agent_id FROM orders WHERE id = '${fx('rauth-order-ready')}'`)).assigned_agent_id).toBeNull();

    const jobs = await request(app).get('/delivery/jobs').set(as(RIDER));
    expect(jobs.status).toBe(200);
    expect(jobs.body.data.map((j) => j.id)).toContain(fx('rauth-order-ready'));
    expect((await request(app).post(`/delivery/jobs/${fx('rauth-order-ready')}/accept`).set(as(RIDER))).status).toBe(200);
  });

  test('applying to be a rider grants nothing until it is approved, and changes no role', async () => {
    const applied = await request(app).post('/delivery/onboarding').set(as(ADMIN)).send({ vehicleType: 'motorcycle', vehicleNumber: 'MH12AB1234' });
    expect(applied.status).toBe(200);
    // It used to set the applicant's role to delivery_agent on the spot — an
    // administrator who tried the form stopped being one.
    expect((await queryOne('SELECT role FROM users WHERE id = $1', [ADMIN])).role).toBe('super_admin');

    await request(app).post('/delivery/onboarding').set(as(OWNER)).send({ vehicleType: 'motorcycle' });
    expect((await queryOne('SELECT role FROM users WHERE id = $1', [OWNER])).role).toBe('shop_owner');
    const pending = await request(app).get('/delivery/jobs').set(as(OWNER));
    expect(pending.status).toBe(403);
    expect(pending.body.code).toBe('RIDER_NOT_APPROVED');
  });
});

describe('completing a delivery', () => {
  async function order(id, { agent = RIDER, status = 'out_for_delivery', otp = '4821', fee = 30 } = {}) {
    await query(
      `INSERT INTO orders (id, user_id, shop_id, total_amount, delivery_fee, payment_method, order_status, otp_code, assigned_agent_id)
       VALUES ($1, $2, $3, 200, $4, 'cod', $5, $6, $7)`,
      [id, CUSTOMER, SHOP, fee, status, otp, agent]
    );
  }
  const complete = (userId, id, otp, path = 'verify-otp') => request(app).post(`/delivery/jobs/${id}/${path}`).set(as(userId)).send({ otp });
  const statusOf = async (id) => (await queryOne('SELECT order_status FROM orders WHERE id = $1', [id])).order_status;
  const riderBalance = async () => {
    const wallet = await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [RIDER]);
    return wallet ? Number(wallet.balance) : 0;
  };

  test('needs the right code, from the assigned rider — on the old path too', async () => {
    await order(fx('rauth-order-1'));

    // What used to work: any account, any four digits.
    expect((await complete(CUSTOMER, fx('rauth-order-1'), '0000')).status).toBe(403);
    expect((await complete(RIDER, fx('rauth-order-1'), '0000')).status).toBe(403);
    expect(await statusOf(fx('rauth-order-1'))).toBe('out_for_delivery');

    const ok = await complete(RIDER, fx('rauth-order-1'), '4821');
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('DELIVERED');
    expect(await statusOf(fx('rauth-order-1'))).toBe('delivered');
  });

  test('pays the delivery fee once, however many times it is sent', async () => {
    await order(fx('rauth-order-2'), { fee: 45 });
    const before = await riderBalance();

    const results = await Promise.all([
      complete(RIDER, fx('rauth-order-2'), '4821', 'complete'),
      complete(RIDER, fx('rauth-order-2'), '4821', 'complete'),
      complete(RIDER, fx('rauth-order-2'), '4821'),
    ]);

    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await riderBalance()).toBe(before + 45);
  });
});

describe('administrative actions', () => {
  test('verifying a doctor, and listing them all, is for administrators', async () => {
    await query(
      `INSERT INTO medical_doctors (id, name, specialization, hospital_name, phone, is_verified) VALUES ('${fx('rauth-doctor')}', 'Dr Test', 'General', 'Test Clinic', '9877000099', '0')`
    );

    const self = await request(app).put(`/medical/admin/doctors/${fx('rauth-doctor')}/verify`).set(as(CUSTOMER)).send({ is_verified: true });
    expect(self.status).toBe(403);
    expect((await queryOne(`SELECT is_verified FROM medical_doctors WHERE id = '${fx('rauth-doctor')}'`)).is_verified).toBe(0);

    expect((await request(app).get('/medical/admin/records')).status).toBe(401);
    expect((await request(app).get('/medical/admin/records').set(as(CUSTOMER))).status).toBe(403);

    const admin = await request(app).put(`/medical/admin/doctors/${fx('rauth-doctor')}/verify`).set(as(ADMIN)).send({ is_verified: true });
    expect(admin.status).toBe(200);
    expect((await queryOne(`SELECT is_verified FROM medical_doctors WHERE id = '${fx('rauth-doctor')}'`)).is_verified).toBe(1);
  });

  test("a shop's KYC record is for its owner, and an administrator can review", async () => {
    expect((await request(app).get(`/shops/${SHOP}/kyc`).set(as(RIVAL))).status).toBe(403);
    expect((await request(app).get(`/shops/${SHOP}/kyc`).set(as(OWNER))).status).toBe(200);
    expect((await request(app).post(`/shops/${SHOP}/kyc/verify-gst`).set(as(RIVAL)).send({ gst_number: '27AAPFU0939F1ZV' })).status).toBe(403);

    // Stored roles are lower case; the check compared against upper case and refused every admin.
    const pending = await request(app).get('/shops/admin/pending').set(as(ADMIN));
    expect(pending.status).toBe(200);
    expect((await request(app).get('/shops/admin/pending').set(as(OWNER))).status).toBe(403);
  });

  test('a group deal is published by the shop it is for', async () => {
    const deal = { title: 'Rice 10kg', min_buyers: 5, wholesale_price: 400, end_datetime: new Date(Date.now() + 86400000).toISOString() };
    expect((await request(app).post(`/group-buy/${SHOP}`).set(as(RIVAL)).send(deal)).status).toBe(403);
    expect((await request(app).post(`/group-buy/${SHOP}`).set(as(OWNER)).send({ ...deal, wholesale_price: 0 })).status).toBe(400);
    expect((await request(app).post(`/group-buy/${SHOP}`).set(as(OWNER)).send({ ...deal, end_datetime: '2020-01-01' })).status).toBe(400);
  });
});

describe('job applications', () => {
  test('an employer moves applications to their own postings only', async () => {
    for (const [id, employer] of [[fx('rauth-job-mine'), OWNER], [fx('rauth-job-theirs'), RIVAL]]) {
      await query(
        `INSERT INTO local_job_postings (id, employer_id, title, category, job_type, status)
         VALUES ($1, $2, 'Helper', 'retail', 'full_time', 'active')`,
        [id, employer]
      );
    }
    await query(`INSERT INTO job_applications (id, job_id, applicant_id, stage) VALUES ('${fx('rauth-app-mine')}', '${fx('rauth-job-mine')}', $1, 'applied')`, [CUSTOMER]);
    await query(`INSERT INTO job_applications (id, job_id, applicant_id, stage) VALUES ('${fx('rauth-app-theirs')}', '${fx('rauth-job-theirs')}', $1, 'applied')`, [CUSTOMER]);

    const res = await request(app).post('/advanced/jobs/employer/bulk-action').set(as(OWNER))
      .send({ application_ids: [fx('rauth-app-mine'), fx('rauth-app-theirs')], action: 'reject' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ updated: 1, skipped: 1 }));
    expect((await queryOne(`SELECT stage FROM job_applications WHERE id = '${fx('rauth-app-mine')}'`)).stage).toBe('rejected');
    expect((await queryOne(`SELECT stage FROM job_applications WHERE id = '${fx('rauth-app-theirs')}'`)).stage).toBe('applied');

    const bogus = await request(app).post('/advanced/jobs/employer/bulk-action').set(as(OWNER))
      .send({ application_ids: [fx('rauth-app-mine')], action: 'promote-to-ceo' });
    expect(bogus.status).toBe(400);
  });
});

describe('the recruitment flow, end to end', () => {
  test('a job can be posted with a title and category alone, applied to, and seen by its employer', async () => {
    // Two things stopped this on a database built from the migrations: the
    // posting table required a salary range and an address the form does not,
    // and job_applications.job_id had a foreign key to a different jobs table,
    // so every application was rejected.
    const posted = await request(app).post('/jobs/postings').set(as(OWNER)).send({ title: 'Counter staff', category: 'retail' });
    expect(posted.status).toBeLessThan(300);
    const job = await queryOne("SELECT id FROM local_job_postings WHERE employer_id = $1 AND title = 'Counter staff'", [OWNER]);
    expect(job).not.toBeNull();

    const applied = await request(app).post('/jobs/apply').set(as(CUSTOMER)).send({ jobId: job.id, cover_note: 'Available immediately' });
    expect(applied.status).toBe(201);
    const stored = await queryOne('SELECT job_id, applicant_id, stage FROM job_applications WHERE id = $1', [applied.body.applicationId]);
    expect(stored).toEqual({ job_id: job.id, applicant_id: CUSTOMER, stage: 'applied' });

    // The employer dashboard read a table nothing writes to, and was always empty.
    const dashboard = await request(app).get('/advanced/jobs/employer/dashboard').set(as(OWNER));
    expect(dashboard.status).toBe(200);
    expect(JSON.stringify(dashboard.body)).toContain('Counter staff');
  });
});
