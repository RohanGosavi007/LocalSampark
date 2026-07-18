const { query } = require('../config/database');
const { Parser } = require('json2csv');

exports.exportFinancials = async (req, res, next) => {
  try {
    const { format, rangeType = 'months', limit = 12 } = req.query; // format: 'csv', rangeType: 'months' or 'years'

    // Perform a complex SQL aggregation for current breakdown
    const revenueData = await query(`
      SELECT 
        'Order Commission' as revenue_stream,
        COUNT(id) as total_transactions,
        SUM(total_amount * 0.10) as estimated_revenue
      FROM orders
      WHERE status = 'delivered'
      UNION ALL
      SELECT 
        'Carpool Booking Fees' as revenue_stream,
        COUNT(id) as total_transactions,
        SUM(price * 0.05) as estimated_revenue
      FROM carpool_rides
      WHERE status = 'completed'
    `);

    // Generate dynamic historical data based on requested range (mocked for demo as per schema constraints)
    const historicalData = [];
    const currentDate = new Date();
    
    for (let i = limit - 1; i >= 0; i--) {
      let label = '';
      if (rangeType === 'years') {
        label = (currentDate.getFullYear() - i).toString();
      } else {
        const d = new Date();
        d.setMonth(currentDate.getMonth() - i);
        label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      }
      
      historicalData.push({
        period: label,
        revenue: Math.floor(Math.random() * (500000 - 100000) + 100000), // Mock random revenue
        payouts: Math.floor(Math.random() * (300000 - 50000) + 50000)   // Mock random payouts
      });
    }

    if (format === 'csv') {
      // Format as Tally/QuickBooks compatible Accounting CSV
      // Tally expects: Date, Voucher Type, Voucher Number, Ledger Name, Amount, Dr/Cr, Narration
      const tallyData = revenueData.rows.map((row, index) => ({
        'Date': new Date().toISOString().split('T')[0],
        'Voucher Type': 'Journal',
        'Voucher Number': `LS-REV-${1000 + index}`,
        'Ledger Name': row.revenue_stream,
        'Amount': row.estimated_revenue || 0,
        'Dr/Cr': 'Cr',
        'Narration': `Platform commission for ${row.total_transactions} transactions`
      }));

      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(tallyData);
      
      res.header('Content-Type', 'text/csv');
      res.attachment('tally_localsampark_financial_export.csv');
      return res.send(csv);
    }

    res.json({
      success: true,
      data: {
        revenueBreakdown: revenueData.rows || [],
        historicalProjections: historicalData
      }
    });

  } catch (error) {
    next(error);
  }
};
