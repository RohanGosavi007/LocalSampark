const { query, queryOne, queryMany, withTransaction } = require('../config/database');
const { isPlatformAdmin } = require('../middleware/shop-owner.middleware');
const { getIo } = require('../sockets/index');

exports.getCatalogItems = async (req, res) => {
  try {
    const { shopId } = req.params;
    const items = await queryMany('SELECT * FROM universal_catalog_items WHERE shop_id = $1 AND is_active = true ORDER BY created_at DESC', [shopId]);
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error fetching catalog:', error);
    res.status(500).json({ success: false, message: 'Server error fetching catalog items' });
  }
};

const ITEM_TYPES = ['physical_good', 'service', 'subscription', 'job_card'];
const MAX_BULK_ITEMS = 500;

/**
 * Checks one catalogue item as sent by a client. Returns { error } or the
 * values to store. A price is a finite number that is not negative: the
 * column is what an order is charged from, and it used to take whatever
 * arrived — a missing price in a bulk upload was stored as 0, a free item.
 */
function readItem(item) {
  const source = item || {};
  const title = typeof source.title === 'string' ? source.title.trim() : '';
  if (!title) return { error: 'Each item needs a title' };
  if (title.length > 200) return { error: 'A title can be at most 200 characters' };

  const price = Number(source.price);
  if (source.price === undefined || source.price === null || source.price === '' || !Number.isFinite(price) || price < 0) {
    return { error: `"${title}" needs a price of 0 or more` };
  }
  const compare = source.compare_at_price === undefined || source.compare_at_price === null || source.compare_at_price === ''
    ? null : Number(source.compare_at_price);
  if (compare !== null && (!Number.isFinite(compare) || compare < 0)) {
    return { error: `"${title}" has an invalid compare-at price` };
  }
  const inventory = source.inventory_count === undefined || source.inventory_count === null || source.inventory_count === ''
    ? 0 : Number(source.inventory_count);
  if (!Number.isInteger(inventory) || inventory < 0) {
    return { error: `"${title}" needs a whole, non-negative stock count` };
  }
  const itemType = source.item_type || 'physical_good';
  if (!ITEM_TYPES.includes(itemType)) return { error: `"${title}" has an unknown item_type` };

  return {
    values: [
      itemType,
      title,
      source.description || null,
      source.pricing_model || 'fixed',
      price,
      compare,
      inventory,
      source.availability_matrix ? JSON.stringify(source.availability_matrix) : null,
      source.image_url || null,
      source.metadata ? JSON.stringify(source.metadata) : null,
    ],
  };
}

const INSERT_ITEM = `INSERT INTO universal_catalog_items (shop_id, item_type, title, description, pricing_model, price, compare_at_price, inventory_count, availability_matrix, image_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

/**
 * Guard for /item/:itemId — the caller owns the shop the item belongs to.
 * The item id is all the request carries, so the shop is looked up from it.
 */
exports.requireItemOwner = async (req, res, next) => {
  try {
    const item = await queryOne(
      `SELECT i.id, i.shop_id, s.owner_id
         FROM universal_catalog_items i
         LEFT JOIN local_shops s ON CAST(s.id AS TEXT) = CAST(i.shop_id AS TEXT)
        WHERE CAST(i.id AS TEXT) = $1`,
      [String(req.params.itemId)]
    );
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (!isPlatformAdmin(req) && String(item.owner_id) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You do not manage the shop this item belongs to.' });
    }
    req.catalogItem = item;
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.addCatalogItem = async (req, res) => {
  try {
    const { shopId } = req.params;
    const item = readItem(req.body);
    if (item.error) return res.status(400).json({ success: false, message: item.error });

    const result = await query(`${INSERT_ITEM} RETURNING id`, [shopId, ...item.values]);

    const itemId = (result.rows && result.rows[0] && result.rows[0].id) ?? result.lastID;
    res.json({ success: true, message: 'Item added successfully', itemId });
  } catch (error) {
    console.error('Error adding catalog item:', error);
    res.status(500).json({ success: false, message: 'Server error adding catalog item' });
  }
};

exports.bulkAddCatalogItems = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { items } = req.body || {}; // Array of item objects

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty items array' });
    }
    if (items.length > MAX_BULK_ITEMS) {
      return res.status(400).json({ success: false, message: `At most ${MAX_BULK_ITEMS} items can be added at once` });
    }

    // Every row is checked before any is written, and they are written
    // together: a sheet with one bad row used to import the rows above it and
    // stop, leaving a catalogue nobody could tell the state of.
    const rows = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = readItem(items[index]);
      if (item.error) {
        return res.status(400).json({ success: false, message: `Row ${index + 1}: ${item.error}` });
      }
      rows.push(item.values);
    }

    await withTransaction(async (client) => {
      for (const values of rows) {
        await client.query(INSERT_ITEM, [shopId, ...values]);
      }
    });

    res.json({ success: true, message: `Successfully bulk added ${rows.length} items.`, addedCount: rows.length });
  } catch (error) {
    console.error('Error bulk adding catalog items:', error);
    res.status(500).json({ success: false, message: 'Server error bulk adding catalog items' });
  }
};

exports.trackLead = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { leadType, content } = req.body; // 'FAVORITE', 'ABANDONED_CART'
    const userId = req.user.id;

    if (typeof leadType !== 'string' || !leadType.trim()) {
      return res.status(400).json({ success: false, message: 'leadType is required' });
    }

    await query(
      `INSERT INTO universal_leads (shop_id, user_id, lead_type, content) VALUES ($1, $2, $3, $4)`,
      [shopId, userId, leadType, content || '']
    );

    res.json({ success: true, message: 'Lead tracked successfully' });
  } catch (error) {
    console.error('Error tracking lead:', error);
    res.status(500).json({ success: false, message: 'Server error tracking lead' });
  }
};

exports.generateDescriptionWithAI = async (req, res) => {
  try {
    const { title, itemType, attributes } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    let prompt = `Write a compelling, professional, and SEO-optimized product description for an item named "${title}". `;
    prompt += `This is a ${itemType || 'product'}. `;
    if (attributes) prompt += `Here are some attributes to highlight: ${JSON.stringify(attributes)}. `;
    prompt += `Keep it between 2 to 4 sentences, focusing on benefits and value. Do not use quotes around the response.`;

    const apiKey = process.env.GEMINI_API_KEY;

    // Without a key there is no model to ask. This used to return a fixed
    // sentence with the title pasted in, presented as the generated result —
    // which a shop owner would then publish as their product description.
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        code: 'AI_UNAVAILABLE',
        message: 'Description suggestions are not available right now. Please write the description yourself.',
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text.trim();
      return res.json({ success: true, description: text });
    }

    throw new Error('Invalid response from AI');
  } catch (error) {
    console.error('Error generating AI description:', error);
    res.status(500).json({ success: false, message: 'Failed to generate AI description' });
  }
};

exports.updateCatalogItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const body = req.body || {};

    // Only the fields that were sent are changed. The statement used to set
    // all seven columns from the request, so updating the stock alone wrote
    // NULL into title and price — and price is what an order is charged.
    const sets = [];
    const params = [];
    const set = (column, value) => { params.push(value); sets.push(`${column} = $${params.length}`); };

    if (body.title !== undefined) {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (!title || title.length > 200) return res.status(400).json({ success: false, message: 'title must be 1 to 200 characters' });
      set('title', title);
    }
    if (body.description !== undefined) set('description', body.description || null);
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (body.price === null || body.price === '' || !Number.isFinite(price) || price < 0) {
        return res.status(400).json({ success: false, message: 'price must be 0 or more' });
      }
      set('price', price);
    }
    if (body.compare_at_price !== undefined) {
      const compare = body.compare_at_price === null || body.compare_at_price === '' ? null : Number(body.compare_at_price);
      if (compare !== null && (!Number.isFinite(compare) || compare < 0)) {
        return res.status(400).json({ success: false, message: 'compare_at_price must be 0 or more' });
      }
      set('compare_at_price', compare);
    }
    if (body.inventory_count !== undefined) {
      const inventory = Number(body.inventory_count);
      if (!Number.isInteger(inventory) || inventory < 0) {
        return res.status(400).json({ success: false, message: 'inventory_count must be a whole number of 0 or more' });
      }
      set('inventory_count', inventory);
    }
    if (body.is_active !== undefined) {
      const active = body.is_active === true || body.is_active === 1 || body.is_active === '1' || body.is_active === 'true';
      set('is_active', active ? '1' : '0');
    }
    if (body.metadata !== undefined) set('metadata', body.metadata ? JSON.stringify(body.metadata) : null);

    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    params.push(String(itemId));
    await query(
      `UPDATE universal_catalog_items SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE CAST(id AS TEXT) = $${params.length}`,
      params
    );
    const { inventory_count, is_active } = body;

    // Fetch the shopId for broadcasting
    const item = await queryOne('SELECT shop_id FROM universal_catalog_items WHERE id = $1', [itemId]);
    if (item && item.shop_id) {
      try {
        getIo().to(`shop_${item.shop_id}`).emit('inventory_update', {
          itemId,
          inventory_count,
          is_active
        });
      } catch (e) {
        console.error('WebSocket emit failed', e);
      }
    }

    res.json({ success: true, message: 'Item updated successfully' });
  } catch (error) {
    console.error('Error updating catalog item:', error);
    res.status(500).json({ success: false, message: 'Server error updating catalog item' });
  }
};

exports.deleteCatalogItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    await query(`DELETE FROM universal_catalog_items WHERE CAST(id AS TEXT) = $1`, [String(itemId)]);
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting catalog item:', error);
    res.status(500).json({ success: false, message: 'Server error deleting catalog item' });
  }
};
