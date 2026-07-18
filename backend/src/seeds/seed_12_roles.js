const { query, queryOne } = require('../config/database');
const crypto = require('crypto');

async function seed12Roles() {
  try {
    console.log('🌱 Seeding 12 RBAC preset users...');

    // Get or create region
    let region = await queryOne("SELECT id FROM regions LIMIT 1");
    let regionId;
    if (!region) {
      regionId = crypto.randomUUID();
      await query(
        `INSERT INTO regions (id, name, state, country, latitude, longitude, radius_km)
         VALUES ($1, 'Dhanori', 'Maharashtra', 'India', 18.5786, 73.8967, 5.0)`,
        [regionId]
      );
    } else {
      regionId = region.id;
    }

    const rolesMap = [
      { role: 'user', phone: '+919000000001', name: 'Dev Resident' },
      { role: 'resident_member', phone: '+919000000002', name: 'Dev Society Resident' },
      { role: 'society_admin', phone: '+919000000003', name: 'Dev Society Admin' },
      { role: 'security_guard', phone: '+919000000004', name: 'Dev Security Guard' },
      { role: 'shop_owner', phone: '+919000000005', name: 'Dev Shop Owner' },
      { role: 'service_provider', phone: '+919000000006', name: 'Dev Service Provider' },
      { role: 'delivery_agent', phone: '+919000000007', name: 'Dev Delivery Agent' },
      { role: 'field_agent', phone: '+919000000008', name: 'Dev Field Agent' },
      { role: 'area_agent', phone: '+919000000009', name: 'Dev Area Agent' },
      { role: 'territory_admin', phone: '+919000000010', name: 'Dev Territory Admin' },
      { role: 'moderator', phone: '+919000000011', name: 'Dev Content Moderator' },
      { role: 'super_admin', phone: '+919000000012', name: 'Dev Super Admin' }
    ];

    for (const item of rolesMap) {
      let user = await queryOne("SELECT id FROM users WHERE phone_number = $1", [item.phone]);
      if (!user) {
        const userId = crypto.randomUUID();
        await query(
          `INSERT INTO users (id, phone_number, full_name, role, is_verified, is_active, region_id)
           VALUES ($1, $2, $3, $4, 1, 1, $5)`,
          [userId, item.phone, item.name, item.role, regionId]
        );
        // Create wallet
        await query('INSERT INTO wallets (user_id, balance) VALUES ($1, 500.00)', [userId]);
        
        // If it's an admin/franchise role, insert into admin_roles table as well
        const adminRoles = ['territory_admin', 'area_agent', 'moderator', 'super_admin', 'society_admin'];
        if (adminRoles.includes(item.role)) {
          const roleId = crypto.randomUUID();
          await query(
            `INSERT INTO admin_roles (id, user_id, role, region_id, permissions, is_active)
             VALUES ($1, $2, $3, $4, '{"all": true}', 1)`,
            [roleId, userId, item.role, regionId]
          );
        }
      } else {
        await query("UPDATE users SET role = $1, full_name = $2 WHERE phone_number = $3", [item.role, item.name, item.phone]);
      }
    }

    console.log('✅ 12 RBAC users seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed12Roles();
