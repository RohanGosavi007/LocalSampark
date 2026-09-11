const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

/**
 * Neighbourhood jobs board.
 *
 * apps/mobile/app/modules/jobs/index.js reads and writes /jobs-board, which
 * was never mounted. The richer recruitment module at /jobs (jobs.routes.js)
 * is a different product surface — postings with applications, resumes,
 * assessments and interviews — whereas this screen posts a title, a job type,
 * a salary range and a location.
 *
 * Both are backed by local_job_postings; this route only touches the subset of
 * columns the simple board uses.
 */

const BOARD_SELECT = `
    SELECT id,
           title,
           description,
           job_type,
           salary_range,
           COALESCE(address, '') AS location,
           status,
           created_at
      FROM local_job_postings`;

router.get('/', authenticate, async (req, res, next) => {
    try {
        const { pincode } = req.query;
        const params = ['active'];
        let sql = `${BOARD_SELECT} WHERE COALESCE(status, 'active') = $1`;
        if (pincode) {
            params.push(`%${pincode}%`);
            sql += ' AND address LIKE $2';
        }
        sql += ' ORDER BY created_at DESC LIMIT 100';

        const result = await query(sql, params);
        res.json({ success: true, data: result.rows || result || [] });
    } catch (err) {
        next(err);
    }
});

router.post('/', authenticate, async (req, res, next) => {
    try {
        const { title, description, jobType, salaryRange, location } = req.body;

        if (!title || !String(title).trim()) {
            return res.status(400).json({ success: false, error: 'title is required' });
        }
        if (!location || !String(location).trim()) {
            return res.status(400).json({ success: false, error: 'location is required' });
        }

        const id = crypto.randomUUID();
        await query(
            `INSERT INTO local_job_postings
                 (id, employer_id, title, description, job_type, salary_range, address, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
            [id, req.user.id, title, description || '',
             jobType || 'Full-time', salaryRange || '', location]
        );

        res.status(201).json({
            success: true,
            data: { id },
            message: 'Job posted to the board',
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
