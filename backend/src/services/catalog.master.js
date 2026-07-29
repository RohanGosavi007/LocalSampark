const { query } = require('../config/database');

/**
 * 10x Global FMCG Catalog Engine
 * Maps messy local shop inventory to pristine global SKUs with aggregated variants.
 */
class MasterCatalogService {
  /**
   * Matches a local shop item to the Master Global Catalog via Barcode or Fuzzy AI Match
   */
  static async linkToMasterCatalog(shopId, localItemName, barcode) {
    let masterSkuId = null;

    if (barcode) {
      // 1. Try exact Barcode Match
      const res = await query('SELECT id FROM global_catalog WHERE barcode = $1', [barcode]);
      if (res.rows.length > 0) masterSkuId = res.rows[0].id;
    }

    if (!masterSkuId && localItemName) {
      // 2. Try Fuzzy Text Trigram Match (PostgreSQL pg_trgm)
      const fuzzyRes = await query(`
        SELECT id, name, similarity(name, $1) as sml 
        FROM global_catalog 
        WHERE name % $1 
        ORDER BY sml DESC 
        LIMIT 1;
      `, [localItemName]);

      if (fuzzyRes.rows.length > 0 && fuzzyRes.rows[0].sml > 0.75) {
        masterSkuId = fuzzyRes.rows[0].id;
      }
    }

    return masterSkuId; // Returns null if no match, requiring manual catalog review
  }

  /**
   * Fetches aggregated variants (100g, 500g, 1kg) for a unified product card UI
   */
  static async getAggregatedVariants(masterSkuId, shopId) {
    const sql = `
      SELECT gc.variant_label, gc.weight, sp.price, sp.stock_qty, gc.image_url 
      FROM shop_products sp
      JOIN global_catalog gc ON sp.master_sku_id = gc.id
      WHERE gc.parent_group_id = (SELECT parent_group_id FROM global_catalog WHERE id = $1)
        AND sp.shop_id = $2
      ORDER BY gc.weight ASC;
    `;
    const res = await query(sql, [masterSkuId, shopId]);
    return res.rows;
  }
}

module.exports = MasterCatalogService;
