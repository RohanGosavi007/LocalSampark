const { query } = require('../config/database');

const insertData = async () => {
    try {
        console.log('Inserting Turf & Grounds category...');
        await query(`
            INSERT INTO shop_categories 
            (id, name, slug, icon, business_model, is_active, display_order) 
            VALUES ('cat_056', 'Turf & Grounds', 'turf-grounds', '⚽', 'appointment', true, 100) ON CONFLICT DO NOTHING
        `);
        console.log('Category inserted.');

        console.log('Inserting demo Turf shops...');
        
        const owner = await require('../config/database').queryOne("SELECT id FROM users WHERE role = 'shop_owner' LIMIT 1");
        const ownerId = owner ? owner.id : 'owner_1';
        
        const region = await require('../config/database').queryOne("SELECT id FROM regions LIMIT 1");
        const regionId = region ? region.id : 'region_1';

        // Turf 1
        const shop1Id = 'shop_turf_001';
        await query(`
            INSERT INTO local_shops 
            (id, owner_id, region_id, category_id, name, description, category, phone_number, address, coordinate, latitude, longitude, opening_hours, photo_urls, shop_type, approval_status, is_verified, is_active, delivery_available)
            VALUES ($1, $2, $3, $4, $5, $6, $7, '+919999999999', $8, ST_GeomFromText('POINT(73.8967 18.5793)', 4326), $9, $10, '{"open":"09:00","close":"21:00"}', '[]', $11, 'approved', true, true, true) ON CONFLICT DO NOTHING
        `, [
            shop1Id,
            ownerId,
            regionId,
            'cat_056',
            'Dhanori Sports Arena Turf',
            'Premium 5v5 and 7v7 artificial grass football and cricket turf with floodlights.',
            'Turf & Grounds',
            'Dhanori-Lohegaon Road, Pune',
            18.5793, 73.8967,
            'appointment'
        ]);

        // Turf 2
        const shop2Id = 'shop_turf_002';
        await query(`
            INSERT INTO local_shops 
            (id, owner_id, region_id, category_id, name, description, category, phone_number, address, coordinate, latitude, longitude, opening_hours, photo_urls, shop_type, approval_status, is_verified, is_active, delivery_available)
            VALUES ($1, $2, $3, $4, $5, $6, $7, '+919999999999', $8, ST_GeomFromText('POINT(73.9143 18.5679)', 4326), $9, $10, '{"open":"09:00","close":"21:00"}', '[]', $11, 'approved', true, true, true) ON CONFLICT DO NOTHING
        `, [
            shop2Id,
            ownerId,
            regionId,
            'cat_056',
            'KickOff Box Turf',
            'Best box cricket and futsal turf in the area with seating and refreshments.',
            'Turf & Grounds',
            'Viman Nagar, Pune',
            18.5679, 73.9143,
            'appointment'
        ]);

        console.log('Mock shops inserted. Adding services and staff (grounds)...');

        // Services (Time slots types) for Turf 1
        await query(`INSERT INTO shop_services (id, shop_id, name, price, duration_minutes, is_available) VALUES ('svc_turf_1_1', $1, '5v5 Football Turf (1 Hour)', 1200, 60, true) ON CONFLICT DO NOTHING
        `, [shop1Id]);
        await query(`INSERT INTO shop_services (id, shop_id, name, price, duration_minutes, is_available) VALUES ('svc_turf_1_2', $1, 'Box Cricket (1 Hour)', 1000, 60, true) ON CONFLICT DO NOTHING
        `, [shop1Id]);
        
        // Services for Turf 2
        await query(`INSERT INTO shop_services (id, shop_id, name, price, duration_minutes, is_available) VALUES ('svc_turf_2_1', $1, '7v7 Football (1 Hour)', 1500, 60, true) ON CONFLICT DO NOTHING
        `, [shop2Id]);

        // Staff (Representing the actual Grounds/Courts)
        await query(`INSERT INTO shop_staff (id, shop_id, name, role, is_active) VALUES ('stf_turf_1_1', $1, 'Ground A (5v5)', 'Turf', true) ON CONFLICT DO NOTHING
        `, [shop1Id]);
        await query(`INSERT INTO shop_staff (id, shop_id, name, role, is_active) VALUES ('stf_turf_1_2', $1, 'Ground B (Cricket)', 'Turf', true) ON CONFLICT DO NOTHING
        `, [shop1Id]);
        await query(`INSERT INTO shop_staff (id, shop_id, name, role, is_active) VALUES ('stf_turf_2_1', $1, 'Main Field (7v7)', 'Turf', true) ON CONFLICT DO NOTHING
        `, [shop2Id]);

        console.log('All mock data inserted successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error inserting data:', err);
        process.exit(1);
    }
};

insertData();
