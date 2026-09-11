/**
 * Shop payout / commission arithmetic.
 *
 * The pre-launch audit measured 3.7% branch coverage across the backend, and the
 * money paths were the worst of it — the pre-existing wallet test asserts that a
 * SQL string the test itself declares contains a substring, so it exercises no
 * application code at all.
 *
 * These tests drive the real PayoutService.calculateShopPayout with the database
 * mocked, and assert on the money rather than on the shape of a query string.
 */
const { query, queryMany } = require('../src/config/database');

jest.mock('../src/config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  queryMany: jest.fn(),
  queryOne: jest.fn(),
  pool: { query: jest.fn() },
}));

const PayoutService = require('../src/services/payout.service');

/** Pull the values written into shop_payouts by the call under test. */
function payoutInsert() {
  const call = query.mock.calls.find((c) => /INSERT INTO shop_payouts/i.test(c[0]));
  if (!call) return null;
  const p = call[1];
  return {
    grossGMV: parseFloat(p[4]),
    totalOrders: p[5],
    platformCommission: parseFloat(p[6]),
    commissionRate: p[7],
    gatewayFee: parseFloat(p[8]),
    deliveryDeductions: parseFloat(p[9]),
    gstOnCommission: parseFloat(p[10]),
    tds: parseFloat(p[11]),
    netPayout: parseFloat(p[12]),
  };
}

function lineItems() {
  return query.mock.calls
    .filter((c) => /INSERT INTO payout_line_items/i.test(c[0]))
    .map((c) => ({
      orderAmount: parseFloat(c[1][3]),
      commission: parseFloat(c[1][4]),
      gatewayFee: parseFloat(c[1][5]),
      net: parseFloat(c[1][6]),
    }));
}

const P0 = '2026-08-01';
const P1 = '2026-09-01';

beforeEach(() => {
  jest.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
});

describe('calculateShopPayout — core arithmetic', () => {
  it('returns null when the shop had no delivered orders', async () => {
    queryMany.mockResolvedValue([]);
    const result = await PayoutService.calculateShopPayout('shop_1', P0, P1);
    expect(result).toBeNull();
    // Nothing should be written for an empty period.
    expect(query).not.toHaveBeenCalled();
  });

  it('computes commission on the full order value, delivery fee included', async () => {
    queryMany.mockResolvedValue([
      { id: 'o1', total_amount: '1000', delivery_fee: '40', payment_method: 'razorpay' },
    ]);
    await PayoutService.calculateShopPayout('shop_1', P0, P1, 10);
    const p = payoutInsert();

    expect(p.grossGMV).toBeCloseTo(1000, 2);
    expect(p.deliveryDeductions).toBeCloseTo(40, 2);
    // 10% of the full 1000, delivery fee included
    expect(p.platformCommission).toBeCloseTo(100, 2);
    // 2% gateway fee is charged on the FULL gross, not the net
    expect(p.gatewayFee).toBeCloseTo(20, 2);
    // 18% GST on the commission
    expect(p.gstOnCommission).toBeCloseTo(18, 2);
    expect(p.netPayout).toBeCloseTo(1000 - 100 - 20 - 18, 2);
  });

  it('aggregates across multiple orders', async () => {
    queryMany.mockResolvedValue([
      { id: 'o1', total_amount: '500', delivery_fee: '20' },
      { id: 'o2', total_amount: '300', delivery_fee: '20' },
      { id: 'o3', total_amount: '200', delivery_fee: '0' },
    ]);
    await PayoutService.calculateShopPayout('shop_1', P0, P1, 10);
    const p = payoutInsert();

    expect(p.totalOrders).toBe(3);
    expect(p.grossGMV).toBeCloseTo(1000, 2);
    expect(p.deliveryDeductions).toBeCloseTo(40, 2);
    expect(p.platformCommission).toBeCloseTo(100, 2);
  });

  it('honours a non-default commission rate', async () => {
    queryMany.mockResolvedValue([{ id: 'o1', total_amount: '1000', delivery_fee: '0' }]);
    await PayoutService.calculateShopPayout('shop_1', P0, P1, 25);
    expect(payoutInsert().platformCommission).toBeCloseTo(250, 2);
  });

  it('defaults to a 10% rate when none is supplied', async () => {
    queryMany.mockResolvedValue([{ id: 'o1', total_amount: '1000', delivery_fee: '0' }]);
    await PayoutService.calculateShopPayout('shop_1', P0, P1);
    expect(payoutInsert().commissionRate).toBe(10.0);
  });

  it('treats a missing delivery_fee as zero rather than NaN', async () => {
    queryMany.mockResolvedValue([{ id: 'o1', total_amount: '1000' }]);
    await PayoutService.calculateShopPayout('shop_1', P0, P1, 10);
    const p = payoutInsert();
    expect(Number.isNaN(p.deliveryDeductions)).toBe(false);
    expect(p.deliveryDeductions).toBeCloseTo(0, 2);
    expect(p.platformCommission).toBeCloseTo(100, 2);
  });
});

describe('calculateShopPayout — TDS threshold branch', () => {
  // TDS applies at commission > 50000, i.e. GMV of 500,000 at 10%.
  it('does not deduct TDS below the threshold', async () => {
    queryMany.mockResolvedValue([{ id: 'o1', total_amount: '400000', delivery_fee: '0' }]);
    await PayoutService.calculateShopPayout('shop_1', P0, P1, 10);
    expect(payoutInsert().tds).toBeCloseTo(0, 2);
  });

  it('does not deduct TDS exactly at the threshold (strict >)', async () => {
    queryMany.mockResolvedValue([{ id: 'o1', total_amount: '500000', delivery_fee: '0' }]);
    await PayoutService.calculateShopPayout('shop_1', P0, P1, 10);
    const p = payoutInsert();
    expect(p.platformCommission).toBeCloseTo(50000, 2);
    expect(p.tds).toBeCloseTo(0, 2);
  });

  it('deducts 1% TDS above the threshold', async () => {
    queryMany.mockResolvedValue([{ id: 'o1', total_amount: '600000', delivery_fee: '0' }]);
    await PayoutService.calculateShopPayout('shop_1', P0, P1, 10);
    const p = payoutInsert();
    expect(p.platformCommission).toBeCloseTo(60000, 2);
    expect(p.tds).toBeCloseTo(600, 2);
  });
});

describe('calculateShopPayout — audit trail', () => {
  it('writes one line item per order', async () => {
    queryMany.mockResolvedValue([
      { id: 'o1', total_amount: '100', delivery_fee: '0' },
      { id: 'o2', total_amount: '200', delivery_fee: '0' },
    ]);
    await PayoutService.calculateShopPayout('shop_1', P0, P1, 10);
    expect(lineItems()).toHaveLength(2);
  });

  it('line items reconcile with the payout when there are no delivery fees', async () => {
    queryMany.mockResolvedValue([
      { id: 'o1', total_amount: '600', delivery_fee: '0' },
      { id: 'o2', total_amount: '400', delivery_fee: '0' },
    ]);
    await PayoutService.calculateShopPayout('shop_1', P0, P1, 10);
    const summed = lineItems().reduce((s, l) => s + l.commission, 0);
    expect(summed).toBeCloseTo(payoutInsert().platformCommission, 2);
  });

  it('line items reconcile with the payout even when delivery fees exist', async () => {
    // Regression guard for the reconciliation bug: the aggregate used to
    // charge on (grossGMV - deliveryFees) while line items charged on the full
    // total_amount, so the audit trail never tied out to the payout.
    queryMany.mockResolvedValue([
      { id: 'o1', total_amount: '1000', delivery_fee: '100' },
    ]);
    await PayoutService.calculateShopPayout('shop_1', P0, P1, 10);

    const aggregate = payoutInsert().platformCommission; // 10% of 1000 = 100
    const summed = lineItems().reduce((s, l) => s + l.commission, 0); // 10% of 1000 = 100

    expect(aggregate).toBeCloseTo(100, 2);
    expect(summed).toBeCloseTo(100, 2);
    expect(summed - aggregate).toBeCloseTo(0, 2);
  });
});

describe('calculateShopPayout — money safety', () => {
  it('never writes NaN into a monetary column', async () => {
    queryMany.mockResolvedValue([
      { id: 'o1', total_amount: null, delivery_fee: undefined },
      { id: 'o2', total_amount: '250', delivery_fee: '25' },
    ]);
    await PayoutService.calculateShopPayout('shop_1', P0, P1, 10);
    const p = payoutInsert();
    for (const [field, value] of Object.entries(p)) {
      expect(`${field}:${Number.isNaN(Number(value))}`).toBe(`${field}:false`);
    }
  });

  it('rounds every stored monetary value to 2 decimal places', async () => {
    queryMany.mockResolvedValue([{ id: 'o1', total_amount: '333.33', delivery_fee: '11.11' }]);
    await PayoutService.calculateShopPayout('shop_1', P0, P1, 7.5);
    const call = query.mock.calls.find((c) => /INSERT INTO shop_payouts/i.test(c[0]));
    for (const idx of [4, 6, 8, 9, 10, 11, 12]) {
      expect(String(call[1][idx])).toMatch(/^-?\d+\.\d{2}$/);
    }
  });
});
