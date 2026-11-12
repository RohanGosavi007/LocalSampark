/**
 * C11 in the app: rating a delivered order, and reporting a review.
 */
const fs = require('fs');
const path = require('path');
const { reviewOrder } = require('../src/services/orders');
const { reportReview, REPORT_REASONS } = require('../src/services/product');

const DELIVERED = { id: 'o 1', shopId: 's/1', status: 'delivered' };

test('[C11.5] a delivered order can be rated; anything else is refused before it is sent', async () => {
  const apiPost = jest.fn().mockResolvedValue({ success: true });
  await reviewOrder(DELIVERED, 4, '  Crisp and fresh  ', { apiPost });
  expect(apiPost).toHaveBeenCalledWith('/shops/s%2F1/orders/o%201/review', { rating: 4, review: 'Crisp and fresh' });
  await reviewOrder(DELIVERED, 5, '', { apiPost });
  expect(apiPost).toHaveBeenLastCalledWith('/shops/s%2F1/orders/o%201/review', { rating: 5 });

  apiPost.mockClear();
  await expect(reviewOrder(DELIVERED, 0, 'x', { apiPost })).rejects.toThrow(/1 to 5/);
  await expect(reviewOrder(DELIVERED, 4.5, 'x', { apiPost })).rejects.toThrow(/1 to 5/);
  await expect(reviewOrder({ ...DELIVERED, status: 'preparing' }, 5, 'x', { apiPost })).rejects.toThrow(/delivered/);
  expect(apiPost).not.toHaveBeenCalled();
});

test('[C11.6] a review is reported with a reason the server accepts', async () => {
  const SERVER = ['spam', 'offensive', 'fake', 'personal_information', 'off_topic', 'other'];
  for (const [reason] of REPORT_REASONS) expect(SERVER).toContain(reason);
  const apiPost = jest.fn().mockResolvedValue({ success: true });
  await reportReview('s1', 'r1', 'fake', { apiPost });
  expect(apiPost).toHaveBeenCalledWith('/shops/s1/reviews/r1/report', { reason: 'fake' });
  await expect(reportReview('s1', 'r1', 'because', { apiPost })).rejects.toThrow(/why/i);
});

test('[C11.7] the order screen offers a review on delivery, and the product screen a report on each review', () => {
  const track = fs.readFileSync(path.join(__dirname, '..', 'app', 'orders', 'track', '[id].js'), 'utf8');
  expect(track).toMatch(/order\.status === 'delivered' \? <RateOrder/);
  const product = fs.readFileSync(path.join(__dirname, '..', 'app', 'product', '[shopId]', '[productId].js'), 'utf8');
  expect(product).toMatch(/Report this review/);
  expect(product).toMatch(/reportReview\(product\.shopId, r\.id, reason\)/);
});
