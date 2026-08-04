/**
 * @localsampark/types — services.ts
 * ══════════════════════════════════════════════════════════════════
 * Phase 2: Multi-Role Service Provider Engine
 * Time-slot scheduling, rate cards, job cards, booking lifecycle,
 * and service catalog for Home Services, Salon, Medical, etc.
 * ══════════════════════════════════════════════════════════════════
 */

import { GeoPoint, IndianAddress, MoneyINR } from './identity';

// ─── ENUMS ────────────────────────────────────────────────────────

/** Service domain classification */
export enum ServiceDomain {
  ELECTRICAL = 'ELECTRICAL',
  PLUMBING = 'PLUMBING',
  CARPENTRY = 'CARPENTRY',
  PAINTING = 'PAINTING',
  CLEANING = 'CLEANING',
  PEST_CONTROL = 'PEST_CONTROL',
  AC_REPAIR = 'AC_REPAIR',
  APPLIANCE_REPAIR = 'APPLIANCE_REPAIR',
  SALON_AT_HOME = 'SALON_AT_HOME',
  MASSAGE_SPA = 'MASSAGE_SPA',
  TIFFIN_DELIVERY = 'TIFFIN_DELIVERY',
  LAUNDRY_DRY_CLEAN = 'LAUNDRY_DRY_CLEAN',
  TUTORING = 'TUTORING',
  PHOTOGRAPHY = 'PHOTOGRAPHY',
  CATERING = 'CATERING',
  DRIVER_ON_DEMAND = 'DRIVER_ON_DEMAND',
  PET_GROOMING = 'PET_GROOMING',
  YOGA_FITNESS = 'YOGA_FITNESS',
  MEDICAL_HOME_VISIT = 'MEDICAL_HOME_VISIT',
  LEGAL_CONSULTATION = 'LEGAL_CONSULTATION',
  CA_TAX_FILING = 'CA_TAX_FILING',
  MECHANIC_ROADSIDE = 'MECHANIC_ROADSIDE',
}

/** Service booking lifecycle state machine */
export enum BookingStatus {
  DRAFT = 'DRAFT',
  REQUESTED = 'REQUESTED',
  PROVIDER_ASSIGNED = 'PROVIDER_ASSIGNED',
  PROVIDER_EN_ROUTE = 'PROVIDER_EN_ROUTE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED_BY_CONSUMER = 'CANCELLED_BY_CONSUMER',
  CANCELLED_BY_PROVIDER = 'CANCELLED_BY_PROVIDER',
  NO_SHOW = 'NO_SHOW',
  DISPUTED = 'DISPUTED',
  REFUNDED = 'REFUNDED',
}

/** Slot availability state */
export enum SlotStatus {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
  BLOCKED = 'BLOCKED',       // Provider blocked manually
  BREAK = 'BREAK',           // Lunch / rest break
  BUFFER = 'BUFFER',         // Travel buffer between jobs
  EMERGENCY_HOLD = 'EMERGENCY_HOLD', // Held for SOS dispatch
}

/** Pricing model for a service */
export enum PricingModel {
  FIXED = 'FIXED',
  PER_HOUR = 'PER_HOUR',
  PER_UNIT = 'PER_UNIT',       // e.g. per room, per AC unit
  INSPECTION_QUOTE = 'INSPECTION_QUOTE', // Free inspection, then custom quote
  SUBSCRIPTION = 'SUBSCRIPTION', // Monthly retainer (e.g. tiffin, cleaning)
}

/** Job card priority */
export enum JobPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',          // e.g. burst pipe, power failure
  EMERGENCY = 'EMERGENCY',   // SOS-linked
}

// ─── SERVICE LISTING ─────────────────────────────────────────────

export interface ServiceListing {
  /** Globally unique, prefixed: svc_ */
  id: string;
  /** Provider user ID — cross-refs users.json */
  providerId: string;
  /** Zone(s) this service covers — cross-refs territories.json */
  zoneIds: string[];

  domain: ServiceDomain;
  name: string;
  slug: string;
  description: string;
  /** Detailed service inclusions */
  inclusions: string[];
  /** What's NOT included */
  exclusions: string[];
  /** Tags for search */
  tags: string[];

  // ── Pricing ──
  pricingModel: PricingModel;
  /** Base price in paise */
  basePricePaise: number;
  basePriceFormatted: string;
  /** Per-hour rate in paise (if PER_HOUR pricing) */
  perHourPaise?: number;
  /** Minimum charge in paise */
  minimumChargePaise: number;
  /** Inspection/visit fee in paise (deducted from final bill if hired) */
  visitFeePaise: number;
  /** Rate card with detailed pricing breakdown */
  rateCard: RateCardItem[];

  // ── Duration ──
  /** Estimated duration in minutes */
  estimatedDurationMinutes: number;
  /** Minimum booking duration in minutes */
  minBookingMinutes: number;
  /** Maximum booking duration in minutes */
  maxBookingMinutes: number;

  // ── Media ──
  imageUrls: string[];
  thumbnailUrl: string;
  /** Before/After gallery for completed jobs */
  portfolioUrls: string[];

  // ── Ratings ──
  avgRating: number;
  totalRatings: number;
  totalBookings: number;
  completionRate: number; // 0-100 percentage

  // ── Availability ──
  /** Whether this service is currently bookable */
  isActive: boolean;
  /** Whether instant booking is allowed (vs. request-based) */
  instantBookingEnabled: boolean;
  /** How far in advance can this be booked (days) */
  advanceBookingDays: number;
  /** Cancellation window in hours (free cancellation before this) */
  freeCancellationHours: number;

  // ── Requirements ──
  /** Items the consumer should have ready */
  consumerRequirements: string[];
  /** Tools/equipment the provider brings */
  providerEquipment: string[];

  createdAt: string;
  updatedAt: string;
}

export interface RateCardItem {
  itemName: string;
  description: string;
  pricePaise: number;
  priceFormatted: string;
  unit: string; // "per point", "per unit", "flat", "per hour"
  isPopular: boolean;
}

// ─── TIME SLOT SCHEDULING ────────────────────────────────────────

export interface ProviderDaySchedule {
  /** ISO date string "YYYY-MM-DD" */
  date: string;
  dayOfWeek: string;
  providerId: string;
  /** Whether the provider is working this day */
  isWorkingDay: boolean;
  slots: TimeSlotEntry[];
  /** Notes (e.g. "half day — family function") */
  dayNotes?: string;
}

export interface TimeSlotEntry {
  slotId: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  status: SlotStatus;
  /** Booking ID if BOOKED */
  bookingId?: string;
  /** Consumer name (for provider's view) */
  consumerName?: string;
  /** Service location for this slot */
  serviceLocation?: GeoPoint;
  /** Travel time from previous slot in minutes */
  travelTimeFromPreviousMinutes?: number;
}

export interface WeeklyScheduleMatrix {
  providerId: string;
  providerName: string;
  weekStartDate: string; // Monday ISO date
  weekEndDate: string;   // Sunday ISO date
  days: ProviderDaySchedule[];
  totalAvailableSlots: number;
  totalBookedSlots: number;
  utilizationPercent: number;
}

// ─── JOB CARD ────────────────────────────────────────────────────

export interface JobCard {
  /** Globally unique, prefixed: job_ */
  id: string;
  bookingId: string;
  providerId: string;
  consumerId: string;
  serviceListingId: string;

  // ── Job Details ──
  title: string;
  description: string;
  priority: JobPriority;
  status: BookingStatus;
  domain: ServiceDomain;

  // ── Location ──
  serviceAddress: IndianAddress;
  serviceLocation: GeoPoint;
  providerCurrentLocation?: GeoPoint;

  // ── Scheduling ──
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  /** Total on-site duration in minutes */
  actualDurationMinutes?: number;

  // ── Checklist ──
  checklist: JobChecklistItem[];
  /** Photos taken during the job (before/during/after) */
  photoEvidence: JobPhoto[];

  // ── Billing ──
  estimatedCostPaise: number;
  estimatedCostFormatted: string;
  /** Line items for materials used */
  materialCharges: MaterialCharge[];
  /** Labour charge in paise */
  labourChargePaise: number;
  /** Total final bill in paise */
  finalBillPaise?: number;
  finalBillFormatted?: string;
  /** Whether the consumer has approved the final bill */
  billApprovedByConsumer: boolean;

  // ── Ratings ──
  consumerRating?: number;
  consumerReview?: string;
  providerRating?: number; // Provider rates the consumer
  providerNotes?: string;

  // ── Timestamps ──
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface JobChecklistItem {
  itemId: string;
  description: string;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}

export interface JobPhoto {
  photoId: string;
  url: string;
  caption: string;
  stage: 'BEFORE' | 'DURING' | 'AFTER';
  capturedAt: string;
  geoPoint?: GeoPoint;
}

export interface MaterialCharge {
  materialName: string;
  quantity: number;
  unitPricePaise: number;
  totalPricePaise: number;
  totalPriceFormatted: string;
}

// ─── SERVICE BOOKING ─────────────────────────────────────────────

export interface ServiceBooking {
  /** Globally unique, prefixed: bkg_ */
  id: string;
  consumerId: string;
  providerId?: string;      // null until assigned
  serviceListingId: string;
  jobCardId?: string;       // Created after provider accepts

  status: BookingStatus;
  priority: JobPriority;

  // ── Schedule ──
  requestedDate: string;
  requestedTimeSlot: string; // "09:00-11:00"
  confirmedDate?: string;
  confirmedTimeSlot?: string;

  // ── Location ──
  serviceAddress: IndianAddress;

  // ── Pricing ──
  estimatedPricePaise: number;
  estimatedPriceFormatted: string;
  finalPricePaise?: number;
  finalPriceFormatted?: string;
  paymentStatus: 'UNPAID' | 'ADVANCE_PAID' | 'FULLY_PAID' | 'REFUNDED';
  paymentMethod?: string;

  // ── Consumer notes ──
  consumerNotes?: string;
  /** Photos of the issue (e.g. broken pipe) */
  issuePhotoUrls: string[];

  // ── Audit ──
  statusHistory: BookingStatusChange[];

  createdAt: string;
  updatedAt: string;
}

export interface BookingStatusChange {
  from: BookingStatus;
  to: BookingStatus;
  changedAt: string;
  changedBy: string; // User ID
  reason?: string;
}
