/**
 * C2 Location & Serviceability and C3 Discovery on Android.
 *
 * C2: outside every zone the app used to move the user into the nearest one
 *     without saying so (ZoneContext → GET /zones/nearby). Now it reports
 *     "outside", names the nearest zone, and takes a waitlist sign-up.
 * C3: the directory row read shop.distance, which no endpoint sends, so every
 *     shop said "Nearby"; open status comes from the server's is_open_now.
 */
jest.mock('../src/lib/api', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));

const fs = require('fs');
const path = require('path');
const { apiGet, apiPost } = require('../src/lib/api');
const {
  checkServiceability, outOfZoneMessage, waitlistContact, joinWaitlist,
} = require('../src/services/serviceability');
const { distanceLabel, openStatusLabel } = require('../src/services/discovery');

beforeEach(() => {
  apiGet.mockReset();
  apiPost.mockReset();
});

describe('[C2.5] location: serviceability check on the phone', () => {
  test('[C2.5] inside a zone: the territory is returned for locking', async () => {
    apiGet.mockResolvedValueOnce({ success: true, outOfBounds: false, territory: { id: 't1', name: 'Dhanori', pincode: '411015' } });
    const r = await checkServiceability(18.5793, 73.8796);
    expect(apiGet).toHaveBeenCalledWith('/zones/resolve?lat=18.5793&lng=73.8796');
    expect(r).toEqual({ inZone: true, territory: { id: 't1', name: 'Dhanori', pincode: '411015' } });
  });

  test('[C2.5] outside every zone: reported as outside, with the nearest named, never moved into it', async () => {
    apiGet.mockResolvedValueOnce({ success: true, outOfBounds: true, nearest: { id: 't1', name: 'Dhanori', distance_km: 212.4 } });
    const r = await checkServiceability(19.8762, 75.3433);
    expect(r.inZone).toBe(false);
    expect(r.territory).toBeUndefined();
    expect(outOfZoneMessage(r)).toBe("We don't deliver to your area yet. The nearest area we serve is Dhanori, about 212 km away.");
    expect(outOfZoneMessage({ inZone: false, nearest: null })).toBe("We don't deliver to your area yet.");
  });

  test('[C2.5] the zone screen no longer falls back to /zones/nearby to pick a zone for the user', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/context/ZoneContext.js'), 'utf8');
    expect(src).toContain('checkServiceability(');
    expect(src).not.toMatch(/zones\/nearby\?lat=/);
  });

  test('[C2.5] no position is refused before any request', async () => {
    await expect(checkServiceability(undefined, 73.8)).rejects.toThrow('A location is needed');
    expect(apiGet).not.toHaveBeenCalled();
  });
});

describe('[C2.6] location: waitlist sign-up from the phone', () => {
  test('[C2.6] a phone number or an email becomes the right field', () => {
    expect(waitlistContact(' +91 98765-43210 ')).toEqual({ phone: '+919876543210' });
    expect(waitlistContact('Meera@Example.com')).toEqual({ email: 'meera@example.com' });
  });

  test.each([['', 'Enter a mobile number'], ['12ab', 'mobile number does not look right'], ['a@b', 'email does not look right']])(
    '[C2.6] %p is refused with a message, and nothing is sent', async (input, message) => {
      expect(waitlistContact(input).error).toContain(message);
      await expect(joinWaitlist({ lat: 19.8, lng: 75.3, contact: input })).rejects.toThrow(message);
      expect(apiPost).not.toHaveBeenCalled();
    }
  );

  test('[C2.6] a valid sign-up is posted with the position it was made from', async () => {
    apiPost.mockResolvedValueOnce({ success: true, id: 'w1' });
    await joinWaitlist({ lat: 19.8762, lng: 75.3433, contact: '9876543210' });
    expect(apiPost).toHaveBeenCalledWith('/zones/waitlist', { latitude: 19.8762, longitude: 75.3433, phone: '9876543210' });
  });
});

describe('[C3.4] discovery: distance and open status in the directory', () => {
  test('[C3.4] distance comes from distance_km, the field the API sends', () => {
    expect(distanceLabel({ distance_km: 0.35 })).toBe('350 m');
    expect(distanceLabel({ distance_km: 3.04 })).toBe('3 km');
    expect(distanceLabel({ distance_km: 12.66 })).toBe('12.7 km');
    expect(distanceLabel({ distance_km: null })).toBe('Nearby');
    expect(distanceLabel({})).toBe('Nearby');
  });

  test('[C3.4] open status is shown only when the server knows it', () => {
    expect(openStatusLabel({ is_open_now: true })).toBe('Open now');
    expect(openStatusLabel({ is_open_now: false })).toBe('Closed now');
    expect(openStatusLabel({ is_open_now: null })).toBeNull();
    expect(openStatusLabel({})).toBeNull();
  });

  test('[C3.4] the directory tab uses these, not the field no endpoint returns', () => {
    const src = fs.readFileSync(path.join(__dirname, '../app/(tabs)/directory.js'), 'utf8');
    expect(src).toContain('distanceLabel(shop)');
    expect(src).toContain('openStatusLabel(shop)');
    expect(src).not.toMatch(/shop\.distance \?/);
  });
});
