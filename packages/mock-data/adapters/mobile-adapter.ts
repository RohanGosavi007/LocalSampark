/**
 * @localsampark/mock-data — Mobile Adapter (React Native / Expo)
 * ══════════════════════════════════════════════════════════════════
 * Async Mock Adapter for apps/mobile (Expo Router + React Query).
 * Designed for offline-first architecture with:
 *   - AsyncStorage cache layer simulation
 *   - Network-aware latency (simulates 2G/3G/4G/WiFi)
 *   - Optimistic update helpers
 *   - React Query queryFn-compatible signatures
 *
 * Usage in apps/mobile:
 *   import { MockMobileAPI, NetworkProfile } from '@localsampark/mock-data/adapters/mobile';
 *   
 *   // In React Query:
 *   const { data } = useQuery({
 *     queryKey: ['user', userId],
 *     queryFn: () => MockMobileAPI.getUserById(userId),
 *   });
 *
 *   // Simulate poor network for demo:
 *   MockMobileAPI.setNetworkProfile('2G_RURAL');
 * ══════════════════════════════════════════════════════════════════
 */

import type { User, UserRole, GeoPoint } from '@localsampark/types';
import type { Zone, Ward } from '@localsampark/types';
import type {
  Wallet, LedgerEntry, UserSubscription,
  SubscriptionPlan, UserFinancialSnapshot,
} from '@localsampark/types';

// ─── SEED DATA IMPORTS ────────────────────────────────────────────
// For React Native, these are bundled at build time via Metro resolver

import usersData from '../seeds/users.json';
import territoriesData from '../seeds/territories.json';
import walletsData from '../seeds/wallets.json';

// ─── NETWORK SIMULATION ─────────────────────────────────────────

export type NetworkProfile = '4G_URBAN' | '3G_SUBURBAN' | '2G_RURAL' | 'WIFI' | 'OFFLINE';

interface NetworkConfig {
  latencyMs: [number, number];
  jitterMs: number;
  packetLossRate: number; // Probability of simulated timeout
  bandwidthLabel: string;
}

const NETWORK_PROFILES: Record<NetworkProfile, NetworkConfig> = {
  WIFI: {
    latencyMs: [20, 80],
    jitterMs: 10,
    packetLossRate: 0.0,
    bandwidthLabel: 'WiFi (~50 Mbps)',
  },
  '4G_URBAN': {
    latencyMs: [50, 200],
    jitterMs: 30,
    packetLossRate: 0.01,
    bandwidthLabel: '4G Urban (~15 Mbps)',
  },
  '3G_SUBURBAN': {
    latencyMs: [200, 800],
    jitterMs: 100,
    packetLossRate: 0.05,
    bandwidthLabel: '3G Suburban (~2 Mbps)',
  },
  '2G_RURAL': {
    latencyMs: [800, 3000],
    jitterMs: 500,
    packetLossRate: 0.15,
    bandwidthLabel: '2G Rural (~100 Kbps)',
  },
  OFFLINE: {
    latencyMs: [0, 0],
    jitterMs: 0,
    packetLossRate: 1.0,
    bandwidthLabel: 'Offline',
  },
};

// ─── OFFLINE CACHE SIMULATION ────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

class MockOfflineCache {
  private store: Map<string, CacheEntry<unknown>> = new Map();

  set<T>(key: string, data: T, ttlMs: number = 300_000): void {
    this.store.set(key, { data, cachedAt: Date.now(), ttlMs });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────

function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const calc =
    sinDLat * sinDLat +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sinDLon * sinDLon;
  return R * 2 * Math.atan2(Math.sqrt(calc), Math.sqrt(1 - calc));
}

function formatINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ─── MOCK MOBILE API ─────────────────────────────────────────────

export class MockMobileAPI {
  private static networkProfile: NetworkProfile = '4G_URBAN';
  private static cache = new MockOfflineCache();
  private static verbose = __DEV__ ?? false;

  /** Switch network simulation profile (useful for demo presentations) */
  static setNetworkProfile(profile: NetworkProfile): void {
    MockMobileAPI.networkProfile = profile;
    if (MockMobileAPI.verbose) {
      const cfg = NETWORK_PROFILES[profile];
      console.log(`[MockMobileAPI] Network → ${cfg.bandwidthLabel}`);
    }
  }

  static getNetworkProfile(): NetworkProfile {
    return MockMobileAPI.networkProfile;
  }

  /** Clear all cached data (simulate fresh install) */
  static clearCache(): void {
    MockMobileAPI.cache.clear();
  }

  // ── INTERNAL ──

  private static async simulateNetwork<T>(
    cacheKey: string,
    fetcher: () => T,
    cacheTtlMs: number = 300_000
  ): Promise<T> {
    const config = NETWORK_PROFILES[MockMobileAPI.networkProfile];

    // OFFLINE → return cached data or throw
    if (MockMobileAPI.networkProfile === 'OFFLINE') {
      const cached = MockMobileAPI.cache.get<T>(cacheKey);
      if (cached) {
        if (MockMobileAPI.verbose) console.log(`[MockMobileAPI] OFFLINE cache hit: ${cacheKey}`);
        return cached;
      }
      throw new Error('[MockMobileAPI] OFFLINE: No cached data available. Please check your network connection.');
    }

    // Simulate latency
    const [min, max] = config.latencyMs;
    const baseLatency = Math.floor(Math.random() * (max - min + 1)) + min;
    const jitter = Math.floor(Math.random() * config.jitterMs * 2) - config.jitterMs;
    const totalLatency = Math.max(0, baseLatency + jitter);
    await new Promise((resolve) => setTimeout(resolve, totalLatency));

    // Simulate packet loss
    if (Math.random() < config.packetLossRate) {
      const cached = MockMobileAPI.cache.get<T>(cacheKey);
      if (cached) {
        if (MockMobileAPI.verbose) console.log(`[MockMobileAPI] Packet loss, returning stale cache: ${cacheKey}`);
        return cached;
      }
      throw new Error(`[MockMobileAPI] Network request failed (simulated packet loss on ${config.bandwidthLabel})`);
    }

    // Success — fetch and cache
    const result = fetcher();
    MockMobileAPI.cache.set(cacheKey, result, cacheTtlMs);
    return result;
  }

  // ── USER / AUTH ────────────────────────────────────────────────

  /** Get current authenticated user profile (simulates /me endpoint) */
  static async getCurrentUser(userId: string = 'usr_consumer_01'): Promise<User> {
    return MockMobileAPI.simulateNetwork(`user:${userId}`, () => {
      const user = (usersData as any).users.find((u: User) => u.id === userId);
      if (!user) throw new Error(`User ${userId} not found`);
      return user;
    });
  }

  static async getUserById(userId: string): Promise<User | null> {
    return MockMobileAPI.simulateNetwork(`user:${userId}`, () => {
      return (usersData as any).users.find((u: User) => u.id === userId) ?? null;
    });
  }

  // ── ZONES / TERRITORY ─────────────────────────────────────────

  /** Get zones near a GPS coordinate, sorted by distance */
  static async getNearbyZones(
    userLocation: GeoPoint,
    radiusKm: number = 15
  ): Promise<(Zone & { distanceKm: number })[]> {
    return MockMobileAPI.simulateNetwork(
      `zones:nearby:${userLocation.latitude}:${userLocation.longitude}:${radiusKm}`,
      () => {
        const zones = (territoriesData as any).zones as Zone[];
        return zones
          .filter((z) => z.status === 'ACTIVE' || z.status === 'LAUNCHING')
          .map((z) => ({
            ...z,
            distanceKm: parseFloat(
              haversineDistanceKm(userLocation, z.centerPoint).toFixed(2)
            ),
          }))
          .filter((z) => z.distanceKm <= radiusKm)
          .sort((a, b) => a.distanceKm - b.distanceKm);
      },
      600_000 // Cache nearby zones for 10 minutes
    );
  }

  /** Get a single zone by ID */
  static async getZoneById(zoneId: string): Promise<Zone | null> {
    return MockMobileAPI.simulateNetwork(`zone:${zoneId}`, () => {
      return (territoriesData as any).zones.find((z: Zone) => z.id === zoneId) ?? null;
    });
  }

  /** Get wards for a zone */
  static async getWardsByZoneId(zoneId: string): Promise<Ward[]> {
    return MockMobileAPI.simulateNetwork(`wards:${zoneId}`, () => {
      return (territoriesData as any).wards.filter((w: Ward) => w.zoneId === zoneId);
    });
  }

  /** Check if a coordinate falls within any active zone */
  static async resolveZoneForLocation(location: GeoPoint): Promise<Zone | null> {
    return MockMobileAPI.simulateNetwork(
      `zone:resolve:${location.latitude}:${location.longitude}`,
      () => {
        const zones = (territoriesData as any).zones as Zone[];
        // Simple bounding box check (production would use ray casting on polygon)
        return (
          zones.find((z) => {
            if (z.status !== 'ACTIVE' && z.status !== 'LAUNCHING') return false;
            const bb = z.boundingBox;
            return (
              location.latitude >= bb.southWest.latitude &&
              location.latitude <= bb.northEast.latitude &&
              location.longitude >= bb.southWest.longitude &&
              location.longitude <= bb.northEast.longitude
            );
          }) ?? null
        );
      }
    );
  }

  // ── WALLET & FINANCE ──────────────────────────────────────────

  /** Get wallet balances for the current user */
  static async getMyWallets(userId: string = 'usr_consumer_01'): Promise<Wallet[]> {
    return MockMobileAPI.simulateNetwork(`wallets:${userId}`, () => {
      return (walletsData as any).wallets.filter((w: Wallet) => w.userId === userId);
    });
  }

  /** Get recent transactions for the current user */
  static async getMyTransactions(
    userId: string = 'usr_consumer_01',
    limit: number = 20
  ): Promise<LedgerEntry[]> {
    return MockMobileAPI.simulateNetwork(`transactions:${userId}:${limit}`, () => {
      return (walletsData as any).ledgerEntries
        .filter((t: LedgerEntry) => t.userId === userId)
        .slice(0, limit);
    });
  }

  /** Get active subscription for the current user */
  static async getMySubscription(
    userId: string = 'usr_consumer_01'
  ): Promise<UserSubscription | null> {
    return MockMobileAPI.simulateNetwork(`subscription:${userId}`, () => {
      return (
        (walletsData as any).userSubscriptions.find(
          (s: UserSubscription) =>
            s.userId === userId && ['ACTIVE', 'TRIAL'].includes(s.status)
        ) ?? null
      );
    });
  }

  /** Get all available subscription plans */
  static async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return MockMobileAPI.simulateNetwork(
      'subscription:plans',
      () => (walletsData as any).subscriptionPlans,
      3_600_000 // Cache plans for 1 hour
    );
  }

  /** Get full financial snapshot (wallets + txns + subscription) */
  static async getMyFinancialSnapshot(
    userId: string = 'usr_consumer_01'
  ): Promise<UserFinancialSnapshot | null> {
    return MockMobileAPI.simulateNetwork(`financial:${userId}`, () => {
      const wallets = (walletsData as any).wallets.filter(
        (w: Wallet) => w.userId === userId
      );
      if (wallets.length === 0) return null;

      const transactions = (walletsData as any).ledgerEntries.filter(
        (t: LedgerEntry) => t.userId === userId
      );
      const subscription = (walletsData as any).userSubscriptions.find(
        (s: UserSubscription) =>
          s.userId === userId && ['ACTIVE', 'TRIAL'].includes(s.status)
      );

      const totalAvailable = wallets.reduce(
        (sum: number, w: Wallet) => sum + w.balancePaise,
        0
      );
      const totalHeld = wallets.reduce(
        (sum: number, w: Wallet) => sum + w.heldAmountPaise,
        0
      );

      return {
        userId,
        wallets,
        activeSubscription: subscription ?? undefined,
        recentTransactions: transactions.slice(0, 20),
        pendingPayouts: [],
        totalAvailableBalancePaise: totalAvailable,
        totalAvailableFormatted: formatINR(totalAvailable),
        totalHeldPaise: totalHeld,
      };
    });
  }

  // ── CONNECTIVITY DIAGNOSTICS (for the Settings/Debug screen) ──

  static getDiagnostics(): {
    networkProfile: NetworkProfile;
    networkLabel: string;
    cachedEntries: number;
    latencyRange: [number, number];
    packetLossRate: number;
  } {
    const config = NETWORK_PROFILES[MockMobileAPI.networkProfile];
    return {
      networkProfile: MockMobileAPI.networkProfile,
      networkLabel: config.bandwidthLabel,
      cachedEntries: MockMobileAPI.cache.size,
      latencyRange: config.latencyMs,
      packetLossRate: config.packetLossRate,
    };
  }
}

// ─── CONVENIENCE: React Query Key Factory ────────────────────────

export const mockQueryKeys = {
  user: (id: string) => ['user', id] as const,
  nearbyZones: (lat: number, lng: number) => ['zones', 'nearby', lat, lng] as const,
  zone: (id: string) => ['zone', id] as const,
  wards: (zoneId: string) => ['wards', zoneId] as const,
  wallets: (userId: string) => ['wallets', userId] as const,
  transactions: (userId: string) => ['transactions', userId] as const,
  subscription: (userId: string) => ['subscription', userId] as const,
  subscriptionPlans: () => ['subscription', 'plans'] as const,
  financial: (userId: string) => ['financial', userId] as const,
} as const;
