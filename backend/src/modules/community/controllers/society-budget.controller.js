const { query, queryMany, queryOne } = require('../../../config/database.sqlite');
const { v4: uuidv4 } = require('uuid');

const createBudget = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id);
        const { year, category, allocatedAmount } = req.body;
        
        const id = uuidv4();
        await query(
            'INSERT INTO society_budgets (id, society_id, financial_year, category, allocated_amount, spent_amount) VALUES (?, ?, ?, ?, ?, 0)',
            [id, societyId, year, category, allocatedAmount]
        );
        res.status(201).json({ success: true, data: { id } });
    } catch (error) { next(error); }
};

const getBudgets = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id);
        const { year } = req.query;
        let sql = 'SELECT * FROM society_budgets WHERE society_id = ?';
        const params = [societyId];
        if (year) {
            sql += ' AND financial_year = ?';
            params.push(year);
        }
        const budgets = await queryMany(sql, params);
        res.json({ success: true, data: budgets });
    } catch (error) { next(error); }
};

const recordExpense = async (req, res, next) => {
    try {
        const { budgetId, amount, description } = req.body;
        await query('UPDATE society_budgets SET spent_amount = spent_amount + ? WHERE id = ?', [amount, budgetId]);
        res.json({ success: true, message: 'Expense recorded' });
    } catch (error) { next(error); }
};

async function getSocietyIdForUser(userId) {
    const member = await queryOne('SELECT society_id FROM society_members WHERE user_id = ? AND is_active = 1', [userId]);
    return member ? member.society_id : null;
}

module.exports = {
    createBudget,
    getBudgets,
    recordExpense
};
