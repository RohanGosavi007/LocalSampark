/**
 * The commission a shop is charged, as a percentage of an order's item value.
 *
 *   the shop's own rate      local_shops.commission_override_percent
 *   else its category's      shop_categories.commission_percent
 *   else the platform's      default_commission_percent (5 unless an
 *                            administrator has changed it)
 *
 * One rule, used when an order is placed (the rate is stored on the order) and
 * when a payout is calculated for an order that has none stored. The payout
 * code used to read a column that does not exist and assume 10%; the order
 * code fell back to 0%.
 */

const { queryOne } = require('../config/database');
const platformConfig = require('./platformConfig.service');

const usable = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;

/** For a local_shops row already in hand. */
async function rateForShop(shop) {
  if (shop && usable(shop.commission_override_percent)) return Number(shop.commission_override_percent);

  if (shop && shop.category_id) {
    const category = await queryOne('SELECT commission_percent FROM shop_categories WHERE id = $1', [shop.category_id]);
    if (category && usable(category.commission_percent)) return Number(category.commission_percent);
  }
  return platformConfig.get('default_commission_percent');
}

/**
 * The fixed fee a shop pays the platform per order, on top of the percentage:
 * its own (convenience_fee_override), else its category's, else none.
 */
async function convenienceFeeForShop(shop) {
  if (shop && usable(shop.convenience_fee_override)) return Number(shop.convenience_fee_override);
  if (shop && shop.category_id) {
    const category = await queryOne('SELECT convenience_fee FROM shop_categories WHERE id = $1', [shop.category_id]);
    if (category && usable(category.convenience_fee)) return Number(category.convenience_fee);
  }
  return 0;
}

/**
 * What the platform earns from the shop on an order of `itemValue`, and what
 * is left for the shop — before tax and gateway costs, which settlement adds.
 */
async function termsFor(shop, itemValue) {
  const percent = await rateForShop(shop);
  const convenienceFee = await convenienceFeeForShop(shop);
  const round = (value) => Math.round(value * 100) / 100;
  const commissionAmount = round((Number(itemValue) || 0) * (percent / 100));
  const platformEarning = round(commissionAmount + convenienceFee);
  return { percent, convenienceFee, commissionAmount, platformEarning, netToShop: round((Number(itemValue) || 0) - platformEarning) };
}

/** For a shop id. */
async function rateForShopId(shopId) {
  const shop = await queryOne('SELECT id, category_id, commission_override_percent FROM local_shops WHERE id = $1', [shopId]);
  return rateForShop(shop);
}

module.exports = { rateForShop, rateForShopId, convenienceFeeForShop, termsFor };
