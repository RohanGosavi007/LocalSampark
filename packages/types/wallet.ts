/**
 * @localsampark/types — wallet.ts
 * ══════════════════════════════════════════════════════════════════
 * Phase 1: Wallet, Subscription & Double-Entry Ledger Engine
 * All monetary values in paise (integer). Zero floating-point drift.
 * ══════════════════════════════════════════════════════════════════
 */

import { MoneyINR } from './identity';

// ─── ENUMS ────────────────────────────────────────────────────────

/** Wallet type — every user can have multiple wallets */
export enum WalletType {
  CONSUMER_CASHBACK = 'CONSUMER_CASHBACK',
  CONSUMER_CREDITS = 'CONSUMER_CREDITS',
  MERCHANT_EARNINGS = 'MERCHANT_EARNINGS',
  RUNNER_EARNINGS = 'RUNNER_EARNINGS',
  SERVICE_PROVIDER_EARNINGS = 'SERVICE_PROVIDER_EARNINGS',
  FRANCHISE_REVENUE = 'FRANCHISE_REVENUE',
  REFERRAL_BONUS = 'REFERRAL_BONUS',
  ESCROW_HOLD = 'ESCROW_HOLD',
}

/** Transaction state machine */
export enum TransactionStatus {
  INITIATED = 'INITIATED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
  DISPUTED = 'DISPUTED',
  EXPIRED = 'EXPIRED',
  HELD = 'HELD',       // Escrow hold pending release
  RELEASED = 'RELEASED', // Escrow released to recipient
}

/** Double-entry ledger entry type */
export enum LedgerEntryType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

/** What triggered this transaction */
export enum TransactionSource {
  ORDER_PAYMENT = 'ORDER_PAYMENT',
  ORDER_REFUND = 'ORDER_REFUND',
  CASHBACK_EARNED = 'CASHBACK_EARNED',
  CASHBACK_BURNED = 'CASHBACK_BURNED',
  REFERRAL_BONUS = 'REFERRAL_BONUS',
  SUBSCRIPTION_PAYMENT = 'SUBSCRIPTION_PAYMENT',
  DELIVERY_EARNINGS = 'DELIVERY_EARNINGS',
  SERVICE_PAYOUT = 'SERVICE_PAYOUT',
  COMMISSION_DEDUCTION = 'COMMISSION_DEDUCTION',
  WALLET_TOPUP = 'WALLET_TOPUP',
  WALLET_WITHDRAWAL = 'WALLET_WITHDRAWAL',
  PROMOTIONAL_CREDIT = 'PROMOTIONAL_CREDIT',
  PENALTY_DEDUCTION = 'PENALTY_DEDUCTION',
  DISPUTE_RESOLUTION = 'DISPUTE_RESOLUTION',
  FRANCHISE_SETTLEMENT = 'FRANCHISE_SETTLEMENT',
  PLATFORM_FEE = 'PLATFORM_FEE',
  GST_DEDUCTION = 'GST_DEDUCTION',
  TDS_DEDUCTION = 'TDS_DEDUCTION',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
}

/** Payment gateway used */
export enum PaymentGateway {
  RAZORPAY = 'RAZORPAY',
  PAYTM = 'PAYTM',
  PHONEPE = 'PHONEPE',
  GOOGLE_PAY = 'GOOGLE_PAY',
  UPI_GENERIC = 'UPI_GENERIC',
  NET_BANKING = 'NET_BANKING',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  WALLET_BALANCE = 'WALLET_BALANCE',
}

/** Subscription plan tiers */
export enum SubscriptionPlanId {
  FREE = 'FREE',
  MERCHANT_SILVER = 'MERCHANT_SILVER',
  MERCHANT_GOLD = 'MERCHANT_GOLD',
  MERCHANT_PLATINUM = 'MERCHANT_PLATINUM',
  KRISHI_BASIC = 'KRISHI_BASIC',
  KRISHI_PRO = 'KRISHI_PRO',
  CONSUMER_PLUS = 'CONSUMER_PLUS',
  FRANCHISE_STARTER = 'FRANCHISE_STARTER',
  FRANCHISE_PRO = 'FRANCHISE_PRO',
}

/** Subscription state machine */
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIAL = 'TRIAL',
  PAST_DUE = 'PAST_DUE',       // Payment failed, grace period
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PAUSED = 'PAUSED',
  PENDING_ACTIVATION = 'PENDING_ACTIVATION',
}

/** Payout settlement status */
export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SETTLED = 'SETTLED',
  FAILED = 'FAILED',
  ON_HOLD = 'ON_HOLD',         // Fraud check
  REVERSED = 'REVERSED',
}

// ─── WALLET ──────────────────────────────────────────────────────

export interface Wallet {
  /** Globally unique wallet ID, prefixed: wal_ */
  id: string;
  userId: string;
  walletType: WalletType;

  /** Current available balance in paise */
  balancePaise: number;
  /** Formatted display string e.g. "₹1,250.00" */
  balanceFormatted: string;
  /** Amount currently held in escrow (not withdrawable) */
  heldAmountPaise: number;
  /** Lifetime total credits received */
  lifetimeCreditsPaise: number;
  /** Lifetime total debits */
  lifetimeDebitsPaise: number;

  /** Whether this wallet is frozen (e.g. fraud investigation) */
  isFrozen: boolean;
  freezeReason?: string;

  /** Minimum balance allowed (can be negative for credit wallets) */
  minBalancePaise: number;
  /** Maximum balance cap (anti-fraud measure) */
  maxBalancePaise: number;

  /** Last transaction timestamp */
  lastTransactionAt?: string;
  /** Auto-expiry for promotional credits */
  creditsExpiryDate?: string;

  createdAt: string;
  updatedAt: string;
}

// ─── LEDGER ENTRY (Double-Entry) ─────────────────────────────────

export interface LedgerEntry {
  /** Globally unique entry ID, prefixed: txn_ */
  id: string;
  walletId: string;
  userId: string;

  entryType: LedgerEntryType;
  amountPaise: number;
  amountFormatted: string;

  /** Running balance AFTER this entry */
  runningBalancePaise: number;

  source: TransactionSource;
  status: TransactionStatus;
  gateway?: PaymentGateway;

  /** External reference — order ID, subscription ID, payout ID, etc. */
  referenceId?: string;
  referenceType?: 'ORDER' | 'SUBSCRIPTION' | 'PAYOUT' | 'REFUND' | 'DISPUTE' | 'MANUAL';

  /** Counterparty wallet ID for double-entry reconciliation */
  counterpartyWalletId?: string;

  /** Razorpay / Paytm payment ID for external reconciliation */
  gatewayTransactionId?: string;
  gatewayOrderId?: string;

  /** Human-readable description */
  description: string;
  /** Internal admin-only notes */
  adminNotes?: string;

  /** Tax breakdown */
  gstAmountPaise?: number;
  tdsAmountPaise?: number;

  /** Idempotency key to prevent duplicate processing */
  idempotencyKey: string;

  /** IP address of request origin (audit trail) */
  originIp?: string;

  createdAt: string;
  processedAt?: string;
  failedAt?: string;
  failureReason?: string;

  /** Metadata bag for extensibility */
  metadata?: Record<string, unknown>;
}

// ─── SUBSCRIPTION ────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  description: string;
  /** Monthly price in paise */
  monthlyPricePaise: number;
  monthlyPriceFormatted: string;
  /** Annual price in paise (discount applied) */
  annualPricePaise: number;
  annualPriceFormatted: string;
  /** Trial period in days (0 = no trial) */
  trialDays: number;
  /** Features included */
  features: SubscriptionFeature[];
  /** Maximum number of products/listings allowed */
  maxListings: number;
  /** Commission discount percentage (e.g. Gold gets 2% less commission) */
  commissionDiscountPercent: number;
  /** Priority support SLA in hours */
  supportSlaHours: number;
  isPopular: boolean;
  isActive: boolean;
}

export interface SubscriptionFeature {
  featureKey: string;
  displayName: string;
  description: string;
  isIncluded: boolean;
  /** Usage limit (-1 = unlimited) */
  usageLimit: number;
}

export interface UserSubscription {
  /** Globally unique subscription ID, prefixed: sub_ */
  id: string;
  userId: string;
  planId: SubscriptionPlanId;
  status: SubscriptionStatus;

  /** Billing cycle */
  billingCycle: 'MONTHLY' | 'ANNUAL';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate?: string;

  /** Trial info */
  trialStart?: string;
  trialEnd?: string;
  isInTrial: boolean;

  /** Payment */
  lastPaymentAmountPaise: number;
  lastPaymentDate?: string;
  lastPaymentStatus: TransactionStatus;
  paymentGateway: PaymentGateway;
  gatewaySubscriptionId?: string;

  /** Cancellation */
  cancelledAt?: string;
  cancellationReason?: string;
  /** If true, access continues until currentPeriodEnd */
  cancelAtPeriodEnd: boolean;

  /** Auto-renew flag */
  autoRenew: boolean;
  /** Number of failed payment retries */
  failedPaymentRetries: number;

  createdAt: string;
  updatedAt: string;
}

// ─── PAYOUT ──────────────────────────────────────────────────────

export interface Payout {
  /** Globally unique payout ID, prefixed: pay_ */
  id: string;
  userId: string;
  walletId: string;

  amountPaise: number;
  amountFormatted: string;
  status: PayoutStatus;

  /** Bank account / UPI details */
  bankAccountId: string;
  /** NEFT/IMPS/UPI reference */
  bankReferenceNumber?: string;

  /** Tax deductions */
  tdsDeductedPaise: number;
  netAmountPaise: number;

  /** Settlement cycle */
  settlementCycle: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  periodStart: string;
  periodEnd: string;

  initiatedAt: string;
  settledAt?: string;
  failedAt?: string;
  failureReason?: string;

  /** Invoice PDF URL */
  invoiceUrl?: string;
}

// ─── AGGREGATE: USER FINANCIAL SNAPSHOT ───────────────────────────

export interface UserFinancialSnapshot {
  userId: string;
  wallets: Wallet[];
  activeSubscription?: UserSubscription;
  recentTransactions: LedgerEntry[];
  pendingPayouts: Payout[];
  /** Total pending amount across all wallets */
  totalAvailableBalancePaise: number;
  totalAvailableFormatted: string;
  /** Total held in escrow */
  totalHeldPaise: number;
}
