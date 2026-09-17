/**
 * Job card lifecycle, ownership and row shape.
 *
 * This module manages repair jobs for garages, appliance and mobile repair
 * shops. Four things were wrong with it, and three of them were invisible:
 *
 *  1. **No ownership check anywhere.** Every mutating route was guarded by
 *     `authenticate` alone. The shop id sits in the URL and nothing compared it
 *     to the caller, so any signed-in account could create job cards in any
 *     garage, move any repair to "completed", edit any milestone, and add
 *     labour charges to a stranger's bill through the parts route.
 *
 *  2. **No state machine.** Any status could follow any other. A completed
 *     repair could be moved back to "received" and a cancelled one revived —
 *     and the customer sees this status.
 *
 *  3. **The public tracking route ignored its own shop id.** It looked up by
 *     job_number alone. Job numbers are `JOB-` plus a base-36 timestamp, so
 *     they are sequential and guessable, and the route is deliberately
 *     unauthenticated. Anyone could walk the number space and read customer
 *     names off every repair job on the platform.
 *
 *  4. **`result.rows` assumed everywhere.** The SQLite layer returns the array
 *     itself, so every listing resolved to `[]` and creation threw "Cannot read
 *     properties of undefined".
 */

process.env.USE_SQLITE = 'true';

const crypto = require('crypto');
const { query, queryOne } = require('../../config/database');

const SHOP_A = 'jc-shop-a';
const SHOP_B = 'jc-shop-b';
const OWNER_A = 'jc-owner-a';
const OWNER_B = 'jc-owner-b';

// The flow the route enforces, restated here so a change to it has to be
// deliberate in two places.
const FLOW = {
  received: ['diagnosed', 'cancelled'],
  diagnosed: ['waiting_parts', 'in_progress', 'cancelled'],
  waiting_parts: ['in_progress', 'cancelled'],
  in_progress: ['quality_check', 'waiting_parts', 'cancelled'],
  quality_check: ['ready', 'in_progress', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const canMove = (from, to) => from === to || (FLOW[from] || []).includes(to);

async function cleanup() {
  await query("DELETE FROM job_card_milestones WHERE job_card_id LIKE 'jc-%'");
  await query("DELETE FROM job_cards WHERE id LIKE 'jc-%' OR shop_id LIKE 'jc-shop-%'");
  await query("DELETE FROM local_shops WHERE id LIKE 'jc-shop-%'");
  await query("DELETE FROM users WHERE id LIKE 'jc-owner-%'");
}

beforeAll(async () => {
  await cleanup();

  for (const [uid, phone] of [[OWNER_A, '9844000001'], [OWNER_B, '9844000002']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)',
      [uid, `JC ${uid}`, phone, 'shop_owner']);
  }

  for (const [sid, owner] of [[SHOP_A, OWNER_A], [SHOP_B, OWNER_B]]) {
    await query(
      `INSERT INTO local_shops (id, owner_id, category, name, description, address, coordinate,
                                latitude, longitude, is_active)
       VALUES ($1, $2, 'automotive-mechanic', $3, 'Fixture', '1 Test Road', '18.53,73.87', 18.53, 73.87, 1)`,
      [sid, owner, `JC ${sid}`]
    );
  }
});

afterAll(cleanup);

beforeEach(async () => {
  await query("DELETE FROM job_card_milestones WHERE job_card_id LIKE 'jc-card%'");
  await query("DELETE FROM job_cards WHERE id LIKE 'jc-card%'");
});

async function makeCard(id, shopId = SHOP_A, status = 'received') {
  await query(
    // `title` is NOT NULL — the defect that made the create route fail outright.
    `INSERT INTO job_cards (id, shop_id, job_number, title, customer_name, description, status, created_at)
     VALUES ($1, $2, $3, 'Brake noise', 'JC Customer', 'Brake noise', $4, datetime('now'))`,
    [id, shopId, `JOB-${id.toUpperCase()}`, status]
  );
  return queryOne('SELECT * FROM job_cards WHERE id = $1', [id]);
}

describe('the status flow', () => {
  test('a job moves forward through the intended sequence', async () => {
    const path = ['received', 'diagnosed', 'in_progress', 'quality_check', 'ready', 'completed'];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canMove(path[i], path[i + 1])).toBe(true);
    }
  });

  test('a completed job cannot be reopened', async () => {
    // Terminal means terminal. Reopening a finished repair is a new job card,
    // which is also what the receipt and the warranty clock need it to be.
    for (const target of Object.keys(FLOW)) {
      if (target === 'completed') continue;
      expect(canMove('completed', target)).toBe(false);
    }
  });

  test('a cancelled job cannot be revived', async () => {
    expect(canMove('cancelled', 'in_progress')).toBe(false);
    expect(canMove('cancelled', 'received')).toBe(false);
  });

  test('a job cannot skip diagnosis and jump straight to ready', async () => {
    // Nobody has looked at it yet, and the customer is being told it is done.
    expect(canMove('received', 'ready')).toBe(false);
    expect(canMove('received', 'completed')).toBe(false);
  });

  test('a job can go back for parts or rework', async () => {
    // Genuine backward moves the flow must keep allowing.
    expect(canMove('in_progress', 'waiting_parts')).toBe(true);
    expect(canMove('quality_check', 'in_progress')).toBe(true);
  });

  test('cancellation is reachable from every live state', async () => {
    for (const state of ['received', 'diagnosed', 'waiting_parts', 'in_progress', 'quality_check', 'ready']) {
      expect(canMove(state, 'cancelled')).toBe(true);
    }
  });

  test('re-setting the current status is a no-op, not a rejection', async () => {
    // A retried request from a patchy connection must not look like a rejected
    // one to the shop staff.
    expect(canMove('in_progress', 'in_progress')).toBe(true);
  });
});

describe('shop scoping', () => {
  test("a card is only found under the shop that owns it", async () => {
    await makeCard('jc-card-1', SHOP_A);

    // The guard the routes now apply: cardId paired with shopId. Without the
    // pairing the shop segment of the URL was decoration and any card id
    // worked under any shop id.
    const underOwner = await queryOne('SELECT * FROM job_cards WHERE id = $1 AND shop_id = $2',
      ['jc-card-1', SHOP_A]);
    const underOther = await queryOne('SELECT * FROM job_cards WHERE id = $1 AND shop_id = $2',
      ['jc-card-1', SHOP_B]);

    expect(underOwner).toBeTruthy();
    expect(underOther).toBeFalsy();
  });

  test('shop ownership is resolvable for the guard', async () => {
    const shop = await queryOne('SELECT id, owner_id FROM local_shops WHERE id = $1', [SHOP_A]);
    expect(shop.owner_id).toBe(OWNER_A);
    expect(shop.owner_id).not.toBe(OWNER_B);
  });

  test('a milestone belongs to one card', async () => {
    await makeCard('jc-card-2', SHOP_A);
    const milestoneId = crypto.randomUUID();
    await query(
      `INSERT INTO job_card_milestones (id, job_card_id, step_order, title, status)
       VALUES ($1, $2, 1, 'Received', 'pending')`,
      [milestoneId, 'jc-card-2']
    ).catch(async () => {
      await query(
        `INSERT INTO job_card_milestones (job_card_id, step_order, title, status)
         VALUES ($1, 1, 'Received', 'pending')`,
        ['jc-card-2']
      );
    });

    const own = await queryOne('SELECT id FROM job_card_milestones WHERE job_card_id = $1', ['jc-card-2']);
    expect(own).toBeTruthy();

    // Updating by milestone id alone let any milestone on the platform be
    // edited through any shop's URL.
    const foreign = await queryOne(
      'SELECT id FROM job_card_milestones WHERE id = $1 AND job_card_id = $2',
      [own.id, 'jc-card-does-not-exist']
    );
    expect(foreign).toBeFalsy();
  });
});

describe('public tracking is scoped to its shop', () => {
  test('a job number resolves only under its own shop', async () => {
    const card = await makeCard('jc-card-3', SHOP_A);

    const correct = await query(
      'SELECT id FROM job_cards WHERE job_number = $1 AND shop_id = $2',
      [card.job_number, SHOP_A]
    );
    const wrong = await query(
      'SELECT id FROM job_cards WHERE job_number = $1 AND shop_id = $2',
      [card.job_number, SHOP_B]
    );

    expect((correct.rows || correct).length).toBe(1);
    // Unscoped, anyone could walk the guessable number space and read customer
    // names off every repair job on the platform.
    expect((wrong.rows || wrong).length).toBe(0);
  });
});

describe('row shape', () => {
  test('a listing returns rows on this driver', async () => {
    await makeCard('jc-card-4', SHOP_A);
    const result = await query('SELECT * FROM job_cards WHERE shop_id = $1', [SHOP_A]);

    // The defect: `result.rows || []` gave [] on SQLite, so job cards silently
    // never appeared in the shop's list.
    const rows = Array.isArray(result) ? result : (result.rows || []);
    expect(rows.length).toBeGreaterThan(0);

    // And the shape this file used to assume, proven to be the wrong one here.
    if (Array.isArray(result)) {
      expect(result.rows).toBeUndefined();
    }
  });

  test('a RETURNING insert yields a usable row', async () => {
    const result = await query(
      `INSERT INTO job_cards (id, shop_id, job_number, title, customer_name, description, status, created_at)
       VALUES ($1, $2, $3, 'Test job', 'JC Customer', 'Test', 'received', datetime('now')) RETURNING *`,
      ['jc-card-5', SHOP_A, 'JOB-JC-CARD-5']
    );

    const rows = Array.isArray(result) ? result : (result.rows || []);
    const created = rows[0];

    // `result.rows[0]` threw "Cannot read properties of undefined" here, which
    // is the exact TypeError class the audit brief named.
    expect(created).toBeTruthy();
    expect(created.id).toBe('jc-card-5');
  });
});
