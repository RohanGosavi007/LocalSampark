const { query } = require('../config/database');
const checkoutService = require('../modules/ecommerce/services/checkout.service');

async function testBackendEngine() {
  console.log('--- Testing Geospatial Bounding Box Database Query ---');
  const lat = 18.5913, lng = 73.8987, radius = 10;
  const latDelta = radius / 111.045;
  const lngDelta = radius / (111.045 * Math.cos(lat * (Math.PI / 180)));
  const minLat = lat - latDelta, maxLat = lat + latDelta;
  const minLng = lng - lngDelta, maxLng = lng + lngDelta;

  const shops = await query(
    'SELECT id, name, geohash FROM local_shops WHERE latitude BETWEEN $1 AND $2 AND longitude BETWEEN $3 AND $4',
    [minLat, maxLat, minLng, maxLng]
  );
  const candidates = shops.rows || shops;
  console.log('Spatial Candidates Found:', candidates.length);
  if (candidates.length > 0) {
    console.log('Sample Candidate:', candidates[0]);
  }

  console.log('\n--- Testing Checkout Service Module ---');
  console.log('CheckoutService processCheckout is functional:', typeof checkoutService.processCheckout === 'function');
  process.exit(0);
}

testBackendEngine();
