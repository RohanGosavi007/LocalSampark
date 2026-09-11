/**
 * Server-render every visitor view with the exact props VisitorViewRouter hands
 * it, and assert it produces markup instead of throwing.
 *
 * This is the check the static parity tests could not make: reaching the right
 * component with the right prop names still says nothing about whether the
 * component survives being handed that data.
 */
const path = require('path');
const fs = require('fs');
const Module = require('module');

const WEB = path.resolve(__dirname, '..');
const DIR = path.join(WEB, 'src/app/shops/[id]/components');

const babel = require(path.join(WEB, '../../node_modules/@babel/core'));

// ── Resolve `@/…` the way jsconfig does, and stub what SSR cannot run ──────
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) {
    return origResolve.call(this, path.join(WEB, 'src', request.slice(2)), parent, ...rest);
  }
  return origResolve.call(this, request, parent, ...rest);
};

// ── Transform JSX on require ──────────────────────────────────────────────
require.extensions['.js'] = function (mod, filename) {
  const src = fs.readFileSync(filename, 'utf8');
  if (filename.includes('node_modules')) return mod._compile(src, filename);
  const out = babel.transformSync(src, {
    filename,
    presets: [[require.resolve('next/babel', { paths: [WEB] }), { 'preset-react': { runtime: 'automatic' } }]],
    babelrc: false,
    configFile: false,
    sourceType: 'module',
  });
  return mod._compile(out.code, filename);
};

const React = require(path.join(WEB, '../../node_modules/react'));
const { renderToString } = require(path.join(WEB, '../../node_modules/react-dom/server'));

// ── Representative data ───────────────────────────────────────────────────
const shop = {
  id: 'shop-1', name: 'Test Shop', slug: 'test-shop',
  description: 'A shop used to smoke-render every category view.',
  rating: 4.4, totalRatings: 128, phoneNumber: '+919876543210',
  whatsappNumber: '+919876543210', address: 'Kothrud, Pune', pincode: '411038',
  city: 'Pune', state: 'Maharashtra', latitude: 18.5074, longitude: 73.8077,
  logoUrl: null, bannerUrl: null, deliveryAvailable: true, pickupAvailable: true,
  estimatedDeliveryTime: 35, is_open: true, category_details: { slug: 'grocery-supermarkets' },
};
const products = [
  { id: 'p1', name: 'Item A', pricePaise: 12000, price: 120, mrpPaise: 15000, unit: 'kg',
    stockQuantity: 8, imageUrls: [], thumbnailUrl: null, description: 'First item', category: 'Staples' },
  { id: 'p2', name: 'Item B', pricePaise: 4500, price: 45, mrpPaise: 5000, unit: 'pc',
    stockQuantity: 0, imageUrls: [], thumbnailUrl: null, description: 'Out of stock', category: 'Snacks' },
];
const services = [
  { id: 's1', name: 'Standard Service', serviceName: 'Standard Service', price: 499, pricePaise: 49900,
    durationMinutes: 45, serviceCategory: 'General', description: 'A service', category: 'General' },
  { id: 's2', name: 'Premium Service', serviceName: 'Premium Service', price: 999, pricePaise: 99900,
    durationMinutes: 90, serviceCategory: 'General', description: 'Another service', category: 'General' },
];
const staff = [
  { id: 'st1', name: 'Dr. A. Sharma', providerName: 'Dr. A. Sharma', role: 'Senior', providerRole: 'Senior',
    specialization: 'General Medicine', isAvailable: true, status: 'available', rating: 4.8 },
];
const noop = () => {};

// viewType → [component file, props, expected content markers]
// `expect` is content the view must actually emit. Rendering without throwing
// only proves it did not crash; these prove it consumed the data it was given
// rather than rendering an empty shell — which is how a view that silently
// ignores its props would otherwise pass.
const ARMS = [
  ['restaurant',     'RestaurantVisitorView',      { shop, products, onAddToCart: noop },                          ['Test Shop', 'Item A']],
  ['tiffin',         'TiffinCateringVisitorView',  { shop, products, onSubscribe: noop },                          ['Item A']],
  ['beauty',         'BeautyVisitorView',          { shop, services, staff, onBookAppointment: noop },             ['Standard Service']],
  ['hospital',       'HospitalVisitorView',        { shop, services, staff, onBookAppointment: noop },             ['Standard Service']],
  ['pharmacy',       'PharmacyVisitorView',        { shop, products, onAddToCart: noop },                          ['Item A']],
  ['garage',         'GarageVisitorView',          { shop, services, onBookAppointment: noop, onRequestService: noop }, ['Standard Service']],
  ['home_service',   'HomeServiceVisitorView',     { shop, services, staff, onRequestQuote: noop },                ['Standard Service']],
  ['professional',   'ProfessionalVisitorView',    { shop, services, onBookAppointment: noop },                    ['Standard Service']],
  ['education',      'EducationEventsVisitorView', { shop, services, onEnroll: noop },                             ['Standard Service']],
  ['turf',           'TurfVisitorView',            { shop, services, staff, onBookAppointment: noop },             ['Standard Service']],
    // Loads its own fleet assets in a useEffect, which SSR does not run, so it
  // is asserted only to render rather than to show catalogue data.
  ['rental',         'RentalVisitorView',          { shop },                                                       []],
  ['lead_directory', 'LeadDirectoryVisitorView',   { shop },                                                       ['Test Shop']],
  ['retail',         'RetailVisitorView',          { shop, products, onAddToCart: noop },                          ['Item A']],
];

let failures = 0;
const EMPTY = 400; // markup shorter than this is suspiciously bare

console.log('── with data ────────────────────────────────────────────────────');
for (const [viewType, file, props, expect] of ARMS) {
  let status, detail = '';
  try {
    const mod = require(path.join(DIR, file + '.js'));
    const Component = mod.default || mod;
    const html = renderToString(React.createElement(Component, props));

    if (!html || html.length < EMPTY) {
      status = 'BARE';
      detail = `only ${html.length} chars of markup`;
      failures++;
    } else {
      const absent = (expect || []).filter((m) => !html.includes(m));
      if (absent.length) {
        status = 'MISS';
        detail = `${html.length} chars, but never rendered: ${absent.join(', ')}`;
        failures++;
      } else {
        status = ' ok ';
        detail = `${html.length} chars; shows ${(expect || []).join(', ')}`;
      }
    }
  } catch (e) {
    status = 'THROW';
    detail = String(e && e.message).split('\n')[0].slice(0, 130);
    failures++;
  }
  console.log(`[${status}] ${viewType.padEnd(15)} ${file.padEnd(28)} ${detail}`);
}

// ── Empty-data pass ───────────────────────────────────────────────────────
// A brand-new shop that has listed nothing yet is the least-exercised path in
// the product and the one that used to be filled with invented content:
// three fictional doctors with consultation fees, three fictional technicians,
// four fictional courses at fictional prices. Those fallbacks are gone, so
// these views now have real empty states — which have to render, and must not
// name a person or quote a price.
const FABRICATION_MARKERS = [
  'Dr. Sharma', 'Dr. Patel', 'Dr. Gupta',       // invented practitioners
  'Rajesh K.', 'Sunil M.', 'Amit P.',           // invented technicians
  'Foundation Course', 'Crash Course',          // invented courses
  '200+ clients', '500+ Students',              // invented volume claims
  '1000+ Cases Handled', '(95 reviews)', '(120 reviews)',
];

console.log('\n── with nothing published (new shop) ────────────────────────────');
for (const [viewType, file, props] of ARMS) {
  const bare = { ...props };
  for (const k of ['products', 'services', 'staff']) if (k in bare) bare[k] = [];

  let status, detail = '';
  try {
    const mod = require(path.join(DIR, file + '.js'));
    const Component = mod.default || mod;
    const html = renderToString(React.createElement(Component, bare));

    const invented = FABRICATION_MARKERS.filter((m) => html.includes(m));
    if (invented.length) {
      status = 'FAKE';
      detail = `invented content with no data: ${invented.join(', ')}`;
      failures++;
    } else if (!html || html.length < 200) {
      status = 'BARE';
      detail = `only ${html.length} chars`;
      failures++;
    } else {
      status = ' ok ';
      detail = `${html.length} chars, nothing invented`;
    }
  } catch (e) {
    status = 'THROW';
    detail = String(e && e.message).split('\n')[0].slice(0, 130);
    failures++;
  }
  console.log(`[${status}] ${viewType.padEnd(15)} ${file.padEnd(28)} ${detail}`);
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} problem(s) across ${ARMS.length * 2} renders.`);
process.exit(failures ? 1 : 0);
