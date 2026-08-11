const { query, queryMany } = require('../../../config/database');

// Get all franchises and their assigned coordinates for the map
async function getTerritoryMap(req, res, next) {
  try {
    // In a real app we'd fetch this from the DB. 
    // Mocking polygon data for Mapbox visualization
    const territories = [
      {
        id: 'TER-001',
        name: 'Pune Central (Shivajinagar)',
        franchiseOwner: 'Ramesh Patil',
        stats: { shops: 145, orders: 12050, revenue: '₹45.2L' },
        color: '#3b82f6',
        polygon: [
          [73.8567, 18.5204],
          [73.8667, 18.5204],
          [73.8667, 18.5304],
          [73.8567, 18.5304],
          [73.8567, 18.5204]
        ]
      },
      {
        id: 'TER-002',
        name: 'Pune East (Kalyani Nagar)',
        franchiseOwner: 'Sunita Sharma',
        stats: { shops: 89, orders: 8400, revenue: '₹32.1L' },
        color: '#10b981',
        polygon: [
          [73.9000, 18.5400],
          [73.9200, 18.5400],
          [73.9200, 18.5600],
          [73.9000, 18.5600],
          [73.9000, 18.5400]
        ]
      }
    ];

    res.json({ success: true, territories });
  } catch (error) { next(error); }
}

module.exports = {
  getTerritoryMap
};
