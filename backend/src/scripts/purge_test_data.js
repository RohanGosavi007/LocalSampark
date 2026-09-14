/**
 * Selective Mock Data Purge
 * =========================
 *
 * Removes developer test garbage while PRESERVING everything the investor demo
 * needs to look populated:
 *
 *   PRESERVED (never touched)
 *     - Mock Shops and all their content: local_shops, shop_products,
 *       shop_offers, shop_staff, staff_availability, shop_search_index_*
 *     - The users who OWN those shops, plus any "Demo *" persona accounts
 *     - Structural reference data: shop_categories, marketplace_categories,
 *       home_service_categories, category_attributes, regions, territories,
 *       location_* hierarchy, feature_flags, admin config/roles/settings,
 *       localization dictionaries, migration bookkeeping
 *     - Demo-visible content: posts, community_events, polls, job_postings,
 *       property_listings, charity_campaigns and friends — an empty community
 *       feed is exactly what makes a demo look broken
 *
 *   PURGED
 *     - Ephemeral auth/session state (OTPs, email verification tokens,
 *       device fingerprints, session rows)
 *     - Throwaway QA accounts
 *     - Operational exhaust with no demo value (alert logs, webhook logs,
 *       fraud signals, telemetry rows)
 *
 * Why this is not the previous implementation:
 *   - That version ran `DELETE FROM feed_posts / notifications / messages /
 *     society_notices` unconditionally. Those are the tables that make the
 *     community, chat and society screens look alive; wiping them produces a
 *     clean database and an empty-looking demo, the opposite of the goal.
 *   - It deleted users by `full_name LIKE '%test%'`. That is a substring match
 *     on human names, it missed this database's actual QA rows ("Smoke Chef",
 *     "Flow A", "Flow B"), and it had no guard against deleting a user who
 *     owns a preserved shop — which, on a cascading FK, destroys the Mock
 *     Shops the exclusion exists to protect.
 *   - It ran outside a transaction, swallowed fatal errors, and still exited 0,
 *     so a half-applied purge reported success.
 *
 * Usage:
 *   node src/scripts/purge_test_data.js              # dry run (default)
 *   node src/scripts/purge_test_data.js --execute    # apply, in one transaction
 *   node src/scripts/purge_test_data.js --execute --json
 */

const db = require('../config/database');
const logger = require('../config/logger');

const { queryOne, queryMany, listTables } = db;

/** Personas that carry the demo. Matched exactly, never by substring. */
const PRESERVED_USER_NAMES = [
  'God Developer',
  'Demo Property Owner',
  'Demo Commercial Owner',
  'Demo Community Organiser',
  'Demo Cultural Organiser',
];

/** Throwaway QA accounts. Matched exactly — no LIKE heuristics on names. */
const QA_USER_NAMES = ['Smoke Tester', 'Smoke Chef', 'Flow A', 'Flow B'];

/**
 * Tables wiped in full. Each one is ephemeral state or operational exhaust:
 * nothing here is rendered on a demo screen, and nothing here is structural.
 */
const TRUNCATE_TABLES = [
  // Ephemeral auth / session state
  'otps',
  'email_verification_tokens',
  'device_fingerprints',
  'password_reset_tokens',
  'refresh_tokens',
  'user_sessions',
  // Operational exhaust
  'admin_alerts_log',
  'webhook_logs',
  'fraud_signals',
  'ip_reputation',
  'rate_limit_violations',
  'delivery_telemetry',
  'data_breach_log',
  'chatbot_conversations',
];

function parseArgs(argv) {
  return {
    execute: argv.includes('--execute'),
    json: argv.includes('--json'),
  };
}

async function countOf(table, where, params) {
  const row = await queryOne(
    'SELECT COUNT(*) AS c FROM "' + table + '" ' + (where || ''),
    params || []
  );
  if (!row) return 0;
  // pg returns a string for COUNT(*) (bigint); sqlite returns a number.
  const raw = row.c !== undefined ? row.c : row.count;
  return Number(raw || 0);
}

function placeholders(values, offset) {
  // pg needs $1..$n; the sqlite driver in this repo accepts the same form.
  return values.map((_, i) => '$' + (i + 1 + (offset || 0))).join(', ');
}

/**
 * Every column in the schema that is a foreign key onto users(id).
 *
 * Deleting a QA account leaves its dependent rows behind wherever the FK is
 * not ON DELETE CASCADE, which the integrity check at commit time then
 * (correctly) rejects. Rather than hardcode the affected tables — this schema
 * has ~370 of them and the list drifts with every migration — the dependants
 * are discovered from the live catalogue, so a new table referencing users is
 * handled without touching this script.
 */
async function userReferencingColumns(existing) {
  const refs = [];
  if (process.env.USE_SQLITE === 'true') {
    for (const table of existing) {
      if (table === 'users') continue;
      let fks = [];
      try {
        fks = await queryMany('PRAGMA foreign_key_list("' + table + '")');
      } catch (e) {
        continue; // virtual/rtree shadow tables
      }
      for (const fk of fks) {
        if (String(fk.table).toLowerCase() === 'users' && fk.from) {
          refs.push({ table, column: fk.from });
        }
      }
    }
  } else {
    const rows = await queryMany(
      `SELECT tc.table_name AS table_name, kcu.column_name AS column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON kcu.constraint_name = tc.constraint_name
          AND kcu.table_schema = tc.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND ccu.table_name = 'users'
          AND tc.table_name <> 'users'`
    );
    for (const r of rows) refs.push({ table: r.table_name, column: r.column_name });
  }
  return refs;
}

async function buildPlan() {
  const existing = new Set(await listTables());
  const plan = [];

  // 1. Identify the users that must survive. Shop owners are resolved from the
  //    shop table itself rather than assumed, so a demo owner named anything
  //    at all is still protected.
  let protectedIds = [];
  if (existing.has('local_shops')) {
    const owners = await queryMany(
      'SELECT DISTINCT owner_id FROM local_shops WHERE owner_id IS NOT NULL'
    );
    protectedIds = owners.map((r) => r.owner_id);
  }
  if (existing.has('users')) {
    const named = await queryMany(
      'SELECT id FROM users WHERE full_name IN (' + placeholders(PRESERVED_USER_NAMES) + ')',
      PRESERVED_USER_NAMES
    );
    protectedIds = protectedIds.concat(named.map((r) => r.id));
  }
  protectedIds = Array.from(new Set(protectedIds));

  // 2. Full-table wipes.
  for (const table of TRUNCATE_TABLES) {
    if (!existing.has(table)) continue;
    const c = await countOf(table);
    if (c > 0) {
      plan.push({
        table,
        rows: c,
        sql: 'DELETE FROM "' + table + '"',
        params: [],
        reason: 'ephemeral/operational',
      });
    }
  }

  // 3. QA accounts, and everything hanging off them.
  if (existing.has('users')) {
    const nameSlots = placeholders(QA_USER_NAMES);
    let where = 'WHERE full_name IN (' + nameSlots + ')';
    let params = QA_USER_NAMES.slice();
    if (protectedIds.length) {
      where += ' AND id NOT IN (' + placeholders(protectedIds, QA_USER_NAMES.length) + ')';
      params = params.concat(protectedIds);
    }

    const doomed = await queryMany('SELECT id FROM users ' + where, params);
    const doomedIds = doomed.map((r) => r.id);

    if (doomedIds.length) {
      // 3a. Dependent rows first, so the delete does not strand them. Scoped to
      //     the doomed accounts only — these tables also hold demo content that
      //     belongs to the preserved personas and must survive.
      const refs = await userReferencingColumns(existing);
      const idSlots = placeholders(doomedIds);
      for (const ref of refs) {
        const w = 'WHERE "' + ref.column + '" IN (' + idSlots + ')';
        let c = 0;
        try {
          c = await countOf(ref.table, w, doomedIds);
        } catch (e) {
          continue;
        }
        if (c > 0) {
          plan.push({
            table: ref.table,
            rows: c,
            sql: 'DELETE FROM "' + ref.table + '" ' + w,
            params: doomedIds,
            reason: 'owned by a throwaway QA account',
          });
        }
      }

      // 3b. Then the accounts themselves.
      plan.push({
        table: 'users',
        rows: doomedIds.length,
        sql: 'DELETE FROM users ' + where,
        params,
        reason: 'throwaway QA account',
      });
    }
  }

  return { plan, protectedIds, existing };
}

/** Row counts for the tables the demo depends on, checked before and after. */
async function reportPreserved(existing) {
  const watch = [
    'local_shops', 'shop_products', 'shop_offers', 'shop_staff',
    'shop_categories', 'regions', 'territories', 'users',
    'posts', 'community_events', 'polls', 'job_postings',
  ];
  const out = {};
  for (const t of watch) {
    if (existing.has(t)) out[t] = await countOf(t);
  }
  return out;
}

async function runPurge(isDryRun) {
  if (isDryRun === undefined) isDryRun = true;
  logger.info('🧹 Selective Mock Data Purge — ' + (isDryRun ? 'DRY RUN' : 'EXECUTE'));

  const { plan, protectedIds, existing } = await buildPlan();
  const before = await reportPreserved(existing);
  const totalRows = plan.reduce((a, p) => a + p.rows, 0);

  if (plan.length === 0) {
    logger.info('   Nothing to purge — the database is already clean.');
  } else {
    logger.info('   ' + plan.length + ' deletion(s) planned, ' + totalRows + ' row(s) total:');
    for (const p of plan) {
      logger.info('     - ' + p.table + ': ' + p.rows + ' row(s) (' + p.reason + ')');
    }
  }
  logger.info('   ' + protectedIds.length + ' user account(s) protected as shop owners / demo personas.');

  if (isDryRun) {
    logger.info('   DRY RUN — nothing was written. Re-run with --execute to apply.');
    return { dryRun: true, plan, before, after: before, protectedIds };
  }

  // One transaction: a failure halfway through must not leave the demo in a
  // partially-purged state.
  //
  // Constraints are DEFERRED to commit time. Deleting a user cascades through
  // ~105 referencing tables, and SQLite checks foreign keys *immediately*, so
  // an intermediate state partway through a cascade can trip a constraint even
  // though the final state is perfectly consistent — which is exactly what
  // happened here: the delete failed with SQLITE_CONSTRAINT while
  // `PRAGMA foreign_key_check` reported zero violations afterwards. Deferring
  // is NOT the same as switching integrity off: the check below still runs,
  // inside the transaction, and aborts the purge if the resulting state is
  // inconsistent.
  //
  // On Postgres, SET CONSTRAINTS ALL DEFERRED only affects constraints declared
  // DEFERRABLE, so it is close to a no-op there. That is fine: the plan already
  // deletes dependent rows before the parent, which is what Postgres needs.
  const isSqlite = process.env.USE_SQLITE === 'true';

  await db.withTransaction(async (client) => {
    if (isSqlite) {
      await client.query('PRAGMA defer_foreign_keys = ON');
    } else {
      await client.query('SET CONSTRAINTS ALL DEFERRED');
    }

    for (const p of plan) {
      await client.query(p.sql, p.params);
      logger.info('   ✅ ' + p.table + ': ' + p.rows + ' row(s) removed');
    }

    if (isSqlite) {
      const violations = await client.query('PRAGMA foreign_key_check');
      const rows = violations.rows || violations || [];
      if (rows.length) {
        throw new Error(
          'Purge would leave ' + rows.length + ' dangling foreign-key reference(s); rolled back. ' +
          'First: ' + JSON.stringify(rows[0])
        );
      }
      logger.info('   Referential integrity verified (0 dangling references).');
    }
  });

  const after = await reportPreserved(existing);

  // Verify the exclusion held, rather than discovering it on stage during the
  // demo. A watched table is allowed to shrink by exactly the number of rows
  // the plan said it would remove (`users` and `posts` legitimately lose their
  // QA-owned rows); anything beyond that means a cascade reached further than
  // intended and must be reported.
  const planned = {};
  for (const p of plan) planned[p.table] = (planned[p.table] || 0) + p.rows;

  const violations = Object.keys(before).filter(
    (t) => before[t] - after[t] > (planned[t] || 0)
  );
  if (violations.length) {
    const detail = violations
      .map((t) => t + ' (' + before[t] + ' -> ' + after[t] + ', expected -' + (planned[t] || 0) + ')')
      .join(', ');
    // The transaction has already committed at this point, so say so plainly
    // instead of implying the database is untouched.
    throw new Error(
      'PURGE COMMITTED BUT OVER-DELETED. Restore from backup and investigate. Affected: ' + detail
    );
  }

  logger.info('🎉 Purge complete. Mock Shops, categories, regions and demo content are intact.');
  return { dryRun: false, plan, before, after, protectedIds };
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  runPurge(!args.execute)
    .then((result) => {
      if (args.json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      process.exit(0);
    })
    .catch((err) => {
      // The previous version logged fatal errors and exited 0, so a failed
      // purge looked identical to a successful one in CI. Note the message is
      // deliberately neutral about commit state: a throw from inside
      // withTransaction rolls back, but the post-commit verification above
      // throws after the data is already written and says so itself.
      logger.error('❌ Purge failed: ' + err.message);
      process.exit(1);
    });
}

module.exports = { runPurge, PRESERVED_USER_NAMES, QA_USER_NAMES, TRUNCATE_TABLES };
