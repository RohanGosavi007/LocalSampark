/**
 * Production seed: reference data only.
 *
 *   node seed-production.js
 *
 * This file used to do three things, none of which should happen to a
 * production database:
 *
 *   - create a super admin on the phone number +919999999991 with the password
 *     "Admin@123", both written here in the repository;
 *   - write that password to a `users.password` column, which does not exist —
 *     the column is `password_hash` — so the script failed on its first
 *     statement and nothing below ran anyway;
 *   - create `shops_partitioned` and per-pincode partitions of it, a table no
 *     query in the application reads.
 *
 * It now delegates to the default seeder with the demo layer forced off, so it
 * writes the pilot region, the platform settings and the loyalty tiers, and
 * nothing that is a credential.
 *
 * To create an administrator, with a phone number that is really theirs and a
 * PIN that is not in source control:
 *
 *   ADMIN_PIN=<6 digits> node scripts/provision-admin.js --phone +91… --name "…"
 */

const { runSeed } = require('./src/seeds/run');

runSeed({ demo: false })
  .then((counts) => {
    for (const row of counts.createdRows) console.log(`   + ${row}`);
    console.log(`✅ Production seeding completed: ${counts.created} created, ${counts.existing} already present.`);
    console.log('   No accounts were created. Use scripts/provision-admin.js to add an administrator.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error during production seeding:', error.message);
    process.exit(1);
  });
