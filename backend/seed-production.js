const { query } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function seedProduction() {
  try {
    console.log('Seeding production database...');

    // Hash the default password for the super admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin@123', salt);

    // Create Super Admin user
    const userRes = await query(
      `INSERT INTO users (full_name, phone_number, password, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (phone_number) DO NOTHING
       RETURNING id`,
      ['Super Admin', '+919999999991', hashedPassword, 'super_admin', true]
    );

    if (userRes.rows && userRes.rows.length > 0) {
      const adminId = userRes.rows[0].id;

      // Assign roles and permissions
      await query(
        `INSERT INTO admin_roles (id, user_id, role, permissions, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, role) DO NOTHING`,
        ['role_' + Date.now(), adminId, 'super_admin', JSON.stringify({ all: true }), 1]
      );
      console.log('✅ Super Admin account created.');
    } else {
      console.log('ℹ️ Super Admin account already exists. Skipping...');
    }

    // Initialize PostGIS Partitioning and Indexes
    console.log('Initializing Spatial Partitions & GIST Indexes...');
    
    // Create base shops table if it doesn't exist (simulated for deployment plan)
    // Normally handled by migrations, but ensuring partition schema
    await query(`
      CREATE TABLE IF NOT EXISTS shops_partitioned (
        id UUID PRIMARY KEY,
        name VARCHAR(255),
        pincode VARCHAR(6),
        location geometry(Point, 4326)
      ) PARTITION BY LIST (pincode);
    `);

    // Ensure partitions for major pincodes exist
    const initialPincodes = ['411014', '411015', '411047'];
    for (const pin of initialPincodes) {
      await query(`
        CREATE TABLE IF NOT EXISTS shops_${pin}
        PARTITION OF shops_partitioned FOR VALUES IN ('${pin}');
      `);
      
      // Create GIST Index for spatial queries on the partition
      await query(`
        CREATE INDEX IF NOT EXISTS idx_shops_${pin}_location 
        ON shops_${pin} USING GIST (location);
      `);
    }
    console.log('✅ Spatial Partitions configured.');

    console.log('✅ Production seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during production seeding:', error);
    process.exit(1);
  }
}

seedProduction();
