/**
 * @localsampark/types — operations.ts
 * ══════════════════════════════════════════════════════════════════
 * Phase 5: Operations, Admin & Analytics Engine
 * Orders, delivery tracking, GPS logs, audit trails,
 * analytics dashboards, and system configuration.
 * ══════════════════════════════════════════════════════════════════
 */

import { GeoPoint, IndianAddress } from './identity';

// ─── ENUMS ────────────────────────────────────────────────────────

export enum OrderStatus {
  CART = 'CART',
  PLACED = 'PLACED',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  PICKED_UP = 'PICKED_UP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  UPI = 'UPI',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  NET_BANKING = 'NET_BANKING',
  WALLET_BALANCE = 'WALLET_BALANCE',
  COD = 'COD',
  EMI = 'EMI',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  COD_COLLECTED = 'COD_COLLECTED',
}

export enum DeliveryStatus {
  UNASSIGNED = 'UNASSIGNED',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  NEAR_DESTINATION = 'NEAR_DESTINATION',
  DELIVERED = 'DELIVERED',
  FAILED_ATTEMPT = 'FAILED_ATTEMPT',
  RETURNED_TO_SHOP = 'RETURNED_TO_SHOP',
}

export enum AuditAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  KYC_SUBMITTED = 'KYC_SUBMITTED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PAYOUT_INITIATED = 'PAYOUT_INITIATED',
  PAYOUT_FAILED = 'PAYOUT_FAILED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_REINSTATED = 'ACCOUNT_REINSTATED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  ZONE_CREATED = 'ZONE_CREATED',
  ZONE_STATUS_CHANGED = 'ZONE_STATUS_CHANGED',
  CONFIG_UPDATED = 'CONFIG_UPDATED',
  SOS_TRIGGERED = 'SOS_TRIGGERED',
  FRAUD_FLAGGED = 'FRAUD_FLAGGED',
}

// ─── ORDER ───────────────────────────────────────────────────────

export interface Order {
  id: string;
  consumerId: string;
  shopId: string;
  runnerId?: string;

  status: OrderStatus;
  orderType: 'DELIVERY' | 'PICKUP' | 'DINE_IN';

  // ── Items ──
  items: OrderItem[];
  totalItemsPaise: number;
  totalItemsFormatted: string;

  // ── Fees ──
  deliveryFeePaise: number;
  packagingFeePaise: number;
  platformFeePaise: number;
  taxPaise: number;
  discountPaise: number;
  cashbackAppliedPaise: number;

  /** Grand total charged to customer */
  grandTotalPaise: number;
  grandTotalFormatted: string;

  // ── Payment ──
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentGatewayTxnId?: string;

  // ── Delivery ──
  deliveryAddress?: IndianAddress;
  deliveryInstructions?: string;
  estimatedDeliveryMinutes: number;
  actualDeliveryMinutes?: number;

  // ── Rating ──
  consumerRating?: number;
  consumerReview?: string;

  // ── Audit ──
  statusHistory: OrderStatusChange[];

  // ── Timestamps ──
  placedAt: string;
  confirmedAt?: string;
  preparedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string;
  quantity: number;
  unitPricePaise: number;
  totalPricePaise: number;
  totalPriceFormatted: string;
  specialInstructions?: string;
}

export interface OrderStatusChange {
  from: OrderStatus;
  to: OrderStatus;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

// ─── DELIVERY TRACKING ──────────────────────────────────────────

export interface DeliveryTracking {
  id: string;
  orderId: string;
  runnerId: string;
  status: DeliveryStatus;

  pickupLocation: GeoPoint;
  dropLocation: GeoPoint;
  distanceKm: number;
  estimatedTimeMinutes: number;

  /** Real-time GPS trail */
  gpsTrail: GPSPoint[];
  /** Current runner location */
  currentLocation: GeoPoint;

  /** OTP for delivery verification */
  deliveryOtp: string;
  otpVerified: boolean;

  /** Proof of delivery photo */
  deliveryPhotoUrl?: string;

  assignedAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}

export interface GPSPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  speedKmh: number;
  heading: number;
  accuracyMeters: number;
  batteryPercent?: number;
  capturedAt: string;
}

// ─── AUDIT LOG ───────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actorId: string;
  actorRole: string;
  targetId?: string;
  targetType?: string;

  description: string;
  metadata?: Record<string, unknown>;

  ipAddress: string;
  userAgent?: string;
  geoPoint?: GeoPoint;

  createdAt: string;
}

// ─── ANALYTICS ───────────────────────────────────────────────────

export interface ZoneAnalytics {
  zoneId: string;
  zoneName: string;
  periodStart: string;
  periodEnd: string;

  /** GMV in paise */
  gmvPaise: number;
  gmvFormatted: string;
  gmvGrowthPercent: number;

  totalOrders: number;
  ordersGrowthPercent: number;
  avgOrderValuePaise: number;

  totalUsers: number;
  newUsersThisPeriod: number;
  activeUsersThisPeriod: number;

  totalMerchants: number;
  activeMerchants: number;

  totalRunners: number;
  activeRunners: number;
  avgDeliveryMinutes: number;

  /** Revenue breakdown */
  commissionEarnedPaise: number;
  subscriptionRevenuePaise: number;
  deliveryFeesCollectedPaise: number;

  /** Operational metrics */
  avgRating: number;
  cancellationRate: number;
  returnRate: number;
  sosCount: number;
  ticketCount: number;
}

// ─── SYSTEM CONFIG ───────────────────────────────────────────────

export interface SystemConfig {
  key: string;
  value: string | number | boolean;
  category: string;
  description: string;
  /** Who can modify this config */
  requiredRole: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
}
