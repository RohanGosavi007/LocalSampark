const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');
const crypto = require('crypto');

// GET /postings - Search local job postings by pincode/category/geofence
router.get('/postings', async (req, res, next) => {
  try {
    const { category, lat, lng, radius = 10 } = req.query;
    let sql = 'SELECT * FROM local_job_postings WHERE status = $1';
    const params = ['active'];

    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const searchRadius = parseFloat(radius);

      const latDelta = searchRadius / 111.045;
      const lngDelta = searchRadius / (111.045 * Math.cos(userLat * (Math.PI / 180)));

      params.push(userLat - latDelta, userLat + latDelta, userLng - lngDelta, userLng + lngDelta);
      sql += ` AND latitude BETWEEN $${params.length - 3} AND $${params.length - 2} AND longitude BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    const jobs = await query(sql, params);
    res.json({ success: true, jobs: jobs.rows || jobs });
  } catch (err) {
    next(err);
  }
});

// POST /postings - Create new job posting
router.post('/postings', authenticate, async (req, res, next) => {
  try {
    const { title, category, salaryRange, jobType, address, latitude, longitude, requirements } = req.body;
    if (!title || !category || !salaryRange || !address) {
      return res.status(400).json({ error: 'Missing required job fields' });
    }

    const jobId = crypto.randomUUID();
    await query(`
      INSERT INTO local_job_postings (id, employer_id, title, category, salary_range, job_type, address, latitude, longitude, requirements, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
    `, [jobId, req.user.id, title, category, salaryRange, jobType || 'Full-Time', address, latitude || null, longitude || null, requirements || null]);

    res.status(201).json({ success: true, message: 'Job posting created successfully!', jobId });
  } catch (err) {
    next(err);
  }
});

// POST /apply - Submit candidate application
router.post('/apply', authenticate, async (req, res, next) => {
  try {
    const { jobId, applicantName, applicantPhone, experienceSummary } = req.body;
    if (!jobId || !applicantName || !applicantPhone) {
      return res.status(400).json({ error: 'Missing required application fields' });
    }

    const appId = crypto.randomUUID();
    await query(`
      INSERT INTO job_applications (id, job_id, applicant_id, applicant_name, applicant_phone, experience_summary, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'applied')
    `, [appId, jobId, req.user.id, applicantName, applicantPhone, experienceSummary || null]);

    res.status(201).json({ success: true, message: 'Job application submitted successfully!', applicationId: appId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
