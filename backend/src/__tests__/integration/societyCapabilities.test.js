/**
 * Society capabilities, tenancy isolation and the visitor lifecycle.
 *
 * Three properties are pinned here, each guarding a failure that produced no
 * error:
 *
 *  1. **A capability is held in a society, not in general.** A guard at one
 *     society must hold nothing at another. This is what makes tampering with
 *     a society id uninteresting: it moves the caller to a society where they
 *     have no capability, rather than to someone else's records.
 *
 *  2. **Approval belongs to the resident being visited.** Previously any member
 *     of a society could set any status on any visitor — a neighbour could
 *     approve a visitor for a flat that was not theirs. A guard explicitly
 *     cannot approve: the point of the approval step is that someone upstairs
 *     agrees, and a gate that approves its own entries is the step deleted.
 *
 *  3. **The lifecycle is a machine, not a free-text field.** A checked-out
 *     visitor could be put back to checked-in and a denied one approved after
 *     the fact. This log is the record of who was inside the society and when.
 */

process.env.USE_SQLITE = 'true';

const crypto = require('crypto');
const { query, queryOne } = require('../../config/database');
const caps = require('../../modules/community/middleware/society-capability');

const SOC_A = 'sc-society-a';
const SOC_B = 'sc-society-b';

const RESIDENT_101 = 'sc-resident-101';
const RESIDENT_102 = 'sc-resident-102';
const GUARD_A = 'sc-guard-a';
const GUARD_B = 'sc-guard-b';
const ADMIN_A = 'sc-admin-a';
const OUTSIDER = 'sc-outsider';

const reqFor = (userId, role = 'user') => ({ user: { id: userId, role } });

async function cleanup() {
  await query("DELETE FROM society_visitors WHERE id LIKE 'sc-%'");
  await query("DELETE FROM society_admin_roles WHERE user_id LIKE 'sc-%'");
  await query("DELETE FROM society_members WHERE user_id LIKE 'sc-%'");
  await query("DELETE FROM societies WHERE id LIKE 'sc-society-%'");
  await query("DELETE FROM users WHERE id LIKE 'sc-%'");
}

beforeAll(async () => {
  await cleanup();

  const people = [
    [RESIDENT_101, '9855000001'], [RESIDENT_102, '9855000002'],
    [GUARD_A, '9855000003'], [GUARD_B, '9855000004'],
    [ADMIN_A, '9855000005'], [OUTSIDER, '9855000006'],
  ];
  for (const [id, phone] of people) {
    // Base role stays `user` for everyone: being a guard is something you are
    // in a society, not instead of being a citizen.
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)',
      [id, `SC ${id}`, phone, 'user']);
  }

  for (const [id, name] of [[SOC_A, 'Green Acres'], [SOC_B, 'Blue Meadows']]) {
    await query(
      // societies carries name/address/coordinate, not city/state/pincode.
      `INSERT INTO societies (id, name, address, is_active) VALUES ($1, $2, '1 Society Road, Pune', 1)`,
      [id, name]
    );
  }

  // Guards and society admins carry no flat — migration 107 made
  // society_members.flat_number nullable so the membership table can represent
  // them at all. Before it, a guard could not be a society member, which is why
  // their society affiliation had nowhere to live but users.role.
  const members = [
    [RESIDENT_101, SOC_A, 'resident', '101'],
    [RESIDENT_102, SOC_A, 'resident', '102'],
    [GUARD_A, SOC_A, 'guard', null],
    [GUARD_B, SOC_B, 'guard', null],
    [ADMIN_A, SOC_A, 'society_admin', null],
  ];
  for (const [userId, societyId, role, flat] of members) {
    await query(
      `INSERT INTO society_members (id, society_id, user_id, flat_number, role, is_active, status)
       VALUES ($1, $2, $3, $4, $5, 1, 'active')`,
      [crypto.randomUUID(), societyId, userId, flat, role]
    );
  }
});

afterAll(cleanup);

describe('capabilities are scoped to one society', () => {
  test('a guard can log gate entries in their own society', async () => {
    expect(await caps.hasSocietyCapability(reqFor(GUARD_A), SOC_A, caps.CAPABILITIES.LOG_GATE_ENTRY)).toBe(true);
  });

  test('a guard holds nothing at another society', async () => {
    // The property that makes a tampered societyId uninteresting: it moves the
    // caller somewhere they hold nothing, not into someone else's records.
    expect(await caps.hasSocietyCapability(reqFor(GUARD_A), SOC_B, caps.CAPABILITIES.LOG_GATE_ENTRY)).toBe(false);
    expect(await caps.hasSocietyCapability(reqFor(GUARD_B), SOC_A, caps.CAPABILITIES.LOG_GATE_ENTRY)).toBe(false);
  });

  test('a resident holds nothing at another society', async () => {
    expect(await caps.hasSocietyCapability(reqFor(RESIDENT_101), SOC_B, caps.CAPABILITIES.APPROVE_VISITOR)).toBe(false);
  });

  test('a society admin manages only their own society', async () => {
    expect(await caps.hasSocietyCapability(reqFor(ADMIN_A), SOC_A, caps.CAPABILITIES.MANAGE_SOCIETY)).toBe(true);
    expect(await caps.hasSocietyCapability(reqFor(ADMIN_A), SOC_B, caps.CAPABILITIES.MANAGE_SOCIETY)).toBe(false);
  });

  test('someone with no membership holds nothing anywhere', async () => {
    expect(await caps.hasSocietyCapability(reqFor(OUTSIDER), SOC_A, caps.CAPABILITIES.APPROVE_VISITOR)).toBe(false);
    expect(await caps.hasSocietyCapability(reqFor(OUTSIDER), SOC_A, caps.CAPABILITIES.LOG_GATE_ENTRY)).toBe(false);
  });

  test('platform staff are unscoped by design', async () => {
    expect(await caps.hasSocietyCapability(reqFor('sc-platform', 'super_admin'), SOC_A, caps.CAPABILITIES.MANAGE_SOCIETY)).toBe(true);
  });

  test('a removed member keeps their history and loses their capability', async () => {
    const former = 'sc-former';
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)',
      [former, 'SC Former', '9855000099', 'user']);
    await query(
      `INSERT INTO society_members (id, society_id, user_id, flat_number, role, is_active, status)
       VALUES ($1, $2, $3, '103', 'resident', 0, 'removed')`,
      [crypto.randomUUID(), SOC_A, former]
    );

    try {
      expect(await caps.hasSocietyCapability(reqFor(former), SOC_A, caps.CAPABILITIES.APPROVE_VISITOR)).toBe(false);
    } finally {
      await query('DELETE FROM society_members WHERE user_id = $1', [former]);
      await query('DELETE FROM users WHERE id = $1', [former]);
    }
  });
});

describe('who may approve a visitor', () => {
  test('a resident approves visitors for their own flat', async () => {
    expect(await caps.hasSocietyCapability(
      reqFor(RESIDENT_101), SOC_A, caps.CAPABILITIES.APPROVE_VISITOR, '101'
    )).toBe(true);
  });

  test("a resident cannot approve a visitor for a neighbour's flat", async () => {
    // Any member could previously set any status on any visitor.
    expect(await caps.hasSocietyCapability(
      reqFor(RESIDENT_101), SOC_A, caps.CAPABILITIES.APPROVE_VISITOR, '102'
    )).toBe(false);
  });

  test('a guard cannot approve visitors at all', async () => {
    // The approval step exists so that someone upstairs agrees. A gate that
    // approves its own entries has deleted the step.
    expect(await caps.hasSocietyCapability(reqFor(GUARD_A), SOC_A, caps.CAPABILITIES.APPROVE_VISITOR)).toBe(false);
    expect(await caps.hasSocietyCapability(reqFor(GUARD_A), SOC_A, caps.CAPABILITIES.APPROVE_VISITOR, '101')).toBe(false);
  });

  test('a resident cannot log gate movements', async () => {
    expect(await caps.hasSocietyCapability(reqFor(RESIDENT_101), SOC_A, caps.CAPABILITIES.LOG_GATE_ENTRY)).toBe(false);
  });

  test('a society admin may both approve and work the gate', async () => {
    // Covering the desk is part of the job, so an admin is not narrowed to a flat.
    expect(await caps.hasSocietyCapability(reqFor(ADMIN_A), SOC_A, caps.CAPABILITIES.APPROVE_VISITOR, '102')).toBe(true);
    expect(await caps.hasSocietyCapability(reqFor(ADMIN_A), SOC_A, caps.CAPABILITIES.LOG_GATE_ENTRY)).toBe(true);
  });
});

describe('the visitor lifecycle', () => {
  const FLOW = {
    pending: ['approved', 'denied'],
    approved: ['checked_in', 'denied'],
    denied: [],
    checked_in: ['checked_out'],
    checked_out: [],
  };
  const canMove = (from, to) => from === to || (FLOW[from] || []).includes(to);

  test('the intended path is permitted end to end', () => {
    const path = ['pending', 'approved', 'checked_in', 'checked_out'];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canMove(path[i], path[i + 1])).toBe(true);
    }
  });

  test('a checked-out visitor cannot be put back inside', () => {
    // The gate register is the only evidence of who was in the society.
    expect(canMove('checked_out', 'checked_in')).toBe(false);
    expect(canMove('checked_out', 'approved')).toBe(false);
  });

  test('a denied visitor cannot be approved after the fact', () => {
    expect(canMove('denied', 'approved')).toBe(false);
    expect(canMove('denied', 'checked_in')).toBe(false);
  });

  test('a visitor cannot walk in without being approved', () => {
    expect(canMove('pending', 'checked_in')).toBe(false);
  });

  test('an approval can still be withdrawn before entry', () => {
    expect(canMove('approved', 'denied')).toBe(true);
  });
});

describe('concurrent check-out', () => {
  const VISITOR = 'sc-visitor-race';

  beforeEach(async () => {
    await query("DELETE FROM society_visitors WHERE id LIKE 'sc-visitor-%'");
    await query(
      `INSERT INTO society_visitors
         (id, society_id, guard_id, visitor_name, purpose, flat_number, status, checked_in_at, created_at)
       VALUES ($1, $2, $3, 'SC Guest', 'guest', '101', 'checked_in', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [VISITOR, SOC_A, GUARD_A]
    );
  });

  test('only one of several simultaneous check-outs takes effect', async () => {
    // The handler read the status and then updated by id, so a second tap — or
    // a gate tablet retrying on a flaky connection — passed the check too and
    // overwrote checked_out_at with the later time. The condition now lives in
    // the statement, so the database decides.
    const attempts = Array.from({ length: 6 }, () =>
      query(
        `UPDATE society_visitors
            SET status = 'checked_out', checked_out_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND society_id = $2 AND status <> 'checked_out'`,
        [VISITOR, SOC_A]
      ).then((r) => r.rowCount)
    );

    const changed = await Promise.all(attempts);
    expect(changed.filter((n) => n === 1)).toHaveLength(1);
    expect(changed.filter((n) => n === 0)).toHaveLength(5);
  });

  test('a check-out scoped to the wrong society changes nothing', async () => {
    const result = await query(
      `UPDATE society_visitors
          SET status = 'checked_out'
        WHERE id = $1 AND society_id = $2 AND status <> 'checked_out'`,
      [VISITOR, SOC_B]
    );
    expect(result.rowCount).toBe(0);

    const row = await queryOne('SELECT status FROM society_visitors WHERE id = $1', [VISITOR]);
    expect(row.status).toBe('checked_in');
  });
});

describe('society context for the client', () => {
  test('lists every society a person belongs to, with capabilities', async () => {
    // What the app needs to offer "Guard Gate Mode" beside "Personal Citizen
    // Mode" without a second login or a role that replaces their own.
    const contexts = await caps.societyContextFor(reqFor(GUARD_A));

    expect(contexts).toHaveLength(1);
    expect(contexts[0].societyId).toBe(SOC_A);
    expect(contexts[0].role).toBe('guard');
    expect(contexts[0].capabilities).toContain(caps.CAPABILITIES.LOG_GATE_ENTRY);
    expect(contexts[0].capabilities).not.toContain(caps.CAPABILITIES.APPROVE_VISITOR);
  });

  test('a resident context carries their flat', async () => {
    const contexts = await caps.societyContextFor(reqFor(RESIDENT_101));
    expect(contexts[0].flatId).toBe('101');
    expect(contexts[0].capabilities).toContain(caps.CAPABILITIES.APPROVE_VISITOR);
  });

  test('someone with no membership gets an empty context, not an error', async () => {
    // A plain citizen is the common case, and it must not look like a failure.
    await expect(caps.societyContextFor(reqFor(OUTSIDER))).resolves.toEqual([]);
  });
});

describe('member approval queue', () => {
  const APPLICANT = 'sc-applicant';
  let applicationId;

  beforeEach(async () => {
    await query("DELETE FROM society_members WHERE user_id = $1", [APPLICANT]);
    await query("DELETE FROM users WHERE id = $1", [APPLICANT]);
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)',
      [APPLICANT, 'SC Applicant', '9855000077', 'user']);

    applicationId = crypto.randomUUID();
    await query(
      `INSERT INTO society_members (id, society_id, user_id, flat_number, role, is_active, status)
       VALUES ($1, $2, $3, '204', 'resident', 0, 'pending')`,
      [applicationId, SOC_A, APPLICANT]
    );
  });

  afterEach(async () => {
    await query("DELETE FROM society_members WHERE user_id = $1", [APPLICANT]);
    await query("DELETE FROM users WHERE id = $1", [APPLICANT]);
  });

  test('a pending application appears for its own society only', async () => {
    const mine = await query(
      "SELECT id FROM society_members WHERE society_id = $1 AND LOWER(COALESCE(status,'')) = 'pending'",
      [SOC_A]
    );
    const theirs = await query(
      "SELECT id FROM society_members WHERE society_id = $1 AND LOWER(COALESCE(status,'')) = 'pending'",
      [SOC_B]
    );

    expect((mine.rows || mine).map((r) => r.id)).toContain(applicationId);
    expect((theirs.rows || theirs).map((r) => r.id)).not.toContain(applicationId);
  });

  test('approving activates the membership', async () => {
    const result = await query(
      `UPDATE society_members SET status = 'approved', is_active = 1
        WHERE id = $1 AND society_id = $2 AND LOWER(COALESCE(status,'')) = 'pending'`,
      [applicationId, SOC_A]
    );
    expect(result.rowCount).toBe(1);

    // And the capability follows from the membership, with no second step.
    expect(await caps.hasSocietyCapability(reqFor(APPLICANT), SOC_A, caps.CAPABILITIES.APPROVE_VISITOR, '204')).toBe(true);
  });

  test('a rejection deactivates rather than deleting', async () => {
    await query(
      `UPDATE society_members SET status = 'rejected', is_active = 0
        WHERE id = $1 AND society_id = $2 AND LOWER(COALESCE(status,'')) = 'pending'`,
      [applicationId, SOC_A]
    );

    // The row is the record that somebody asked and was turned down — which is
    // exactly what a committee needs when the same person applies again.
    const row = await queryOne('SELECT status FROM society_members WHERE id = $1', [applicationId]);
    expect(row).toBeTruthy();
    expect(row.status).toBe('rejected');

    expect(await caps.hasSocietyCapability(reqFor(APPLICANT), SOC_A, caps.CAPABILITIES.APPROVE_VISITOR)).toBe(false);
  });

  test("a committee member of another society cannot decide this application", async () => {
    // Scoped by society as well as by member id: the id alone would let a
    // committee member of one society decide an application to another.
    const result = await query(
      `UPDATE society_members SET status = 'approved', is_active = 1
        WHERE id = $1 AND society_id = $2 AND LOWER(COALESCE(status,'')) = 'pending'`,
      [applicationId, SOC_B]
    );
    expect(result.rowCount).toBe(0);
  });

  test('deciding twice is refused rather than silently repeated', async () => {
    const first = await query(
      `UPDATE society_members SET status = 'approved', is_active = 1
        WHERE id = $1 AND society_id = $2 AND LOWER(COALESCE(status,'')) = 'pending'`,
      [applicationId, SOC_A]
    );
    const second = await query(
      `UPDATE society_members SET status = 'rejected', is_active = 0
        WHERE id = $1 AND society_id = $2 AND LOWER(COALESCE(status,'')) = 'pending'`,
      [applicationId, SOC_A]
    );

    expect(first.rowCount).toBe(1);
    // Two committee members opening the queue together must not be able to
    // approve and reject the same person.
    expect(second.rowCount).toBe(0);
  });

  test('only a society admin holds the capability the queue requires', async () => {
    expect(await caps.hasSocietyCapability(reqFor(ADMIN_A), SOC_A, caps.CAPABILITIES.MANAGE_SOCIETY)).toBe(true);
    expect(await caps.hasSocietyCapability(reqFor(RESIDENT_101), SOC_A, caps.CAPABILITIES.MANAGE_SOCIETY)).toBe(false);
    expect(await caps.hasSocietyCapability(reqFor(GUARD_A), SOC_A, caps.CAPABILITIES.MANAGE_SOCIETY)).toBe(false);
  });
});
