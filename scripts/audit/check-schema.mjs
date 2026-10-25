import db from '../../backend/src/config/database.js';
const { getTableColumns } = db;

async function main() {
  const cols = await getTableColumns('coupons');
  console.log('Columns of `coupons`:', cols);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
