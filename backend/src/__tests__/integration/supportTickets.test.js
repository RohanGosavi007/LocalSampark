/**
 * Customer support and statutory grievances (C14, F-146).
 *
 * The order a ticket is about used to be accepted and dropped, a ticket could
 * name any order, and the customer's ticket list never showed the support
 * team's answer.
 */
const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';
const id = () => crypto.randomUUID();
const CUSTOMER = id();
const OTHER = id();
const ADMIN = id();
const SHOP = id();
const ORDER = id();
const OTHERS_ORDER = id();

const token = (userId, role) => jwt.sign({ userId, id: userId, role, tokenVersion: 0 }, getJwtSecret(), { expiresIn: '1h' });
let app;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/support', require('../../modules/core/routes/support.routes'));
  app.use('/admin/commerce', require('../../modules/crm/routes/admin-commerce.routes'));

  for (const [uid, phone, role] of [[CUSTOMER, '+917711000001', 'user'], [OTHER, '+917711000002', 'user'], [ADMIN, '+917711000003', 'super_admin']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role, is_active) VALUES ($1, $2, $3, $4, true)', [uid, `Support ${role}`, phone, role]);
  }
  await query(
    `INSERT INTO local_shops (id, name, owner_id, phone, category, address, latitude, longitude, coordinate, pincode, is_active, is_verified, approval_status)
     VALUES ($1, 'Support Test Shop', $2, '+917711000010', 'grocery', 'Dhanori', 18.58, 73.89, 'POINT(73.89 18.58)', '411015', true, true, 'approved')`,
    [SHOP, ADMIN]
  );
  for (const [oid, uid] of [[ORDER, CUSTOMER], [OTHERS_ORDER, OTHER]]) {
    await query(
      `INSERT INTO orders (id, user_id, shop_id, subtotal, total_amount, delivery_fee, delivery_address, payment_method, payment_status, order_status, status, fulfillment_method, created_at)
       VALUES ($1, $2, $3, 100, 120, 20, 'Dhanori', 'cod', 'pending', 'delivered', 'delivered', 'delivery', ${NOW})`,
      [oid, uid, SHOP]
    );
  }
});

afterAll(async () => {
  delete process.env.GRIEVANCE_OFFICER_NAME;
  await query('DELETE FROM shop_notifications WHERE recipient_id IN ($1, $2)', [CUSTOMER, OTHER]);
  await query('DELETE FROM admin_audit_log WHERE admin_id = $1', [ADMIN]);
  await query('DELETE FROM support_tickets WHERE user_id IN ($1, $2)', [CUSTOMER, OTHER]);
  await query('DELETE FROM orders WHERE id IN ($1, $2)', [ORDER, OTHERS_ORDER]);
  await query('DELETE FROM local_shops WHERE id = $1', [SHOP]);
  await query('DELETE FROM users WHERE id IN ($1, $2, $3)', [CUSTOMER, OTHER, ADMIN]);
});

const asCustomer = (method, path) => request(app)[method](path).set('Authorization', `Bearer ${token(CUSTOMER, 'user')}`);

describe('support tickets', () => {
  let ticketId;

  it('[C14.5] keeps the order a ticket is about', async () => {
    const res = await asCustomer('post', '/support/tickets').send({
      orderId: ORDER, subject: 'Paneer missing', description: 'One packet of paneer was not in the bag', category: 'order',
    });
    expect(res.status).toBe(201);
    expect(res.body.ticket.orderId).toBe(ORDER);
    ticketId = res.body.ticket.id;
    const row = await queryOne('SELECT order_id FROM support_tickets WHERE id = $1', [ticketId]);
    expect(String(row.order_id)).toBe(ORDER);
  });

  it('[C14.6] a ticket cannot be pinned to someone else\'s order', async () => {
    const res = await asCustomer('post', '/support/tickets').send({
      orderId: OTHERS_ORDER, subject: 'x', description: 'y', category: 'order',
    });
    expect(res.status).toBe(404);
  });

  it('[C14.7] rejects an unknown category and an over-long subject', async () => {
    expect((await asCustomer('post', '/support/tickets').send({ subject: 's', description: 'd', category: 'whatever' })).status).toBe(400);
    expect((await asCustomer('post', '/support/tickets').send({ subject: 'x'.repeat(201), description: 'd' })).status).toBe(400);
  });

  it('[C14.8] the customer sees the support team\'s resolution on their ticket', async () => {
    const reply = 'A replacement packet will be delivered today.';
    const resolved = await request(app)
      .put(`/admin/commerce/grievances/${ticketId}`)
      .set('Authorization', `Bearer ${token(ADMIN, 'super_admin')}`)
      .send({ status: 'resolved', resolution: reply });
    expect(resolved.status).toBe(200);

    const mine = await asCustomer('get', '/support/tickets/my');
    const ticket = mine.body.tickets.find((t) => t.id === ticketId);
    expect(ticket).toMatchObject({ status: 'resolved', resolution: reply, orderId: ORDER });
    expect(ticket.resolvedAt).toBeTruthy();
  });

  it('[C14.9] the grievance officer is configuration, not code', async () => {
    process.env.GRIEVANCE_OFFICER_NAME = 'Configured Officer';
    const res = await request(app).get('/support/grievance-officer');
    expect(res.body.grievanceOfficer.name).toBe('Configured Officer');
    expect(res.body.grievanceOfficer.slaHoursAcknowledgement).toBe(48);
    delete process.env.GRIEVANCE_OFFICER_NAME;
  });
});
