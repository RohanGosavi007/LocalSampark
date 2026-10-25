const crypto = require('crypto');
const { query } = require('../config/database');
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
   * Records a balanced double-entry transaction.
   *
   * @param {Object} params
   * @param {string} [params.transactionId] - Optional transaction identifier (UUID generated if not provided)
   * @param {string} params.referenceType - 'ORDER_PAYMENT', 'ORDER_REFUND', 'SELLER_PAYOUT', 'RIDER_PAYOUT', 'MANUAL_ADJUSTMENT'
   * @param {string} params.referenceId - Foreign key (e.g. orderId, payoutId)
   * @param {string} [params.description]
   * @param {Array<{entryType: 'DEBIT'|'CREDIT', accountType: string, accountId: string, amountPaise: number, description?: string}>} params.entries
   * @param {Object} [params.client] - Optional transactional db client
   */
  async recordTransaction({ transactionId, referenceType, referenceId, entries, description = '', client = null }) {
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

    const queryFn = client ? client.query.bind(client) : query;
    const isPostgres = process.env.USE_SQLITE !== 'true';

    for (const entry of entries) {
      const entryId = crypto.randomUUID();
      const amount = Math.round(Number(entry.amountPaise));
      const entryDesc = entry.description || description;

      if (isPostgres) {
        await queryFn(
          `INSERT INTO platform_ledger_entries
             (id, transaction_id, entry_type, account_type, account_id, amount_paise, reference_type, reference_id, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [entryId, txId, entry.entryType, entry.accountType, String(entry.accountId), amount, referenceType, String(referenceId), entryDesc]
        );
      } else {
        await queryFn(
          `INSERT INTO platform_ledger_entries
             (id, transaction_id, entry_type, account_type, account_id, amount_paise, reference_type, reference_id, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [entryId, txId, entry.entryType, entry.accountType, String(entry.accountId), amount, referenceType, String(referenceId), entryDesc]
        );
      }
    }

    logger.info(`[Ledger] Recorded transaction ${txId} (${referenceType}:${referenceId}) with ${entries.length} entries totaling ${totalDebits} paise`);
    return { transactionId: txId, totalAmountPaise: totalDebits, entriesCount: entries.length };
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
  async recordOrderRefund({ orderId, shopId, refundAmountPaise, reason = 'Order refund', client = null }) {
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
      client
    });
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
