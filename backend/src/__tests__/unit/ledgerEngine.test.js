const ledgerService = require('../../services/ledger.service');
const { query } = require('../../config/database');
const crypto = require('crypto');

describe('P3 Double-Entry Platform Payments Ledger', () => {
  const TEST_SHOP_ID = crypto.randomUUID();
  const TEST_USER_ID = crypto.randomUUID();
  const TEST_ORDER_ID = crypto.randomUUID();

  beforeAll(async () => {
    await query('DELETE FROM platform_ledger_entries WHERE account_id IN ($1, $2, $3)', [
      TEST_SHOP_ID,
      TEST_USER_ID,
      TEST_ORDER_ID
    ]);
  });

  afterAll(async () => {
    await query('DELETE FROM platform_ledger_entries WHERE account_id IN ($1, $2, $3)', [
      TEST_SHOP_ID,
      TEST_USER_ID,
      TEST_ORDER_ID
    ]);
  });

  test('[P3.1] rejects imbalanced transactions', async () => {
    await expect(
      ledgerService.recordTransaction({
        referenceType: 'MANUAL_ADJUSTMENT',
        referenceId: 'test-imbalance-1',
        entries: [
          { entryType: 'DEBIT', accountType: 'CUSTOMER_CASH', accountId: TEST_USER_ID, amountPaise: 50000 },
          { entryType: 'CREDIT', accountType: 'SELLER_PAYABLE', accountId: TEST_SHOP_ID, amountPaise: 40000 }
        ]
      })
    ).rejects.toThrow(/Double-entry imbalance/);
  });

  test('[P3.2] records balanced transaction and updates balance', async () => {
    const tx = await ledgerService.recordTransaction({
      referenceType: 'MANUAL_ADJUSTMENT',
      referenceId: 'test-balanced-1',
      entries: [
        { entryType: 'DEBIT', accountType: 'CUSTOMER_CASH', accountId: TEST_USER_ID, amountPaise: 50000 },
        { entryType: 'CREDIT', accountType: 'SELLER_PAYABLE', accountId: TEST_SHOP_ID, amountPaise: 50000 }
      ]
    });

    expect(tx.transactionId).toBeDefined();
    expect(tx.totalAmountPaise).toBe(50000);

    const sellerBal = await ledgerService.getAccountBalance('SELLER_PAYABLE', TEST_SHOP_ID);
    expect(sellerBal.balancePaise).toBe(50000);
    expect(sellerBal.totalCreditsPaise).toBe(50000);
    expect(sellerBal.totalDebitsPaise).toBe(0);

    const userBal = await ledgerService.getAccountBalance('CUSTOMER_CASH', TEST_USER_ID);
    expect(userBal.balancePaise).toBe(50000); // Asset account: debit - credit
  });

  test('[P3.3] records order payment with 0% launch commission and delivery fee', async () => {
    // ₹450 order with ₹50 delivery fee = ₹500 total
    const tx = await ledgerService.recordOrderPayment({
      orderId: TEST_ORDER_ID,
      customerId: TEST_USER_ID,
      shopId: TEST_SHOP_ID,
      paymentMethod: 'COD',
      amountPaise: 50000,
      deliveryFeePaise: 5000,
      commissionPaise: 0 // 0% commission at launch
    });

    expect(tx.transactionId).toBeDefined();

    const sellerBal = await ledgerService.getAccountBalance('SELLER_PAYABLE', TEST_SHOP_ID);
    // Previous 50000 + new 45000 = 95000
    expect(sellerBal.balancePaise).toBe(95000);
  });

  test('[P3.4] records order refund and debits seller payable', async () => {
    // Refund ₹100 = 10000 paise
    const tx = await ledgerService.recordOrderRefund({
      orderId: TEST_ORDER_ID,
      shopId: TEST_SHOP_ID,
      refundAmountPaise: 10000,
      reason: 'Damaged item return'
    });

    expect(tx.transactionId).toBeDefined();

    const sellerBal = await ledgerService.getAccountBalance('SELLER_PAYABLE', TEST_SHOP_ID);
    // 95000 - 10000 = 85000
    expect(sellerBal.balancePaise).toBe(85000);
    expect(sellerBal.totalDebitsPaise).toBe(10000);

    const refundBal = await ledgerService.getAccountBalance('REFUND_PAYABLE', TEST_ORDER_ID);
    expect(refundBal.balancePaise).toBe(10000);
  });

  test('[P3.5] account statement reproduces chronological history and entries', async () => {
    const statement = await ledgerService.getAccountStatement('SELLER_PAYABLE', TEST_SHOP_ID);
    expect(statement.length).toBe(3);
    const types = statement.map(s => s.reference_type);
    expect(types).toContain('ORDER_REFUND');
    expect(types).toContain('ORDER_PAYMENT');
    expect(types).toContain('MANUAL_ADJUSTMENT');
  });
});
