/**
 * @localsampark/types — agriculture.ts
 * ══════════════════════════════════════════════════════════════════
 * Phase 3: Smart Farming & Agri-Data Engine
 * Farm plots, crop rotations, APMC mandi rates, satellite imagery,
 * weather alerts, soil analysis, and government scheme eligibility.
 * ══════════════════════════════════════════════════════════════════
 */

import { GeoPoint } from './identity';

// ─── ENUMS ────────────────────────────────────────────────────────

export enum CropSeason {
  KHARIF = 'KHARIF',     // Jun–Oct (monsoon crops: rice, soybean, cotton)
  RABI = 'RABI',         // Nov–Mar (winter crops: wheat, gram, onion)
  ZAID = 'ZAID',         // Mar–Jun (summer crops: watermelon, cucumber)
  PERENNIAL = 'PERENNIAL', // Year-round (sugarcane, banana, pomegranate)
}

export enum CropStatus {
  SOWING = 'SOWING',
  GERMINATION = 'GERMINATION',
  VEGETATIVE = 'VEGETATIVE',
  FLOWERING = 'FLOWERING',
  FRUITING = 'FRUITING',
  HARVESTING = 'HARVESTING',
  POST_HARVEST = 'POST_HARVEST',
  FALLOW = 'FALLOW',
}

export enum IrrigationType {
  RAINFED = 'RAINFED',
  BOREWELL = 'BOREWELL',
  CANAL = 'CANAL',
  DRIP = 'DRIP',
  SPRINKLER = 'SPRINKLER',
  LIFT_IRRIGATION = 'LIFT_IRRIGATION',
  TANK = 'TANK',
}

export enum SoilType {
  BLACK_COTTON = 'BLACK_COTTON',       // Regur — Maharashtra
  RED_LATERITE = 'RED_LATERITE',
  ALLUVIAL = 'ALLUVIAL',
  SANDY_LOAM = 'SANDY_LOAM',
  CLAY_LOAM = 'CLAY_LOAM',
  SALINE = 'SALINE',
}

export enum WeatherAlertSeverity {
  INFO = 'INFO',
  ADVISORY = 'ADVISORY',
  WATCH = 'WATCH',
  WARNING = 'WARNING',
  EXTREME = 'EXTREME',
}

export enum WeatherAlertType {
  HEAVY_RAIN = 'HEAVY_RAIN',
  DROUGHT = 'DROUGHT',
  FROST = 'FROST',
  HEATWAVE = 'HEATWAVE',
  HAILSTORM = 'HAILSTORM',
  CYCLONE = 'CYCLONE',
  FLOOD = 'FLOOD',
  PEST_OUTBREAK = 'PEST_OUTBREAK',
  WIND = 'WIND',
}

export enum APMCGrade {
  FAQ = 'FAQ',       // Fair Average Quality
  SUPER = 'SUPER',
  PREMIUM = 'PREMIUM',
  REJECT = 'REJECT',
}

// ─── FARM ENTITY ─────────────────────────────────────────────────

export interface Farm {
  id: string;
  ownerId: string;           // cross-refs users.json
  zoneId: string;            // cross-refs territories.json

  name: string;
  farmSizeAcres: number;
  farmSizeHectares: number;  // Pre-computed
  soilType: SoilType;
  irrigationType: IrrigationType;
  isOrganicCertified: boolean;
  organicCertId?: string;

  // ── Location ──
  centerPoint: GeoPoint;
  /** Polygon boundary vertices (GeoJSON [lng, lat] standard) */
  boundaryPolygon: [number, number][];

  // ── Land Records ──
  landRecordIds: string[];   // 7/12 extract numbers
  /** Khasra/Survey number */
  surveyNumber: string;
  /** Gram Panchayat */
  gramPanchayat: string;
  taluka: string;
  district: string;

  // ── Infrastructure ──
  hasFencing: boolean;
  hasElectricity: boolean;
  hasRoadAccess: boolean;
  storageCapacityQuintal: number;
  /** Water source details */
  waterSourceDetails: string;

  // ── Current Crops ──
  activeCrops: CropEntry[];
  /** Historical crop rotation data */
  cropHistory: CropHistoryEntry[];

  // ── Soil Analysis ──
  latestSoilReport?: SoilReport;

  createdAt: string;
  updatedAt: string;
}

export interface CropEntry {
  cropId: string;
  cropName: string;
  cropNameMarathi: string;
  variety: string;
  season: CropSeason;
  status: CropStatus;
  plotAreaAcres: number;
  sowingDate: string;
  expectedHarvestDate: string;
  actualHarvestDate?: string;
  /** Expected yield in quintal per acre */
  expectedYieldQuintalPerAcre: number;
  /** Actual yield (filled post-harvest) */
  actualYieldQuintalPerAcre?: number;
  /** NDVI health score 0-1 from latest satellite pass */
  ndviHealthScore?: number;
  /** Disease/pest alerts active */
  activeAlerts: string[];
}

export interface CropHistoryEntry {
  cropName: string;
  season: CropSeason;
  year: number;
  yieldQuintalPerAcre: number;
  revenueEarnedPaise: number;
}

export interface SoilReport {
  reportId: string;
  testedAt: string;
  labName: string;
  /** pH value (ideal: 6.0-7.5 for most crops) */
  phLevel: number;
  /** Organic carbon percentage */
  organicCarbonPercent: number;
  /** Nitrogen kg/hectare */
  nitrogenKgPerHa: number;
  /** Phosphorus kg/hectare */
  phosphorusKgPerHa: number;
  /** Potassium kg/hectare */
  potassiumKgPerHa: number;
  /** Electrical conductivity dS/m */
  ecDsPerM: number;
  /** Deficiencies detected */
  deficiencies: string[];
  /** Recommendations */
  recommendations: string[];
}

// ─── APMC MANDI RATES ───────────────────────────────────────────

export interface APMCMandiRate {
  id: string;
  /** APMC market name */
  mandiName: string;
  mandiCode: string;
  district: string;
  state: string;

  commodity: string;
  commodityMarathi: string;
  variety: string;
  grade: APMCGrade;

  /** Minimum price per quintal in paise */
  minPricePaise: number;
  minPriceFormatted: string;
  /** Maximum price per quintal in paise */
  maxPricePaise: number;
  maxPriceFormatted: string;
  /** Modal (most common) price per quintal in paise */
  modalPricePaise: number;
  modalPriceFormatted: string;

  /** Arrival quantity in quintals */
  arrivalQuintal: number;
  /** MSP (Minimum Support Price) in paise/quintal if applicable */
  mspPaise?: number;
  /** Whether current modal is above MSP */
  isAboveMsp?: boolean;

  /** Price trend compared to last week */
  weeklyTrend: 'UP' | 'DOWN' | 'STABLE';
  weeklyChangePercent: number;

  /** Recorded date */
  reportDate: string;
  /** Data source */
  source: string;
}

// ─── WEATHER ─────────────────────────────────────────────────────

export interface WeatherForecast {
  locationId: string;
  locationName: string;
  geoPoint: GeoPoint;
  forecastDate: string;

  /** Temperature in Celsius */
  tempMinC: number;
  tempMaxC: number;
  /** Feels-like temperature */
  feelsLikeC: number;

  /** Humidity percentage */
  humidityPercent: number;
  /** Rainfall in mm */
  rainfallMm: number;
  /** Wind speed km/h */
  windSpeedKmh: number;
  windDirection: string;
  /** Cloud cover percentage */
  cloudCoverPercent: number;

  /** UV index */
  uvIndex: number;
  /** Air Quality Index (0-500 scale) */
  aqi?: number;

  /** Overall condition */
  condition: string;
  conditionIcon: string;

  /** Sunrise/sunset for farm scheduling */
  sunriseTime: string;
  sunsetTime: string;
}

export interface WeatherAlert {
  id: string;
  type: WeatherAlertType;
  severity: WeatherAlertSeverity;
  title: string;
  titleMarathi: string;
  description: string;
  descriptionMarathi: string;

  /** Affected zones/districts */
  affectedZoneIds: string[];
  affectedDistricts: string[];

  /** Recommended actions for farmers */
  farmerAdvisory: string[];
  farmerAdvisoryMarathi: string[];

  /** Validity period */
  validFrom: string;
  validUntil: string;
  issuedAt: string;
  issuedBy: string;

  /** Whether this alert is currently active */
  isActive: boolean;
}

// ─── GOVERNMENT SCHEMES ──────────────────────────────────────────

export interface GovtScheme {
  id: string;
  name: string;
  nameMarathi: string;
  department: string;
  description: string;
  descriptionMarathi: string;

  /** Eligibility criteria */
  eligibilityCriteria: string[];
  /** Benefit amount in paise (0 = non-monetary) */
  benefitAmountPaise: number;
  benefitDescription: string;

  /** Application deadline */
  applicationDeadline?: string;
  /** Application URL */
  applicationUrl?: string;

  /** Whether auto-check can determine eligibility */
  autoEligibilityCheck: boolean;

  isActive: boolean;
  validFrom: string;
  validUntil?: string;
}
