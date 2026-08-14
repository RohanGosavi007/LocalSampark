exports.getOverview = async (req, res, next) => {
  try {
    const { duration = 'week' } = req.query; // day, week, month

    // Mock realistic growth metrics based on duration
    let metrics = {
      totalUsers: 145920,
      financialVolume: 12450000,
      activeMerchants: 840,
      slaTime: '12m 40s'
    };

    let chartData = [];

    if (duration === 'day') {
      metrics.totalUsers = 1250;
      metrics.financialVolume = 450000;
      metrics.activeMerchants = 310;
      metrics.slaTime = '11m 15s';
      
      chartData = [
        { label: '6AM', revenue: 12000, users: 45 },
        { label: '9AM', revenue: 45000, users: 180 },
        { label: '12PM', revenue: 85000, users: 340 },
        { label: '3PM', revenue: 110000, users: 420 },
        { label: '6PM', revenue: 145000, users: 510 },
        { label: '9PM', revenue: 53000, users: 190 }
      ];
    } else if (duration === 'week') {
      metrics.totalUsers = 15400;
      metrics.financialVolume = 2850000;
      metrics.activeMerchants = 540;
      metrics.slaTime = '12m 40s';
      
      chartData = [
        { label: 'Mon', revenue: 320000, users: 1800 },
        { label: 'Tue', revenue: 380000, users: 2100 },
        { label: 'Wed', revenue: 410000, users: 2300 },
        { label: 'Thu', revenue: 390000, users: 2200 },
        { label: 'Fri', revenue: 520000, users: 2800 },
        { label: 'Sat', revenue: 610000, users: 3400 },
        { label: 'Sun', revenue: 220000, users: 1200 }
      ];
    } else if (duration === 'month') {
      metrics.totalUsers = 65000;
      metrics.financialVolume = 12450000;
      metrics.activeMerchants = 840;
      metrics.slaTime = '13m 20s';
      
      chartData = [
        { label: 'Week 1', revenue: 2850000, users: 15400 },
        { label: 'Week 2', revenue: 3100000, users: 16800 },
        { label: 'Week 3', revenue: 3450000, users: 17500 },
        { label: 'Week 4', revenue: 3050000, users: 15300 }
      ];
    }

    res.json({ success: true, metrics, chartData });
  } catch (error) {
    next(error);
  }
};
