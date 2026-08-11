/**
 * ═══════════════════════════════════════════════════════════════════════
 * Offline Sync Service — Delta Sync for Tier-3/4 India
 * 10x Plan: Section 22.1 — React Native Offline-First Support
 * ═══════════════════════════════════════════════════════════════════════
 */
const { query, queryOne, queryMany } = require('../config/database');
const logger = require('../config/logger');
const crypto = require('crypto');

class OfflineSyncService {

  // Tables available for sync with their territory-scoping strategy
  static SYNC_TABLES = {
    shops: {
      query: `SELECT ls.*, sc.name as category_name, sc.icon as category_icon
              FROM local_shops ls
              LEFT JOIN shop_categories sc ON ls.category = sc.slug
              WHERE ls.region_id = $1 AND ls.updated_at > $2 AND ls.is_active = 1
              ORDER BY ls.updated_at ASC LIMIT $3`,
      territoryScoped: true,
    },
    products: {
      query: `SELECT sp.* FROM shop_products sp
              JOIN local_shops ls ON sp.shop_id = ls.id
              WHERE ls.region_id = $1 AND sp.updated_at > $2 AND ls.is_active = 1
              ORDER BY sp.updated_at ASC LIMIT $3`,
      territoryScoped: true,
    },
    categories: {
      query: `SELECT * FROM shop_categories WHERE is_active = 1`,
      territoryScoped: false,
    },
  };

  /**
   * Delta sync — returns only changes since last sync timestamp
   */
  static async deltaSync(userId, territoryId, since, tables = [], deviceId = '', limit = 500) {
    const sinceDate = since ? new Date(since).toISOString() : new Date(0).toISOString();
    const requestedTables = tables.length > 0 ? tables : Object.keys(this.SYNC_TABLES);
    const changes = {};
    let totalRecords = 0;

    for (const tableName of requestedTables) {
      const config = this.SYNC_TABLES[tableName];
      if (!config) continue;

      try {
        if (config.territoryScoped) {
          if (!territoryId) {
            changes[tableName] = { records: [], error: 'territory_id required for this table' };
            continue;
          }
          const records = await queryMany(config.query, [territoryId, sinceDate, limit]);
          changes[tableName] = { records, count: records.length };
          totalRecords += records.length;
        } else {
          // Non-territory tables — return all (small tables like categories)
          const records = await queryMany(config.query, []);
          changes[tableName] = { records, count: records.length };
          totalRecords += records.length;
        }
      } catch (error) {
        logger.error(`Sync failed for table ${tableName}: ${error.message}`);
        changes[tableName] = { records: [], error: error.message };
      }
    }

    // Update sync watermark
    if (userId && deviceId) {
      await this.updateWatermark(userId, deviceId, requestedTables, territoryId);
    }

    const syncTimestamp = new Date().toISOString();

    return {
      sync_timestamp: syncTimestamp,
      territory_id: territoryId,
      total_records: totalRecords,
      tables_synced: requestedTables.length,
      changes,
    };
  }

  /**
   * Process offline mutations queued on the device
   */
  static async processMutations(userId, deviceId, mutations = []) {
    const results = [];

    for (const mutation of mutations) {
      const id = crypto.randomUUID();
      try {
        // Record the mutation
        await query(
          `INSERT INTO offline_mutations (id, user_id, device_id, mutation_type, table_name, record_id, payload, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing')`,
          [id, userId, deviceId, mutation.type, mutation.table, mutation.recordId, JSON.stringify(mutation.payload)]
        );

        // Apply mutation based on type
        let result;
        switch (mutation.type) {
          case 'create_order':
            result = await this.applyCreateOrder(userId, mutation.payload);
            break;
          case 'create_review':
            result = await this.applyCreateReview(userId, mutation.payload);
            break;
          case 'update_profile':
            result = await this.applyUpdateProfile(userId, mutation.payload);
            break;
          default:
            result = { status: 'skipped', reason: `Unknown mutation type: ${mutation.type}` };
        }

        // Mark as applied
        await query(
          `UPDATE offline_mutations SET status = 'applied', applied_at = datetime('now') WHERE id = $1`,
          [id]
        );

        results.push({ mutationId: id, clientId: mutation.clientId, status: 'applied', result });
      } catch (error) {
        await query(
          `UPDATE offline_mutations SET status = 'failed', error_message = $1 WHERE id = $2`,
          [error.message, id]
        );
        results.push({ mutationId: id, clientId: mutation.clientId, status: 'failed', error: error.message });
      }
    }

    return { processed: results.length, results };
  }

  /**
   * Apply a create_order mutation from offline queue
   */
  static async applyCreateOrder(userId, payload) {
    // Validate shop still exists and is active
    const shop = await queryOne(
      `SELECT id, name, is_active FROM local_shops WHERE id = $1`, [payload.shopId]
    );
    if (!shop || !shop.is_active) {
      throw new Error('Shop is no longer available');
    }

    // Create order via the standard flow
    const orderId = crypto.randomUUID();
    await query(
      `INSERT INTO orders (id, user_id, shop_id, total_amount, delivery_fee, payment_method, delivery_address, delivery_coordinate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [orderId, userId, payload.shopId, payload.totalAmount, payload.deliveryFee || 0,
       payload.paymentMethod || 'cod', payload.deliveryAddress || '', '']
    );

    return { orderId, status: 'pending' };
  }

  /**
   * Apply a create_review mutation from offline queue
   */
  static async applyCreateReview(userId, payload) {
    const reviewId = crypto.randomUUID();
    await query(
      `INSERT INTO shop_reviews (id, shop_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [reviewId, payload.shopId, userId, payload.rating, payload.comment || '']
    );
    return { reviewId };
  }

  /**
   * Apply a profile update mutation from offline queue
   */
  static async applyUpdateProfile(userId, payload) {
    const allowedFields = ['full_name', 'bio', 'avatar_url'];
    const updates = [];
    const values = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (payload[field] !== undefined) {
        updates.push(`${field} = $${paramIdx}`);
        values.push(payload[field]);
        paramIdx++;
      }
    }

    if (updates.length === 0) return { status: 'no_changes' };

    values.push(userId);
    await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = $${paramIdx}`,
      values
    );

    return { status: 'updated', fields: updates.length };
  }

  /**
   * Update sync watermark for a device
   */
  static async updateWatermark(userId, deviceId, tables, territoryId) {
    const now = new Date().toISOString();
    for (const table of tables) {
      const id = crypto.randomUUID();
      try {
        const existing = await queryOne(
          `SELECT id FROM sync_watermarks
           WHERE user_id = $1 AND device_id = $2 AND table_name = $3 AND territory_id = $4`,
          [userId, deviceId, table, territoryId || 'global']
        );

        if (existing) {
          await query(
            `UPDATE sync_watermarks SET last_synced_at = $1, updated_at = $1 WHERE id = $2`,
            [now, existing.id]
          );
        } else {
          await query(
            `INSERT INTO sync_watermarks (id, user_id, device_id, table_name, territory_id, last_synced_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, userId, deviceId, table, territoryId || 'global', now]
          );
        }
      } catch (error) {
        logger.error(`Watermark update failed: ${error.message}`);
      }
    }
  }
}

module.exports = OfflineSyncService;
