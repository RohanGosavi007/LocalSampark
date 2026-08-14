const crypto = require('crypto');

exports.getFraudScan = async (req, res, next) => {
  try {
    // Mocking the AI Anomaly engine for the MVP presentation
    const fraudData = {
      flagged_users: [
        {
          id: crypto.randomUUID(),
          full_name: 'Rajesh Kumar',
          phone_number: '+91 9988776655',
          order_count: 142
        },
        {
          id: crypto.randomUUID(),
          full_name: 'Priya Sharma',
          phone_number: '+91 9876543210',
          order_count: 87
        }
      ],
      flagged_shops: [
        {
          id: crypto.randomUUID(),
          shop_name: 'Shree Ji Electronics',
          payout_count: 24
        },
        {
          id: crypto.randomUUID(),
          shop_name: 'Maha Laxmi Traders',
          payout_count: 18
        }
      ]
    };

    res.json({ success: true, data: fraudData });
  } catch (error) {
    next(error);
  }
};
