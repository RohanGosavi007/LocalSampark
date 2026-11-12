/**
 * C10 in the app: asking to return a delivered order, with photos, and
 * following the request (src/services/orders.js).
 */
const fs = require('fs');
const path = require('path');
const { RETURN_REASONS, validateReturn, requestReturn, myReturns, uploadReturnPhoto } = require('../src/services/orders');

const SERVER_CODES = ['wrong_item', 'damaged', 'spoiled_or_expired', 'missing_items', 'quality_issue', 'not_as_described', 'other'];
const ORDER = { id: 'o1', shopId: 's1', status: 'delivered' };

test('[C10.7] the app offers exactly the server\'s reason codes, and checks a request before sending it', () => {
  expect(RETURN_REASONS.map(([c]) => c).sort()).toEqual([...SERVER_CODES].sort());
  expect(validateReturn({ reasonCode: 'damaged' })).toBeNull();
  expect(validateReturn({ reasonCode: 'other', reason: '  ' })).toMatch(/what went wrong/);
  expect(validateReturn({ reasonCode: 'nope' })).toMatch(/Choose/);
  expect(validateReturn({ reasonCode: 'damaged', photos: Array(6).fill({ uri: 'file:///p.jpg' }) })).toMatch(/5 photos/);
  expect(validateReturn({ reasonCode: 'damaged', returnType: 'swap' })).toMatch(/refund or a replacement/);
});

test('[C10.8] photos are uploaded as return photos, then the request is sent with their links', async () => {
  const fetch = jest.fn(async () => ({ ok: true, json: async () => ({ url: `https://cdn.example/r/${fetch.mock.calls.length}.jpg` }) }));
  const apiPost = jest.fn().mockResolvedValue({ success: true, data: { id: 'r1', status: 'pending_review' } });
  await requestReturn(ORDER, { returnType: 'replacement', reasonCode: 'damaged', reason: ' Cracked ', photos: [{ uri: 'file:///a.jpg' }, { uri: 'file:///b.jpg' }] },
    { fetch, headers: async () => ({ Authorization: 'Bearer t', 'Content-Type': 'application/json' }), api: { apiPost } });
  expect(fetch).toHaveBeenCalledTimes(2);
  const [url, init] = fetch.mock.calls[0];
  expect(url).toMatch(/\/upload$/);
  expect(init.headers).toEqual({ Authorization: 'Bearer t' });
  expect(apiPost).toHaveBeenCalledWith('/orders/o1/returns', {
    returnType: 'replacement', reasonCode: 'damaged', reason: 'Cracked',
    evidenceUrls: ['https://cdn.example/r/1.jpg', 'https://cdn.example/r/2.jpg'],
  });
  const failing = jest.fn(async () => ({ ok: false, json: async () => ({ error: 'Too large' }) }));
  await expect(uploadReturnPhoto('o1', { uri: 'file:///x.jpg' }, { fetch: failing, headers: async () => ({}) })).rejects.toThrow(/Too large/);
  await expect(requestReturn(ORDER, { reasonCode: 'other', reason: '' }, { api: { apiPost } })).rejects.toThrow(/what went wrong/);
});

test('[C10.9] the order screen shows the request and where it stands', async () => {
  const apiGet = jest.fn().mockResolvedValue({ success: true, data: [{ order_id: 'o1', status: 'pending_review' }] });
  await expect(myReturns({ apiGet })).resolves.toEqual([{ order_id: 'o1', status: 'pending_review' }]);
  expect(apiGet).toHaveBeenCalledWith('/orders/returns/mine');
  const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'orders', 'track', '[id].js'), 'utf8');
  expect(screen).toMatch(/order\.status === 'delivered' \? <ReturnRequest/);
  expect(screen).toMatch(/RETURN_STATUS\[existing\.status\]/);
});

test('[C10.13] a cash return can name a UPI ID, and the screen says where the refund stands while the wallet is off', async () => {
  const { refundText } = require('../src/services/orders');
  expect(validateReturn({ reasonCode: 'damaged', refundUpi: 'meera@okbank' })).toBeNull();
  expect(validateReturn({ reasonCode: 'damaged', refundUpi: 'meera at bank' })).toMatch(/UPI ID/);

  const apiPost = jest.fn().mockResolvedValue({ success: true });
  await requestReturn(ORDER, { reasonCode: 'damaged', refundUpi: ' meera@okbank ' }, { api: { apiPost } });
  expect(apiPost.mock.calls[0][1]).toMatchObject({ refundUpi: 'meera@okbank' });

  expect(refundText({ refund_amount: 250, refund_channel: 'manual_payout', payout_status: 'pending', refund_upi: 'meera@okbank' }))
    .toBe('₹250 will be sent to meera@okbank; our team will tell you when it is.');
  expect(refundText({ refund_amount: 250, refund_channel: 'manual_payout', payout_status: 'paid', refund_upi: 'meera@okbank', payout_reference: 'UPI123' }))
    .toBe('₹250 sent to meera@okbank (reference UPI123).');
  expect(refundText({ refund_amount: 99, refund_channel: 'wallet' })).toMatch(/wallet/);
  expect(refundText({ refund_amount: 99, refund_channel: 'source_gateway', refund_reference_id: null })).toMatch(/is being refunded/);
});
