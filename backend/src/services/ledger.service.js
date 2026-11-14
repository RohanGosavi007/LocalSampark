const crypto = require('crypto');
const { query, withTransaction } = require('../config/database');
const logger = require('../config/logger');

const LIABILITY_AND_EQUITY_ACCOUNTS = new Set([
  'SELLER_PAYABLE',
  'RIDER_PAYABLE',
  'REFUND_PAYABLE',
  'CUSTOMER_WALLET',
  'PLATFORM_REVENUE_COMMISSION',
  'PLATFORM_REVENUE_DELIVERY_FEE'
]);

/**
 * Double-Entry Platform Payments Ledger Service (P3)
 * Guarantees that every movement of money is accounted for with balanced debits and credits.
 */
class LedgerService {
  /**
   * Records a balanced double-entry transaction, all or nothing.
   *
   * @param {Object} params
   * @param {string} [params.transactionId] - Optional transaction identifier (UUID generated if not provided)
   * @param {string} params.referenceType - 'ORDER_PAYMENT', 'ORDER_REFUND', 'SELLER_PAYOUT', 'RIDER_PAYOUT', 'MANUAL_ADJUSTMENT'
   * @param {string} params.referenceId - Foreign key (e.g. orderId, payoutId)
   * @param {string} [params.description]
   * @param {Array<{entryType: 'DEBIT'|'CREDIT', accountType: string, accountId: string, amountPaise: number, description?: string}>} params.entries
   * @param {Object} [params.client] - Optional transactional db client: the posting then joins the caller's transaction
   * @param {string} [params.postingKey] - Makes the posting once-only ("ORDER_PAYMENT:<order id>"): a second
   *   attempt with the same key writes nothing and returns { duplicate: true } with the first transaction's id.
   *
   * Without a client the entries are written in a transaction of their own. They
   * used to be inserted one by one on the pool, so a failure after the first
   * entry left half a transaction (a debit with no credit) in the book.
   */
  async recordTransaction({ transactionId, referenceType, referenceId, entries, description = '', client = null, postingKey = null }) {
    if (!Array.isArray(entries) || entries.length < 2) {
      throw new Error('A double-entry transaction must contain at least 2 entries');
    }

    const txId = transactionId || crypto.randomUUID();
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of entries) {
      const amount = Math.round(Number(entry.amountPaise));
      if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error(`Invalid ledger entry amount: ${entry.amountPaise}. Must be positive integer paise.`);
      }
      if (entry.entryType === 'DEBIT') {
        totalDebits += amount;
      } else if (entry.entryType === 'CREDIT') {
        totalCredits += amount;
      } else {
        throw new Error(`Invalid entryType: ${entry.entryType}. Must be DEBIT or CREDIT.`);
      }
    }

    if (totalDebits !== totalCredits) {
      throw new Error(`Double-entry imbalance: total debits (${totalDebits}) do not equal total credits (${totalCredits})`);
    }

    const write = async (tx) => {
      if (postingKey) {
        const claimed = await tx.query(
          'INSERT INTO platform_ledger_postings (posting_key, transaction_id) VALUES ($1, $2) ON CONFLICT (posting_key) DO NOTHING',
          [String(postingKey), txId]
        );
        if (!(claimed.rowCount ?? claimed.changes)) {
          const first = (await tx.query('SELECT transaction_id FROM platform_ledger_postings WHERE posting_key = $1', [String(postingKey)])).rows[0];
          return { transactionId: first ? first.transaction_id : null, totalAmountPaise: totalDebits, entriesCount: 0, duplicate: true };
        }
      }
      for (const entry of entries) {
        await tx.query(
          `INSERT INTO platform_ledger_entries
             (id, transaction_id, entry_type, account_type, account_id, amount_paise, reference_type, reference_id, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [crypto.randomUUID(), txId, entry.entryType, entry.accountType, String(entry.accountId),
            Math.round(Number(entry.amountPaise)), referenceType, String(referenceId), entry.description || description]
        );
      }
      return { transactionId: txId, totalAmountPaise: totalDebits, entriesCount: entries.length, duplicate: false };
    };

    const result = client ? await write(client) : await withTransaction(write);
    if (!result.duplicate) {
      logger.info(`[Ledger] Recorded transaction ${txId} (${referenceType}:${referenceId}) with ${entries.length} entries totaling ${totalDebits} paise`);
    }
    return result;
  }

  /**
   * Helper to record order payment double-entry.
   */
  async recordOrderPayment({ orderId, customerId, shopId, paymentMethod, amountPaise, deliveryFeePaise = 0, commissionPaise = 0, client = null }) {
    const total = Math.round(Number(amountPaise));
    const delivery = Math.round(Number(deliveryFeePaise));
    const commission = Math.round(Number(commissionPaise));
    const sellerPayable = total - delivery - commission;

    if (sellerPayable < 0) {
      throw new Error('Seller net amount cannot be negative');
    }

    const debitAccount = paymentMethod === 'COD' ? 'CUSTOMER_CASH' : 'GATEWAY_RECEIVABLE';

    const entries = [
      {
        entryType: 'DEBIT',
        accountType: debitAccount,
        accountId: customerId || 'GUEST',
        amountPaise: total,
        description: `Order ${orderId} payment via ${paymentMethod}`
      },
      {
        entryType: 'CREDIT',
        accountType: 'SELLER_PAYABLE',
        accountId: shopId,
        amountPaise: sellerPayable,
        description: `Order ${orderId} seller payout credit (net)`
      }
    ];

    if (delivery > 0) {
      entries.push({
        entryType: 'CREDIT',
        accountType: 'PLATFORM_REVENUE_DELIVERY_FEE',
        accountId: 'PLATFORM',
        amountPaise: delivery,
        description: `Order ${orderId} delivery fee revenue`
      });
    }

    if (commission > 0) {
      entries.push({
        entryType: 'CREDIT',
        accountType: 'PLATFORM_REVENUE_COMMISSION',
        accountId: 'PLATFORM',
        amountPaise: commission,
        description: `Order ${orderId} platform commission revenue`
      });
    }

    return this.recordTransaction({
      referenceType: 'ORDER_PAYMENT',
      referenceId: orderId,
      description: `Payment for Order ${orderId}`,
      entries,
      client
    });
  }

  /**
   * Helper to record order refund double-entry.
   */
  async recordOrderRefund({ orderId, shopId, refundAmountPaise, reason = 'Order refund', client = null, postingKey = null }) {
    const amount = Math.round(Number(refundAmountPaise));
    const entries = [
      {
        entryType: 'DEBIT',
        accountType: 'SELLER_PAYABLE',
        accountId: shopId,
        amountPaise: amount,
        description: `Debit seller for refund on order ${orderId}: ${reason}`
      },
      {
        entryType: 'CREDIT',
        accountType: 'REFUND_PAYABLE',
        accountId: orderId,
        amountPaise: amount,
        description: `Credit refund payable for order ${orderId}`
      }
    ];

    return this.recordTransaction({
      referenceType: 'ORDER_REFUND',
      referenceId: orderId,
      description: `Refund for Order ${orderId}`,
      entries,
      client,
      postingKey
    });
  }

  /**
   * Books a delivered order: where the customer's money goes. Runs inside the
   * delivery transaction (pass its client), once per order (postingKey).
   *
   *   Dr  what the customer paid with   COD -> CUSTOMER_CASH, online -> GATEWAY_RECEIVABLE,
   *                                     wallet -> CUSTOMER_WALLET             total_amount
   *   Cr  SELLER_PAYABLE (the shop)     what the shop is owed (shop_commissions.net_to_shop)
   *   Cr  PLATFORM_REVENUE_COMMISSION   commission + convenience fee, and the platform and small-order fees
   *   Cr  RIDER_PAYABLE (the rider)     the rider's pay, when a platform rider delivered it
   *   Cr  PLATFORM_REVENUE_DELIVERY_FEE what is left of the delivery fee after the rider's pay
   *
   * A discount the platform gave (a coupon or loyalty coins) is the difference
   * between what the customer paid and what everyone is owed; it is booked as a
   * debit against PLATFORM_REVENUE_COMMISSION. Every amount is an integer number
   * of paise, and the entries balance by construction.
   *
   * An order with no shop_commissions row (placed before that table was written
   * at checkout) is booked with the shop owed its whole subtotal and the platform
   * earning nothing on it.
   */
  async postDeliveredOrder(client, order) {
    const paise = (value) => Math.round((Number(value) || 0) * 100);
    const total = paise(order.total_amount);
    if (total <= 0) return null; // nothing was paid, so nothing moved

    const terms = (await client.query(
      "SELECT commission_amount, convenience_fee, net_to_shop FROM shop_commissions WHERE order_id = $1 AND order_type = 'product_order' ORDER BY created_at ASC LIMIT 1",
      [String(order.id)]
    )).rows[0];

    const delivery = paise(order.delivery_fee);
    const stored = paise(order.rider_payout);
    const rider = order.assigned_agent_id ? (stored > 0 ? stored : delivery) : 0;

    const lines = {
      seller: terms ? paise(terms.net_to_shop) : paise(order.subtotal),
      commission: (terms ? paise(terms.commission_amount) + paise(terms.convenience_fee) : 0) + paise(order.platform_fee) + paise(order.small_order_fee),
      rider,
      deliveryRevenue: delivery - rider, // negative when the rider's pay exceeds the fee charged
    };
    // Rounding, and any platform-funded discount, land on the commission line.
    lines.commission += total - (lines.seller + lines.commission + lines.rider + lines.deliveryRevenue);

    const method = String(order.payment_method || '').toLowerCase();
    const source = method === 'cod' ? 'CUSTOMER_CASH' : (method === 'wallet' ? 'CUSTOMER_WALLET' : 'GATEWAY_RECEIVABLE');
    const accounts = [
      ['seller', 'SELLER_PAYABLE', order.shop_id],
      ['commission', 'PLATFORM_REVENUE_COMMISSION', 'PLATFORM'],
      ['rider', 'RIDER_PAYABLE', order.assigned_agent_id],
      ['deliveryRevenue', 'PLATFORM_REVENUE_DELIVERY_FEE', 'PLATFORM'],
    ];

    // Cash and gateway money are tracked per order (a refund of the order credits
    // the same account, see refundPayouts.service.js); a wallet is the customer's.
    const sourceAccountId = source === 'CUSTOMER_WALLET' ? (order.user_id || 'GUEST') : order.id;
    const entries = [{ entryType: 'DEBIT', accountType: source, accountId: sourceAccountId, amountPaise: total, description: `Order ${order.id} paid by ${method || 'unknown'}` }];
    for (const [key, accountType, accountId] of accounts) {
      const amount = lines[key];
      if (!amount) continue;
      entries.push({
        entryType: amount > 0 ? 'CREDIT' : 'DEBIT',
        accountType,
        accountId: accountId || 'PLATFORM',
        amountPaise: Math.abs(amount),
        description: `Order ${order.id} ${key === 'seller' ? 'owed to the shop' : key === 'rider' ? "rider's pay" : key === 'commission' ? 'platform earning' : 'delivery fee margin'}`,
      });
    }
    if (entries.length < 2) return null;

    return this.recordTransaction({
      referenceType: 'ORDER_PAYMENT',
      referenceId: order.id,
      description: `Delivered order ${order.id}`,
      entries,
      client,
      postingKey: `ORDER_PAYMENT:${order.id}`,
    });
  }

  /**
   * The trial balance: every transaction whose debits and credits differ (there
   * must be none), and the totals over the whole book. Balances are reproducible
   * from the entries alone, and this is how to prove it.
   */
  async trialBalance({ client = null } = {}) {
    const queryFn = client ? client.query.bind(client) : query;
    const unbalanced = (await queryFn(
      `SELECT transaction_id,
              SUM(CASE WHEN entry_type = 'DEBIT' THEN amount_paise ELSE 0 END) AS debits,
              SUM(CASE WHEN entry_type = 'CREDIT' THEN amount_paise ELSE 0 END) AS credits
         FROM platform_ledger_entries
        GROUP BY transaction_id
       HAVING SUM(CASE WHEN entry_type = 'DEBIT' THEN amount_paise ELSE 0 END) <> SUM(CASE WHEN entry_type = 'CREDIT' THEN amount_paise ELSE 0 END)`
    )).rows || [];
    const totals = ((await queryFn(
      `SELECT SUM(CASE WHEN entry_type = 'DEBIT' THEN amount_paise ELSE 0 END) AS debits,
              SUM(CASE WHEN entry_type = 'CREDIT' THEN amount_paise ELSE 0 END) AS credits
         FROM platform_ledger_entries`
    )).rows || [])[0] || {};
    return {
      balanced: unbalanced.length === 0 && Number(totals.debits || 0) === Number(totals.credits || 0),
      totalDebitsPaise: Number(totals.debits || 0),
      totalCreditsPaise: Number(totals.credits || 0),
      unbalancedTransactions: unbalanced.map((r) => ({ transactionId: r.transaction_id, debitsPaise: Number(r.debits), creditsPaise: Number(r.credits) })),
    };
  }

  /**
   * Retrieves net balance for an account by aggregating debits and credits.
   */
  async getAccountBalance(accountType, accountId, client = null) {
    const queryFn = client ? client.query.bind(client) : query;
    const res = await queryFn(
      `SELECT entry_type, SUM(amount_paise) AS total
         FROM platform_ledger_entries
        WHERE account_type = $1 AND account_id = $2
        GROUP BY entry_type`,
      [accountType, String(accountId)]
    );

    const rows = res.rows || res || [];
    let debits = 0;
    let credits = 0;

    for (const r of rows) {
      if (r.entry_type === 'DEBIT') debits = Number(r.total || 0);
      if (r.entry_type === 'CREDIT') credits = Number(r.total || 0);
    }

    const isLiabilityOrEquity = LIABILITY_AND_EQUITY_ACCOUNTS.has(accountType);
    const balancePaise = isLiabilityOrEquity ? (credits - debits) : (debits - credits);

    return {
      accountType,
      accountId,
      balancePaise,
      totalCreditsPaise: credits,
      totalDebitsPaise: debits
    };
  }

  /**
   * Retrieves ledger statement for an account.
   */
  async getAccountStatement(accountType, accountId, { limit = 50, offset = 0, client = null } = {}) {
    const queryFn = client ? client.query.bind(client) : query;
    const res = await queryFn(
      `SELECT id, transaction_id, entry_type, amount_paise, reference_type, reference_id, description, created_at
         FROM platform_ledger_entries
        WHERE account_type = $1 AND account_id = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4`,
      [accountType, String(accountId), limit, offset]
    );

    return res.rows || res || [];
  }
}

module.exports = new LedgerService();
