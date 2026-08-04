/**
 * @localsampark/types — identity.ts
 * ══════════════════════════════════════════════════════════════════
 * Phase 1: Core Identity & Role Engine
 * Production-grade type definitions for multi-role user identity,
 * KYC verification, and authentication state machines.
 * ══════════════════════════════════════════════════════════════════
 */

// ─── ENUMS ────────────────────────────────────────────────────────

/** Every actor in the system maps to one or more of these roles */
export enum UserRole {
  CONSUMER = 'CONSUMER',
  SHOP_OWNER = 'SHOP_OWNER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  DELIVERY_RUNNER = 'DELIVERY_RUNNER',
  FIELD_AGENT = 'FIELD_AGENT',
  FRANCHISE_PARTNER = 'FRANCHISE_PARTNER',
  SUPER_ADMIN = 'SUPER_ADMIN',
  SOCIETY_ADMIN = 'SOCIETY_ADMIN',
  FARMER = 'FARMER',
  VOLUNTEER = 'VOLUNTEER',
}

/** KYC verification state machine */
export enum KYCStatus {
  NOT_STARTED = 'NOT_STARTED',
  DOCUMENTS_UPLOADED = 'DOCUMENTS_UPLOADED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
}

/** Account lifecycle state machine */
export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  DORMANT = 'DORMANT',           // No activity >90 days
  SOFT_DELETED = 'SOFT_DELETED', // GDPR-style soft delete
}

/** Authentication provider enum */
export enum AuthProvider {
  EMAIL_PASSWORD = 'EMAIL_PASSWORD',
  PHONE_OTP = 'PHONE_OTP',
  GOOGLE_OAUTH = 'GOOGLE_OAUTH',
  APPLE_ID = 'APPLE_ID',
  BIOMETRIC = 'BIOMETRIC',
}

/** Gender enum for demographic data */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NON_BINARY = 'NON_BINARY',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/** Preferred language */
export enum Language {
  ENGLISH = 'en',
  HINDI = 'hi',
  MARATHI = 'mr',
  GUJARATI = 'gu',
  KANNADA = 'kn',
  TELUGU = 'te',
}

// ─── VALUE OBJECTS ────────────────────────────────────────────────

/** INR monetary value — integers in paise to prevent floating-point drift */
export interface MoneyINR {
  /** Amount in paise (₹1 = 100 paise). Use integer arithmetic only. */
  amountPaise: number;
  /** Pre-formatted display string, e.g. "₹1,250.00" */
  displayFormatted: string;
  /** ISO 4217 currency code, always "INR" */
  currency: 'INR';
}

/** GPS coordinate with optional accuracy metadata */
export interface GeoPoint {
  latitude: number;   // WGS-84
  longitude: number;  // WGS-84
  /** Accuracy in meters (from device GPS) */
  accuracyMeters?: number;
  /** Altitude in meters above sea level */
  altitudeMeters?: number;
  /** ISO 8601 timestamp of when this reading was taken */
  capturedAt?: string;
}

/** Structured Indian postal address */
export interface IndianAddress {
  line1: string;
  line2?: string;
  landmark?: string;
  ward?: string;
  city: string;
  taluka?: string;
  district: string;
  state: string;
  pincode: string;
  geoPoint: GeoPoint;
}

/** Aadhaar-based KYC document reference */
export interface KYCDocument {
  documentType: 'AADHAAR' | 'PAN' | 'VOTER_ID' | 'DRIVING_LICENSE' | 'PASSPORT' | 'GST_CERTIFICATE' | 'SHOP_LICENSE' | 'FSSAI';
  documentNumber: string;
  /** Masked display, e.g. "XXXX XXXX 1234" */
  maskedNumber: string;
  isVerified: boolean;
  verifiedAt?: string;
  expiresAt?: string;
  /** S3/CDN URL for document scan (encrypted at rest) */
  documentUrl?: string;
  rejectionReason?: string;
}

// ─── ROLE-SPECIFIC PROFILE EXTENSIONS ─────────────────────────────

export interface ConsumerProfile {
  preferredCategories: string[];
  defaultDeliveryAddress?: IndianAddress;
  loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  totalOrdersPlaced: number;
  totalSpentPaise: number;
  referralCode: string;
  referredByUserId?: string;
}

export interface ShopOwnerProfile {
  shopIds: string[];
  gstNumber?: string;
  fssaiNumber?: string;
  businessType: 'SOLE_PROPRIETOR' | 'PARTNERSHIP' | 'PVT_LTD' | 'LLP';
  bankAccount: BankAccountInfo;
  commissionTier: 'STANDARD' | 'GOLD' | 'ENTERPRISE';
  monthlyGmvPaise: number;
}

export interface DeliveryRunnerProfile {
  vehicleType: 'BICYCLE' | 'MOTORCYCLE' | 'AUTO_RICKSHAW' | 'MINI_VAN' | 'WALKING';
  vehicleRegistration?: string;
  currentZoneId: string;
  isOnline: boolean;
  lastKnownLocation?: GeoPoint;
  totalDeliveries: number;
  avgRating: number;
  /** Whether runner has completed mandatory safety training */
  safetyTrainingCompleted: boolean;
  /** Bag/equipment deposit paid (in paise) */
  equipmentDepositPaise: number;
}

export interface ServiceProviderProfile {
  serviceCategories: string[];
  experienceYears: number;
  certifications: string[];
  availabilitySlots: WeeklyAvailability;
  avgRating: number;
  totalJobsCompleted: number;
  /** Radius in km the provider is willing to travel */
  serviceRadiusKm: number;
}

export interface FieldAgentProfile {
  assignedTerritoryIds: string[];
  onboardedMerchants: number;
  monthlyTargetMerchants: number;
  currentMonthOnboarded: number;
  incentiveSlabId: string;
}

export interface FranchisePartnerProfile {
  franchiseTerritoryIds: string[];
  investmentTier: 'MICRO' | 'STANDARD' | 'PREMIUM' | 'MEGA';
  monthlyRevenuePaise: number;
  teamSize: number;
  contractStartDate: string;
  contractEndDate: string;
}

export interface FarmerProfile {
  farmSizeAcres: number;
  primaryCrops: string[];
  landRecordIds: string[];
  irrigationType: 'RAINFED' | 'BOREWELL' | 'CANAL' | 'DRIP' | 'SPRINKLER';
  soilType: string;
  isOrganicCertified: boolean;
}

export interface BankAccountInfo {
  accountHolderName: string;
  bankName: string;
  ifscCode: string;
  /** Masked account number, e.g. "XXXX1234" */
  maskedAccountNumber: string;
  accountType: 'SAVINGS' | 'CURRENT';
  isVerified: boolean;
  upiId?: string;
}

export interface WeeklyAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  startTime: string; // "HH:mm" 24hr
  endTime: string;   // "HH:mm" 24hr
}

// ─── NOTIFICATION & DEVICE ───────────────────────────────────────

export interface DeviceInfo {
  deviceId: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  osVersion: string;
  appVersion: string;
  fcmToken?: string;
  /** Last time a push notification was successfully delivered */
  lastPushDeliveredAt?: string;
  /** Offline-first: flag indicating device has unsynced local data */
  hasUnsyncedData: boolean;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  /** Quiet hours — no notifications sent during this window */
  quietHoursStart?: string; // "HH:mm"
  quietHoursEnd?: string;   // "HH:mm"
  /** Per-category opt-outs */
  mutedCategories: string[];
}

// ─── MASTER USER ENTITY ──────────────────────────────────────────

export interface User {
  /** Globally unique user ID, prefixed: usr_ */
  id: string;
  /** Display name (can be shop name for SHOP_OWNER) */
  displayName: string;
  firstName: string;
  lastName: string;
  /** E.164 format, e.g. "+919876543210" */
  phoneNumber: string;
  /** Optional — many Indian users register phone-only */
  email?: string;
  gender: Gender;
  dateOfBirth?: string; // ISO 8601 date
  preferredLanguage: Language;
  avatarUrl?: string;

  // ── Role & Status ──
  /** A user can hold multiple roles simultaneously */
  roles: UserRole[];
  primaryRole: UserRole;
  accountStatus: AccountStatus;
  kycStatus: KYCStatus;
  kycDocuments: KYCDocument[];

  // ── Auth ──
  authProviders: AuthProvider[];
  lastLoginAt: string;
  lastLoginIp?: string;
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;

  // ── Location & Territory ──
  primaryAddress: IndianAddress;
  /** The territory zone this user is assigned to / resides in */
  homeZoneId: string;
  homeTerritoryId: string;

  // ── Role-specific profiles (populated based on roles[]) ──
  consumerProfile?: ConsumerProfile;
  shopOwnerProfile?: ShopOwnerProfile;
  deliveryRunnerProfile?: DeliveryRunnerProfile;
  serviceProviderProfile?: ServiceProviderProfile;
  fieldAgentProfile?: FieldAgentProfile;
  franchisePartnerProfile?: FranchisePartnerProfile;
  farmerProfile?: FarmerProfile;

  // ── Device & Notifications ──
  devices: DeviceInfo[];
  notificationPreferences: NotificationPreferences;

  // ── Timestamps ──
  createdAt: string;  // ISO 8601
  updatedAt: string;
  deletedAt?: string; // Soft delete

  // ── Edge-case flags ──
  /** User was force-migrated from legacy system */
  isLegacyMigrated: boolean;
  /** User is a test/demo account (excluded from analytics) */
  isTestAccount: boolean;
  /** User has violated community guidelines */
  hasCommunityStrikes: boolean;
  communityStrikeCount: number;
}
