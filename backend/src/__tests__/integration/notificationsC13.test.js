/**
 * C13: the inbox, the customer's settings, and what is sent on each channel.
 *
 *   - GET /notifications carries the ids a client routes on (an order opens
 *     the order), and read/unread is the customer's own;
 *   - GET/PUT /notifications/preferences (migration 140), shared by web and app;
 *   - promotions turned off are not delivered; push turned off is not pushed;
 *     order updates are always kept in the inbox;
 *   - the order email goes out within the customer's settings, escapes what
 *     customers and shops typed, and links to a page that exists.
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const notifications = require('../../modules/core/services/notification.service');
const push = require('../../services/push.service');

const ME = fx('c13n-me');
const OTHER = fx('c13n-other');
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query(`DELETE FROM shop_notifications WHERE CAST(recipient_id AS TEXT) LIKE '${fxLike('c13n')}'`);
  await query(`DELETE FROM notification_preferences WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c13n')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('c13n')}'`);
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role, email) VALUES ($1, 'Inbox Owner', '9833333001', 'user', 'inbox@example.com')", [ME]);
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Someone Else', '9833333002', 'user')", [OTHER]);
  app = express();
  app.use(express.json());
  app.use('/notifications', require('../../modules/core/routes/notification.routes'));
  app.use(require('../../middleware/error.middleware').errorHandler);
});

beforeEach(async () => {
  await query(`DELETE FROM shop_notifications WHERE CAST(recipient_id AS TEXT) LIKE '${fxLike('c13n')}'`);
  await query(`DELETE FROM notification_preferences WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c13n')}'`);
});

afterEach(() => jest.restoreAllMocks());
afterAll(cleanup);

const inbox = async (userId) => (await request(app).get('/notifications').set(as(userId))).body.data;

test('[C13.4] the inbox carries what a notification opens, and read/unread is the customer\'s own', async () => {
  const orderId = fx('c13n-order');
  await notifications.sendToUser(ME, { type: 'order_update', title: 'Order placed', body: 'b', data: { orderId }, actionUrl: `/order-tracking?id=${orderId}` });
  await notifications.sendToUser(ME, { type: 'system', title: 'Second', body: 'b' });
  await notifications.sendToUser(OTHER, { type: 'system', title: 'Not mine', body: 'b' });

  const mine = await inbox(ME);
  expect(mine.map((n) => n.title).sort()).toEqual(['Order placed', 'Second']);
  const order = mine.find((n) => n.title === 'Order placed');
  expect(order).toMatchObject({ isRead: false, actionUrl: `/order-tracking?id=${orderId}`, data: { orderId } });

  // Marking someone else's notification read does nothing to it.
  const theirs = (await inbox(OTHER))[0];
  await request(app).put(`/notifications/${theirs.id}/read`).set(as(ME));
  expect((await inbox(OTHER))[0].isRead).toBe(false);

  await request(app).put(`/notifications/${order.id}/read`).set(as(ME));
  expect((await inbox(ME)).filter((n) => n.isRead).map((n) => n.title)).toEqual(['Order placed']);
  await request(app).put('/notifications/read-all').set(as(ME));
  expect((await inbox(ME)).every((n) => n.isRead)).toBe(true);
  expect((await inbox(OTHER))[0].isRead).toBe(false);
});

test('[C13.5] settings start all on, change one at a time, and refuse anything that is not true or false', async () => {
  const start = await request(app).get('/notifications/preferences').set(as(ME));
  expect(start.body.preferences).toEqual({ orderUpdates: true, promotions: true, push: true, email: true });

  const off = await request(app).put('/notifications/preferences').set(as(ME)).send({ promotions: false });
  expect(off.body.preferences).toEqual({ orderUpdates: true, promotions: false, push: true, email: true });
  const pushOff = await request(app).put('/notifications/preferences').set(as(ME)).send({ push: false });
  expect(pushOff.body.preferences).toEqual({ orderUpdates: true, promotions: false, push: false, email: true });
  expect((await request(app).get('/notifications/preferences').set(as(ME))).body.preferences.push).toBe(false);
  // Someone else's settings are untouched.
  expect((await request(app).get('/notifications/preferences').set(as(OTHER))).body.preferences.promotions).toBe(true);

  expect((await request(app).put('/notifications/preferences').set(as(ME)).send({ promotions: 'no' })).status).toBe(400);
  expect((await request(app).put('/notifications/preferences').set(as(ME)).send({})).status).toBe(400);
  expect((await request(app).get('/notifications/preferences')).status).toBe(401);
});

test('[C13.6] with promotions off a promotion is not delivered; an order update still is', async () => {
  await request(app).put('/notifications/preferences').set(as(ME)).send({ promotions: false });
  const pushed = jest.spyOn(push, 'sendToUser').mockResolvedValue(undefined);
  await notifications.sendToUser(ME, { type: 'promotion', title: '20% off', body: 'b' });
  await notifications.sendToUser(ME, { type: 'order_update', title: 'Order placed', body: 'b' });
  expect((await inbox(ME)).map((n) => n.title)).toEqual(['Order placed']);
  expect(pushed.mock.calls.map(([, msg]) => msg.title)).toEqual(['Order placed']);
});

test('[C13.7] [P5.1] push off, or order updates off, keeps the inbox but sends nothing to the phone', async () => {
  const pushed = jest.spyOn(push, 'sendToUser').mockResolvedValue(undefined);
  await notifications.sendToUser(ME, { type: 'order_update', title: 'One', body: 'b' });
  expect(pushed).toHaveBeenCalledTimes(1);

  await request(app).put('/notifications/preferences').set(as(ME)).send({ push: false });
  await notifications.sendToUser(ME, { type: 'order_update', title: 'Two', body: 'b' });
  await request(app).put('/notifications/preferences').set(as(ME)).send({ push: true, orderUpdates: false });
  await notifications.sendToUser(ME, { type: 'order_update', title: 'Three', body: 'b' });
  await notifications.sendToUser(ME, { type: 'system', title: 'Four', body: 'b' });

  expect(pushed.mock.calls.map(([, msg]) => msg.title)).toEqual(['One', 'Four']);
  expect((await inbox(ME)).map((n) => n.title).sort()).toEqual(['Four', 'One', 'Three', 'Two']);
});

test('[C13.8] [P5.1] the order email goes to the customer within their settings', async () => {
  const email = require('../../modules/core/services/email.service');
  const sent = jest.spyOn(email, 'sendOrderConfirmation').mockResolvedValue({ success: true });
  jest.spyOn(push, 'sendToUser').mockResolvedValue(undefined);
  const { orderPlaced } = require('../../services/orderEvents.service');
  const order = { id: fx('c13n-o1'), user_id: ME, shop_id: fx('c13n-no-shop'), total_amount: 150, order_status: 'pending' };

  await orderPlaced({ order, shop: { name: 'Shop' }, user: null });
  expect(sent).toHaveBeenCalledTimes(1);
  expect(sent.mock.calls[0][0].email).toBe('inbox@example.com');

  await request(app).put('/notifications/preferences').set(as(ME)).send({ email: false });
  await orderPlaced({ order: { ...order, id: fx('c13n-o2') }, shop: { name: 'Shop' }, user: null });
  expect(sent).toHaveBeenCalledTimes(1);
});

test('[C13.9] the order email escapes names and links to the order page that exists', async () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'm1' });
  const before = process.env.SMTP_USER;
  process.env.SMTP_USER = 'mailer@example.com';
  try {
    let email;
    jest.isolateModules(() => {
      jest.doMock('nodemailer', () => ({ createTransport: () => ({ sendMail }) }));
      email = require('../../modules/core/services/email.service');
    });
    const order = { id: 'e2e00000-0000-4000-8000-0000000000b1', total_amount: 150, order_status: 'pending', fulfillment_method: 'delivery' };
    await email.sendOrderConfirmation({ email: 'c@example.com', full_name: '<img src=x onerror=alert(1)>' }, order, { name: 'Shop & "Co"' });
    const { html, subject } = sendMail.mock.calls[0][0];
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('Shop &amp; &quot;Co&quot;');
    expect(html).toContain('/order-tracking?id=e2e00000-0000-4000-8000-0000000000b1');
    expect(html).not.toMatch(/\/order-tracking\/e2e/);
    expect(html).toContain('Home delivery');
    expect(subject).toMatch(/placed/);
  } finally {
    if (before === undefined) delete process.env.SMTP_USER; else process.env.SMTP_USER = before;
    jest.dontMock('nodemailer');
  }
});
