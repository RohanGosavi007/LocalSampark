const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src', 'data', 'localsampark.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(`ALTER TABLE shop_categories ADD COLUMN allowed_payment_methods TEXT DEFAULT 'RAZORPAY,STRIPE,CASHFREE,COD'`, (err) => {
    if (err) {
      console.log('allowed_payment_methods might already exist:', err.message);
    } else {
      console.log('✅ Added allowed_payment_methods to shop_categories');
    }
  });

  db.run(`ALTER TABLE shop_categories ADD COLUMN allowed_fulfillment_methods TEXT DEFAULT 'DELIVERY,SELF_PICKUP'`, (err) => {
    if (err) {
      console.log('allowed_fulfillment_methods might already exist:', err.message);
    } else {
      console.log('✅ Added allowed_fulfillment_methods to shop_categories');
    }
  });

  // Let's seed an example category restriction
  // Let's set cat_005 (Dairy, Sweets & Bakery) or cat_001 (Grocery) to test
  // The user says: "i want all 4 Razorpay, Cashfree, Stripe, and purely Cash on Delivery and self pickup option on specific shop category for product sale"
  // Let's configure:
  // - cat_001 (Grocery & Supermarkets): allowed_payment_methods = 'RAZORPAY,CASHFREE,STRIPE,COD', allowed_fulfillment_methods = 'DELIVERY,SELF_PICKUP'
  // - Let's say cat_005 (Dairy, Sweets & Bakery): allowed_payment_methods = 'COD', allowed_fulfillment_methods = 'SELF_PICKUP' (strictly Cash on Delivery & Self Pickup only)
  db.run(`UPDATE shop_categories SET allowed_payment_methods = 'COD', allowed_fulfillment_methods = 'SELF_PICKUP' WHERE id = 'cat_005'`, (err) => {
    if (err) {
      console.error('Failed to update cat_005:', err.message);
    } else {
      console.log('✅ Configured Dairy, Sweets & Bakery (cat_005) to COD and SELF_PICKUP only');
    }
  });

  db.all("SELECT id, name, allowed_payment_methods, allowed_fulfillment_methods FROM shop_categories LIMIT 10", (err, rows) => {
    if (err) {
      console.error('Failed to query categories:', err.message);
    } else {
      console.log('Current Category Configurations:', rows);
    }
    db.close();
  });
});
