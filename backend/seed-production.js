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

    console.log('✅ Production seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during production seeding:', error);
    process.exit(1);
  }
}

seedProduction();
