/**
 * Role parity: a specialised role is still a citizen.
 *
 * Every user of this platform is a citizen first and holds a specialised role
 * second. A security guard finishes a shift and buys groceries; a society admin
 * books a cab; a delivery rider orders dinner. The app did not agree.
 *
 * `MODULE_ACCESS` enumerated the consumer surface role by role — `marketplace`,
 * `carpool`, `checkout`, `bills`, `jobs`, `health`, `shop-detail` and the rest
 * named only USER, RESIDENT_MEMBER and SUPER_ADMIN. A guard tapping Nearby
 * Shops was told "Access Restricted — your current role (Security Guard) does
 * not have permission to view this section." A society admin could not check
 * out a cart. Taking a job on the gate meant giving up being a customer.
 *
 * The guard's navigation shell made it worse: a single `index` tab titled
 * "Gate", so there was no route out of the console even to the screens they
 * were nominally allowed. Their own phone became a single-purpose terminal.
 *
 * These tests are written as the person, not the matrix: "can a guard buy
 * something" rather than "is SECURITY_GUARD in this array".
 */

const {
  ROLES,
  CITIZEN_MODULES,
  MODULE_ACCESS,
  hasAccess,
  getTabsForRole,
} = require('../src/utils/rolePolicy');
// rolePolicy, not permissions: the latter carries the withRoleGuard HOC and so
// contains JSX, which this deliberately-minimal jest setup does not transform.
// permissions.js re-exports everything below, so both reach the same policy.

/** Everyone who can hold a session. `visitor` is the signed-out placeholder. */
const AUTHENTICATED_ROLES = Object.values(ROLES).filter((r) => r !== ROLES.VISITOR);

/** The consumer surface the brief requires every role to keep. */
const STANDARD_FEATURES = [
  'directory',        // Nearby Shops
  'shop-detail',
  'marketplace',      // Hyperlocal Marketplace
  'community_hub',    // Local Feeds
  'carpool',          // Rideshare
  'checkout',
  'order-tracking',
  'bills',
  'jobs',
  'health',
  'events',
  'chat',
];

describe('the citizen floor', () => {
  test.each(AUTHENTICATED_ROLES)('%s can reach every standard feature', (role) => {
    for (const feature of STANDARD_FEATURES) {
      expect(hasAccess(role, feature)).toBe(true);
    }
  });

  test('a security guard can shop, book a ride and check out', () => {
    // The specific complaint the fix addresses, spelled out.
    expect(hasAccess(ROLES.SECURITY_GUARD, 'directory')).toBe(true);
    expect(hasAccess(ROLES.SECURITY_GUARD, 'marketplace')).toBe(true);
    expect(hasAccess(ROLES.SECURITY_GUARD, 'carpool')).toBe(true);
    expect(hasAccess(ROLES.SECURITY_GUARD, 'checkout')).toBe(true);
  });

  test('a society admin can use consumer features as an ordinary citizen', () => {
    expect(hasAccess(ROLES.SOCIETY_ADMIN, 'marketplace')).toBe(true);
    expect(hasAccess(ROLES.SOCIETY_ADMIN, 'checkout')).toBe(true);
    expect(hasAccess(ROLES.SOCIETY_ADMIN, 'order-tracking')).toBe(true);
  });

  test('a delivery agent and a shop owner are citizens too', () => {
    for (const role of [ROLES.DELIVERY_AGENT, ROLES.SHOP_OWNER]) {
      expect(hasAccess(role, 'marketplace')).toBe(true);
      expect(hasAccess(role, 'carpool')).toBe(true);
    }
  });

  test('the citizen list and the specialist matrix do not overlap', () => {
    // A module in both is ambiguous: the floor would grant it and the matrix
    // would appear to restrict it, and whichever is read first wins.
    const overlap = CITIZEN_MODULES.filter((m) => MODULE_ACCESS[m]);
    expect(overlap).toEqual([]);
  });
});

describe('specialist consoles stay gated', () => {
  test('a guard cannot open a shop owner console', () => {
    // The floor must not become a skeleton key. A gate console is not a shop
    // owner's business and a shop's inventory is not a guard's.
    expect(hasAccess(ROLES.SECURITY_GUARD, 'shop-products')).toBe(false);
    expect(hasAccess(ROLES.SECURITY_GUARD, 'shop-analytics')).toBe(false);
  });

  test('a plain user cannot open the gate console or platform admin', () => {
    expect(hasAccess(ROLES.USER, 'security-gate')).toBe(false);
    expect(hasAccess(ROLES.USER, 'admin')).toBe(false);
    expect(hasAccess(ROLES.USER, 'franchise-revenue')).toBe(false);
  });

  test('a society admin cannot open franchise or moderation consoles', () => {
    expect(hasAccess(ROLES.SOCIETY_ADMIN, 'franchise-revenue')).toBe(false);
    expect(hasAccess(ROLES.SOCIETY_ADMIN, 'mod-content')).toBe(false);
  });

  test('a guard and a society admin can open the gate console', () => {
    expect(hasAccess(ROLES.SECURITY_GUARD, 'security-gate')).toBe(true);
    expect(hasAccess(ROLES.SOCIETY_ADMIN, 'security-gate')).toBe(true);
  });

  test('an unknown module name is refused, not allowed', () => {
    // A typo in a route name must not open a door.
    expect(hasAccess(ROLES.USER, 'not-a-real-module')).toBe(false);
    expect(hasAccess(ROLES.SECURITY_GUARD, 'not-a-real-module')).toBe(false);
  });

  test('a super admin still reaches everything', () => {
    expect(hasAccess(ROLES.SUPER_ADMIN, 'security-gate')).toBe(true);
    expect(hasAccess(ROLES.SUPER_ADMIN, 'not-a-real-module')).toBe(true);
  });

  test('a signed-out visitor reaches nothing', () => {
    expect(hasAccess(null, 'marketplace')).toBe(false);
    expect(hasAccess(undefined, 'directory')).toBe(false);
  });
});

describe('the society portal is reachable under the composable model', () => {
  test('a plain user can open the society module', () => {
    // A resident's base role is `user`; their society membership is what grants
    // the flat portal. Gating on RESIDENT_MEMBER alone meant a resident whose
    // account was never re-roled could not reach their own society.
    expect(hasAccess(ROLES.USER, 'society')).toBe(true);
  });

  test('guards, residents and society admins all reach it', () => {
    for (const role of [ROLES.SECURITY_GUARD, ROLES.RESIDENT_MEMBER, ROLES.SOCIETY_ADMIN]) {
      expect(hasAccess(role, 'society')).toBe(true);
    }
  });
});

describe('no role is trapped in an isolated shell', () => {
  test.each(AUTHENTICATED_ROLES)('%s has more than one tab', (role) => {
    // A single-tab shell has no route out of its console. The guard had exactly
    // one: `index`, titled "Gate".
    const config = getTabsForRole(role);
    expect(config.tabs.length).toBeGreaterThan(1);
  });

  test('a guard keeps the gate as their landing tab', () => {
    // It is what they open the app for during a shift; the fix adds routes out,
    // it does not bury the console.
    const tabs = getTabsForRole(ROLES.SECURITY_GUARD).tabs;
    expect(tabs[0].name).toBe('index');
    expect(tabs[0].title).toBe('Gate');
  });

  test('a guard can navigate to the standard surfaces from the shell', () => {
    const names = getTabsForRole(ROLES.SECURITY_GUARD).tabs.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['directory', 'community', 'more']));
  });

  test('an unrecognised role falls back to the citizen shell rather than nothing', () => {
    const config = getTabsForRole('some-future-role');
    expect(config.tabs.length).toBeGreaterThan(1);
  });
});
