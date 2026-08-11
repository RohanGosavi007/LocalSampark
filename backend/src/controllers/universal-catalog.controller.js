const { query, queryOne, queryMany } = require('../config/database');
const { getIo } = require('../sockets/index');

exports.getCatalogItems = async (req, res) => {
  try {
    const { shopId } = req.params;
    const items = await queryMany('SELECT * FROM universal_catalog_items WHERE shop_id = ? AND is_active = 1 ORDER BY created_at DESC', [shopId]);
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error fetching catalog:', error);
    res.status(500).json({ success: false, message: 'Server error fetching catalog items' });
  }
};

exports.addCatalogItem = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { item_type, title, description, pricing_model, price, compare_at_price, inventory_count, availability_matrix, image_url, metadata } = req.body;

    // Optional validation logic here

    const result = await query(
      `INSERT INTO universal_catalog_items (shop_id, item_type, title, description, pricing_model, price, compare_at_price, inventory_count, availability_matrix, image_url, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [shopId, item_type || 'physical_good', title, description, pricing_model || 'fixed', price, compare_at_price || null, inventory_count || 0, availability_matrix ? JSON.stringify(availability_matrix) : null, image_url || null, metadata ? JSON.stringify(metadata) : null]
    );

    res.json({ success: true, message: 'Item added successfully', itemId: result.lastID });
  } catch (error) {
    console.error('Error adding catalog item:', error);
    res.status(500).json({ success: false, message: 'Server error adding catalog item' });
  }
};

exports.bulkAddCatalogItems = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { items } = req.body; // Array of item objects

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or empty items array' });
    }

    // SQLite doesn't natively support easy bulk insert with query builder without building a huge string.
    // We'll iterate and insert. (In production with Postgres, we'd use unnest or prisma.createMany)
    let addedCount = 0;
    for (const item of items) {
      const { item_type, title, description, pricing_model, price, compare_at_price, inventory_count, availability_matrix, image_url, metadata } = item;
      
      await query(
        `INSERT INTO universal_catalog_items (shop_id, item_type, title, description, pricing_model, price, compare_at_price, inventory_count, availability_matrix, image_url, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [shopId, item_type || 'physical_good', title, description || null, pricing_model || 'fixed', price || 0, compare_at_price || null, inventory_count || 0, availability_matrix ? JSON.stringify(availability_matrix) : null, image_url || null, metadata ? JSON.stringify(metadata) : null]
      );
      addedCount++;
    }

    res.json({ success: true, message: `Successfully bulk added ${addedCount} items.`, addedCount });
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

    await query(
      `INSERT INTO universal_leads (shop_id, user_id, lead_type, content) VALUES (?, ?, ?, ?)`,
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
    
    // Fallback if no API key is provided
    if (!apiKey) {
      const mockDescription = `Discover the exceptional quality of our ${title}. This ${itemType || 'product'} is designed to deliver outstanding performance and unmatched value for your everyday needs.`;
      return res.json({ success: true, description: mockDescription });
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
    const { title, description, price, compare_at_price, inventory_count, is_active, metadata } = req.body;
    
    await query(
      `UPDATE universal_catalog_items SET title = ?, description = ?, price = ?, compare_at_price = ?, inventory_count = ?, is_active = ?, metadata = ? WHERE id = ?`,
      [title, description, price, compare_at_price, inventory_count, is_active, metadata ? JSON.stringify(metadata) : null, itemId]
    );

    // Fetch the shopId for broadcasting
    const item = await queryOne('SELECT shop_id FROM universal_catalog_items WHERE id = ?', [itemId]);
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
    await query(`DELETE FROM universal_catalog_items WHERE id = ?`, [itemId]);
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting catalog item:', error);
    res.status(500).json({ success: false, message: 'Server error deleting catalog item' });
  }
};
