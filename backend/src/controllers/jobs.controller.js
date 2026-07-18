const { query, queryOne } = require('../config/database');
const crypto = require('crypto');

/**
 * Post a new job (costs SamparkCoins)
 */
const postJob = async (req, res, next) => {
  try {
    const { title, description, jobType, salaryRange, location } = req.body;
    const userId = req.user.id;

    // MVP: Job posting is currently free.
    // Ensure we are linking it to a shop. For now, assume shop_id is null or a default.
    // In a full implementation, we'd look up the shop_id for the user.
    let shopId = null;
    const shop = await queryOne('SELECT id FROM local_shops WHERE owner_id = $1 LIMIT 1', [userId]);
    if (shop) shopId = shop.id;

    const jobId = crypto.randomUUID();
    const newJob = await query(
      `INSERT INTO job_vacancies (id, shop_id, title, description, job_type, salary_range, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING *`,
      [jobId, shopId, title, description, jobType, salaryRange]
    );

    res.status(201).json({
      success: true,
      message: `Job posted successfully!`,
      data: newJob.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active job listings
 */
const getJobs = async (req, res, next) => {
  try {
    const { location } = req.query;

    let jobs;
    // We join with local_shops because jobs belong to shops
    if (location && location !== 'Choose Location' && location !== '') {
      jobs = await query(`
        SELECT j.*, ls.name as employer_name, ls.address as location
        FROM job_vacancies j 
        LEFT JOIN local_shops ls ON j.shop_id = ls.id 
        WHERE j.is_active = 1 
          AND (LOWER(ls.address) LIKE LOWER($1) OR LOWER(ls.category) LIKE LOWER($1))
        ORDER BY j.created_at DESC
      `, [`%${location}%`]);
    } else {
      jobs = await query(`
        SELECT j.*, ls.name as employer_name, ls.address as location
        FROM job_vacancies j 
        LEFT JOIN local_shops ls ON j.shop_id = ls.id 
        WHERE j.is_active = 1 
        ORDER BY j.created_at DESC
      `);
    }
    
    res.json({
      success: true,
      data: jobs.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Apply to a job (Resume URL + Text Note)
 */
const applyJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { applicationNote, resumeUrl } = req.body;
    const applicantId = req.user.id;

    if (!applicationNote && !resumeUrl) {
      return res.status(400).json({ error: 'You must provide either an application note or a PDF resume.' });
    }

    // Verify job exists
    const job = await queryOne('SELECT id FROM job_vacancies WHERE id = $1', [jobId]);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Check if already applied
    const existing = await queryOne(
      'SELECT id FROM job_applications WHERE job_id = $1 AND applicant_id = $2',
      [jobId, applicantId]
    );
    if (existing) {
      return res.status(400).json({ error: 'You have already applied for this job.' });
    }

    const appId = crypto.randomUUID();
    const application = await query(
      `INSERT INTO job_applications (id, job_id, applicant_id, cover_note, status) 
       VALUES ($1, $2, $3, $4, 'applied') RETURNING *`,
      [appId, jobId, applicantId, applicationNote || resumeUrl]
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      data: application.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  postJob,
  getJobs,
  applyJob
};
