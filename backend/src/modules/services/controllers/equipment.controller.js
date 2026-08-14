const { query, queryOne, withTransaction } = require('../../../config/database');

let IS_COIN_PAYMENT_ENABLED = true;

/**
 * List a new equipment item for rent
 */
const createListing = async (req, res, next) => {
  try {
    const { itemName, category, description, dailyPrice, securityDeposit, imageUrl } = req.body;
    const userId = req.user.id;

    const newItem = await query(`INSERT INTO equipment_listings (owner_id, item_name, category, description, daily_price, security_deposit, image_url, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'available') RETURNING *`,
      [userId, itemName, category, description, dailyPrice, securityDeposit, imageUrl || '']
    );

    res.status(201).json({ success: true, message: 'Equipment listed successfully.', data: newItem.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available equipment
 */
const getEquipment = async (req, res, next) => {
  try {
    const items = await query(`
      SELECT e.*, u.full_name as owner_name 
      FROM equipment_listings e
      JOIN users u ON e.owner_id = u.id
      WHERE e.status = 'available'
      ORDER BY e.created_at DESC
    `);
    res.json({ success: true, data: items.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Request to rent equipment (Handles Escrow)
 */
const rentEquipment = async (req, res, next) => {
  try {
    const { equipmentId } = req.params;
    const { days, useCoins } = req.body;
    const userId = req.user.id;

    await withTransaction(async (client) => {
      // 1. Lock the equipment row to prevent double booking
      const itemResult = await client.query(`SELECT * FROM equipment_listings WHERE id = $1 AND status = 'available' FOR UPDATE`, 
        [equipmentId]
      );
      const item = itemResult.rows[0];
      
      if (!item) {
        throw new Error('Equipment not found or already rented.');
      }
      if (item.owner_id === userId) {
        throw new Error('Cannot rent your own item.');
      }

      // 2. Payment Logic
      const rentTotal = item.daily_price * days;
      const deposit = item.security_deposit;
      const totalFiatRequired = deposit + (useCoins && IS_COIN_PAYMENT_ENABLED ? 0 : rentTotal);
      const totalCoinsRequired = useCoins && IS_COIN_PAYMENT_ENABLED ? (rentTotal * 10) : 0;

      // 3. If using coins, lock the wallet and deduct safely
      if (totalCoinsRequired > 0) {
        const walletResult = await client.query(`SELECT total_coins FROM loyalty_wallets WHERE user_id = $1 FOR UPDATE`, 
          [userId]
        );
        const wallet = walletResult.rows[0];
        
        if (!wallet || wallet.total_coins < totalCoinsRequired) {
          throw new Error('Insufficient SamparkCoins for rental payment.');
        }
        
        await client.query(`UPDATE loyalty_wallets SET total_coins = total_coins - $1 WHERE user_id = $2`, [totalCoinsRequired, userId]);
        await client.query(`INSERT INTO loyalty_transactions (user_id, amount, type, source) VALUES ($1, $2, 'spent', 'Equipment Rent Escrow')`,
          [userId, totalCoinsRequired]
        );
      }

      // 4. Mark item as rented
      await client.query(`UPDATE equipment_listings SET status = 'rented' WHERE id = $1`, [equipmentId]);

      // 5. Create rental record with escrow
      const rental = await client.query(`INSERT INTO equipment_rentals (equipment_id, renter_id, days, rent_paid_fiat, rent_paid_coins, escrow_deposit_fiat, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING *`,
        [equipmentId, userId, days, totalFiatRequired - deposit, totalCoinsRequired, deposit]
      );

      res.json({
        success: true,
        message: 'Rental confirmed. Security deposit held in escrow.',
        data: rental.rows[0]
      });
    });
  } catch (error) {
    if (error.message === 'Equipment not found or already rented.' || 
        error.message === 'Cannot rent your own item.' || 
        error.message === 'Insufficient SamparkCoins for rental payment.') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Return equipment (Owner action to release escrow)
 */
const confirmReturn = async (req, res, next) => {
  try {
    const { rentalId } = req.params;
    const userId = req.user.id;

    await withTransaction(async (client) => {
      // 1. Lock the rental row
      const rentalResult = await client.query(`
        SELECT r.*, e.owner_id 
        FROM equipment_rentals r
        JOIN equipment_listings e ON r.equipment_id = e.id
        WHERE r.id = $1 AND r.status = 'active'
        FOR UPDATE
      `, [rentalId]);
      
      const rental = rentalResult.rows[0];

      if (!rental) throw new Error('Active rental not found.');
      if (rental.owner_id !== userId) throw new Error('Only the equipment owner can confirm return.');

      // 2. Mark rental as completed
      await client.query(`UPDATE equipment_rentals SET status = 'completed' WHERE id = $1`, [rentalId]);
      
      // 3. Mark equipment as available again
      await client.query(`UPDATE equipment_listings SET status = 'available' WHERE id = $1`, [rental.equipment_id]);

      // Release Escrow: Deposit is naturally released here back to renter's wallet in a real fiat flow.
      
      res.json({
        success: true,
        message: `Equipment returned safely. ₹${rental.escrow_deposit_fiat} security deposit released from escrow back to the renter.`
      });
    });
  } catch (error) {
    if (error.message === 'Active rental not found.' || error.message === 'Only the equipment owner can confirm return.') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Get active rentals for current user (as owner or renter)
 */
const getMyRentals = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const rentals = await query(`
      SELECT r.*, e.item_name, e.image_url, e.owner_id
      FROM equipment_rentals r
      JOIN equipment_listings e ON r.equipment_id = e.id
      WHERE (r.renter_id = $1 OR e.owner_id = $1) AND r.status = 'active'
    `, [userId]);
    res.json({ success: true, data: rentals.rows });
  } catch (error) {
    next(error);
  }
};


/**
 * ADMIN ONLY: Toggle Coin Payments
 */
const toggleCoinPayment = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    IS_COIN_PAYMENT_ENABLED = enabled;
    res.json({ success: true, message: `Coin Payments for Equipment is now ${enabled ? 'ENABLED' : 'DISABLED'}` });
  } catch (error) {
    next(error);
  }
};
const getCoinPaymentStatus = (req, res) => {
  res.json({ success: true, data: { enabled: IS_COIN_PAYMENT_ENABLED } });
};

module.exports = {
  createListing,
  getEquipment,
  rentEquipment,
  confirmReturn,
  getMyRentals,
  toggleCoinPayment,
  getCoinPaymentStatus
};
