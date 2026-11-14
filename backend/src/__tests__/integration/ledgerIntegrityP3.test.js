/**
 * P3 Double-entry ledger — the book of record, and that it stays one.
 *
 * P3.6  append-only: an entry cannot be edited or deleted (migration 149).
 * P3.7  all or nothing: a posting that fails part-way leaves nothing behind.
 * P3.8  once only: posting the same event twice, even at the same moment, counts it once.
 * P3.9  delivered orders are posted (before, only refunds ever reached the
 *       ledger): the customer's payment is split into what the shop is owed,
 *       the platform's earning and the rider's pay, and the entries balance.
 * P3.10 balances can be reproduced from the entries, and the trial balance is clean.
 */
const crypto = require('crypto');
const { query, queryOne, queryMany } = require('../../config/database');
const ledger = require('../../services/ledger.service');
const lifecycle = require('../../services/orderLifecycle.service');

const uid = () => crypto.randomUUID();
const SHOP = uid();
const OWNER = uid();
const BUYER = uid();
const RIDER = uid();
const ADMIN = uid();
const U = (id, role) => ({ id, role });

async function entriesFor(orderId) {
  return queryMany(
    'SELECT entry_type, account_type, account_id, amount_paise FROM platform_ledger_entries WHERE reference_type = $1 AND reference_id = $2 ORDER BY entry_type, account_type',
    ['ORDER_PAYMENT', orderId]
  );
}
const sum = (rows, type) => rows.filter((r) => r.entry_type === type).reduce((n, r) => n + Number(r.amount_paise), 0);
const find = (rows, type, account) => rows.find((r) => r.entry_type === type && r.account_type === account);

/** A delivered-able order with its commission terms, as checkout writes them. */
async function order({ status, method = 'COD', paid = 'unpaid', fulfillment = 'pickup', subtotal, delivery = 0, platformFee = 0, small = 0, discount = 0, riderPayout = 0, rider = null, commission = 0, convenience = 0, withTerms = true }) {
  const id = uid();
  const total = Math.max(0, subtotal + delivery + platformFee + small - discount);
  await query(
    `INSERT INTO orders (id, user_id, shop_id, subtotal, total_amount, delivery_fee, platform_fee, small_order_fee, discount, rider_payout,
                         status, order_status, payment_method, payment_status, fulfillment_method, assigned_agent_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [id, BUYER, SHOP, subtotal, total, delivery, platformFee, small, discount, riderPayout, status, status, method, paid, fulfillment, rider]
  );
  if (withTerms) {
    await query(
      `INSERT INTO shop_commissions (id, shop_id, order_id, order_type, gross_amount, commission_percent, commission_amount, convenience_fee, total_platform_earning, net_to_shop)
       VALUES ($1, $2, $3, 'product_order', $4, 5, $5, $6, $7, $8)`,
      [uid(), SHOP, id, subtotal, commission, convenience, commission + convenience, subtotal - commission - convenience]
    );
  }
  return id;
}

beforeAll(async () => {
  for (const [id, phone, role] of [[BUYER, '9844300001', 'user'], [OWNER, '9844300002', 'shop_owner'], [RIDER, '9844300003', 'delivery_agent'], [ADMIN, '9844300004', 'admin']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, `P3 ${role}`, phone, role]);
  }
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, delivery_available, is_verified)
     VALUES ($1, $2, 'P3 Shop', 'Grocery', 'Shop Road', 'POINT(73.87 18.53)', 18.53, 73.87, '1', '1')`,
    [SHOP, OWNER]
  );
  await query(`INSERT INTO delivery_agents (id, user_id, vehicle_type, kyc_status, cash_in_hand, status) VALUES ($1, $2, 'motorcycle', 'active', '0', 'on_delivery')`, [uid(), RIDER]);
});

afterAll(async () => {
  // The ledger is append-only: its rows stay (the ids above are new each run).
  await query('DELETE FROM shop_commissions WHERE shop_id = $1', [SHOP]);
  await query('DELETE FROM orders WHERE shop_id = $1', [SHOP]);
  await query('DELETE FROM delivery_agents WHERE user_id = $1', [RIDER]);
  await query('DELETE FROM local_shops WHERE id = $1', [SHOP]);
  await query('DELETE FROM users WHERE id IN ($1, $2, $3, $4)', [BUYER, OWNER, RIDER, ADMIN]);
});

describe('[P3.6] the ledger is append-only', () => {
  test('[P3.6] an entry cannot be changed or deleted, and the book is unchanged after the attempt', async () => {
    const acct = uid();
    const tx = await ledger.recordTransaction({
      referenceType: 'MANUAL_ADJUSTMENT', referenceId: uid(),
      entries: [{ entryType: 'DEBIT', accountType: 'CUSTOMER_CASH', accountId: acct, amountPaise: 1000 }, { entryType: 'CREDIT', accountType: 'SELLER_PAYABLE', accountId: acct, amountPaise: 1000 }],
    });
    await expect(query("UPDATE platform_ledger_entries SET amount_paise = 1 WHERE transaction_id = $1", [tx.transactionId])).rejects.toThrow(/append-only/i);
    await expect(query('DELETE FROM platform_ledger_entries WHERE transaction_id = $1', [tx.transactionId])).rejects.toThrow(/append-only/i);
    expect(Number((await ledger.getAccountBalance('SELLER_PAYABLE', acct)).balancePaise)).toBe(1000);
  });
});

describe('[P3.7] a posting is all or nothing', () => {
  test('[P3.7] if a later entry is refused, the earlier ones are not left behind', async () => {
    const transactionId = uid();
    await expect(ledger.recordTransaction({
      transactionId, referenceType: 'MANUAL_ADJUSTMENT', referenceId: uid(),
      entries: [{ entryType: 'DEBIT', accountType: 'CUSTOMER_CASH', accountId: uid(), amountPaise: 500 }, { entryType: 'CREDIT', accountType: 'NOT_AN_ACCOUNT', accountId: uid(), amountPaise: 500 }],
    })).rejects.toThrow();
    expect(await queryMany('SELECT 1 FROM platform_ledger_entries WHERE transaction_id = $1', [transactionId])).toHaveLength(0);
  });
});

describe('[P3.8] an event is posted once', () => {
  const post = (key, acct) => ledger.recordTransaction({
    referenceType: 'MANUAL_ADJUSTMENT', referenceId: key, postingKey: key,
    entries: [{ entryType: 'DEBIT', accountType: 'CUSTOMER_CASH', accountId: acct, amountPaise: 700 }, { entryType: 'CREDIT', accountType: 'SELLER_PAYABLE', accountId: acct, amountPaise: 700 }],
  });

  test('[P3.8] posting the same key again writes nothing and points at the first transaction', async () => {
    const key = `ONCE:${uid()}`;
    const acct = uid();
    const first = await post(key, acct);
    const again = await post(key, acct);
    expect(first.duplicate).toBe(false);
    expect(again).toMatchObject({ duplicate: true, transactionId: first.transactionId, entriesCount: 0 });
    expect(Number((await ledger.getAccountBalance('SELLER_PAYABLE', acct)).balancePaise)).toBe(700);
  });

  test('[P3.8] six at the same moment: exactly one posting', async () => {
    const key = `RACE:${uid()}`;
    const acct = uid();
    const results = await Promise.all(Array.from({ length: 6 }, () => post(key, acct).catch((e) => ({ error: e.message }))));
    expect(results.filter((r) => r.duplicate === false)).toHaveLength(1);
    expect(Number((await ledger.getAccountBalance('SELLER_PAYABLE', acct)).balancePaise)).toBe(700);
  });
});

describe('[P3.9] a delivered order is posted: where the customer’s money goes', () => {
  test('[P3.9] cash, collected by the shop at the counter: the shop is owed its net, the platform its commission', async () => {
    const id = await order({ status: 'ready', method: 'COD', subtotal: 200, commission: 10 });
    await lifecycle.changeStatus({ orderId: id, to: 'delivered', user: U(OWNER, 'shop_owner') });
    const rows = await entriesFor(id);
    expect(find(rows, 'DEBIT', 'CUSTOMER_CASH')).toMatchObject({ account_id: id, amount_paise: expect.anything() });
    expect(Number(find(rows, 'DEBIT', 'CUSTOMER_CASH').amount_paise)).toBe(20000);
    expect(Number(find(rows, 'CREDIT', 'SELLER_PAYABLE').amount_paise)).toBe(19000);
    expect(find(rows, 'CREDIT', 'SELLER_PAYABLE').account_id).toBe(SHOP);
    expect(Number(find(rows, 'CREDIT', 'PLATFORM_REVENUE_COMMISSION').amount_paise)).toBe(1000);
    expect(sum(rows, 'DEBIT')).toBe(sum(rows, 'CREDIT'));
  });

  test('[P3.9] a paid online order delivered by a platform rider: the delivery fee is split, the fees are the platform’s', async () => {
    const id = await order({ status: 'out_for_delivery', method: 'razorpay', paid: 'paid', fulfillment: 'delivery', subtotal: 500, delivery: 40, riderPayout: 30, platformFee: 5, small: 10, commission: 25, rider: RIDER });
    await lifecycle.changeStatus({ orderId: id, to: 'delivered', user: U(ADMIN, 'admin') });
    const rows = await entriesFor(id);
    expect(Number(find(rows, 'DEBIT', 'GATEWAY_RECEIVABLE').amount_paise)).toBe(55500); // 500 + 40 + 5 + 10
    expect(Number(find(rows, 'CREDIT', 'SELLER_PAYABLE').amount_paise)).toBe(47500); // 500 - 25
    expect(Number(find(rows, 'CREDIT', 'RIDER_PAYABLE').amount_paise)).toBe(3000);
    expect(find(rows, 'CREDIT', 'RIDER_PAYABLE').account_id).toBe(RIDER);
    expect(Number(find(rows, 'CREDIT', 'PLATFORM_REVENUE_DELIVERY_FEE').amount_paise)).toBe(1000); // 40 - 30
    expect(Number(find(rows, 'CREDIT', 'PLATFORM_REVENUE_COMMISSION').amount_paise)).toBe(4000); // 25 commission + 5 + 10 fees
    expect(sum(rows, 'DEBIT')).toBe(sum(rows, 'CREDIT'));
  });

  test('[P3.9] a discount the platform gave comes out of the platform’s earning, and the entries still balance', async () => {
    const id = await order({ status: 'ready', method: 'wallet', paid: 'paid', subtotal: 300, discount: 30, commission: 15 });
    await lifecycle.changeStatus({ orderId: id, to: 'delivered', user: U(OWNER, 'shop_owner') });
    const rows = await entriesFor(id);
    expect(find(rows, 'DEBIT', 'CUSTOMER_WALLET').account_id).toBe(BUYER); // a wallet is the customer's
    expect(Number(find(rows, 'DEBIT', 'CUSTOMER_WALLET').amount_paise)).toBe(27000);
    expect(Number(find(rows, 'CREDIT', 'SELLER_PAYABLE').amount_paise)).toBe(28500); // the shop is still owed its net on the full 300
    expect(find(rows, 'CREDIT', 'PLATFORM_REVENUE_COMMISSION')).toBeUndefined();
    expect(Number(find(rows, 'DEBIT', 'PLATFORM_REVENUE_COMMISSION').amount_paise)).toBe(1500); // 15 commission - 30 discount
    expect(sum(rows, 'DEBIT')).toBe(sum(rows, 'CREDIT'));
  });

  test('[P3.9] an order with no commission row is booked with the shop owed its subtotal; a free order posts nothing', async () => {
    const plain = await order({ status: 'ready', subtotal: 100, withTerms: false });
    await lifecycle.changeStatus({ orderId: plain, to: 'delivered', user: U(OWNER, 'shop_owner') });
    expect(Number(find(await entriesFor(plain), 'CREDIT', 'SELLER_PAYABLE').amount_paise)).toBe(10000);

    const free = await order({ status: 'ready', method: 'wallet', paid: 'paid', subtotal: 50, discount: 50, withTerms: false });
    await lifecycle.changeStatus({ orderId: free, to: 'delivered', user: U(OWNER, 'shop_owner') });
    expect(await entriesFor(free)).toHaveLength(0);
  });

  test('[P3.9] delivering is posted once: the same delivery recorded again adds nothing', async () => {
    const id = await order({ status: 'ready', subtotal: 120, commission: 6 });
    await lifecycle.changeStatus({ orderId: id, to: 'delivered', user: U(OWNER, 'shop_owner') });
    const before = (await entriesFor(id)).length;
    const row = await queryOne('SELECT * FROM orders WHERE id = $1', [id]);
    const { withTransaction } = require('../../config/database');
    await withTransaction((client) => ledger.postDeliveredOrder(client, row));
    expect(await entriesFor(id)).toHaveLength(before);
  });
});

describe('[P3.10] balances can be reproduced from the entries', () => {
  test('[P3.10] the shop’s balance is the sum of what it was owed less the refunds, and the whole book balances', async () => {
    const shop = uid();
    const orders = [];
    for (const [subtotal, commission] of [[400, 20], [250, 12.5]]) {
      const id = uid();
      await query(
        `INSERT INTO orders (id, user_id, shop_id, subtotal, total_amount, delivery_fee, status, order_status, payment_method, payment_status, fulfillment_method)
         VALUES ($1, $2, $3, $4, $4, 0, 'delivered', 'delivered', 'COD', 'paid', 'pickup')`,
        [id, BUYER, SHOP, subtotal]
      );
      orders.push({ id, net: subtotal - commission, subtotal, commission });
    }
    // Book them against a separate shop id so the balance below is this test's alone.
    for (const o of orders) {
      await ledger.recordTransaction({
        referenceType: 'ORDER_PAYMENT', referenceId: o.id, postingKey: `ORDER_PAYMENT:${o.id}`,
        entries: [
          { entryType: 'DEBIT', accountType: 'CUSTOMER_CASH', accountId: o.id, amountPaise: Math.round(o.subtotal * 100) },
          { entryType: 'CREDIT', accountType: 'SELLER_PAYABLE', accountId: shop, amountPaise: Math.round(o.net * 100) },
          { entryType: 'CREDIT', accountType: 'PLATFORM_REVENUE_COMMISSION', accountId: 'PLATFORM', amountPaise: Math.round(o.commission * 100) },
        ],
      });
    }
    await ledger.recordOrderRefund({ orderId: orders[0].id, shopId: shop, refundAmountPaise: 5000, postingKey: `RETURN_REFUND:${uid()}` });

    const owed = orders.reduce((n, o) => n + Math.round(o.net * 100), 0) - 5000;
    const balance = await ledger.getAccountBalance('SELLER_PAYABLE', shop);
    expect(Number(balance.balancePaise)).toBe(owed);
    // Reproduced independently, straight from the entries.
    const credits = Number((await queryOne("SELECT COALESCE(SUM(amount_paise), 0) AS n FROM platform_ledger_entries WHERE account_type = 'SELLER_PAYABLE' AND account_id = $1 AND entry_type = 'CREDIT'", [shop])).n);
    const debits = Number((await queryOne("SELECT COALESCE(SUM(amount_paise), 0) AS n FROM platform_ledger_entries WHERE account_type = 'SELLER_PAYABLE' AND account_id = $1 AND entry_type = 'DEBIT'", [shop])).n);
    expect(credits - debits).toBe(owed);

    const trial = await ledger.trialBalance();
    expect(trial.unbalancedTransactions).toEqual([]);
    expect(trial.balanced).toBe(true);
    expect(trial.totalDebitsPaise).toBe(trial.totalCreditsPaise);
  });

  test('[P3.10] a refund posted again with the same key is counted once', async () => {
    const shop = uid();
    const key = `RETURN_REFUND:${uid()}`;
    const orderId = uid();
    await ledger.recordOrderRefund({ orderId, shopId: shop, refundAmountPaise: 3000, postingKey: key });
    await ledger.recordOrderRefund({ orderId, shopId: shop, refundAmountPaise: 3000, postingKey: key });
    expect(Number((await ledger.getAccountBalance('SELLER_PAYABLE', shop)).balancePaise)).toBe(-3000);
  });
});
