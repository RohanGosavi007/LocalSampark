-- ═══════════════════════════════════════════════════════════════════════
-- Migration 038: Vendor KYC System
-- 10x Plan: Section 20.1.2 — Digital KYC, GST Verification, Bank Payout
-- Compatible: SQLite (dev) + PostgreSQL (prod-ready)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_kyc (
    id TEXT PRIMARY KEY,
    shop_id TEXT REFERENCES local_shops(id) ON DELETE CASCADE,
    owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,

    -- Identity Documents
    aadhaar_number_encrypted TEXT,
    aadhaar_front_url TEXT,
    aadhaar_back_url TEXT,
    pan_number TEXT,
    pan_url TEXT,

    -- GST Verification
    gst_number TEXT,
    gst_status TEXT DEFAULT 'not_applicable',
    gst_verified_at TEXT,
    gst_type TEXT,
    gst_legal_name TEXT,
    gst_trade_name TEXT,

    -- Bank Details (for payouts)
    bank_account_number_encrypted TEXT,
    bank_ifsc TEXT,
    bank_name TEXT,
    bank_branch TEXT,
    bank_verified INTEGER DEFAULT 0,
    bank_verification_ref TEXT,

    -- FSSAI (for food shops)
    fssai_number TEXT,
    fssai_expiry TEXT,
    fssai_url TEXT,

    -- Drug License (for pharmacy)
    drug_license_number TEXT,
    drug_license_url TEXT,

    -- Verification Status
    kyc_status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
    verified_by TEXT REFERENCES users(id),
    verified_at TEXT,
    submitted_at TEXT,

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vendor_kyc_shop ON vendor_kyc(shop_id);
CREATE INDEX IF NOT EXISTS idx_vendor_kyc_status ON vendor_kyc(kyc_status);
CREATE INDEX IF NOT EXISTS idx_vendor_kyc_gst ON vendor_kyc(gst_number);
