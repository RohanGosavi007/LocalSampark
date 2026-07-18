const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../src/data/localsampark.db'));

db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name IN ('stories', 'wallets', 'user_subscriptions', 'shop_reviews', 'shop_products', 'orders', 'order_items', 'shop_qa', 'flash_sales')", [], (err, rows) => {
    if (err) console.error(err);
    else {
        rows.forEach(r => console.log(r.sql));
    }
});
