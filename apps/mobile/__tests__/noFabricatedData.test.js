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
  'src/utils/permissions.js',            // the withRoleGuard HOC
  'src/utils/rolePolicy.js',             // tab bar per role, and the citizen/specialist split
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

/**
 * Ungated mock substitution inside a catch block.
 *
 * The two guards above both have a blind spot, and two screens slipped through
 * each of them:
 *
 *   - The shape scanner skips any file that calls an API, on the reasoning that
 *     a screen with a real source is not inventing data. But
 *     app/modules/marketplace/index.js called the API *and* ended its catch with
 *     `setItems(MOCK_ITEMS)` with no __DEV__ guard, so every failed request in a
 *     release build filled the marketplace with eight invented listings at real
 *     prices.
 *
 *   - The shape scanner only inspects array literals.
 *     app/modules/service-booking/booking-detail.js held its fabrications in an
 *     object map, so it was never even considered, and it rendered a made-up
 *     booking -- with a dialable phone number -- for every id.
 *
 * This check is narrower and catches both: a mock identifier assigned into React
 * state inside a catch block, where that catch does not mention __DEV__. That is
 * the precise shape of "the request failed, so show the user fiction instead",
 * which src/utils/mockDataHelper.js already documents as the behaviour that put
 * invented records in front of real users.
 */
function catchBlocksWithUngatedMocks(src) {
  const hits = [];
  const MOCK_ASSIGN = /\bset[A-Z]\w*\(\s*(?:MOCK_\w+|mock[A-Z]\w*)/;

  for (const m of src.matchAll(/\bcatch\s*(?:\([^)]*\))?\s*\{/g)) {
    // Walk to the matching brace so nested blocks are not truncated.
    let depth = 0;
    let end = m.index + m[0].length - 1;
    for (let i = end; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    const body = src.slice(m.index, end + 1);
    if (MOCK_ASSIGN.test(body) && !body.includes('__DEV__')) {
      hits.push(src.slice(0, m.index).split('\n').length);
    }
  }
  return hits;
}

describe('no catch block substitutes mock data in a release build', () => {
  it('the scanner recognises the pattern it is looking for', () => {
    const bad = 'try { await go(); } catch (e) { setItems(MOCK_ITEMS); }';
    const gated = 'try { await go(); } catch (e) { if (__DEV__) setItems(MOCK_ITEMS); }';
    expect(catchBlocksWithUngatedMocks(bad)).toHaveLength(1);
    expect(catchBlocksWithUngatedMocks(gated)).toHaveLength(0);
  });

  it('no screen falls back to mock data when a request fails', () => {
    const offenders = [];
    for (const file of [...walk(path.join(MOBILE, 'app')), ...walk(path.join(MOBILE, 'src'))]) {
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      for (const line of catchBlocksWithUngatedMocks(src)) {
        offenders.push(`${path.relative(MOBILE, file).split(path.sep).join('/')}:${line}`);
      }
    }
    expect(offenders.sort()).toEqual([]);
  });
});
