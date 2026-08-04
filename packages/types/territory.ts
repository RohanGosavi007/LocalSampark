/**
 * @localsampark/types — territory.ts
 * ══════════════════════════════════════════════════════════════════
 * Phase 1: Territory Hierarchy & Zone Engine
 * State ➔ District ➔ Taluka/City ➔ Zone ➔ Hyperlocal Ward
 * All geo-data uses hyper-accurate Pune/Maharashtra coordinates.
 * ══════════════════════════════════════════════════════════════════
 */

import { GeoPoint, MoneyINR } from './identity';

// ─── ENUMS ────────────────────────────────────────────────────────

/** Territory operational status */
export enum TerritoryStatus {
  ACTIVE = 'ACTIVE',
  LAUNCHING = 'LAUNCHING',       // Pre-launch phase, onboarding merchants
  PAUSED = 'PAUSED',             // Temporarily halted operations
  DECOMMISSIONED = 'DECOMMISSIONED',
  PILOT = 'PILOT',               // Beta/pilot territory
}

/** Zone density classification for logistics optimization */
export enum ZoneDensity {
  ULTRA_DENSE = 'ULTRA_DENSE',   // >5000 households/sq km (city core)
  DENSE = 'DENSE',               // 2000-5000 (suburban)
  MODERATE = 'MODERATE',         // 500-2000 (peri-urban)
  SPARSE = 'SPARSE',             // 100-500 (rural town)
  REMOTE = 'REMOTE',             // <100 (deep rural / tribal)
}

/** Territory tier determines feature availability & commission rates */
export enum TerritoryTier {
  TIER_1 = 'TIER_1',  // Metro cities
  TIER_2 = 'TIER_2',  // District HQs
  TIER_3 = 'TIER_3',  // Taluka towns
  TIER_4 = 'TIER_4',  // Rural centers
  TIER_5 = 'TIER_5',  // Remote / tribal
}

/** Day of week for operating hours */
export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

// ─── GEO PRIMITIVES ──────────────────────────────────────────────

/** A closed polygon defining an operational boundary */
export interface BoundingPolygon {
  /** Ordered array of vertices. First and last point MUST be identical to close the polygon. */
  coordinates: [number, number][]; // [longitude, latitude] pairs (GeoJSON standard)
  /** Area in sq km, pre-computed for quick filtering */
  areaSqKm: number;
}

/** Bounding box for fast spatial queries */
export interface BoundingBox {
  northEast: GeoPoint;
  southWest: GeoPoint;
}

// ─── STATE ────────────────────────────────────────────────────────

export interface State {
  id: string;         // e.g. "state_mh"
  name: string;       // "Maharashtra"
  code: string;       // "MH"
  officialLanguages: string[];
  capitalCity: string;
  totalDistricts: number;
  isActive: boolean;
}

// ─── DISTRICT ─────────────────────────────────────────────────────

export interface District {
  id: string;          // e.g. "dist_pune"
  stateId: string;
  name: string;        // "Pune"
  code: string;        // "PUNE"
  headquartersCity: string;
  totalTalukas: number;
  boundingBox: BoundingBox;
  populationEstimate: number;
  isActive: boolean;
}

// ─── TALUKA / CITY ────────────────────────────────────────────────

export interface Taluka {
  id: string;          // e.g. "tal_haveli"
  districtId: string;
  name: string;        // "Haveli"
  /** Whether this is an urban corporation, nagar palika, or rural taluka */
  adminType: 'MUNICIPAL_CORPORATION' | 'NAGAR_PALIKA' | 'NAGAR_PANCHAYAT' | 'TALUKA_RURAL';
  totalZones: number;
  boundingBox: BoundingBox;
  isActive: boolean;
}

// ─── ZONE ─────────────────────────────────────────────────────────

export interface Zone {
  /** Globally unique zone ID, e.g. "zone_kothrud" */
  id: string;
  talukaId: string;
  districtId: string;
  stateId: string;

  name: string;          // "Kothrud"
  slug: string;          // "kothrud"
  displayName: string;   // "Kothrud, Pune"

  status: TerritoryStatus;
  tier: TerritoryTier;
  density: ZoneDensity;

  // ── Geo ──
  centerPoint: GeoPoint;
  boundingPolygon: BoundingPolygon;
  boundingBox: BoundingBox;
  /** Operational radius from center in km */
  operationalRadiusKm: number;

  // ── Demographics ──
  populationEstimate: number;
  householdEstimate: number;
  avgHouseholdIncomePaise: number;
  primaryLanguages: string[];

  // ── Operations ──
  operatingHours: ZoneOperatingHours;
  /** Maximum delivery distance allowed in this zone (km) */
  maxDeliveryRadiusKm: number;
  /** Base delivery fee in paise */
  baseDeliveryFeePaise: number;
  /** Per-km surcharge in paise */
  perKmSurchargePaise: number;
  /** Surge multiplier during peak hours (1.0 = no surge) */
  currentSurgeMultiplier: number;
  /** Number of active delivery runners currently online in this zone */
  activeRunnersCount: number;

  // ── Franchise & Revenue ──
  franchisePartnerId?: string;
  /** Platform commission percentage (e.g. 12.5 means 12.5%) */
  platformCommissionPercent: number;
  /** Monthly GMV target for this zone in paise */
  monthlyGmvTargetPaise: number;
  /** Current month's GMV in paise */
  currentMonthGmvPaise: number;

  // ── Counts ──
  totalMerchants: number;
  totalConsumers: number;
  totalServiceProviders: number;
  totalActiveOrders: number;

  // ── Feature flags ──
  features: ZoneFeatureFlags;

  // ── Timestamps ──
  launchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ZoneOperatingHours {
  [key: string]: { // DayOfWeek string key
    isOpen: boolean;
    openTime: string;   // "HH:mm"
    closeTime: string;  // "HH:mm"
    /** Whether late-night delivery is available */
    lateNightEnabled: boolean;
    lateNightEndTime?: string;
  };
}

export interface ZoneFeatureFlags {
  /** Whether this zone supports instant delivery (<30 min) */
  instantDeliveryEnabled: boolean;
  /** Whether scheduled delivery is available */
  scheduledDeliveryEnabled: boolean;
  /** Whether Krishi/Agriculture module is active */
  krishiModuleEnabled: boolean;
  /** Whether society management is available */
  societyManagementEnabled: boolean;
  /** Whether SOS/emergency services are active */
  sosEnabled: boolean;
  /** Whether group buying is available */
  groupBuyingEnabled: boolean;
  /** Whether cash-on-delivery is allowed */
  codEnabled: boolean;
  /** Whether offline mode sync is supported */
  offlineModeEnabled: boolean;
  /** Whether AR Virtual Try-On is active for shops */
  arTryOnEnabled: boolean;
  /** Whether multilingual voice search is active */
  voiceSearchEnabled: boolean;
}

// ─── HYPERLOCAL WARD ──────────────────────────────────────────────

/** Smallest operational unit — a ward or mohalla within a zone */
export interface Ward {
  id: string;          // e.g. "ward_kothrud_01"
  zoneId: string;
  name: string;        // "Paud Road – Vanaz Corner"
  wardNumber?: string; // Official municipal ward number
  centerPoint: GeoPoint;
  boundingPolygon: BoundingPolygon;
  /** Pincode(s) covering this ward */
  pincodes: string[];
  householdCount: number;
  /** Whether this ward has reliable internet connectivity */
  hasReliableConnectivity: boolean;
  /** Whether local language signage/UI is needed */
  requiresLocalLanguageUI: boolean;
  isActive: boolean;
}

// ─── TERRITORY AGGREGATE ─────────────────────────────────────────

/** Full hierarchical territory tree for a single operational area */
export interface TerritoryHierarchy {
  state: State;
  districts: District[];
  talukas: Taluka[];
  zones: Zone[];
  wards: Ward[];
}

// ─── SERVICE AREA MAPPING ────────────────────────────────────────

/** Maps a user or entity to the territory they operate in */
export interface TerritoryAssignment {
  id: string;
  entityId: string;       // User ID, Shop ID, etc.
  entityType: 'USER' | 'SHOP' | 'SERVICE_PROVIDER' | 'DELIVERY_RUNNER' | 'FRANCHISE';
  zoneId: string;
  wardIds: string[];      // Can operate across multiple wards
  assignedAt: string;
  assignedBy: string;     // Admin user ID
  isActive: boolean;
}
