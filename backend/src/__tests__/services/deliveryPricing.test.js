/**
 * The delivery charge, worked out from distance.
 *
 * deliveryCharges() is pure: a distance, the item total and the settings in;
 * the charge, how it was made up, the rider's pay and an arrival estimate
 * out. Every number in it is an administrator's setting
 * (services/platformConfig.service.js); these use the defaults.
 */

const { SETTINGS, coerce } = require('../../services/platformConfig.service');
const { deliveryCharges, inPeakHours, roadDistanceKm, readPoint } = require('../../services/deliveryPricing.service');

const DEFAULTS = Object.fromEntries(Object.entries(SETTINGS).map(([key, setting]) => [key, setting.default]));
const config = (overrides = {}) => ({ ...DEFAULTS, ...overrides });
const NOON_IST = new Date('2026-10-03T06:30:00Z');

describe('the default rules', () => {
  it('are a 5% commission, ₹20 for the first 2 km, ₹8 a km after, ₹5 platform fee, cash up to ₹2000', () => {
    expect(DEFAULTS).toMatchObject({
      default_commission_percent: 5,
      delivery_base_fee: 20,
      delivery_base_distance_km: 2,
      delivery_per_km_fee: 8,
      delivery_max_distance_km: 10,
      platform_fee: 5,
      cod_enabled: true,
      cod_max_order_value: 2000,
    });
  });
});

describe('deliveryCharges', () => {
  it('charges the base fee within the base distance', () => {
    expect(deliveryCharges(0.4, 300, config(), NOON_IST)).toMatchObject({ deliveryFee: 20, distanceCharge: 0, riderPayout: 20 });
    expect(deliveryCharges(2, 300, config(), NOON_IST).deliveryFee).toBe(20);
  });

  it('adds the per-km fee beyond it, in half-kilometre steps', () => {
    // 2.1 km: 0.1 km over, billed as 0.5 km.
    expect(deliveryCharges(2.1, 300, config(), NOON_IST)).toMatchObject({ deliveryFee: 24, distanceCharge: 4 });
    // 5 km: 3 km over.
    expect(deliveryCharges(5, 300, config(), NOON_IST)).toMatchObject({ deliveryFee: 44, distanceCharge: 24 });
  });

  it('pays the rider by distance, separately from what the customer is charged', () => {
    // ₹20 base + 3 km × ₹7.
    expect(deliveryCharges(5, 300, config(), NOON_IST).riderPayout).toBe(41);
  });

  it('never charges more than the ceiling', () => {
    expect(deliveryCharges(30, 300, config(), NOON_IST).deliveryFee).toBe(150);
  });

  it('is free above the free-delivery threshold — and the rider is still paid', () => {
    const free = deliveryCharges(5, 600, config({ delivery_free_above: 500 }), NOON_IST);
    expect(free).toMatchObject({ deliveryFee: 0, freeDelivery: true, riderPayout: 41 });
    expect(deliveryCharges(5, 499, config({ delivery_free_above: 500 }), NOON_IST).deliveryFee).toBe(44);
  });

  it('applies surge, capped, and passes the surge to the rider', () => {
    const surged = deliveryCharges(5, 300, config({ delivery_surge_multiplier: 1.5 }), NOON_IST);
    expect(surged).toMatchObject({ deliveryFee: 66, surge: 22, surgeMultiplier: 1.5, riderPayout: 63 });

    const capped = deliveryCharges(5, 300, config({ delivery_surge_multiplier: 3, delivery_surge_cap: 2 }), NOON_IST);
    expect(capped.surgeMultiplier).toBe(2);
    expect(capped.deliveryFee).toBe(88);
  });

  it('keeps surge under the fee ceiling', () => {
    const charged = deliveryCharges(14, 300, config({ delivery_surge_multiplier: 2 }), NOON_IST);
    expect(charged.deliveryFee).toBe(150);
  });

  it('applies the peak multiplier during peak hours, by Indian time', () => {
    const peak = config({ delivery_peak_hours: '12-14', delivery_peak_multiplier: 1.25 });
    expect(deliveryCharges(5, 300, peak, NOON_IST).surgeMultiplier).toBe(1.25);
    const evening = new Date('2026-10-03T12:30:00Z'); // 18:00 IST
    expect(deliveryCharges(5, 300, peak, evening).surgeMultiplier).toBe(1);
  });

  it('estimates arrival from preparation time and distance', () => {
    // 15 minutes to prepare, 6 km at 20 km/h.
    expect(deliveryCharges(6, 300, config(), NOON_IST).etaMinutes).toBe(33);
  });
});

describe('peak hours', () => {
  it('reads several windows, and none when empty', () => {
    expect(inPeakHours('12-14,19-22', 13)).toBe(true);
    expect(inPeakHours('12-14,19-22', 20)).toBe(true);
    expect(inPeakHours('12-14,19-22', 16)).toBe(false);
    expect(inPeakHours('', 13)).toBe(false);
  });
});

describe('locations', () => {
  it('reads the shapes clients send, and refuses what is not a place on Earth', () => {
    expect(readPoint({ lat: 18.5, lng: 73.8 })).toEqual({ lat: 18.5, lng: 73.8 });
    expect(readPoint({ latitude: '18.5', longitude: '73.8' })).toEqual({ lat: 18.5, lng: 73.8 });
    expect(readPoint({ lat: 200, lng: 73.8 })).toBeNull();
    expect(readPoint(null)).toBeNull();
  });

  it('estimates road distance from straight-line distance', () => {
    const km = roadDistanceKm({ lat: 18.53, lng: 73.87 }, { lat: 18.56, lng: 73.89 }, 1.3);
    expect(km).toBe(5.1);
  });
});

describe('settings validation', () => {
  it('refuses values outside their range, so a bad row cannot produce a negative fee or a 900% commission', () => {
    expect(coerce('delivery_per_km_fee', -1)).toBeUndefined();
    expect(coerce('default_commission_percent', 900)).toBeUndefined();
    expect(coerce('default_commission_percent', '7.5')).toBe(7.5);
    expect(coerce('cod_enabled', 'false')).toBe(false);
    expect(coerce('delivery_peak_hours', '"12-14"')).toBe('12-14');
    expect(coerce('delivery_peak_hours', 'lunchtime')).toBeUndefined();
  });
});
