#!/usr/bin/env node
/**
 * Collapse the six near-duplicate rows in shop_categories.
 *
 * The taxonomy carries pairs that mean the same thing:
 *
 *     pest-control          / pest-control-services
 *     deep-cleaning         / deep-cleaning-services
 *     physiotherapy         / physiotherapy-chiropractic
 *     pathology-labs        / pathology-labs-diagnostics
 *     ro-water-purifier     / ro-water-purifier-service
 *     catering-party        / catering-party-services
 *
 * Each pair splits the same real-world trade across two ids, so a resident
 * filtering by "Pest Control" sees only half the shops, and every routing map
 * has to carry two entries for one archetype. The three routing maps were
 * updated to handle both, which makes the behaviour correct — this script is the
 * actual fix.
 *
 * The shorter slug is treated as canonical because it is the one all three
 * routing maps and the seed data already used.
 *
 * SAFETY
 *   - Dry run unless --apply is passed. Deleting category rows is not
 *     reversible and the row counts differ per environment.
 *   - Re-points only tables that genuinely reference shop_categories:
 *     local_shops, category_attributes, category_territory_matrix, and the
 *     self-referential parent_category_id.
 *   - shop_products, home_service_bookings and home_service_providers also have
 *     a `category_id` column but declare no foreign key, so it is not certain
 *     they point at this taxonomy rather than their own. Rather than guess, the
 *     script REFUSES to apply if any row in them references a duplicate id, and
 *     tells you which table to look at.
 *
 * Usage:
 *   node src/scripts/merge_duplicate_categories.js            # report only
 *   node src/scripts/merge_duplicate_categories.js --apply    # perform the merge
 */

require('dotenv').config();
const { query, queryOne } = require('../config/database');

const APPLY = process.argv.includes('--apply');

// [canonical, duplicate]
const PAIRS = [
  ['catering-party', 'catering-party-services'],
  ['deep-cleaning', 'deep-cleaning-services'],
  ['pathology-labs', 'pathology-labs-diagnostics'],
  ['pest-control', 'pest-control-services'],
  ['physiotherapy', 'physiotherapy-chiropractic'],
  ['ro-water-purifier', 'ro-water-purifier-service'],
];

// Confirmed to reference shop_categories.id.
const REPOINT = [
  ['local_shops', 'category_id'],
  ['category_attributes', 'category_id'],
  ['category_territory_matrix', 'category_id'],
  ['shop_categories', 'parent_category_id'],
];

// Have a category_id but no declared FK — verified, never rewritten.
const AMBIGUOUS = [
  ['shop_products', 'category_id'],
  ['home_service_bookings', 'category_id'],
  ['home_service_providers', 'category_id'],
];

const rowsOf = (r) => (!r ? [] : r.rows || (Array.isArray(r) ? r : []));

async function countRefs(table, column, id) {
  try {
    const r = await queryOne(`SELECT COUNT(*) AS c FROM ${table} WHERE ${column} = $1`, [id]);
    return Number(r?.c ?? 0);
  } catch (e) {
    // Table absent in this deployment.
    return null;
  }
}

async function main() {
  console.log('─'.repeat(72));
  console.log(`Duplicate category merge — ${APPLY ? 'APPLY (destructive)' : 'DRY RUN (no changes)'}`);
  console.log('─'.repeat(72));

  const plan = [];
  let blocked = false;

  for (const [canonicalSlug, duplicateSlug] of PAIRS) {
    const canonical = await queryOne('SELECT id, name FROM shop_categories WHERE slug = $1', [canonicalSlug]);
    const duplicate = await queryOne('SELECT id, name FROM shop_categories WHERE slug = $1', [duplicateSlug]);

    if (!duplicate) {
      console.log(`\n✓ ${duplicateSlug}\n    already absent — nothing to do.`);
      continue;
    }
    if (!canonical) {
      console.log(`\n! ${duplicateSlug}\n    canonical "${canonicalSlug}" does not exist; skipping rather than guessing.`);
      continue;
    }

    console.log(`\n${duplicateSlug}  →  ${canonicalSlug}`);
    const moves = [];
    for (const [table, column] of REPOINT) {
      const n = await countRefs(table, column, duplicate.id);
      if (n === null) { console.log(`    ${table}.${column}: (table not present)`); continue; }
      console.log(`    ${table}.${column}: ${n} row(s) to re-point`);
      if (n > 0) moves.push({ table, column, n });
    }

    for (const [table, column] of AMBIGUOUS) {
      const n = await countRefs(table, column, duplicate.id);
      if (n === null || n === 0) continue;
      blocked = true;
      console.log(
        `    ⚠ ${table}.${column}: ${n} row(s) reference this id, but that table declares no\n` +
        `      foreign key to shop_categories — it may use a different taxonomy.\n` +
        `      Confirm manually before merging; this script will not rewrite it.`
      );
    }

    plan.push({ canonical, duplicate, canonicalSlug, duplicateSlug, moves });
  }

  if (!plan.length) {
    console.log('\nNothing to merge.\n');
    return;
  }

  if (blocked) {
    console.log('\nRefusing to apply: at least one table with an undeclared category_id references a');
    console.log('duplicate. Resolve those rows (or confirm the column is a different taxonomy) first.\n');
    return;
  }

  if (!APPLY) {
    console.log(`\nDry run. ${plan.length} pair(s) would be merged. Re-run with --apply.`);
    console.log('Take a database backup first — deleting a category row is not reversible.\n');
    return;
  }

  let merged = 0;
  for (const p of plan) {
    try {
      for (const { table, column } of p.moves) {
        await query(`UPDATE ${table} SET ${column} = $1 WHERE ${column} = $2`, [p.canonical.id, p.duplicate.id]);
      }
      await query('DELETE FROM shop_categories WHERE id = $1', [p.duplicate.id]);
      merged++;
      console.log(`  merged ${p.duplicateSlug} into ${p.canonicalSlug}`);
    } catch (e) {
      console.error(`  FAILED ${p.duplicateSlug}: ${e.message}`);
    }
  }

  console.log(`\nDone. ${merged} of ${plan.length} pair(s) merged.`);
  console.log('Now remove the duplicate keys from the three routing maps — the parity test');
  console.log('(backend/src/__tests__/categoryRouterParity.test.js) will fail until all three agree.\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nMerge failed:', err);
    process.exit(1);
  });
