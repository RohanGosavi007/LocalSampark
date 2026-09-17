const { query, queryMany, queryOne } = require('../../../config/database');
const { v4: uuidv4 } = require('uuid');

const createBudget = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id, req);
        const { year, category, allocatedAmount } = req.body;
        
        const id = uuidv4();
        await query('INSERT INTO society_budgets (id, society_id, financial_year, category, allocated_amount, spent_amount) VALUES ($1, $2, $3, $4, $5, 0)',
            [id, societyId, year, category, allocatedAmount]
        );
        res.status(201).json({ success: true, data: { id } });
    } catch (error) { next(error); }
};

const getBudgets = async (req, res, next) => {
    try {
        const societyId = await getSocietyIdForUser(req.user.id, req);
        const { year } = req.query;
        let sql = 'SELECT * FROM society_budgets WHERE society_id = $1';
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
        await query('UPDATE society_budgets SET spent_amount = spent_amount + $1 WHERE id = $2', [amount, budgetId]);
        res.json({ success: true, message: 'Expense recorded' });
    } catch (error) { next(error); }
};

/**
 * The society for this request comes from req.societyId, set by
 * requireCapability after it has verified the caller holds the capability *in
 * that society*.
 *
 * Each of these controllers used to carry its own copy of this helper, which
 * returned the caller's first active membership with no ordering. The guard in
 * front validated a different id — the one the request named — so the society
 * that was authorised and the society that was written to were resolved
 * independently. For a committee member who also lives elsewhere that is a
 * privilege escalation.
 */
async function getSocietyIdForUser(userId, req) {
  if (req && req.societyId) return req.societyId;
  // No resolved society means the guard did not run. Refusing is the only safe
  // answer; guessing a membership is the behaviour being removed.
  return null;
}

module.exports = {
    createBudget,
    getBudgets,
    recordExpense
};
