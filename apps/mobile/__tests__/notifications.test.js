/**
 * C13 in the app: a notification opens what it is about, a tapped push does
 * too, and the customer's settings are read and saved.
 */
const fs = require('fs');
const path = require('path');
const { notificationTarget, pushTarget, notificationKind } = require('../src/services/notificationLinks');
const { PREFS, loadPrefs, savePref } = require('../src/services/notificationPrefs');

const APP = path.join(__dirname, '..', 'app');

test('[C13.10] a notification opens the screen it is about', () => {
  const id = 'e2e00000-0000-4000-8000-0000000000b1';
  // From the ids the server puts in data, and from the web links it writes.
  expect(notificationTarget({ data: { orderId: id } })).toBe(`/orders/track/${id}`);
  expect(notificationTarget({ data: JSON.stringify({ orderId: id }) })).toBe(`/orders/track/${id}`);
  expect(notificationTarget({ actionUrl: `/order-tracking?id=${id}` })).toBe(`/orders/track/${id}`);
  expect(notificationTarget({ actionUrl: `/order-tracking/${id}` })).toBe(`/orders/track/${id}`);
  expect(notificationTarget({ actionUrl: '/order-tracking' })).toBe('/orders');
  expect(notificationTarget({ actionUrl: '/support' })).toBe('/support');
  expect(notificationTarget({ actionUrl: '/shops/s-1' })).toBe('/modules/shop/s-1');
  expect(notificationTarget({ actionUrl: '/shop-dashboard' })).toBe('/modules/shop-dashboard');
  expect(notificationTarget({ actionUrl: 'https://elsewhere.example' })).toBeNull();
  expect(notificationTarget(null)).toBeNull();
  // Every route named here exists in the app.
  for (const file of ['orders/track/[id].js', 'orders/index.js', 'support/index.js', 'modules/shop/[id].js', 'modules/shop-dashboard/index.js']) {
    expect(fs.existsSync(path.join(APP, file))).toBe(true);
  }
  expect(notificationKind('order_update')).toBe('order');
  expect(notificationKind('flash_sale')).toBe('promotion');
});

test('[C13.11] a tapped push opens its order, and the app handles taps from start-up', () => {
  const id = 'e2e00000-0000-4000-8000-0000000000c1';
  expect(pushTarget({ data: { orderId: id, type: 'order_update', actionUrl: `/order-tracking?id=${id}` } })).toBe(`/orders/track/${id}`);
  expect(pushTarget({ data: {} })).toBeNull();

  const layout = fs.readFileSync(path.join(APP, '_layout.js'), 'utf8');
  expect(layout).toMatch(/<NotificationTapHandler \/>/);
  const handler = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'NotificationTapHandler.js'), 'utf8');
  expect(handler).toMatch(/addNotificationResponseReceivedListener/);
  expect(handler).toMatch(/getLastNotificationResponseAsync/);
  const inbox = fs.readFileSync(path.join(APP, 'modules', 'notifications', 'index.js'), 'utf8');
  expect(inbox).toMatch(/notificationTarget\(item\)/);
  expect(inbox).not.toMatch(/Add navigation logic/);
});

test('[C13.12] settings are read from and saved to the server', async () => {
  const apiGet = jest.fn().mockResolvedValue({ success: true, preferences: { orderUpdates: true, promotions: true, push: true, email: true } });
  await expect(loadPrefs({ apiGet })).resolves.toMatchObject({ promotions: true });
  expect(apiGet).toHaveBeenCalledWith('/notifications/preferences');

  const apiPut = jest.fn().mockResolvedValue({ success: true, preferences: { orderUpdates: true, promotions: false, push: true, email: true } });
  await expect(savePref('promotions', false, { apiPut })).resolves.toMatchObject({ promotions: false });
  expect(apiPut).toHaveBeenCalledWith('/notifications/preferences', { promotions: false });
  await expect(savePref('everything', false, { apiPut })).rejects.toThrow(/Unknown setting/);
  expect(PREFS.map((p) => p.key)).toEqual(['orderUpdates', 'promotions', 'push', 'email']);
});
