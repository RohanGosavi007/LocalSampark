const { query } = require('../../../config/database');

// Simulated gamification engine
exports.getGamificationProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // In a real DB, you would have a user_badges table and loyalty_points table.
        // We will simulate it here based on total orders.
        const orderCountResult = await query('SELECT COUNT(*) as count FROM orders WHERE user_id = $1', [userId]);
        const orderCount = parseInt(orderCountResult.rows[0].count, 10);
        
        let level = 1;
        let points = orderCount * 50;
        let title = "Neighborhood Newbie";
        let badges = [];

        if (orderCount >= 5) {
            level = 2;
            title = "Local Supporter";
            badges.push({ id: 'b1', name: 'First 5 Orders', icon: '⭐' });
        }
        if (orderCount >= 15) {
            level = 3;
            title = "Community Champion";
            badges.push({ id: 'b2', name: 'Loyal Customer', icon: '🏆' });
        }

        // Check if spin wheel is available (e.g., 1 spin per 3 orders)
        let availableSpins = Math.floor(orderCount / 3);
        const usedSpinsResult = await query("SELECT COUNT(*) as count FROM wallet_transactions WHERE user_id = $1 AND purpose = 'spin_wheel_reward'", [userId]);
        const usedSpins = parseInt(usedSpinsResult.rows?.[0]?.count || 0, 10);
        
        availableSpins = Math.max(0, availableSpins - usedSpins);

        res.json({
            success: true,
            profile: {
                level,
                points,
                title,
                badges,
                availableSpins,
                ordersUntilNextSpin: 3 - (orderCount % 3)
            }
        });
    } catch (error) {
        console.error('Error fetching gamification profile:', error);
        res.status(500).json({ error: 'Failed to fetch gamification profile' });
    }
};

exports.spinWheel = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // This is a simplified version. In production, we must lock rows or use Redis to prevent double spinning.
        
        // Determine reward
        const rewards = [
            { id: 'r1', type: 'points', value: 10, probability: 0.5, label: '10 Points' },
            { id: 'r2', type: 'points', value: 50, probability: 0.3, label: '50 Points' },
            { id: 'r3', type: 'wallet', value: 20, probability: 0.15, label: '₹20 Cashback' },
            { id: 'r4', type: 'wallet', value: 100, probability: 0.05, label: '₹100 Jackpot!' }
        ];

        // Random pick based on probability
        let rand = Math.random();
        let selectedReward = rewards[0];
        let cumulative = 0;
        for (const reward of rewards) {
            cumulative += reward.probability;
            if (rand <= cumulative) {
                selectedReward = reward;
                break;
            }
        }

        // Apply reward
        if (selectedReward.type === 'wallet') {
            await query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2', [selectedReward.value, userId]);
            await query(`INSERT INTO wallet_transactions (wallet_id, amount, type, purpose, status) 
                         VALUES ((SELECT id FROM wallets WHERE user_id = $1), $2, 'credit', 'spin_wheel_reward', 'completed')`, 
                         [userId, selectedReward.value]);
        }
        
        // If points, we would update a loyalty_points column in users.
        
        res.json({
            success: true,
            reward: selectedReward
        });

    } catch (error) {
        console.error('Error spinning wheel:', error);
        res.status(500).json({ error: 'Failed to spin wheel' });
    }
};
