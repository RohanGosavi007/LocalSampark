/**
 * The SQLite driver gives an INSERT a generated id when it names none, the way
 * a PostgreSQL column default would. It did so with two regular expressions,
 * and each case below is a live statement that came out wrong:
 *
 *   - a table with no `id` column had one added, and the INSERT failed;
 *   - a placeholder after the VALUES list kept its number while the parameter
 *     list grew by one, so it bound the value before the one intended;
 *   - a VALUES list containing a sub-select was cut at its first ')'.
 *
 * The second and third did not fail. They stored the wrong value and reported
 * success, which is why they need tests rather than a look at the logs.
 */

process.env.USE_SQLITE = 'true';

const { query, queryOne } = require('../config/database');

const USER = 'shim-user-0001';
const WALLET = 'shim-wallet-0001';

async function cleanup() {
  await query('DELETE FROM wallet_transactions WHERE wallet_id = $1', [WALLET]);
  await query('DELETE FROM wallets WHERE id = $1', [WALLET]);
  await query('DELETE FROM loyalty_accounts WHERE user_id = $1', [USER]);
  await query("DELETE FROM admin_config WHERE config_key = 'shim_test_flag'");
  await query('DELETE FROM users WHERE id = $1', [USER]);
}

beforeAll(async () => {
  await cleanup();
  await query(
    'INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)',
    [USER, 'Shim Test User', '9833111001', 'user']
  );
  await query('INSERT INTO wallets (id, user_id, balance) VALUES ($1, $2, 100)', [WALLET, USER]);
});

afterAll(cleanup);

test('a table keyed on something other than id is inserted into as written', async () => {
  // loyalty_accounts is keyed on user_id and has no id column.
  await query(
    'INSERT INTO loyalty_accounts (user_id, sampark_coins_balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING',
    [USER]
  );
  const row = await queryOne('SELECT * FROM loyalty_accounts WHERE user_id = $1', [USER]);
  expect(row).toBeTruthy();
  expect(Number(row.sampark_coins_balance)).toBe(0);
});

test('a placeholder in ON CONFLICT binds the value it was written for', async () => {
  const upsert = (value) => query(
    `INSERT INTO admin_config (config_key, config_value, config_category)
     VALUES ('shim_test_flag', $1, 'system')
     ON CONFLICT (config_key) DO UPDATE SET config_value = $1`,
    [value]
  );

  await upsert('true');
  // The second call takes the conflict branch, which is where $1 used to
  // resolve to the generated id instead of the value.
  await upsert('false');

  const row = await queryOne("SELECT id, config_value FROM admin_config WHERE config_key = 'shim_test_flag'");
  expect(row.config_value).toBe('false');
  expect(row.id).toBeTruthy();
});

test('a sub-select in VALUES does not shift the parameters after it', async () => {
  await query(
    `INSERT INTO wallet_transactions (wallet_id, amount, type, purpose, status)
     VALUES ((SELECT id FROM wallets WHERE user_id = $1), $2, 'debit', 'withdrawal', 'completed')`,
    [USER, 25]
  );

  const row = await queryOne('SELECT * FROM wallet_transactions WHERE wallet_id = $1', [WALLET]);
  expect(row).toBeTruthy();
  // This was the user's id.
  expect(Number(row.amount)).toBe(25);
  expect(row.id).toBeTruthy();
});

test('RETURNING still reports the generated id', async () => {
  const row = await queryOne(
    `INSERT INTO wallet_transactions (wallet_id, amount, type, purpose, status)
     VALUES ($1, $2, 'credit', 'refund', 'completed') RETURNING id, amount`,
    [WALLET, 10]
  );
  expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(Number(row.amount)).toBe(10);
});

test('a rebuilt table with a quoted integer key is left to assign its own id', async () => {
  // A table that has been through a rebuild is stored with quoted names:
  // "id" INTEGER PRIMARY KEY. The shim recognised only the unquoted spelling,
  // took the table for a UUID-keyed one, and gave its rowid a UUID string —
  // SQLITE_MISMATCH on every insert.
  await query('DROP TABLE IF EXISTS shim_quoted_integer_key');
  await query('CREATE TABLE "shim_quoted_integer_key" ("id" INTEGER PRIMARY KEY, "label" TEXT NOT NULL)');
  try {
    const row = await queryOne('INSERT INTO shim_quoted_integer_key (label) VALUES ($1) RETURNING id', ['first']);
    expect(Number.isInteger(row.id)).toBe(true);
  } finally {
    await query('DROP TABLE IF EXISTS shim_quoted_integer_key');
  }
});
