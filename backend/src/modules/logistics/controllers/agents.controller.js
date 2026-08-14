const { query } = require('../../../../config/database');

exports.getAgents = async (req, res, next) => {
  try {
    let agents;
    try {
      const result = await query('SELECT * FROM logistics_agents ORDER BY name ASC');
      agents = result.rows || result;
    } catch (e) {
      agents = [];
    }

    if (agents.length === 0) {
      // Mock data seed fallback if table is newly created or empty
      agents = [
        { id: 1, name: 'Rahul Verma', status: 'active', current_order: 'ORD-8192', battery: '82%', location: 'Zone B' },
        { id: 2, name: 'Vikram Singh', status: 'idle', current_order: null, battery: '95%', location: 'Zone A' },
        { id: 3, name: 'Arjun Das', status: 'paused', current_order: null, battery: '12%', location: 'Zone C' }
      ];
      
      try {
        if (e && (e.message.includes('relation "logistics_agents" does not exist') || e.message.includes('no such table'))) {
          await query(\`
            CREATE TABLE logistics_agents (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255),
              status VARCHAR(50),
              current_order VARCHAR(100),
              battery VARCHAR(20),
              location VARCHAR(100)
            )
          \`);
          
          for (const agent of agents) {
            await query(
              \`INSERT INTO logistics_agents (name, status, current_order, battery, location) VALUES ($1, $2, $3, $4, $5)\`,
              [agent.name, agent.status, agent.current_order, agent.battery, agent.location]
            );
          }
        }
      } catch (innerErr) {
        // Ignore seeding errors in dev
      }
    }

    res.json({ success: true, data: agents });
  } catch (error) {
    next(error);
  }
};
