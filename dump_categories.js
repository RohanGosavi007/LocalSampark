const { queryMany } = require('./backend/src/config/database');

async function dumpCategories() {
  try {
    const cats = await queryMany("SELECT * FROM shop_categories ORDER BY display_order");
    console.log(JSON.stringify(cats, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

dumpCategories();
