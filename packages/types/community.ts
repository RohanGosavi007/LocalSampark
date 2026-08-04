/**
 * @localsampark/types — community.ts
 * ══════════════════════════════════════════════════════════════════
 * Phase 4: Community, Emergency & Notification Engine
 * Society management, community posts, SOS emergency,
 * notification templates, and help desk tickets.
 * ══════════════════════════════════════════════════════════════════
 */

import { GeoPoint, IndianAddress } from './identity';

// ─── ENUMS ────────────────────────────────────────────────────────

export enum SOSType {
  MEDICAL = 'MEDICAL',
  FIRE = 'FIRE',
  FLOOD = 'FLOOD',
  ACCIDENT = 'ACCIDENT',
  CRIME = 'CRIME',
  GAS_LEAK = 'GAS_LEAK',
  ANIMAL_ATTACK = 'ANIMAL_ATTACK',
  DOMESTIC_VIOLENCE = 'DOMESTIC_VIOLENCE',
  MISSING_PERSON = 'MISSING_PERSON',
  OTHER = 'OTHER',
}

export enum SOSStatus {
  TRIGGERED = 'TRIGGERED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESPONDER_DISPATCHED = 'RESPONDER_DISPATCHED',
  RESPONDER_ON_SITE = 'RESPONDER_ON_SITE',
  RESOLVED = 'RESOLVED',
  FALSE_ALARM = 'FALSE_ALARM',
  ESCALATED = 'ESCALATED',
}

export enum CommunityPostType {
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  DISCUSSION = 'DISCUSSION',
  EVENT = 'EVENT',
  COMPLAINT = 'COMPLAINT',
  POLL = 'POLL',
  LOST_AND_FOUND = 'LOST_AND_FOUND',
  MARKETPLACE = 'MARKETPLACE',
  ALERT = 'ALERT',
}

export enum PostStatus {
  PUBLISHED = 'PUBLISHED',
  DRAFT = 'DRAFT',
  HIDDEN = 'HIDDEN',
  FLAGGED = 'FLAGGED',
  REMOVED = 'REMOVED',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_ON_USER = 'WAITING_ON_USER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TicketCategory {
  ORDER_ISSUE = 'ORDER_ISSUE',
  PAYMENT_REFUND = 'PAYMENT_REFUND',
  DELIVERY_ISSUE = 'DELIVERY_ISSUE',
  ACCOUNT_KYC = 'ACCOUNT_KYC',
  APP_BUG = 'APP_BUG',
  MERCHANT_SUPPORT = 'MERCHANT_SUPPORT',
  SERVICE_COMPLAINT = 'SERVICE_COMPLAINT',
  SAFETY_CONCERN = 'SAFETY_CONCERN',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  OTHER = 'OTHER',
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  IN_APP = 'IN_APP',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// ─── SOCIETY / HOUSING COMPLEX ───────────────────────────────────

export interface Society {
  id: string;
  name: string;
  slug: string;
  address: IndianAddress;
  zoneId: string;
  wardId?: string;

  /** Society admin user IDs */
  adminUserIds: string[];
  /** Total registered members */
  totalMembers: number;
  /** Total flats/units */
  totalUnits: number;

  /** Amenities */
  amenities: string[];
  /** Monthly maintenance in paise */
  monthlyMaintenancePaise: number;
  maintenanceFormatted: string;

  /** Emergency contacts */
  emergencyContacts: SocietyEmergencyContact[];

  /** Gate entry log enabled */
  gateEntryEnabled: boolean;
  /** Visitor management enabled */
  visitorManagementEnabled: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface SocietyEmergencyContact {
  name: string;
  role: string;
  phoneNumber: string;
  isAvailable24x7: boolean;
}

// ─── SOS EMERGENCY ───────────────────────────────────────────────

export interface SOSAlert {
  id: string;
  triggeredBy: string;        // User ID
  triggerType: SOSType;
  status: SOSStatus;

  /** Location at time of SOS */
  location: GeoPoint;
  locationAddress?: string;

  /** Audio recording URL (auto-recorded on SOS trigger) */
  audioRecordingUrl?: string;
  /** Photos attached */
  photoUrls: string[];
  /** Description from user */
  description: string;

  /** Nearby responders auto-notified */
  notifiedResponderIds: string[];
  /** Responder who acknowledged */
  acknowledgedBy?: string;
  acknowledgedAt?: string;

  /** Emergency services contacted */
  policeNotified: boolean;
  ambulanceNotified: boolean;
  fireNotified: boolean;

  /** Resolution */
  resolvedAt?: string;
  resolutionNotes?: string;

  /** Audit trail */
  statusHistory: SOSStatusChange[];

  createdAt: string;
  updatedAt: string;
}

export interface SOSStatusChange {
  from: SOSStatus;
  to: SOSStatus;
  changedAt: string;
  changedBy: string;
  notes?: string;
}

// ─── COMMUNITY POSTS ─────────────────────────────────────────────

export interface CommunityPost {
  id: string;
  authorId: string;
  zoneId: string;
  societyId?: string;  // null = zone-wide post

  type: CommunityPostType;
  status: PostStatus;

  title: string;
  body: string;
  imageUrls: string[];
  videoUrl?: string;

  /** For POLL type */
  pollOptions?: PollOption[];
  pollEndsAt?: string;

  /** For EVENT type */
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  eventRsvpCount?: number;

  /** Engagement metrics */
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;

  /** Moderation */
  flagCount: number;
  flagReasons: string[];
  moderatedBy?: string;
  moderatedAt?: string;
  moderationAction?: string;

  isPinned: boolean;
  isAnonymous: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface PollOption {
  optionId: string;
  text: string;
  voteCount: number;
}

// ─── HELP DESK / TICKETS ─────────────────────────────────────────

export interface SupportTicket {
  id: string;
  userId: string;
  assignedAgentId?: string;

  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;

  subject: string;
  description: string;
  attachmentUrls: string[];

  /** Related entity references */
  relatedOrderId?: string;
  relatedPaymentId?: string;
  relatedBookingId?: string;

  /** Conversation thread */
  messages: TicketMessage[];

  /** SLA tracking */
  slaResponseDueAt: string;
  slaResolutionDueAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  slaBreached: boolean;

  /** Satisfaction */
  csatRating?: number;
  csatComment?: string;

  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface TicketMessage {
  messageId: string;
  senderId: string;
  senderType: 'USER' | 'AGENT' | 'SYSTEM';
  body: string;
  attachmentUrls: string[];
  createdAt: string;
}

// ─── NOTIFICATION TEMPLATES ──────────────────────────────────────

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: NotificationChannel;
  priority: NotificationPriority;

  /** Template with {{variable}} placeholders */
  titleTemplate: string;
  bodyTemplate: string;
  /** Marathi body template */
  bodyTemplateMarathi?: string;

  /** Action deep link */
  actionUrl?: string;

  /** Target audience */
  targetRoles: string[];
  targetZoneIds?: string[];

  isActive: boolean;
  createdAt: string;
}

export interface NotificationLog {
  id: string;
  templateId: string;
  userId: string;
  channel: NotificationChannel;

  title: string;
  body: string;
  actionUrl?: string;

  /** Delivery status */
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  clickedAt?: string;
  failedAt?: string;
  failureReason?: string;

  /** Whether user has dismissed this */
  isDismissed: boolean;
}
