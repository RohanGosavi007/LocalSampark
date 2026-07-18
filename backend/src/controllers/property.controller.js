const { query, queryOne } = require('../config/database');

const getProperties = async (req, res, next) => {
  try {
    const { type, search } = req.query;
    let sql = `SELECT * FROM properties WHERE status = 'active'`;
    let params = [];
    let paramIndex = 1;

    if (type && type !== 'All') {
      sql += ` AND listing_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (LOWER(location) LIKE LOWER($${paramIndex}) OR LOWER(title) LIKE LOWER($${paramIndex}))`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT 50`;

    const properties = await query(sql, params);
    res.json(properties.rows || properties);
  } catch (error) {
    next(error);
  }
};

const createProperty = async (req, res, next) => {
  try {
    const { title, location, type, price, deposit, beds, baths, sqft, description, images } = req.body;
    
    const { v4: uuidv4 } = require('uuid');
    const propertyId = uuidv4();
    
    // Convert arrays/json appropriately if necessary. In standard SQL, images would be JSONB.
    const property = await queryOne(
      `INSERT INTO properties (id, user_id, title, location, listing_type, price, deposit, beds, baths, sqft, description, images, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
       RETURNING *`,
      [propertyId, req.user.id, title, location, type, price, deposit || null, beds || 1, baths || 1, sqft || null, description || '', JSON.stringify(images || [])]
    );

    res.status(201).json(property);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProperties,
  createProperty
};
