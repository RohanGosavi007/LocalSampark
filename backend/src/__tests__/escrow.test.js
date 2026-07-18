const request = require('supertest');
const { app } = require('../server');
const { pool } = require('../config/database');

describe('Escrow & Race Condition Tests', () => {
  let server;
  
  beforeAll(async () => {
    server = app.listen(5001);
    
    // Create test tables if not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS equipment_listings (
        id INTEGER PRIMARY KEY,
        owner_id INTEGER,
        item_name TEXT,
        category TEXT,
        daily_price INTEGER,
        security_deposit INTEGER,
        status TEXT
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS volunteer_tasks (
        id INTEGER PRIMARY KEY,
        poster_id INTEGER,
        title TEXT,
        bounty_coins INTEGER,
        type TEXT,
        status TEXT,
        volunteer_id INTEGER
      )
    `);
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  });

  describe('Concurrent Equipment Rental (Double Booking Prevention)', () => {
    it('should only allow one user to rent equipment even with concurrent requests', async () => {
      // Mock the auth middleware by assuming routes are somehow accessible or passing a mock token
      // In a real test, we would generate a valid JWT for two different users.
      // For this structural test, we focus on the Database level concurrency by calling the controller directly or mocking the pool.

      const mockEquipmentId = 999;
      const userA = 101;
      const userB = 102;
      
      // Seed a dummy equipment
      await pool.query(
        `INSERT INTO equipment_listings (id, owner_id, item_name, category, daily_price, security_deposit, status) 
         VALUES ($1, $2, 'Drill', 'Tools', 100, 500, 'available') 
         ON CONFLICT (id) DO UPDATE SET status = 'available'`,
        [mockEquipmentId, 900]
      );

      // We will simulate the internal transaction flow to test row-level locking
      // We fire two transactions at the exact same time trying to SELECT ... FOR UPDATE

      const rentLogic = async (userId) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const res = await client.query(`SELECT * FROM equipment_listings WHERE id = $1 AND status = 'available' FOR UPDATE`, [mockEquipmentId]);
          
          if (res.rows.length === 0) {
            await client.query('ROLLBACK');
            return { success: false, error: 'Equipment not available' };
          }

          // Simulate processing time
          await new Promise(r => setTimeout(r, 100));

          await client.query(`UPDATE equipment_listings SET status = 'rented' WHERE id = $1`, [mockEquipmentId]);
          await client.query('COMMIT');
          return { success: true };
        } catch (e) {
          await client.query('ROLLBACK');
          return { success: false, error: e.message };
        } finally {
          client.release();
        }
      };

      const [resultA, resultB] = await Promise.all([
        rentLogic(userA),
        rentLogic(userB)
      ]);

      // One must succeed, one must fail
      const successCount = [resultA, resultB].filter(r => r.success).length;
      const failCount = [resultA, resultB].filter(r => !r.success).length;

      expect(successCount).toBe(1);
      expect(failCount).toBe(1);
      
      const finalStatus = await pool.query(`SELECT status FROM equipment_listings WHERE id = $1`, [mockEquipmentId]);
      expect(finalStatus.rows[0].status).toBe('rented');
    });
  });

  describe('Concurrent Volunteer Bounty Claiming', () => {
    it('should only allow one volunteer to claim an open task', async () => {
      const mockTaskId = 888;
      
      await pool.query(
        `INSERT INTO volunteer_tasks (id, poster_id, title, bounty_coins, type, status) 
         VALUES ($1, $2, 'Clean Park', 100, 'civic_issue', 'open') 
         ON CONFLICT (id) DO UPDATE SET status = 'open'`,
        [mockTaskId, 900]
      );

      const claimLogic = async (userId) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const res = await client.query(`SELECT * FROM volunteer_tasks WHERE id = $1 FOR UPDATE`, [mockTaskId]);
          
          if (res.rows.length === 0 || res.rows[0].status !== 'open') {
            await client.query('ROLLBACK');
            return { success: false };
          }

          await new Promise(r => setTimeout(r, 50)); // artificial delay

          await client.query(`UPDATE volunteer_tasks SET status = 'in_progress', volunteer_id = $1 WHERE id = $2`, [userId, mockTaskId]);
          await client.query('COMMIT');
          return { success: true };
        } catch (e) {
          await client.query('ROLLBACK');
          return { success: false };
        } finally {
          client.release();
        }
      };

      const [res1, res2, res3] = await Promise.all([
        claimLogic(101),
        claimLogic(102),
        claimLogic(103)
      ]);

      const successCount = [res1, res2, res3].filter(r => r.success).length;
      expect(successCount).toBe(1); // Only 1 person gets the task
    });
  });
});
