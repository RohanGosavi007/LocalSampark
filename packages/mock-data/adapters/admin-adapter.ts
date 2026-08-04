/**
 * @localsampark/mock-data — Admin Adapter (Next.js Server Actions)
 * ══════════════════════════════════════════════════════════════════
 * Mock API layer for apps/admin (Next.js App Router).
 * Simulates server-side data fetching with artificial latency,
 * pagination, filtering, and error injection for demo resilience.
 *
 * Usage in apps/admin:
 *   import { MockAdminAPI } from '@localsampark/mock-data/adapters/admin';
 *   const users = await MockAdminAPI.getUsers({ role: 'SHOP_OWNER', zoneId: 'zone_kothrud' });
 * ══════════════════════════════════════════════════════════════════
 */

import type { User, UserRole, AccountStatus, KYCStatus } from '@localsampark/types';
import type { Zone, TerritoryStatus, Ward } from '@localsampark/types';
import type {
  Wallet, WalletType, LedgerEntry, UserSubscription,
  SubscriptionPlan, Payout, UserFinancialSnapshot,
} from '@localsampark/types';

// ─── SEED DATA IMPORTS ────────────────────────────────────────────

import usersData from '../seeds/users.json';
import territoriesData from '../seeds/territories.json';
import walletsData from '../seeds/wallets.json';

// ─── CONFIGURATION ───────────────────────────────────────────────

interface MockConfig {
  /** Artificial latency range in ms [min, max] to simulate real network */
  latencyMs: [number, number];
  /** Probability (0-1) of injecting a simulated 500 error */
  errorRate: number;
  /** Whether to log mock API calls to console */
  verbose: boolean;
}

const DEFAULT_CONFIG: MockConfig = {
  latencyMs: [80, 300],
  errorRate: 0.0, // Set to 0.05 for 5% error injection during stress demos
  verbose: process.env.NODE_ENV === 'development',
};

// ─── HELPERS ─────────────────────────────────────────────────────

function delay(config: MockConfig): Promise<void> {
  const [min, max] = config.latencyMs;
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maybeThrow(config: MockConfig, endpoint: string): void {
  if (Math.random() < config.errorRate) {
    throw new Error(`[MockAdminAPI] Simulated 500 error on ${endpoint}`);
  }
}

function log(config: MockConfig, method: string, params?: unknown): void {
  if (config.verbose) {
    console.log(`[MockAdminAPI] ${method}`, params ?? '');
  }
}

// ─── PAGINATION HELPERS ──────────────────────────────────────────

interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextCursor?: string | null;
}

function paginate<T extends { id?: string }>(
  items: T[],
  { page = 1, pageSize = 20 }: PaginationParams
): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const data = items.slice(start, start + pageSize);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextCursor: data.length > 0 ? (data[data.length - 1] as any).id ?? null : null,
  };
}

// ─── MOCK ADMIN API ──────────────────────────────────────────────

export class MockAdminAPI {
  private static config: MockConfig = { ...DEFAULT_CONFIG };

  /** Override default config (e.g. increase error rate for chaos demos) */
  static configure(overrides: Partial<MockConfig>): void {
    MockAdminAPI.config = { ...MockAdminAPI.config, ...overrides };
  }

  // ── USERS ──────────────────────────────────────────────────────

  static async getUsers(params?: {
    role?: UserRole;
    status?: AccountStatus;
    kycStatus?: KYCStatus;
    zoneId?: string;
    search?: string;
  } & PaginationParams): Promise<PaginatedResult<User>> {
    const cfg = MockAdminAPI.config;
    log(cfg, 'getUsers', params);
    await delay(cfg);
    maybeThrow(cfg, 'getUsers');

    let users = (usersData as any).users as User[];

    if (params?.role) {
      users = users.filter((u) => u.roles.includes(params.role!));
    }
    if (params?.status) {
      users = users.filter((u) => u.accountStatus === params.status);
    }
    if (params?.kycStatus) {
      users = users.filter((u) => u.kycStatus === params.kycStatus);
    }
    if (params?.zoneId) {
      users = users.filter((u) => u.homeZoneId === params.zoneId);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.phoneNumber.includes(q) ||
          (u.email && u.email.toLowerCase().includes(q))
      );
    }

    return paginate(users, { page: params?.page, pageSize: params?.pageSize });
  }

  static async getUserById(userId: string): Promise<User | null> {
    const cfg = MockAdminAPI.config;
    log(cfg, 'getUserById', { userId });
    await delay(cfg);
    maybeThrow(cfg, 'getUserById');

    const user = (usersData as any).users.find((u: User) => u.id === userId);
    return user ?? null;
  }

  // ── TERRITORIES ────────────────────────────────────────────────

  static async getZones(params?: {
    status?: TerritoryStatus;
    tier?: string;
    districtId?: string;
  } & PaginationParams): Promise<PaginatedResult<Zone>> {
    const cfg = MockAdminAPI.config;
    log(cfg, 'getZones', params);
    await delay(cfg);
    maybeThrow(cfg, 'getZones');

    let zones = (territoriesData as any).zones as Zone[];

    if (params?.status) {
      zones = zones.filter((z) => z.status === params.status);
    }
    if (params?.tier) {
      zones = zones.filter((z) => z.tier === params.tier);
    }
    if (params?.districtId) {
      zones = zones.filter((z) => z.districtId === params.districtId);
    }

    return paginate(zones, { page: params?.page, pageSize: params?.pageSize });
  }

  static async getZoneById(zoneId: string): Promise<Zone | null> {
    const cfg = MockAdminAPI.config;
    log(cfg, 'getZoneById', { zoneId });
    await delay(cfg);

    const zone = (territoriesData as any).zones.find((z: Zone) => z.id === zoneId);
    return zone ?? null;
  }

  static async getWardsByZoneId(zoneId: string): Promise<Ward[]> {
    const cfg = MockAdminAPI.config;
    log(cfg, 'getWardsByZoneId', { zoneId });
    await delay(cfg);

    return (territoriesData as any).wards.filter((w: Ward) => w.zoneId === zoneId);
  }

  static async getTerritoryHierarchy() {
    const cfg = MockAdminAPI.config;
    log(cfg, 'getTerritoryHierarchy');
    await delay(cfg);

    return {
      states: (territoriesData as any).states,
      districts: (territoriesData as any).districts,
      talukas: (territoriesData as any).talukas,
      zones: (territoriesData as any).zones,
      wards: (territoriesData as any).wards,
    };
  }

  // ── WALLETS & FINANCE ──────────────────────────────────────────

  static async getUserFinancialSnapshot(userId: string): Promise<UserFinancialSnapshot | null> {
    const cfg = MockAdminAPI.config;
    log(cfg, 'getUserFinancialSnapshot', { userId });
    await delay(cfg);
    maybeThrow(cfg, 'getUserFinancialSnapshot');

    const wallets = (walletsData as any).wallets.filter((w: Wallet) => w.userId === userId);
    const transactions = (walletsData as any).ledgerEntries.filter((t: LedgerEntry) => t.userId === userId);
    const subscription = (walletsData as any).userSubscriptions.find(
      (s: UserSubscription) => s.userId === userId && ['ACTIVE', 'TRIAL'].includes(s.status)
    );
    const payouts = (walletsData as any).payouts.filter(
      (p: Payout) => p.userId === userId && ['PENDING', 'PROCESSING'].includes(p.status)
    );

    if (wallets.length === 0) return null;

    const totalAvailable = wallets.reduce((sum: number, w: Wallet) => sum + w.balancePaise, 0);
    const totalHeld = wallets.reduce((sum: number, w: Wallet) => sum + w.heldAmountPaise, 0);

    return {
      userId,
      wallets,
      activeSubscription: subscription ?? undefined,
      recentTransactions: transactions.slice(0, 20),
      pendingPayouts: payouts,
      totalAvailableBalancePaise: totalAvailable,
      totalAvailableFormatted: `₹${(totalAvailable / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      totalHeldPaise: totalHeld,
    };
  }

  static async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const cfg = MockAdminAPI.config;
    log(cfg, 'getSubscriptionPlans');
    await delay(cfg);

    return (walletsData as any).subscriptionPlans;
  }

  static async getAllPayouts(params?: {
    status?: string;
  } & PaginationParams): Promise<PaginatedResult<Payout>> {
    const cfg = MockAdminAPI.config;
    log(cfg, 'getAllPayouts', params);
    await delay(cfg);

    let payouts = (walletsData as any).payouts as Payout[];
    if (params?.status) {
      payouts = payouts.filter((p) => p.status === params.status);
    }

    return paginate(payouts, { page: params?.page, pageSize: params?.pageSize });
  }

  // ── DASHBOARD AGGREGATES ───────────────────────────────────────

  static async getDashboardStats(): Promise<{
    totalUsers: number;
    activeZones: number;
    totalMerchants: number;
    totalRunners: number;
    totalGmvPaise: number;
    totalGmvFormatted: string;
    activeOrders: number;
    suspendedAccounts: number;
    pendingKyc: number;
  }> {
    const cfg = MockAdminAPI.config;
    log(cfg, 'getDashboardStats');
    await delay(cfg);

    const users = (usersData as any).users as User[];
    const zones = ((territoriesData as any).zones as Zone[]).filter((z) => z.status === 'ACTIVE');
    const totalGmv = zones.reduce((sum, z) => sum + z.currentMonthGmvPaise, 0);

    return {
      totalUsers: users.length,
      activeZones: zones.length,
      totalMerchants: users.filter((u) => u.roles.includes('SHOP_OWNER' as UserRole)).length,
      totalRunners: users.filter((u) => u.roles.includes('DELIVERY_RUNNER' as UserRole)).length,
      totalGmvPaise: totalGmv,
      totalGmvFormatted: `₹${(totalGmv / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      activeOrders: zones.reduce((sum, z) => sum + z.totalActiveOrders, 0),
      suspendedAccounts: users.filter((u) => u.accountStatus === 'SUSPENDED').length,
      pendingKyc: users.filter((u) =>
        ['NOT_STARTED', 'DOCUMENTS_UPLOADED', 'UNDER_REVIEW'].includes(u.kycStatus)
      ).length,
    };
  }
}
