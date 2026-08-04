/**
 * @localsampark/types — commerce.ts
 * ══════════════════════════════════════════════════════════════════
 * Phase 2: HyperLocal Commerce Engine
 * Merchant directory, product SKUs, inventory, catalog,
 * AR metadata, stock alerts, and multi-vendor marketplace.
 * ══════════════════════════════════════════════════════════════════
 */

import { GeoPoint, IndianAddress, MoneyINR } from './identity';

// ─── ENUMS ────────────────────────────────────────────────────────

/** Business vertical classification — 60 categories covering all Indian hyperlocal verticals */
export enum ShopCategory {
  // ── FOOD & BEVERAGE (12) ──
  KIRANA_GROCERY = 'KIRANA_GROCERY',
  RESTAURANT = 'RESTAURANT',
  TIFFIN_CATERING = 'TIFFIN_CATERING',
  BAKERY_SWEETS = 'BAKERY_SWEETS',
  DAIRY_MILK_BOOTH = 'DAIRY_MILK_BOOTH',
  MEAT_FISH_POULTRY = 'MEAT_FISH_POULTRY',
  FRUIT_VEGETABLE = 'FRUIT_VEGETABLE',
  JUICE_SMOOTHIE_BAR = 'JUICE_SMOOTHIE_BAR',
  ICE_CREAM_DESSERT = 'ICE_CREAM_DESSERT',
  TEA_COFFEE_CAFE = 'TEA_COFFEE_CAFE',
  PAN_BETEL_SHOP = 'PAN_BETEL_SHOP',
  LIQUOR_WINE = 'LIQUOR_WINE',

  // ── HEALTH & PHARMA (7) ──
  PHARMACY = 'PHARMACY',
  MEDICAL_CLINIC = 'MEDICAL_CLINIC',
  DENTAL_CLINIC = 'DENTAL_CLINIC',
  PATHOLOGY_DIAGNOSTIC_LAB = 'PATHOLOGY_DIAGNOSTIC_LAB',
  PHYSIOTHERAPY_REHAB = 'PHYSIOTHERAPY_REHAB',
  AYURVEDA_HOMEOPATHY = 'AYURVEDA_HOMEOPATHY',
  VETERINARY_CLINIC = 'VETERINARY_CLINIC',

  // ── FASHION & PERSONAL CARE (6) ──
  CLOTHING_FASHION = 'CLOTHING_FASHION',
  JEWELLERY = 'JEWELLERY',
  OPTICAL = 'OPTICAL',
  SALON_SPA = 'SALON_SPA',
  COSMETICS_BEAUTY = 'COSMETICS_BEAUTY',
  TAILORING_ALTERATION = 'TAILORING_ALTERATION',

  // ── ELECTRONICS & TECH (4) ──
  ELECTRONICS = 'ELECTRONICS',
  COMPUTER_MOBILE_REPAIR = 'COMPUTER_MOBILE_REPAIR',
  AC_APPLIANCE_REPAIR = 'AC_APPLIANCE_REPAIR',
  MOBILE_RECHARGE_DTH = 'MOBILE_RECHARGE_DTH',

  // ── HOME & LIVING (7) ──
  HOME_DECOR = 'HOME_DECOR',
  HARDWARE_PAINT = 'HARDWARE_PAINT',
  FURNITURE = 'FURNITURE',
  MATTRESS_BEDDING = 'MATTRESS_BEDDING',
  KITCHENWARE_UTENSILS = 'KITCHENWARE_UTENSILS',
  ELECTRICAL_PLUMBING_SUPPLY = 'ELECTRICAL_PLUMBING_SUPPLY',
  WATER_PURIFIER_RO = 'WATER_PURIFIER_RO',

  // ── AUTOMOTIVE (4) ──
  GARAGE_AUTO = 'GARAGE_AUTO',
  FUEL_STATION = 'FUEL_STATION',
  CAR_BIKE_DEALER = 'CAR_BIKE_DEALER',
  TYRE_BATTERY = 'TYRE_BATTERY',

  // ── EDUCATION & MEDIA (3) ──
  STATIONERY_BOOKSTORE = 'STATIONERY_BOOKSTORE',
  COACHING_TUITION = 'COACHING_TUITION',
  PHOTOGRAPHY_STUDIO = 'PHOTOGRAPHY_STUDIO',

  // ── PROFESSIONAL SERVICES (12) ──
  LAUNDRY_DRYCLEAN = 'LAUNDRY_DRYCLEAN',
  COBBLER_SHOE_REPAIR = 'COBBLER_SHOE_REPAIR',
  KEY_LOCKSMITH = 'KEY_LOCKSMITH',
  PEST_CONTROL = 'PEST_CONTROL',
  PACKERS_MOVERS = 'PACKERS_MOVERS',
  TRAVEL_AGENT = 'TRAVEL_AGENT',
  PRINTING_XEROX = 'PRINTING_XEROX',
  COURIER_LOGISTICS = 'COURIER_LOGISTICS',
  INTERIOR_DESIGNER = 'INTERIOR_DESIGNER',
  CA_LEGAL_SERVICES = 'CA_LEGAL_SERVICES',
  INSURANCE_FINANCIAL = 'INSURANCE_FINANCIAL',
  EVENT_WEDDING_PLANNER = 'EVENT_WEDDING_PLANNER',

  // ── FITNESS & WELLNESS (2) ──
  SPORTS_FITNESS = 'SPORTS_FITNESS',
  GYM_YOGA_STUDIO = 'GYM_YOGA_STUDIO',

  // ── PETS & PLANTS (3) ──
  PET_STORE = 'PET_STORE',
  NURSERY_GARDEN = 'NURSERY_GARDEN',
  FLORIST = 'FLORIST',

  // ── RELIGIOUS & GIFTS (2) ──
  POOJA_RELIGIOUS = 'POOJA_RELIGIOUS',
  GIFT_NOVELTY = 'GIFT_NOVELTY',

  // ── SPECIALTY (2) ──
  TOY_STORE = 'TOY_STORE',
  RECYCLING_SCRAP = 'RECYCLING_SCRAP',

  // ── AGRICULTURE (1) ──
  FARM_AGRI_INPUT = 'FARM_AGRI_INPUT',

  // ── GENERAL (1) ──
  GENERAL_RETAIL = 'GENERAL_RETAIL',
}

/** Shop verification & listing status */
export enum ShopStatus {
  ACTIVE = 'ACTIVE',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  TEMPORARILY_CLOSED = 'TEMPORARILY_CLOSED',
  PERMANENTLY_CLOSED = 'PERMANENTLY_CLOSED',
  SUSPENDED = 'SUSPENDED',
  UNDER_RENOVATION = 'UNDER_RENOVATION',
  SEASONAL = 'SEASONAL',  // Open only during certain months
}

/** Product availability state */
export enum ProductStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
  COMING_SOON = 'COMING_SOON',
  SEASONAL = 'SEASONAL',
  MADE_TO_ORDER = 'MADE_TO_ORDER',
}

/** Fulfillment method */
export enum FulfillmentType {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
  DINE_IN = 'DINE_IN',
  HOME_SERVICE = 'HOME_SERVICE',
  SHIP_TO_ADDRESS = 'SHIP_TO_ADDRESS',
}

/** Product unit of measure */
export enum UnitOfMeasure {
  PIECE = 'PIECE',
  KG = 'KG',
  GRAM = 'GRAM',
  LITRE = 'LITRE',
  ML = 'ML',
  METRE = 'METRE',
  DOZEN = 'DOZEN',
  PACKET = 'PACKET',
  STRIP = 'STRIP',     // Pharma
  TABLET = 'TABLET',   // Pharma
  PLATE = 'PLATE',     // Restaurant
  SERVING = 'SERVING', // Restaurant
  SESSION = 'SESSION', // Salon / Service
  HOUR = 'HOUR',       // Service / Rental
}

/** Dietary / allergen tags for food items */
export enum DietaryTag {
  VEG = 'VEG',
  NON_VEG = 'NON_VEG',
  VEGAN = 'VEGAN',
  JAIN = 'JAIN',
  GLUTEN_FREE = 'GLUTEN_FREE',
  NUT_FREE = 'NUT_FREE',
  HALAL = 'HALAL',
  SUGAR_FREE = 'SUGAR_FREE',
  ORGANIC = 'ORGANIC',
}

// ─── SHOP / MERCHANT ─────────────────────────────────────────────

export interface Shop {
  /** Globally unique, prefixed: shop_ */
  id: string;
  /** Owner user ID — cross-refs users.json */
  ownerId: string;
  /** Zone this shop operates in — cross-refs territories.json */
  zoneId: string;
  wardId?: string;

  name: string;
  slug: string;
  description: string;
  category: ShopCategory;
  /** Sub-categories for faceted search */
  tags: string[];
  status: ShopStatus;

  // ── Contact ──
  phoneNumber: string;
  whatsappNumber?: string;
  email?: string;
  websiteUrl?: string;

  // ── Location ──
  address: IndianAddress;
  /** Delivery/service coverage radius in km */
  coverageRadiusKm: number;

  // ── Media ──
  logoUrl: string;
  bannerUrl: string;
  /** Gallery of shop interior / products */
  galleryUrls: string[];

  // ── Operating ──
  operatingHours: ShopOperatingHours;
  /** Whether this shop accepts orders right now */
  isCurrentlyOpen: boolean;
  /** Average prep/service time in minutes */
  avgPrepTimeMinutes: number;
  /** Minimum order value in paise for delivery */
  minOrderPaise: number;
  /** Delivery fee charged by this shop in paise (0 = free) */
  deliveryFeePaise: number;
  /** Whether free delivery is offered above a threshold */
  freeDeliveryAbovePaise?: number;

  // ── Fulfillment ──
  supportedFulfillment: FulfillmentType[];

  // ── Ratings & Trust ──
  avgRating: number;
  totalRatings: number;
  totalOrders: number;
  /** Trust badges earned */
  badges: ShopBadge[];

  // ── Compliance ──
  gstNumber?: string;
  fssaiNumber?: string;
  fssaiExpiresAt?: string;
  drugLicenseNumber?: string; // Pharmacy
  shopLicenseNumber?: string;

  // ── Subscription & Commission ──
  subscriptionPlanId: string;
  /** Commission override (null = use zone default) */
  commissionOverridePercent?: number;

  // ── AR / Digital ──
  /** Whether this shop has AR Virtual Try-On enabled */
  arEnabled: boolean;
  /** Number of products with AR models */
  arProductCount: number;

  // ── Feature flags ──
  acceptsCOD: boolean;
  acceptsUPI: boolean;
  acceptsCard: boolean;
  hasLoyaltyProgram: boolean;
  offersSubscriptionBox: boolean; // Weekly/monthly recurring orders

  // ── Timestamps ──
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  suspendedAt?: string;
  suspendedReason?: string;
}

export interface ShopOperatingHours {
  [day: string]: {
    isOpen: boolean;
    shifts: { openTime: string; closeTime: string }[];
  };
}

export interface ShopBadge {
  badgeType: 'VERIFIED' | 'TOP_RATED' | 'FAST_DELIVERY' | 'ECO_FRIENDLY' | 'BEST_SELLER' | 'NEW_ON_PLATFORM' | 'FSSAI_CERTIFIED' | 'ORGANIC';
  earnedAt: string;
  expiresAt?: string;
}

// ─── PRODUCT / SKU ───────────────────────────────────────────────

export interface Product {
  /** Globally unique, prefixed: prod_ */
  id: string;
  shopId: string;
  /** Category-level grouping within the shop */
  categoryPath: string[];  // e.g. ["Beverages", "Cold Drinks"]

  name: string;
  slug: string;
  description: string;
  /** Short description for listing cards */
  shortDescription?: string;
  /** Brand name (if applicable) */
  brand?: string;
  /** Barcode / EAN / UPC */
  barcode?: string;
  /** HSN code for GST classification */
  hsnCode?: string;

  // ── Pricing ──
  /** MRP in paise */
  mrpPaise: number;
  mrpFormatted: string;
  /** Selling price in paise (after discount) */
  sellingPricePaise: number;
  sellingPriceFormatted: string;
  /** Discount percentage (pre-computed for UI) */
  discountPercent: number;
  /** Cost price in paise (hidden from consumers, used for margin analysis) */
  costPricePaise?: number;
  /** GST percentage */
  gstPercent: number;

  // ── Unit ──
  unitOfMeasure: UnitOfMeasure;
  /** Quantity per unit (e.g. 500 for "500g pack") */
  quantityPerUnit: number;
  /** Available size variants */
  variants?: ProductVariant[];

  // ── Inventory ──
  status: ProductStatus;
  /** Current stock count (-1 = unlimited / made-to-order) */
  stockQuantity: number;
  /** Alert threshold — trigger LOW_STOCK when below this */
  lowStockThreshold: number;
  /** Maximum quantity a customer can order */
  maxOrderQuantity: number;

  // ── Media ──
  imageUrls: string[];
  thumbnailUrl: string;
  /** 3D model URL for AR Virtual Try-On */
  arModelUrl?: string;
  /** AR scale factor relative to real-world size */
  arScaleFactor?: number;
  videoUrl?: string;

  // ── Food-specific ──
  dietaryTags?: DietaryTag[];
  /** Calorie count per serving */
  caloriesPerServing?: number;
  /** Allergen warnings */
  allergenWarnings?: string[];
  /** Prep time for restaurant items in minutes */
  prepTimeMinutes?: number;
  /** Whether this item is customizable (e.g. pizza toppings) */
  isCustomizable: boolean;

  // ── Pharma-specific ──
  /** Whether prescription is required */
  requiresPrescription?: boolean;
  /** Drug schedule (H, H1, X, etc.) */
  drugSchedule?: string;
  /** Generic name of the drug */
  genericName?: string;
  /** Manufacturer */
  manufacturer?: string;
  /** Expiry date (YYYY-MM-DD) */
  expiryDate?: string;

  // ── Search & SEO ──
  searchKeywords: string[];
  /** Popularity score (0-100) for search ranking */
  popularityScore: number;

  // ── Timestamps ──
  createdAt: string;
  updatedAt: string;
  lastRestockedAt?: string;
}

export interface ProductVariant {
  variantId: string;
  label: string;  // "250g", "500ml", "Large", "Red"
  pricePaise: number;
  priceFormatted: string;
  stockQuantity: number;
  status: ProductStatus;
  barcode?: string;
}

// ─── CATALOG AGGREGATE ───────────────────────────────────────────

/** A shop's full catalog organized by category */
export interface ShopCatalog {
  shopId: string;
  shopName: string;
  totalProducts: number;
  categories: CatalogCategory[];
  lastUpdatedAt: string;
}

export interface CatalogCategory {
  name: string;
  slug: string;
  productCount: number;
  iconUrl?: string;
  products: Product[];
}
