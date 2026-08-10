const express = require('express');
const router = express.Router();
const { query, queryOne, queryMany } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

router.get('/skills', async (req, res, next) => {
  try {
    const { skillName, location } = req.query;
    
    let baseQuery = `
      SELECT us.*, u.full_name, u.avatar_url, u.phone_number 
      FROM user_skills us
      JOIN users u ON us.user_id = u.id
      WHERE us.availability_status = 'available'
    `;
    const params = [];
    
    if (skillName) {
      params.push(`%${skillName}%`);
      baseQuery += ` AND LOWER(us.skill_name) LIKE LOWER($${params.length})`;
    }
    
    if (location && location !== 'Choose Location' && location !== '') {
      params.push(`%${location}%`);
      baseQuery += ` AND LOWER(us.location) LIKE LOWER($${params.length})`;
    }
    
    const { region_id } = req.query;
    if (region_id) {
      params.push(region_id);
      baseQuery += ` AND u.region_id = $${params.length}`;
    }
    
    const skills = await queryMany(baseQuery, params);
    res.json(skills);
  } catch (error) {
    next(error);
  }
});

router.post('/skills/register', authenticate, async (req, res, next) => {
  try {
    const { skillName, experienceYears, dailyRate, portfolioPhotos, bio, location } = req.body;
    const skillId = crypto.randomUUID();
    const skill = await queryOne(
      `INSERT INTO user_skills (id, user_id, skill_name, experience_years, daily_rate, portfolio_photos, bio, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, skill_name)
       DO UPDATE SET experience_years = EXCLUDED.experience_years,
                     daily_rate = EXCLUDED.daily_rate,
                     portfolio_photos = EXCLUDED.portfolio_photos,
                     bio = EXCLUDED.bio,
                     location = EXCLUDED.location
       RETURNING *`,
      [skillId, req.user.id, skillName, experienceYears, dailyRate, JSON.stringify(portfolioPhotos || []), bio, location]
    );
    res.status(201).json(skill);
  } catch (error) {
    next(error);
  }
});

router.get('/vacancies', async (req, res, next) => {
  try {
    const { region_id } = req.query;
    let sql = `SELECT jv.*, ls.name as shop_name, ls.address as shop_address 
       FROM job_vacancies jv
       JOIN local_shops ls ON jv.shop_id = ls.id
       WHERE jv.is_active = 1`;
    const params = [];
    
    if (region_id) {
        sql += ` AND ls.region_id = $1`;
        params.push(region_id);
    }
    
    const jobs = await queryMany(sql, params);
    res.json(jobs);
  } catch (error) {
    next(error);
  }
});

router.post('/skills/book', authenticate, async (req, res, next) => {
  try {
    const { serviceCategory, description, address, preferredDate } = req.body;
    const bookingId = crypto.randomUUID();
    await query(
      `INSERT INTO skilled_bookings (id, customer_id, service_category, description, address, preferred_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [bookingId, req.user.id, serviceCategory, description, address, preferredDate]
    );
    res.status(201).json({ success: true, message: 'Booking request sent successfully. The freelancer will accept or reject your request shortly.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
