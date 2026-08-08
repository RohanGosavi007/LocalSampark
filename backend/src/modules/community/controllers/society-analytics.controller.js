const { queryOne, queryMany } = require('../../../config/database.sqlite');

const getDashboardOverview = async (req, res, next) => {
    try {
        const adminId = req.user.id;
        const member = await queryOne('SELECT society_id FROM society_members WHERE user_id = ? AND is_active = 1', [adminId]);
        if (!member) return res.status(403).json({ error: 'Access denied' });
        
        const societyId = member.society_id;

        // 1. Visitor Stats (Today)
        const visitorsTodayResult = await queryOne(`
            SELECT COUNT(*) as count 
            FROM society_visitors 
            WHERE society_id = ? AND date(expected_date) = date('now')
        `, [societyId]);
        const visitorsToday = visitorsTodayResult ? visitorsTodayResult.count : 0;

        // 2. Open Complaints
        const openComplaintsResult = await queryOne(`
            SELECT COUNT(*) as count 
            FROM society_complaints 
            WHERE society_id = ? AND status != 'resolved'
        `, [societyId]);
        const openComplaints = openComplaintsResult ? openComplaintsResult.count : 0;

        // 3. Active Amenities Bookings (Today)
        const bookingsResult = await queryOne(`
            SELECT COUNT(*) as count 
            FROM society_amenity_bookings 
            WHERE society_id = ? AND date(booking_date) = date('now') AND status = 'confirmed'
        `, [societyId]);
        const activeBookings = bookingsResult ? bookingsResult.count : 0;

        // 4. Budget Spent vs Allocated (Current Year)
        const currentYear = new Date().getFullYear().toString();
        const budgetResult = await queryOne(`
            SELECT SUM(allocated_amount) as total_allocated, SUM(spent_amount) as total_spent
            FROM society_budgets
            WHERE society_id = ? AND financial_year = ?
        `, [societyId, currentYear]);

        res.json({
            success: true,
            data: {
                visitorsToday,
                openComplaints,
                activeBookings,
                budget: {
                    allocated: budgetResult?.total_allocated || 0,
                    spent: budgetResult?.total_spent || 0
                }
            }
        });
    } catch (error) { next(error); }
};

module.exports = {
    getDashboardOverview
};
