const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobs.controller');
const { authenticate } = require('../middleware/auth.middleware');

// List all active jobs (public or authenticated, let's make it authenticated to keep ecosystem closed)
router.get('/', authenticate, jobsController.getJobs);

// Post a new job (costs SamparkCoins)
router.post('/', authenticate, jobsController.postJob);

// Apply to a job (Resume URL + Text Note)
router.post('/:jobId/apply', authenticate, jobsController.applyJob);

module.exports = router;
