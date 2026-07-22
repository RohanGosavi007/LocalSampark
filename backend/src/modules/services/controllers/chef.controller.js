const { query, queryOne } = require('../../../config/database');

let IS_COIN_DISCOUNT_ENABLED = true;

/**
 * Post a Meal
 * Must be 'verified_chef' or 'admin'
 */
const postMeal = async (req, res, next) => {
  try {
    const { mealName, description, price, availablePlates, isVeg } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!['admin', 'superadmin', 'verified_chef'].includes(userRole)) {
      return res.status(403).json({ error: 'You must have the "Verified Chef" tag to post meals. Contact an Admin.' });
    }

    const newMeal = await query(
      `INSERT INTO home_chef_meals (chef_id, meal_name, description, price, total_plates, available_plates, is_veg, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active') RETURNING *`,
      [userId, mealName, description, price, availablePlates, availablePlates, isVeg]
    );

    res.status(201).json({ success: true, message: 'Meal published for the neighborhood!', data: newMeal.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active meals
 */
const getMeals = async (req, res, next) => {
  try {
    const meals = await query(`
      SELECT m.*, u.full_name as chef_name, u.phone as chef_phone 
      FROM home_chef_meals m
      JOIN users u ON m.chef_id = u.id
      WHERE m.status = 'active' AND m.available_plates > 0
      ORDER BY m.created_at DESC
    `);
    res.json({ success: true, data: meals.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Order Meal (Integrates with Coins & Delivery)
 */
const orderMeal = async (req, res, next) => {
  try {
    const { mealId } = req.params;
    const { quantity, applyDiscount, deliveryOption, dropoffLocation } = req.body;
    const userId = req.user.id;

    // Fetch meal
    const meal = await queryOne(`
      SELECT m.*, u.full_name as chef_name
      FROM home_chef_meals m
      JOIN users u ON m.chef_id = u.id
      WHERE m.id = $1 AND m.status = 'active'
    `, [mealId]);

    if (!meal || meal.available_plates < quantity) {
      return res.status(400).json({ error: 'Not enough plates available.' });
    }

    let finalPrice = meal.price * quantity;
    let coinsDeducted = 0;
    let discountAmount = 0;

    // Apply Gamification Discount
    if (applyDiscount && IS_COIN_DISCOUNT_ENABLED) {
      // Logic: Use 100 coins for ₹10 off per plate
      const maxPossibleDiscount = 10 * quantity;
      const coinsNeeded = 100 * quantity;
      
      const wallet = await queryOne(`SELECT total_coins FROM loyalty_wallets WHERE user_id = $1`, [userId]);
      if (wallet && wallet.total_coins >= coinsNeeded) {
        coinsDeducted = coinsNeeded;
        discountAmount = maxPossibleDiscount;
        finalPrice = Math.max(0, finalPrice - discountAmount);

        // Deduct from wallet
        await query(`UPDATE loyalty_wallets SET total_coins = total_coins - $1 WHERE user_id = $2`, [coinsDeducted, userId]);
        await query(
          `INSERT INTO loyalty_transactions (user_id, amount, type, source) VALUES ($1, $2, 'spent', 'Home Chef Discount')`,
          [userId, coinsDeducted]
        );
      }
    }

    // Update Plates
    await query(`UPDATE home_chef_meals SET available_plates = available_plates - $1 WHERE id = $2`, [quantity, mealId]);

    // Create Order Record
    const order = await query(
      `INSERT INTO home_chef_orders (meal_id, customer_id, quantity, final_price, discount_applied, delivery_option, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed') RETURNING *`,
      [mealId, userId, quantity, finalPrice, discountAmount, deliveryOption]
    );

    // If Delivery is requested, create a Delivery Job for Phase 20 Integration!
    let deliveryJobId = null;
    if (deliveryOption === 'delivery') {
      const deliveryRewardFiat = 30; // standard flat rate for demo
      const newJob = await query(
        `INSERT INTO delivery_jobs (requester_id, pickup_location, dropoff_location, item_details, delivery_type, payment_pref, price_fiat, price_coins, pincode, status) 
         VALUES ($1, $2, $3, $4, 'walker', 'fiat', $5, 0, '400001', 'pending') RETURNING *`,
        [userId, `Chef ${meal.chef_name}'s Kitchen`, dropoffLocation, `${quantity}x ${meal.meal_name}`, deliveryRewardFiat]
      );
      deliveryJobId = newJob.rows[0].id;
    }

    res.json({
      success: true,
      message: 'Meal Ordered Successfully!',
      data: {
        orderId: order.rows[0].id,
        finalPrice,
        coinsDeducted,
        deliveryJobId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ADMIN ONLY: Toggle Coin Discount
 */
const toggleCoinDiscount = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    IS_COIN_DISCOUNT_ENABLED = enabled;
    res.json({ success: true, message: `Home Chef Coin Discounts are now ${enabled ? 'ENABLED' : 'DISABLED'}` });
  } catch (error) {
    next(error);
  }
};
const getCoinDiscountStatus = (req, res) => {
  res.json({ success: true, data: { enabled: IS_COIN_DISCOUNT_ENABLED } });
};

module.exports = {
  postMeal,
  getMeals,
  orderMeal,
  toggleCoinDiscount,
  getCoinDiscountStatus
};
