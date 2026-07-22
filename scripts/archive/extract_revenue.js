const db = require('./backend/src/config/database');

async function extractRevenueData() {
  try {
    const res2 = await db.query("PRAGMA table_info(franchise_partners);");
    console.log("franchise_partners columns:", res2.rows || res2);

    console.log("\n=== TOTAL SALES & EARNINGS ===");
    const ordersRes = await db.query("SELECT SUM(total_amount) as total_sales, COUNT(id) as total_orders FROM orders");
    console.log("Orders:", ordersRes.rows || ordersRes);

    const userEarningsRes = await db.query("SELECT SUM(amount) as total_earnings FROM user_earnings");
    console.log("User Earnings:", userEarningsRes.rows || userEarningsRes);
    
    const revTransRes = await db.query("SELECT SUM(amount) as total_rev FROM revenue_transactions");
    console.log("Revenue Transactions:", revTransRes.rows || revTransRes);

    console.log("\n=== MONTHLY BREAKDOWN (EARNINGS) ===");
    const monthlyEarningsRes = await db.query(`
      SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total
      FROM user_earnings
      GROUP BY month
      ORDER BY month
    `);
    console.log(monthlyEarningsRes.rows || monthlyEarningsRes);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

extractRevenueData();
