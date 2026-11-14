-- ─────────────────────────────────────────────────────────────────────────────
-- 150: Add PLATFORM_BANK account and WALLET_TOPUP reference type to the ledger (P3)
--
-- Seller payouts, rider payouts, and wallet top-ups need a bank/cash clearing
-- account ('PLATFORM_BANK') to balance disbursements against, and wallet
-- top-ups need 'WALLET_TOPUP' in reference_type.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE platform_ledger_entries DROP CONSTRAINT IF EXISTS platform_ledger_entries_account_type_check;
ALTER TABLE platform_ledger_entries ADD CONSTRAINT platform_ledger_entries_account_type_check
    CHECK (account_type IN (
        'CUSTOMER_CASH',
        'CUSTOMER_WALLET',
        'GATEWAY_RECEIVABLE',
        'PLATFORM_BANK',
        'SELLER_PAYABLE',
        'PLATFORM_REVENUE_COMMISSION',
        'PLATFORM_REVENUE_DELIVERY_FEE',
        'RIDER_PAYABLE',
        'REFUND_PAYABLE'
    ));

ALTER TABLE platform_ledger_entries DROP CONSTRAINT IF EXISTS platform_ledger_entries_reference_type_check;
ALTER TABLE platform_ledger_entries ADD CONSTRAINT platform_ledger_entries_reference_type_check
    CHECK (reference_type IN (
        'ORDER_PAYMENT',
        'ORDER_REFUND',
        'SELLER_PAYOUT',
        'RIDER_PAYOUT',
        'WALLET_TOPUP',
        'MANUAL_ADJUSTMENT'
    ));
