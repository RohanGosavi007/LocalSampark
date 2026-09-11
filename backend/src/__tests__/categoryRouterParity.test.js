/**
 * Category taxonomy parity across the five routing maps.
 *
 * The same category → experience mapping is duplicated in five places:
 *
 *   1. backend  shop-management.controller.js         ARCHETYPE_MAP  (the baseline)
 *   2. web      shop-manager/…/ShopManagerRouter.js   CATEGORY_ARCHETYPE
 *   3. web      shops/[id]/…/VisitorViewRouter.js     CATEGORY_VIEW_MAP
 *   4. mobile   src/components/shops/VisitorViewRouter.js  CATEGORY_VIEW_MAP
 *   5. mobile   src/config/visitor-config.js          VISITOR_VIEW_MAP
 *
 * Every one of them falls back to retail on a miss, silently. That is how (3)
 * came to hold 66 keys from a retired snake_case taxonomy — `kirana_grocery`,
 * `salon_spa`, `restaurant` — while shop_categories had moved to kebab-case.
 * Not one key matched, so every shop page in the product rendered the generic
 * RetailVisitorView: a clinic, a salon and a garage all looked like a grocery
 * counter. Nothing failed, nothing logged, and the sixteen specialised views
 * were simply unreachable.
 *
 * These tests hold all five key sets identical, so adding a category to one
 * map without the others fails here rather than silently degrading a shop page.
 * They parse the web files as text because apps/web has no test runner of its
 * own and importing JSX into this suite would need a transform it does not have.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../../..');

const FILES = {
  backend: {
    file: path.join(REPO, 'backend/src/modules/ecommerce/controllers/shop-management.controller.js'),
    marker: 'const ARCHETYPE_MAP',
  },
  merchant: {
    file: path.join(REPO, 'apps/web/src/app/shop-manager/components/ShopManagerRouter.js'),
    marker: 'const CATEGORY_ARCHETYPE',
  },
  visitor: {
    file: path.join(REPO, 'apps/web/src/app/shops/[id]/components/VisitorViewRouter.js'),
    marker: 'const CATEGORY_VIEW_MAP',
  },
  // The mobile app carries a fourth copy, and it had the identical defect: 67
  // snake_case keys from the retired taxonomy, 0 of which matched a category,
  // so every shop in the app rendered RetailView. Found only because the web
  // fix prompted a look at the mobile half.
  mobile: {
    file: path.join(REPO, 'apps/mobile/src/components/shops/VisitorViewRouter.js'),
    marker: 'const CATEGORY_VIEW_MAP',
  },
  // And a fifth, on the mobile app's other shop-detail path. app/(tabs)/directory.js
  // pushes /modules/shop-detail?category=<slug>, and that router resolves the
  // view through this map rather than the one above. It held fifteen keys from
  // the retired taxonomy — 'retail', 'grocery', 'beauty-salon' — none of which
  // matched a category, so every shop opened from the Directory tab rendered
  // RetailVisitorView. Same defect, third occurrence, found only because this
  // file's own comment claimed the copies had all been accounted for.
  mobileDirectory: {
    file: path.join(REPO, 'apps/mobile/src/config/visitor-config.js'),
    marker: 'export const VISITOR_VIEW_MAP',
  },
};

/** Extract the quoted keys of the object literal that follows `marker`. */
function extractKeys({ file, marker }) {
  const src = fs.readFileSync(file, 'utf8');
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`marker ${marker} not found in ${file}`);

  const open = src.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end < 0) throw new Error(`unbalanced braces after ${marker} in ${file}`);

  // Keys are single-quoted throughout these maps; values are too, so anchor on
  // the colon that follows the closing quote.
  return [...src.slice(open, end).matchAll(/'([^']+)'\s*:/g)].map((m) => m[1]);
}

const keys = Object.fromEntries(
  Object.entries(FILES).map(([name, spec]) => [name, extractKeys(spec)])
);

describe('category routing maps', () => {
  it.each(Object.keys(FILES))('%s map parses and is non-trivial', (name) => {
    expect(keys[name].length).toBeGreaterThan(50);
  });

  it.each(Object.keys(FILES))('%s map has no duplicate keys', (name) => {
    const seen = new Set();
    const dupes = keys[name].filter((k) => (seen.has(k) ? true : (seen.add(k), false)));
    expect(dupes).toEqual([]);
  });

  // Iterated rather than named per map, so adding a fifth copy to FILES is
  // enough to guard it. Naming them individually is how the mobile router sat
  // outside these checks while carrying the very defect they exist to catch.
  const CLIENTS = Object.keys(FILES).filter((n) => n !== 'backend');

  it.each(CLIENTS)('%s map covers every category the backend knows about', (name) => {
    // The regression that made every shop page render as retail — on web, and
    // independently on mobile.
    const missing = keys.backend.filter((k) => !keys[name].includes(k));
    expect(missing).toEqual([]);
  });

  it.each(CLIENTS)('%s map references no category the backend lacks', (name) => {
    // Catches the inverse drift: a key kept after the category was renamed.
    const stray = keys[name].filter((k) => !keys.backend.includes(k));
    expect(stray).toEqual([]);
  });

  it('every map describes exactly the same category set', () => {
    const sorted = (a) => [...a].sort();
    for (const name of CLIENTS) {
      expect({ [name]: sorted(keys[name]) }).toEqual({ [name]: sorted(keys.backend) });
    }
  });

  it('category slugs are kebab-case, matching shop_categories', () => {
    // The retired taxonomy used snake_case. Anything with an underscore here is
    // a key that cannot match a row and will fall through to the retail view.
    const offenders = Object.entries(keys).flatMap(([name, list]) =>
      list.filter((k) => k.includes('_')).map((k) => `${name}: ${k}`)
    );
    expect(offenders).toEqual([]);
  });
});

/**
 * The checks above only prove the map's *keys* are right. A category can still
 * be mapped to a view type the switch does not handle, which lands it back on
 * the silent `default:` retail arm — the same failure, one layer down. These
 * cover the value side.
 */
describe('VisitorViewRouter view types', () => {
  const src = fs.readFileSync(FILES.visitor.file, 'utf8');

  const mapBody = (() => {
    const start = src.indexOf(FILES.visitor.marker);
    const open = src.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(open, i); }
    }
    throw new Error('unbalanced CATEGORY_VIEW_MAP');
  })();

  const mappedTypes = [...new Set([...mapBody.matchAll(/:\s*'([^']+)'/g)].map((m) => m[1]))];
  const switchCases = [...new Set([...src.matchAll(/case '([^']+)':/g)].map((m) => m[1]))];

  it('every view type the map produces is handled by the switch', () => {
    const unhandled = mappedTypes.filter((t) => !switchCases.includes(t));
    expect(unhandled).toEqual([]);
  });

  it('every dynamically imported view is actually rendered', () => {
    // Three views (Doctor, TwoWheeler, FourWheeler) were imported but appeared
    // in no switch arm — dead weight that read as though those categories were
    // covered. An unrendered import means either a missing arm or a stale import.
    const body = src.slice(src.indexOf(FILES.visitor.marker));
    const imports = [...src.matchAll(/const (\w+) = dynamic\(/g)].map((m) => m[1]);
    const unrendered = imports.filter((name) => !new RegExp('<' + name + '[\\s/>]').test(body));
    expect(unrendered).toEqual([]);
  });

  it('every rendered view has a component file on disk', () => {
    const dir = path.dirname(FILES.visitor.file);
    const missing = [...src.matchAll(/dynamic\(\(\) => import\('\.\/(\w+)'\)/g)]
      .map((m) => m[1])
      .filter((file) => !fs.existsSync(path.join(dir, `${file}.js`)));
    expect(missing).toEqual([]);
  });

  /**
   * Prop contracts between the router and each view.
   *
   * Reaching the right component is not enough if it is handed the wrong props.
   * EducationEventsVisitorView takes `onEnroll`, but the router passed
   * `onBookAppointment`; because the call site is `onEnroll?.(selectedPkg)`, the
   * optional chaining swallowed the undefined and the Enrol button silently did
   * nothing across six categories. No error, no console output — the same class
   * of silent failure as the slug mismatch, one layer further in.
   *
   * A handler prop with no default that the router never passes is always this
   * bug, so it is asserted rather than merely reported.
   */
  const dir = path.dirname(FILES.visitor.file);

  const arms = (() => {
    const found = [...src.matchAll(/case '([^']+)': return <(\w+)([^/]*)\/>/g)].map((m) => ({
      viewType: m[1],
      component: m[2],
      passed: [...m[3].matchAll(/(\w+)=\{/g)].map((p) => p[1]),
    }));
    const def = src.match(/default: return <(\w+)([^/]*)\/>/);
    if (def) {
      found.push({
        viewType: 'default',
        component: def[1],
        passed: [...def[2].matchAll(/(\w+)=\{/g)].map((p) => p[1]),
      });
    }
    return found;
  })();

  it('parses every switch arm', () => {
    expect(arms.length).toBeGreaterThanOrEqual(12);
  });

  it.each(arms.map((a) => [a.viewType, a]))(
    'the %s arm passes every prop its view requires',
    (_viewType, arm) => {
      const viewSrc = fs.readFileSync(path.join(dir, `${arm.component}.js`), 'utf8');
      // Handles both `export default function X({...})` and the
      // `export default React.memo(function X({...}))` wrapper.
      const sig = viewSrc.match(
        /export default (?:React\.memo\(\s*)?function \w+\(\s*\{([^}]*)\}/
      );
      expect(sig).not.toBeNull();

      const params = sig[1].split(',').map((p) => p.trim()).filter(Boolean);
      const required = params
        .filter((p) => !p.includes('='))
        .map((p) => p.split(':')[0].trim());

      const missing = required.filter((p) => !arm.passed.includes(p));
      expect(missing).toEqual([]);
    }
  );
});

/**
 * Same value-side check for the mobile Directory path. Its map produces
 * component names rather than view-type strings, and app/modules/shop-detail/index.js
 * resolves them through a VIEW_COMPONENTS lookup that also falls back to
 * RetailVisitorView on a miss — so a typo'd component name degrades exactly the
 * way a stale category key does, silently.
 */
describe('mobile Directory visitor views', () => {
  const configSrc = fs.readFileSync(FILES.mobileDirectory.file, 'utf8');
  const routerFile = path.join(REPO, 'apps/mobile/app/modules/shop-detail/index.js');
  const routerSrc = fs.readFileSync(routerFile, 'utf8');
  const viewsDir = path.dirname(routerFile);

  const mappedViews = [...new Set(
    [...configSrc.matchAll(/:\s*'(\w+VisitorView)'/g)].map((m) => m[1])
  )];

  const registered = (() => {
    const start = routerSrc.indexOf('const VIEW_COMPONENTS');
    const open = routerSrc.indexOf('{', start);
    const close = routerSrc.indexOf('}', open);
    return routerSrc
      .slice(open + 1, close)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  })();

  it('the map produces a non-trivial set of views', () => {
    expect(mappedViews.length).toBeGreaterThan(5);
  });

  it('every view the map produces is registered in VIEW_COMPONENTS', () => {
    const unregistered = mappedViews.filter((v) => !registered.includes(v));
    expect(unregistered).toEqual([]);
  });

  it('every view the map produces exists on disk', () => {
    const missing = mappedViews.filter((v) => !fs.existsSync(path.join(viewsDir, `${v}.js`)));
    expect(missing).toEqual([]);
  });

  it('every registered view is imported', () => {
    const imported = [...routerSrc.matchAll(/import (\w+) from '\.\/(\w+)'/g)].map((m) => m[1]);
    const notImported = registered.filter((v) => !imported.includes(v));
    expect(notImported).toEqual([]);
  });
});
