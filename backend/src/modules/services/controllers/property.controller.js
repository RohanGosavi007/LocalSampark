const { query, queryOne } = require('../../../config/database');
const crypto = require('crypto');

const getProperties = async (req, res, next) => {
  try {
    const { type, search } = req.query;
    let sql = `SELECT * FROM local_property_listings WHERE status = 'available'`;
    let params = [];
    let paramIndex = 1;

    if (type && type !== 'All') {
      sql += ` AND property_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (LOWER(address) LIKE LOWER($${paramIndex}) OR LOWER(title) LIKE LOWER($${paramIndex}))`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT 50`;

    const properties = await query(sql, params);
    res.json({ success: true, properties: properties.rows || properties });
  } catch (error) {
    next(error);
  }
};

const createProperty = async (req, res, next) => {
  try {
    const { title, address, propertyType, price, deposit, description, images } = req.body;
    
    const propertyId = crypto.randomUUID();
    
    await query(`INSERT INTO local_property_listings (id, owner_id, title, property_type, listing_type, price, deposit, address, images_json, status)
       VALUES ($1, $2, $3, $4, 'RENT', $5, $6, $7, $8, 'available')`,
      [propertyId, req.user.id, title, propertyType || 'FLAT', price, deposit || 0, address || '', JSON.stringify(images || [])]
    );

    res.status(201).json({ success: true, message: 'Property listed successfully!', propertyId });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProperties,
  createProperty
};
