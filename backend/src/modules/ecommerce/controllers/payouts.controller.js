const { query, queryMany } = require('../../../config/database');

async function getLedger(req, res, next) {
  try {
    const { role, id } = req.query; // role = franchise, shop, rider

    // Mock response for the split payments engine
    // In production, this would query the Razorpay Route/Transfers API or our internal DB
    const ledger = [
      { txnId: 'TXN-88219A', date: new Date(), amount: 1500, fee: 30, net: 1470, status: 'Settled' },
      { txnId: 'TXN-88220A', date: new Date(), amount: 450, fee: 9, net: 441, status: 'Processing' },
    ];

    res.json({ success: true, ledger, role });
  } catch (error) { next(error); }
}

module.exports = {
  getLedger
};
