/**
 * Fabricated-identity guard.
 *
 * A recurring defect in this app was screens that shipped invented records and
 * presented them as the user's own: a merchant's inventory seeded with
 * "Aashirvaad Atta 5kg, stock 12", a customer's wallet showing "Paid at Sharma
 * Grocery ₹120", a salon's diary listing "Priya Sharma, Haircut + Spa, 4:00 PM",
 * a delivery tracked to "Ramesh Kumar on MH 12 AB 1234". None of it failed
 * loudly — it looked exactly like working software, which is why it survived so
 * long and why a grep of the release bundle was the only thing that found it.
 *
 * The standard this codifies: never invent a named person, business, branded
 * product, price, rating, availability claim or volume claim. Show an honest
 * empty or error state instead.
 *
 * This test pins the files that still contain such strings. The list may only
 * shrink. A new file appearing here fails immediately; fixing one means deleting
 * its entry. It deliberately does not assert the list is empty, because it is
 * not yet — see the entries below for what is left.
 */
const fs = require('fs');
const path = require('path');

const MOBILE = path.join(__dirname, '..');

/**
 * Strings that can only be fabrications: invented businesses, real third-party
 * brands the platform does not stock, invented people, and promises nothing
 * computes.
 */
const NEEDLES = [
  // invented businesses
  'Sharma Grocery', 'Apollo Pharmacy', 'A-One Beauty', 'Maa Ki Rasoi', 'Spice Route',
  'Speedy Garage', 'City Cabs', 'Car Point', 'Bike Point', 'City Hospital',
  'Learnix', 'QuickFix AC', 'Verma & Associates', 'Dr. Sharma Clinic',
  'Mock Grocery Mart',
  // invented branded stock
  'Aashirvaad', 'Ashirvaad', 'Amul ', 'Maggi', 'Tata Salt', 'Dolo 650', 'Vicks Vaporub',
  'Mahindra Tractor',
  // invented people
  'Suresh Kumar', 'Rahul Sharma', 'Amit Kumar', 'Rohan Patil', 'Ramesh Kumar',
  'Priya Sharma', 'Sneha Gupta', 'Vikram Singh', 'Anita Deshmukh',
  'Dr. Rajesh Patil', 'Dr. Ananya Joshi', 'Neha Patel', 'Anjali Desai',
  'Ramesh Patil', 'Sunita Joshi', 'Priya Kulkarni', 'Sunil Deshmukh',
  // invented promises and records
  'LOCAL10', '214 Ratings', 'Token #14', 'Ambulance Dispatched',
  'Savings vs Zomato',
];

/**
 * Files known to still carry fabricated data, with what each one is. Every entry
 * here is a screen that has not yet been wired to its API. Remove an entry when
 * the file is fixed; never add one.
 */
const KNOWN = {
  // Dev-only: both sites sit behind `if (!__DEV__) throw` or `if (__DEV__)`, so
  // the strings are stripped from a release bundle. Kept listed so the guard
  // notices if that gating is ever removed.
  'src/context/AuthContext.js': 'dev-only offline login fallback',
};

function stripComments(src) {
  // Written as /^\s*\/\/.*$/gm this silently matches nothing on a CRLF file:
  // `.` does not match the carriage return and, in multiline mode, `$` only
  // matches immediately before a newline. Half this repo is CRLF, so that form
  // stripped no comments at all and reported explanatory notes as live code.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[^\S\n]*\/\/[^\n]*/gm, '');
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function scan() {
  const offenders = {};

  for (const file of [...walk(path.join(MOBILE, 'app')), ...walk(path.join(MOBILE, 'src'))]) {
    const lines = stripComments(fs.readFileSync(file, 'utf8')).split('\n');
    const found = [];

    for (const needle of NEEDLES) {
      const hit = lines.findIndex(
        // A form hint ("e.g. Sharma Grocery") is an example the user is meant to
        // replace, not a record shown as their own data.
        (line) => line.includes(needle) && !/placeholder\s*=/.test(line)
      );
      if (hit !== -1) found.push(needle);
    }

    if (found.length) {
      offenders[path.relative(MOBILE, file).split(path.sep).join('/')] = found;
    }
  }

  return offenders;
}

describe('no fabricated identities in live screens', () => {
  const offenders = scan();

  it('the scanner actually finds things', () => {
    // Without this, a broken matcher would return {} and every assertion below
    // would pass vacuously — which is exactly how the first version of this
    // check silently reported a clean app.
    const probe = stripComments("const x = [{ name: 'Aashirvaad Atta 5kg' }];");
    expect(probe).toContain('Aashirvaad');
    expect(Object.keys(offenders).length).toBeGreaterThan(0);
  });

  it('no file outside the known list carries fabricated data', () => {
    const unexpected = Object.keys(offenders).filter((f) => !(f in KNOWN)).sort();
    expect(unexpected).toEqual([]);
  });

  it('the known list only shrinks', () => {
    // An entry that no longer matches has been fixed; delete it from KNOWN so
    // the file cannot regress unnoticed.
    const stale = Object.keys(KNOWN).filter((f) => !(f in offenders)).sort();
    expect(stale).toEqual([]);
  });
});

/**
 * The string list above only catches invented names somebody has already seen.
 * Three files found late in this work — BeautyManager.js, the franchise portal
 * and VisitorsTab.js — were found by grepping the release bundle, not by that
 * check, because their invented names were not on the list.
 *
 * This second check looks for the *shape* instead: an array of two or more
 * objects that each read like a database row, in a screen that never asks a
 * server for anything. That is what a fabrication looks like regardless of the
 * names it uses.
 */

/** Field names that suggest a record about the world rather than about the UI. */
const RECORD_KEYS = new Set([
  'id', 'name', 'title', 'price', 'amount', 'status', 'date', 'time', 'customer',
  'shop', 'user', 'phone', 'email', 'address', 'rating', 'quantity', 'total',
  'revenue', 'earnings', 'orders', 'stock', 'service', 'provider', 'driver',
  'partner', 'items', 'seats', 'vehicle', 'points', 'value', 'count',
]);

const API_CALL =
  /\b(apiGet|apiPost|apiPut|apiDelete|fetch\s*\(|loadWithFallback|fetchWithFallback|postWithFallback|useQuery|useShops|useCategories)\b/;

/**
 * Arrays that describe the app's own interface rather than the world outside
 * it: which tabs exist, which payment apps are supported, the fixed captions of
 * a status timeline, the onboarding slides. These are legitimately hardcoded —
 * they are not claims about anybody.
 */
const UI_CONFIG = new Set([
  'src/utils/permissions.js',            // tab bar per role
  'src/components/UPIPaymentSheet.js',   // the UPI apps we support
  'src/components/ShopByCategory.js',    // category tiles and icons
  'app/onboarding-tutorial.js',          // onboarding slides
  'app/modules/checkout/payment.js',     // payment methods offered
  'app/modules/tracking/index.js',       // fixed captions of the status timeline
  'app/modules/orders/tracking.js',      // same
  'app/modules/earn/index.js',           // the earning roles the platform offers
  'app/modules/society/ResidentDashboard.js', // menu sections
  'app/modules/bills/index.js',          // the billers we can pay
  'app/modules/services/booking.js',     // slot labels ("Today", "Tomorrow")
]);

/**
 * Screens that still render seeded records. Every entry is a screen that was
 * never wired to an API. The list may only shrink.
 */
const SEEDED = new Set([
  'app/(tabs)/community.js',
  'app/chat/[shopId].js',
  'app/components/shops/managers/AdvancedRestaurantManager.js',
  'app/modules/care/index.js',
  'app/modules/community/index.js',
  'app/modules/shop-detail/TiffinCateringVisitorView.js',
  'src/screens/properties/PropertySearch.js',
]);

/** Array literals holding two or more objects that each look like a record. */
function seededArrays(src) {
  const hits = [];
  const objectRe = /\{[^{}]*\}/g;

  for (const m of src.matchAll(/\[\s*(?:\r?\n)?\s*\{[\s\S]{0,4000}?\}\s*,?\s*\]/g)) {
    const objects = [...m[0].matchAll(objectRe)];
    if (objects.length < 2) continue;

    let recordLike = 0;
    for (const obj of objects) {
      const keys = [...obj[0].matchAll(/(?:^|[{,])\s*['"]?([a-zA-Z_][\w]*)['"]?\s*:/g)].map((k) => k[1]);
      if (keys.length >= 3 && keys.filter((k) => RECORD_KEYS.has(k)).length >= 2) recordLike++;
    }
    if (recordLike >= 2) hits.push(src.slice(0, m.index).split('\n').length);
  }
  return hits;
}

function screensWithSeededRecords() {
  const found = [];

  for (const file of [...walk(path.join(MOBILE, 'app')), ...walk(path.join(MOBILE, 'src'))]) {
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    // A screen that fetches has a real source; a seeded array beside it is a
    // fallback, which the string guard above covers.
    if (API_CALL.test(src)) continue;
    if (!seededArrays(src).length) continue;
    found.push(path.relative(MOBILE, file).split(path.sep).join('/'));
  }
  return found;
}

describe('no screens invent records by shape', () => {
  const found = screensWithSeededRecords();

  it('the shape scanner actually finds things', () => {
    const probe = seededArrays(
      "const x = [{ id: 1, name: 'A', price: 10 }, { id: 2, name: 'B', price: 20 }];"
    );
    expect(probe.length).toBe(1);
    expect(found.length).toBeGreaterThan(0);
  });

  it('no screen outside the known lists renders seeded records', () => {
    const unexpected = found.filter((f) => !SEEDED.has(f) && !UI_CONFIG.has(f)).sort();
    expect(unexpected).toEqual([]);
  });

  it('the seeded list only shrinks', () => {
    const stale = [...SEEDED].filter((f) => !found.includes(f)).sort();
    expect(stale).toEqual([]);
  });
});
