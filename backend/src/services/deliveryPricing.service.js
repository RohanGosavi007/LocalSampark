/**
 * What an order costs, beyond its items: delivery, surge, small-order and
 * platform fees — and what the rider is paid for carrying it.
 *
 * One calculation for every checkout. Before this, each order route had its
 * own constant (₹30, ₹40, a flat ₹45 for parcels taken from the request body)
 * and each client added different fees on top of those.
 *
 * How a delivery charge is worked out:
 *
 *   distance   straight-line distance from the shop to the customer, times
 *              delivery_road_factor to approximate the road. Beyond
 *              delivery_max_distance_km the order cannot be delivered.
 *   base       delivery_base_fee covers the first delivery_base_distance_km.
 *   per km     delivery_per_km_fee for each further kilometre, counted in
 *              half-kilometre steps so 2.1 km and 2.4 km cost the same.
 *   surge      the base + distance charge is multiplied by the larger of the
 *              manual surge (rain, festivals) and the peak-hour multiplier,
 *              never more than delivery_surge_cap.
 *   ceiling    never more than delivery_max_fee.
 *   free       nothing at all when the item total reaches delivery_free_above.
 *
 * On top of delivery: small_order_fee when the item total is under
 * small_order_threshold, and the flat platform_fee.
 *
 * The rider's pay follows the distance, not the customer's charge: a customer
 * who earned free delivery still has their order carried the same distance.
 * The surge amount is passed to the rider in full.
 *
 * Surge here is set by an administrator or by the clock. Pricing it from live
 * demand needs to know how many riders are available, and nothing records
 * that yet.
 */

const geo = require('../utils/geo');
const platformConfig = require('./platformConfig.service');

class PricingError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.name = 'PricingError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** { lat, lng } from the shapes a location arrives in, or null. */
function readPoint(value) {
  let v = value;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { return null; }
  }
  if (!v || typeof v !== 'object') return null;
  const rawLat = v.lat ?? v.latitude;
  const rawLng = v.lng ?? v.lon ?? v.longitude;
  // Number('') and Number(null) are 0, which is a real coordinate; absent is absent.
  const absent = (x) => x === undefined || x === null || x === '';
  if (absent(rawLat) || absent(rawLng)) return null;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Whether `hour` (0-23) falls inside "12-14,19-22"; a window may wrap midnight. */
function inPeakHours(spec, hour) {
  if (!spec) return false;
  return String(spec).split(',').some((range) => {
    const [from, to] = range.split('-').map(Number);
    if (!Number.isInteger(from) || !Number.isInteger(to)) return false;
    return from <= to ? hour >= from && hour < to : hour >= from || hour < to;
  });
}

/** The hour of day in India, where every shop on the platform is. */
function hourInIndia(now) {
  const shifted = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return shifted.getUTCHours();
}

/** Road distance estimate between two points, in km to one decimal place. */
function roadDistanceKm(from, to, roadFactor) {
  const straight = geo.distanceKm(from.lat, from.lng, to.lat, to.lng);
  if (!Number.isFinite(straight)) return null;
  return Math.round(straight * roadFactor * 10) / 10;
}

/**
 * The delivery part of a bill for a known distance.
 * Returns { deliveryFee, base, distanceCharge, surge, surgeMultiplier, freeDelivery, riderPayout, etaMinutes }.
 */
function deliveryCharges(distanceKm, subtotal, config, now = new Date(), { member = false } = {}) {
  const extraKm = Math.max(0, distanceKm - config.delivery_base_distance_km);
  // Half-kilometre steps.
  const billedKm = Math.ceil(extraKm * 2) / 2;

  const base = config.delivery_base_fee;
  const distanceCharge = billedKm * config.delivery_per_km_fee;

  const peak = inPeakHours(config.delivery_peak_hours, hourInIndia(now)) ? config.delivery_peak_multiplier : 1;
  const surgeMultiplier = Math.min(Math.max(config.delivery_surge_multiplier, peak, 1), config.delivery_surge_cap);
  const beforeSurge = Math.min(base + distanceCharge, config.delivery_max_fee);
  // The surge that fits under the ceiling; the rider is paid what was charged.
  const surge = Math.min(beforeSurge * (surgeMultiplier - 1), config.delivery_max_fee - beforeSurge);

  const charged = beforeSurge + surge;
  const freeForAll = config.delivery_free_above > 0 && subtotal >= config.delivery_free_above;
  // A SamparkPlus member's own, lower threshold: the benefit the membership advertises.
  const freeForMember = Boolean(member) && config.samparkplus_free_delivery_above > 0 && subtotal >= config.samparkplus_free_delivery_above;
  const freeDelivery = freeForAll || freeForMember;

  const riderPayout = config.rider_base_pay + billedKm * config.rider_per_km_pay + surge;
  const etaMinutes = Math.round(config.delivery_prep_minutes + (distanceKm / config.delivery_speed_kmph) * 60);

  return {
    deliveryFee: freeDelivery ? 0 : money(charged),
    base: money(base),
    distanceCharge: money(distanceCharge),
    surge: money(surge),
    surgeMultiplier,
    freeDelivery,
    freeBecauseMember: freeForMember && !freeForAll,
    riderPayout: money(riderPayout),
    etaMinutes,
  };
}

/**
 * The bill for an order of `subtotal` rupees of items from `shop`.
 *
 *   shop     a local_shops row (latitude, longitude, delivery_available)
 *   pickup   true when the customer collects
 *   drop     the customer's location, in any of the usual shapes
 *
 * Throws PricingError when the order cannot be delivered as asked: the shop
 * does not deliver, the customer's location is unknown, or it is too far.
 */
async function quote({ shop, subtotal, pickup = false, drop = null, now = new Date(), member = false }) {
  const config = await platformConfig.all();
  const items = money(subtotal);

  const smallOrderFee = config.small_order_threshold > 0 && items < config.small_order_threshold
    ? money(config.small_order_fee) : 0;
  const platformFee = money(config.platform_fee);

  let delivery = {
    deliveryFee: 0, base: 0, distanceCharge: 0, surge: 0, surgeMultiplier: 1,
    freeDelivery: false, riderPayout: 0, etaMinutes: config.delivery_prep_minutes,
  };
  let distanceKm = null;

  if (!pickup) {
    const delivers = shop && (shop.delivery_available === 1 || shop.delivery_available === true || shop.delivery_available === '1');
    if (!delivers) {
      throw new PricingError(400, 'DELIVERY_NOT_OFFERED', 'This shop does not deliver. Please choose pickup.');
    }
    const from = readPoint({ lat: shop.latitude, lng: shop.longitude });
    const to = readPoint(drop);
    if (!to) {
      throw new PricingError(400, 'LOCATION_REQUIRED', 'Share your delivery location so the delivery charge can be calculated.');
    }
    if (!from) {
      throw new PricingError(409, 'SHOP_LOCATION_MISSING', 'This shop has no location on record and cannot take delivery orders yet.');
    }

    distanceKm = roadDistanceKm(from, to, config.delivery_road_factor);
    if (distanceKm === null) {
      throw new PricingError(400, 'LOCATION_REQUIRED', 'Share your delivery location so the delivery charge can be calculated.');
    }
    if (distanceKm > config.delivery_max_distance_km) {
      throw new PricingError(400, 'OUT_OF_DELIVERY_RANGE',
        `This address is about ${distanceKm} km from the shop; it delivers up to ${config.delivery_max_distance_km} km.`,
        { distanceKm, maxDistanceKm: config.delivery_max_distance_km });
    }
    delivery = deliveryCharges(distanceKm, items, config, now, { member });
  }

  const total = money(items + delivery.deliveryFee + smallOrderFee + platformFee);

  return {
    subtotal: items,
    deliveryFee: delivery.deliveryFee,
    smallOrderFee,
    platformFee,
    total,
    distanceKm,
    surgeMultiplier: delivery.surgeMultiplier,
    freeDelivery: delivery.freeDelivery,
    riderPayout: pickup ? 0 : delivery.riderPayout,
    etaMinutes: delivery.etaMinutes,
    // How the delivery charge was arrived at, for a client to itemise.
    deliveryBreakdown: pickup ? null : {
      base: delivery.base,
      distanceCharge: delivery.distanceCharge,
      surge: delivery.surge,
      freeAbove: config.delivery_free_above || null,
    },
    cod: {
      available: config.cod_enabled && (config.cod_max_order_value === 0 || total <= config.cod_max_order_value),
      maxOrderValue: config.cod_max_order_value || null,
    },
  };
}

module.exports = { PricingError, quote, deliveryCharges, roadDistanceKm, readPoint, inPeakHours, hourInIndia };
