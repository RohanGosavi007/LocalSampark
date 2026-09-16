/**
 * Cross-franchise isolation at the route level.
 *
 * The service-level tests prove the scope is computed correctly. These prove it
 * is actually *applied* — which is a separate failure. A correct scopeClause
 * that no route calls leaks exactly as much data as no scopeClause at all, and
 * that is the state GET /franchise/leads was in: it returned every lead on the
 * platform, with names, phone numbers and email addresses, to any authenticated
 * franchise partner who asked.
 *
 * Each test here is written as the attack rather than as the feature: partner B
 * asks for partner A's data and must be refused. A test that only checks "A
 * sees A's rows" passes just as happily against an unfiltered query.
 */

process.env.USE_SQLITE = 'true';

const express = require('express');
const request = require('supertest');

// The routers pull `authenticate` in at require time, so the identity has to be
// swapped through a module-level variable (jest requires the `mock` prefix) rather than per-request.
let mockCurrentUser = null;

jest.mock('../../middleware/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    if (!mockCurrentUser) return res.status(401).json({ error: 'unauthenticated' });
    req.user = mockCurrentUser;
    next();
  },
  requireAdmin: (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'admin' || role === 'super_admin') return next();
    return res.status(403).json({ error: 'admin only' });
  },
  requireRole: () => (req, res, next) => next(),
  optionalAuth: (req, res, next) => {
    if (mockCurrentUser) req.user = mockCurrentUser;
    next();
  },
  ROLES: {},
  hasAccess: () => (req, res, next) => next(),
}));

const { query, queryOne } = require('../../config/database');
const svc = require('../../services/territoryResolution.service');

const T_A = 'iso-territory-a';
const T_B = 'iso-territory-b';
const PARTNER_A = 'iso-partner-a';
const PARTNER_B = 'iso-partner-b';
const USER_A = 'iso-user-a';
const USER_B = 'iso-user-b';
// Distinct from the pincodes territoryResolution.test.js uses. territories.pincode
// is UNIQUE and jest runs suites concurrently against one SQLite file, so two
// suites claiming 411001 collide — and only in a full run, which is the worst
// kind of flake to chase.
const PIN_A = '413001';
const PIN_B = '413002';

let app;
let talukaId;

async function cleanup() {
  await query("DELETE FROM crm_leads WHERE id LIKE 'iso-lead-%'");
  await query("DELETE FROM territory_assignment_log WHERE territory_id LIKE 'iso-territory-%'");
  await query("DELETE FROM franchise_territories WHERE territory_id LIKE 'iso-territory-%'");
  await query("DELETE FROM franchise_partners WHERE id LIKE 'iso-partner-%'");
  await query("DELETE FROM territories WHERE id LIKE 'iso-territory-%'");
  await query("DELETE FROM users WHERE id LIKE 'iso-user-%'");
  await query("DELETE FROM regions WHERE id LIKE 'iso-zone-%'");
  await query("DELETE FROM location_talukas WHERE id LIKE 'iso-%'");
  await query("DELETE FROM location_districts WHERE id LIKE 'iso-%'");
  await query("DELETE FROM location_states WHERE id LIKE 'iso-%'");
}

beforeAll(async () => {
  await cleanup();
  svc.invalidate();

  // territories.taluka_id is NOT NULL and every territory lookup joins the full
  // state → district → taluka chain, so a fixture without one is rejected on
  // insert. The shared jest fixtures do not seed the location hierarchy.
  const taluka = await queryOne('SELECT id FROM location_talukas LIMIT 1');
  if (taluka) {
    talukaId = taluka.id;
  } else {
    talukaId = 'iso-taluka';
    await query('INSERT INTO location_states (id, name, code) VALUES ($1, $2, $3)', [
      'iso-state',
      'Isolation State',
      'ISO',
    ]);
    await query('INSERT INTO location_districts (id, state_id, name) VALUES ($1, $2, $3)', [
      'iso-district',
      'iso-state',
      'Isolation District',
    ]);
    await query('INSERT INTO location_talukas (id, district_id, name) VALUES ($1, $2, $3)', [
      talukaId,
      'iso-district',
      'Isolation Taluka',
    ]);
  }

  const partners = [
    [USER_A, PARTNER_A, PIN_A, T_A, '9811110001'],
    [USER_B, PARTNER_B, PIN_B, T_B, '9811110002'],
  ];

  for (const [uid, pid, pin, tid, phone] of partners) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [
      uid,
      `Isolation ${pid}`,
      phone,
      'franchise_owner',
    ]);
    await query(
      `INSERT INTO territories (id, name, pincode, taluka_id, centroid_lat, centroid_lng, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tid, `Isolation ${pin}`, pin, talukaId, 18.53, 73.87, 1]
    );
    await query(
      'INSERT INTO franchise_partners (id, user_id, territory_name, territory_pincode, status) VALUES ($1, $2, $3, $4, $5)',
      [pid, uid, `Isolation ${pin}`, pin, 'active']
    );
    await svc.assignTerritory({ franchisePartnerId: pid, territoryId: tid });
  }

  // One lead in each partner's area, plus one belonging to nobody.
  const leads = [
    ['iso-lead-a', 'Anita', PIN_A, T_A, PARTNER_A],
    ['iso-lead-b', 'Bhaskar', PIN_B, T_B, PARTNER_B],
    ['iso-lead-orphan', 'Orphan', null, null, null],
  ];
  for (const [id, name, pin, tid, pid] of leads) {
    await query(
      `INSERT INTO crm_leads (id, first_name, phone, status, pincode, territory_id, franchise_partner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, name, '9999999999', 'new', pin, tid, pid]
    );
  }

  app = express();
  app.use(express.json());
  app.use('/franchise', require('../../modules/crm/routes/franchise.routes'));
  app.use('/crm', require('../../modules/crm/routes/crm.routes'));
  app.use('/franchise-intelligence', require('../../modules/crm/routes/franchise-intelligence.routes'));

  // Zones are regions, and a region carries the pincode the scope is keyed on.
  await query("DELETE FROM regions WHERE id LIKE 'iso-zone-%'");
  const insertZone = (id, name, pin) =>
    query(
      `INSERT INTO regions (id, name, state, country, latitude, longitude, pincode, is_active)
       VALUES ($1, $2, 'Maharashtra', 'India', 18.53, 73.87, $3, 1)`,
      [id, name, pin]
    );
  await insertZone('iso-zone-a', 'Isolation Zone A', PIN_A);
  await insertZone('iso-zone-b', 'Isolation Zone B', PIN_B);
});

afterAll(async () => {
  await cleanup();
});

beforeEach(() => {
  mockCurrentUser = null;
});

describe('GET /franchise/leads cross-franchise isolation', () => {
  test('a partner receives only the leads in the pincodes they hold', async () => {
    mockCurrentUser = { id: USER_A, role: 'franchise_owner' };
    const res = await request(app).get('/franchise/leads');

    expect(res.status).toBe(200);
    const ids = res.body.leads.map((l) => l.id);
    expect(ids).toContain('iso-lead-a');
    expect(ids).not.toContain('iso-lead-b');
  });

  test("partner B cannot see partner A's lead contact details", async () => {
    mockCurrentUser = { id: USER_B, role: 'franchise_owner' };
    const res = await request(app).get('/franchise/leads');

    expect(res.status).toBe(200);
    expect(res.body.leads.map((l) => l.id)).toEqual(['iso-lead-b']);
  });

  test('an unattributed lead is invisible to every partner', async () => {
    // NULL attribution must not read as "belongs to whoever is asking". It is
    // an administrator's backlog item, not a shared row.
    for (const user of [USER_A, USER_B]) {
      mockCurrentUser = { id: user, role: 'franchise_owner' };
      const res = await request(app).get('/franchise/leads');
      expect(res.body.leads.map((l) => l.id)).not.toContain('iso-lead-orphan');
    }
  });

  test('an administrator still sees every lead, including unattributed ones', async () => {
    mockCurrentUser = { id: 'iso-admin', role: 'super_admin' };
    const res = await request(app).get('/franchise/leads');

    expect(res.status).toBe(200);
    expect(res.body.leads.map((l) => l.id)).toEqual(
      expect.arrayContaining(['iso-lead-a', 'iso-lead-b', 'iso-lead-orphan'])
    );
  });

  test('a user who is not a franchise partner is refused, not given everything', async () => {
    mockCurrentUser = { id: 'iso-user-nobody', role: 'user' };
    const res = await request(app).get('/franchise/leads');

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('not_a_franchise_partner');
  });

  test('a suspended partner loses access to the leads in their former area', async () => {
    await query('UPDATE franchise_partners SET status = $1 WHERE id = $2', ['suspended', PARTNER_A]);
    try {
      mockCurrentUser = { id: USER_A, role: 'franchise_owner' };
      const res = await request(app).get('/franchise/leads');
      expect(res.status).toBe(403);
      expect(res.body.reason).toBe('partner_suspended');
    } finally {
      await query('UPDATE franchise_partners SET status = $1 WHERE id = $2', ['active', PARTNER_A]);
    }
  });
});

describe('lead attribution on creation', () => {
  test('a lead created with a pincode is attributed to the franchise serving it', async () => {
    mockCurrentUser = { id: USER_B, role: 'franchise_owner' };

    const res = await request(app)
      .post('/crm/leads')
      .send({ customer_name: 'Attributed', phone: '9000000001', pincode: ` ${PIN_A} ` });

    expect(res.status).toBe(201);

    const stored = await queryOne('SELECT * FROM crm_leads WHERE id = $1', [res.body.id]);
    try {
      // Normalised on the way in: the padded string must not be stored, or the
      // scoped `IN (...)` comparison would never match it again.
      expect(stored.pincode).toBe(PIN_A);
      expect(stored.territory_id).toBe(T_A);
      // Attribution follows the territory, not the creator. Partner B entered
      // this lead; partner A serves the area and is credited for it.
      expect(stored.franchise_partner_id).toBe(PARTNER_A);
    } finally {
      await query('DELETE FROM crm_leads WHERE id = $1', [res.body.id]);
    }
  });

  test('a lead with no usable location is stored unattributed rather than mis-attributed', async () => {
    mockCurrentUser = { id: USER_A, role: 'franchise_owner' };

    const res = await request(app)
      .post('/crm/leads')
      .send({ customer_name: 'No location', phone: '9000000002' });

    expect(res.status).toBe(201);
    const stored = await queryOne('SELECT * FROM crm_leads WHERE id = $1', [res.body.id]);
    try {
      expect(stored.franchise_partner_id).toBeFalsy();
      expect(stored.territory_id).toBeFalsy();
    } finally {
      await query('DELETE FROM crm_leads WHERE id = $1', [res.body.id]);
    }
  });
});

describe('GET /franchise/dashboard', () => {
  test('counts shops across every pincode held, not just the registration one', async () => {
    // Give partner A a second territory; the dashboard must widen with it.
    const extra = 'iso-territory-a2';
    await query('DELETE FROM territories WHERE id = $1', [extra]);
    await query(
      `INSERT INTO territories (id, name, pincode, taluka_id, centroid_lat, centroid_lng, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [extra, 'Isolation 413003', '413003', talukaId, 18.53, 73.87, 1]
    );
    await svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: extra });

    try {
      mockCurrentUser = { id: USER_A, role: 'franchise_owner' };
      const res = await request(app).get('/franchise/dashboard');

      expect(res.status).toBe(200);
      expect(res.body.territoryPincodes).toEqual(expect.arrayContaining([PIN_A, '413003']));
    } finally {
      await query('DELETE FROM franchise_territories WHERE territory_id = $1', [extra]);
      await query('DELETE FROM territory_assignment_log WHERE territory_id = $1', [extra]);
      await query('DELETE FROM territories WHERE id = $1', [extra]);
      svc.invalidate();
    }
  });

  test("a partner cannot read another partner's dashboard by id", async () => {
    mockCurrentUser = { id: USER_B, role: 'franchise_owner' };
    const res = await request(app).get(`/franchise/dashboard?franchiseId=${PARTNER_A}`);
    expect(res.status).toBe(403);
  });
});

describe('franchise-intelligence zone ownership', () => {
  // These routes were guarded only by `requireRole('franchise')`, which asks
  // whether the caller is *a* franchise and never whether it is *this* one. Any
  // partner could substitute another partner's region id in the URL.

  test("a partner cannot read another partner's merchant health scores", async () => {
    mockCurrentUser = { id: USER_B, role: 'franchise_owner' };
    const res = await request(app).get('/franchise-intelligence/iso-zone-a/health-scores');
    expect(res.status).toBe(403);
  });

  test("a partner cannot read another partner's prospect list", async () => {
    mockCurrentUser = { id: USER_B, role: 'franchise_owner' };
    const res = await request(app).get('/franchise-intelligence/iso-zone-a/leads');
    expect(res.status).toBe(403);
  });

  test("a partner cannot write outreach into another partner's log", async () => {
    mockCurrentUser = { id: USER_B, role: 'franchise_owner' };
    const res = await request(app)
      .post('/franchise-intelligence/iso-zone-a/outreach')
      .send({ method: 'call', notes: 'should never be recorded' });

    expect(res.status).toBe(403);

    const written = await queryOne(
      'SELECT COUNT(*) AS c FROM franchise_outreach_log WHERE region_id = $1',
      ['iso-zone-a']
    );
    expect(Number(written.c)).toBe(0);
  });

  test('a partner reaches their own zone', async () => {
    mockCurrentUser = { id: USER_B, role: 'franchise_owner' };
    const res = await request(app).get('/franchise-intelligence/iso-zone-b/leads');
    expect(res.status).toBe(200);
  });

  test('an unknown zone is a 404, not a silent pass', async () => {
    mockCurrentUser = { id: USER_B, role: 'franchise_owner' };
    const res = await request(app).get('/franchise-intelligence/iso-zone-missing/leads');
    expect(res.status).toBe(404);
  });
});
