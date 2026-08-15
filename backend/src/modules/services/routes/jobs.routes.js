const express = require('express');
const router = express.Router();
const { query, queryOne, queryMany } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════
// NLP SKILL MATCHER
// ═══════════════════════════════════════════════════════════════

// Advanced skill matching with synonym awareness, fuzzy matching, and weighted scoring
const SKILL_SYNONYMS = {
  'javascript': ['js', 'es6', 'es2015', 'ecmascript', 'vanilla js'],
  'typescript': ['ts'],
  'react': ['reactjs', 'react.js', 'react js'],
  'node': ['nodejs', 'node.js', 'node js'],
  'python': ['py', 'python3'],
  'java': ['jdk', 'j2ee', 'jee'],
  'sql': ['mysql', 'postgresql', 'postgres', 'sqlite', 'mssql', 'oracle db'],
  'mongodb': ['mongo', 'nosql'],
  'aws': ['amazon web services', 'ec2', 's3', 'lambda'],
  'docker': ['containers', 'containerization'],
  'kubernetes': ['k8s'],
  'machine learning': ['ml', 'deep learning', 'dl', 'ai', 'artificial intelligence'],
  'data science': ['data analytics', 'data analysis', 'data engineering'],
  'html': ['html5'],
  'css': ['css3', 'sass', 'scss', 'less', 'tailwind', 'bootstrap'],
  'git': ['github', 'gitlab', 'version control'],
  'agile': ['scrum', 'kanban', 'sprint'],
  'devops': ['ci/cd', 'cicd', 'continuous integration', 'jenkins', 'gitlab ci'],
  'communication': ['verbal communication', 'written communication', 'presentation'],
  'leadership': ['team lead', 'team management', 'people management'],
  'excel': ['ms excel', 'microsoft excel', 'spreadsheet'],
  'photoshop': ['adobe photoshop', 'ps'],
  'figma': ['ui design', 'ux design', 'ui/ux'],
  'accounting': ['tally', 'bookkeeping', 'gst', 'taxation'],
  'driving': ['driving license', 'dl', 'vehicle driving'],
  'cooking': ['chef', 'culinary', 'food preparation'],
  'plumbing': ['plumber', 'pipe fitting'],
  'electrical': ['electrician', 'wiring'],
  'carpentry': ['carpenter', 'woodwork'],
  'delivery': ['logistics', 'courier', 'dispatch'],
  'sales': ['business development', 'bd', 'client acquisition'],
  'marketing': ['digital marketing', 'seo', 'sem', 'social media marketing'],
  'customer service': ['customer support', 'helpdesk', 'call center'],
};

function normalizeSkill(skill) {
  return skill.toLowerCase().trim().replace(/[^a-z0-9\s\/\.\+\#]/g, '');
}

function getSkillFamily(skill) {
  const normalized = normalizeSkill(skill);
  for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    if (normalized === canonical || synonyms.some(s => normalized === s || normalized.includes(s) || s.includes(normalized))) {
      return canonical;
    }
  }
  return normalized;
}

function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i-1] === a[j-1] ? matrix[i-1][j-1] : Math.min(matrix[i-1][j-1]+1, matrix[i][j-1]+1, matrix[i-1][j]+1);
    }
  }
  return matrix[b.length][a.length];
}

function computeMatchScore(candidateSkills, jobRequiredSkills) {
  if (!jobRequiredSkills || jobRequiredSkills.length === 0) return 75; // Default if no requirements
  if (!candidateSkills || candidateSkills.length === 0) return 10;

  const candidateFamilies = candidateSkills.map(s => getSkillFamily(typeof s === 'object' ? s.skill_name : s));
  const requiredFamilies = jobRequiredSkills.map(s => getSkillFamily(typeof s === 'object' ? s.skill_name : s));

  let matchedCount = 0;
  let partialScore = 0;

  for (const req of requiredFamilies) {
    // Exact family match
    if (candidateFamilies.includes(req)) {
      matchedCount++;
      continue;
    }
    // Fuzzy match (Levenshtein distance ≤ 2)
    let bestDist = Infinity;
    for (const cand of candidateFamilies) {
      const dist = levenshtein(req, cand);
      if (dist < bestDist) bestDist = dist;
    }
    if (bestDist <= 2) {
      partialScore += 0.6;
    } else {
      // Substring match
      for (const cand of candidateFamilies) {
        if (cand.includes(req) || req.includes(cand)) {
          partialScore += 0.4;
          break;
        }
      }
    }
  }

  const totalMatched = matchedCount + partialScore;
  const rawScore = (totalMatched / requiredFamilies.length) * 100;

  // Bonus for extra relevant skills (up to 10%)
  const extraSkills = candidateFamilies.length - matchedCount;
  const bonus = Math.min(extraSkills * 2, 10);

  return Math.min(100, Math.round(rawScore + bonus));
}

// ═══════════════════════════════════════════════════════════════
// JOB POSTINGS
// ═══════════════════════════════════════════════════════════════

// GET /postings — Browse jobs with advanced filters
router.get('/postings', async (req, res, next) => {
  try {
    const { category, job_type, sector, search, min_salary, max_salary, experience_min, experience_max,
            remote, lat, lng, radius = 10, sort = 'newest', page = 1, limit = 20 } = req.query;

    let sql = `SELECT j.*, c.name as company_name, c.logo_url as company_logo, c.average_rating as company_rating
      FROM local_job_postings j LEFT JOIN company_profiles c ON j.company_id = c.id WHERE j.status = 'active'`;
    const params = [];

    if (category) { params.push(category); sql += ` AND j.category = $${params.length}`; }
    if (job_type) { params.push(job_type); sql += ` AND j.job_type = $${params.length}`; }
    if (sector) { params.push(sector); sql += ` AND j.sector = $${params.length}`; }
    if (remote === 'true') { sql += ` AND j.remote_allowed = 1`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (j.title LIKE $${params.length} OR j.description LIKE $${params.length} OR j.requirements LIKE $${params.length})`; }

    const sortMap = { newest: 'j.created_at DESC', salary: 'j.salary_range DESC', popular: 'j.applications_count DESC', urgent: `j.urgency = 'urgent' DESC, j.created_at DESC` };
    sql += ` ORDER BY ${sortMap[sort] || 'j.created_at DESC'}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    let jobs = await queryMany(sql, params);

    // Parse skills JSON
    jobs = jobs.map(j => ({
      ...j,
      skills_required: (() => { try { return JSON.parse(j.skills_required || '[]'); } catch { return []; } })()
    }));

    res.json({ success: true, jobs, page: parseInt(page), total: jobs.length });
  } catch (err) { next(err); }
});

// GET /postings/:id — Job detail with company and similar jobs
router.get('/postings/:id', async (req, res, next) => {
  try {
    const job = await queryOne(`SELECT j.*, c.name as company_name, c.logo_url as company_logo, c.description as company_desc,
      c.employee_count, c.average_rating as company_rating, c.industry as company_industry, c.website as company_website
      FROM local_job_postings j LEFT JOIN company_profiles c ON j.company_id = c.id WHERE j.id = $1`, [req.params.id]);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    job.skills_required = (() => { try { return JSON.parse(job.skills_required || '[]'); } catch { return []; } })();

    // Get required skills from table
    const reqSkills = await queryMany('SELECT * FROM job_required_skills WHERE job_id = $1', [req.params.id]);
    job.required_skills_detail = reqSkills;

    // Get similar jobs
    const similar = await queryMany(`SELECT id, title, salary_range, job_type, company_id FROM local_job_postings
      WHERE status = 'active' AND id != $1 AND category = $2 LIMIT 5`, [req.params.id, job.category]);

    res.json({ success: true, job, similar_jobs: similar });
  } catch (err) { next(err); }
});

// POST /postings — Create job posting
router.post('/postings', authenticate, async (req, res, next) => {
  try {
    const { title, category, salary_range, job_type = 'full_time', address, latitude, longitude, requirements,
            description, description_html, company_id, experience_min = 0, experience_max, skills_required = [],
            sector = 'private', remote_allowed = false, urgency = 'normal', benefits, work_hours,
            contact_email, contact_phone } = req.body;
    if (!title || !category) return res.status(400).json({ error: 'Title and category are required' });

    const jobId = crypto.randomUUID();
    await query(`INSERT INTO local_job_postings (id, employer_id, title, category, salary_range, job_type, address,
      latitude, longitude, requirements, description, description_html, company_id, experience_min, experience_max,
      skills_required, sector, remote_allowed, urgency, benefits, work_hours, contact_email, contact_phone, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,'active')`,
      [jobId, req.user.id, title, category, salary_range||null, job_type, address||null, latitude||null, longitude||null,
       requirements||null, description||null, description_html||null, company_id||null, experience_min, experience_max||null,
       JSON.stringify(skills_required), sector, remote_allowed?1:0, urgency, benefits||null, work_hours||null,
       contact_email||null, contact_phone||null]);

    // Insert required skills
    for (const skill of skills_required) {
      const skillName = typeof skill === 'object' ? skill.name : skill;
      const importance = typeof skill === 'object' ? skill.importance : 'required';
      await query(`INSERT INTO job_required_skills (id, job_id, skill_name, importance) VALUES ($1,$2,$3,$4)
        ON CONFLICT (job_id, skill_name) DO NOTHING`, [crypto.randomUUID(), jobId, skillName, importance]);
    }

    res.status(201).json({ success: true, jobId, message: 'Job posting created' });
  } catch (err) { next(err); }
});

// PUT /postings/:id — Edit job
router.put('/postings/:id', authenticate, async (req, res, next) => {
  try {
    const job = await queryOne('SELECT * FROM local_job_postings WHERE id = $1', [req.params.id]);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (String(job.employer_id) !== String(req.user.id) && !req.user.is_admin) return res.status(403).json({ error: 'Not your posting' });

    const allowed = ['title','category','salary_range','job_type','address','requirements','description','status','urgency','sector','remote_allowed','benefits','work_hours'];
    const sets = [], params = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { params.push(req.body[key]); sets.push(`${key} = $${params.length}`); }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    params.push(req.params.id);
    await query(`UPDATE local_job_postings SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    res.json({ success: true, message: 'Job updated' });
  } catch (err) { next(err); }
});

// DELETE /postings/:id — Close posting
router.delete('/postings/:id', authenticate, async (req, res, next) => {
  try {
    const job = await queryOne('SELECT * FROM local_job_postings WHERE id = $1', [req.params.id]);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (String(job.employer_id) !== String(req.user.id) && !req.user.is_admin) return res.status(403).json({ error: 'Not your posting' });
    await query(`UPDATE local_job_postings SET status = 'closed' WHERE id = $1`, [req.params.id]);
    res.json({ success: true, message: 'Job posting closed' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// APPLICATIONS
// ═══════════════════════════════════════════════════════════════

// POST /apply — Submit application with auto match score
router.post('/apply', authenticate, async (req, res, next) => {
  try {
    const { jobId, applicantName, applicantPhone, experienceSummary, cover_note, resume_id, voice_intro_url } = req.body;
    const name = applicantName || req.user.full_name;
    const phone = applicantPhone || req.user.phone_number || req.user.phone;

    if (!jobId) return res.status(400).json({ error: 'jobId is required' });

    const job = await queryOne('SELECT * FROM local_job_postings WHERE id = $1', [jobId]);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Compute match score
    const candidateSkills = await queryMany('SELECT skill_name FROM job_skills WHERE user_id = $1', [req.user.id]);
    const jobSkills = (() => { try { return JSON.parse(job.skills_required || '[]'); } catch { return []; } })();
    const matchScore = computeMatchScore(candidateSkills, jobSkills);

    const appId = crypto.randomUUID();
    await query(`INSERT INTO job_applications (id, job_id, applicant_id, applicant_name, applicant_phone,
      experience_summary, status, resume_id, match_score, stage, voice_intro_url)
      VALUES ($1,$2,$3,$4,$5,$6,'applied',$7,$8,'applied',$9)`,
      [appId, jobId, req.user.id, name, phone, experienceSummary||cover_note||null,
       resume_id||null, matchScore, voice_intro_url||null]);

    // Increment applications count
    await query('UPDATE local_job_postings SET applications_count = COALESCE(applications_count, 0) + 1 WHERE id = $1', [jobId]);

    res.status(201).json({ success: true, applicationId: appId, matchScore, message: 'Application submitted' });
  } catch (err) { next(err); }
});

// GET /applications — My applications with tracking
router.get('/applications', authenticate, async (req, res, next) => {
  try {
    const apps = await queryMany(`SELECT a.*, j.title as job_title, j.salary_range, j.job_type, j.company_id,
      c.name as company_name, c.logo_url as company_logo
      FROM job_applications a
      INNER JOIN local_job_postings j ON a.job_id = j.id
      LEFT JOIN company_profiles c ON j.company_id = c.id
      WHERE a.applicant_id = $1 ORDER BY a.applied_at DESC`, [req.user.id]);
    res.json({ success: true, applications: apps });
  } catch (err) { next(err); }
});

// PUT /applications/:id/stage — Update application stage (recruiter)
router.put('/applications/:id/stage', authenticate, async (req, res, next) => {
  try {
    const { stage, recruiter_notes, interview_date } = req.body;
    const validStages = ['applied', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected'];
    if (!stage || !validStages.includes(stage)) return res.status(400).json({ error: 'Invalid stage' });

    const app = await queryOne('SELECT a.*, j.employer_id FROM job_applications a INNER JOIN local_job_postings j ON a.job_id = j.id WHERE a.id = $1', [req.params.id]);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (String(app.employer_id) !== String(req.user.id) && !req.user.is_admin) return res.status(403).json({ error: 'Not authorized' });

    const sets = [`stage = $1`];
    const params = [stage];
    if (recruiter_notes) { params.push(recruiter_notes); sets.push(`recruiter_notes = $${params.length}`); }
    if (interview_date) { params.push(interview_date); sets.push(`interview_date = $${params.length}`); }
    params.push(req.params.id);
    await query(`UPDATE job_applications SET ${sets.join(', ')} WHERE id = $${params.length}`, params);

    res.json({ success: true, message: `Application moved to ${stage}` });
  } catch (err) { next(err); }
});

// GET /applications/:id/match-score — Detailed match breakdown
router.get('/applications/:id/match-score', authenticate, async (req, res, next) => {
  try {
    const app = await queryOne('SELECT * FROM job_applications WHERE id = $1', [req.params.id]);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const job = await queryOne('SELECT * FROM local_job_postings WHERE id = $1', [app.job_id]);
    const candidateSkills = await queryMany('SELECT * FROM job_skills WHERE user_id = $1', [app.applicant_id]);
    const jobSkills = (() => { try { return JSON.parse(job.skills_required || '[]'); } catch { return []; } })();

    const candidateFamilies = candidateSkills.map(s => ({ original: s.skill_name, family: getSkillFamily(s.skill_name), proficiency: s.proficiency }));
    const requiredFamilies = jobSkills.map(s => ({ original: typeof s === 'object' ? s.name || s : s, family: getSkillFamily(typeof s === 'object' ? s.name || s : s) }));

    const breakdown = requiredFamilies.map(req => {
      const match = candidateFamilies.find(c => c.family === req.family);
      return { skill: req.original, matched: !!match, matched_with: match?.original || null, proficiency: match?.proficiency || null };
    });

    res.json({ success: true, score: app.match_score, breakdown, candidate_skills: candidateSkills.length, required_skills: jobSkills.length });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// RESUMES
// ═══════════════════════════════════════════════════════════════

router.post('/resumes', authenticate, async (req, res, next) => {
  try {
    const { file_url, file_name, headline, summary, experience_years, education, voice_intro_url, skills = [] } = req.body;
    const id = crypto.randomUUID();

    // Calculate health score
    let healthScore = 0;
    if (headline) healthScore += 15;
    if (summary) healthScore += 20;
    if (experience_years) healthScore += 15;
    if (education) healthScore += 15;
    if (file_url) healthScore += 20;
    if (skills.length > 0) healthScore += Math.min(15, skills.length * 3);

    await query(`INSERT INTO job_resumes (id, user_id, file_url, file_name, headline, summary, experience_years, education, voice_intro_url, parsed_skills, health_score)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT DO NOTHING`,
      [id, req.user.id, file_url||null, file_name||null, headline||null, summary||null, experience_years||0,
       education||null, voice_intro_url||null, JSON.stringify(skills), healthScore]);

    // Insert skills
    for (const skill of skills) {
      const skillName = typeof skill === 'object' ? skill.name : skill;
      const prof = typeof skill === 'object' ? skill.proficiency : 'intermediate';
      await query(`INSERT INTO job_skills (id, user_id, skill_name, proficiency) VALUES ($1,$2,$3,$4)
        ON CONFLICT (user_id, skill_name) DO UPDATE SET proficiency = EXCLUDED.proficiency`,
        [crypto.randomUUID(), req.user.id, skillName, prof]);
    }

    res.status(201).json({ success: true, resumeId: id, healthScore, message: 'Resume saved' });
  } catch (err) { next(err); }
});

router.get('/resumes/me', authenticate, async (req, res, next) => {
  try {
    const resume = await queryOne('SELECT * FROM job_resumes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
    const skills = await queryMany('SELECT * FROM job_skills WHERE user_id = $1 ORDER BY skill_name', [req.user.id]);

    if (resume) {
      resume.parsed_skills = (() => { try { return JSON.parse(resume.parsed_skills || '[]'); } catch { return []; } })();
    }

    res.json({ success: true, resume, skills });
  } catch (err) { next(err); }
});

router.put('/resumes/:id', authenticate, async (req, res, next) => {
  try {
    const resume = await queryOne('SELECT * FROM job_resumes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const { headline, summary, experience_years, education, voice_intro_url } = req.body;
    const sets = [], params = [];
    if (headline !== undefined) { params.push(headline); sets.push(`headline = $${params.length}`); }
    if (summary !== undefined) { params.push(summary); sets.push(`summary = $${params.length}`); }
    if (experience_years !== undefined) { params.push(experience_years); sets.push(`experience_years = $${params.length}`); }
    if (education !== undefined) { params.push(education); sets.push(`education = $${params.length}`); }
    if (voice_intro_url) { params.push(voice_intro_url); sets.push(`voice_intro_url = $${params.length}`); }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    params.push(req.params.id);
    await query(`UPDATE job_resumes SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length}`, params);
    res.json({ success: true, message: 'Resume updated' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// SAVED JOBS
// ═══════════════════════════════════════════════════════════════

router.post('/postings/:id/save', authenticate, async (req, res, next) => {
  try {
    const existing = await queryOne('SELECT * FROM job_saved WHERE user_id = $1 AND job_id = $2', [req.user.id, req.params.id]);
    if (existing) {
      await query('DELETE FROM job_saved WHERE id = $1', [existing.id]);
      return res.json({ success: true, saved: false, message: 'Removed from saved' });
    }
    await query('INSERT INTO job_saved (id, user_id, job_id) VALUES ($1,$2,$3)', [crypto.randomUUID(), req.user.id, req.params.id]);
    res.json({ success: true, saved: true, message: 'Job saved' });
  } catch (err) { next(err); }
});

router.get('/saved', authenticate, async (req, res, next) => {
  try {
    const saved = await queryMany(`SELECT j.*, c.name as company_name, c.logo_url as company_logo, js.created_at as saved_at
      FROM job_saved js INNER JOIN local_job_postings j ON js.job_id = j.id
      LEFT JOIN company_profiles c ON j.company_id = c.id
      WHERE js.user_id = $1 ORDER BY js.created_at DESC`, [req.user.id]);
    res.json({ success: true, saved });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// COMPANIES
// ═══════════════════════════════════════════════════════════════

router.get('/companies', async (req, res, next) => {
  try {
    const companies = await queryMany('SELECT * FROM company_profiles ORDER BY average_rating DESC');
    res.json({ success: true, companies });
  } catch (err) { next(err); }
});

router.get('/companies/:id', async (req, res, next) => {
  try {
    const company = await queryOne('SELECT * FROM company_profiles WHERE id = $1', [req.params.id]);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const reviews = await queryMany(`SELECT * FROM company_reviews WHERE company_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 20`, [req.params.id]);
    const jobs = await queryMany(`SELECT * FROM local_job_postings WHERE company_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 10`, [req.params.id]);

    res.json({ success: true, company, reviews, active_jobs: jobs });
  } catch (err) { next(err); }
});

router.post('/companies/:id/review', authenticate, async (req, res, next) => {
  try {
    const { overall_rating, work_life_rating, salary_rating, culture_rating, management_rating,
            title, pros, cons, advice, is_current_employee, job_title } = req.body;
    if (!overall_rating || overall_rating < 1 || overall_rating > 5) return res.status(400).json({ error: 'overall_rating (1-5) required' });

    const reviewId = crypto.randomUUID();
    await query(`INSERT INTO company_reviews (id, company_id, reviewer_id, overall_rating, work_life_rating, salary_rating,
      culture_rating, management_rating, title, pros, cons, advice, is_current_employee, job_title, is_anonymous, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,1,'active')`,
      [reviewId, req.params.id, req.user.id, overall_rating, work_life_rating||null, salary_rating||null,
       culture_rating||null, management_rating||null, title||null, pros||null, cons||null, advice||null,
       is_current_employee?1:0, job_title||null]);

    // Update average rating
    const avg = await queryOne(`SELECT AVG(overall_rating) as avg_r, COUNT(*) as cnt FROM company_reviews WHERE company_id = $1 AND status = 'active'`, [req.params.id]);
    await query('UPDATE company_profiles SET average_rating = $1, review_count = $2 WHERE id = $3',
      [parseFloat(avg.avg_r).toFixed(1), avg.cnt, req.params.id]);

    res.status(201).json({ success: true, reviewId, message: 'Review submitted anonymously' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// SALARY INSIGHTS
// ═══════════════════════════════════════════════════════════════

router.get('/salary-insights', async (req, res, next) => {
  try {
    const { job_title, company_id } = req.query;
    let sql = `SELECT job_title, company_name, AVG(salary_avg) as avg_salary, MIN(salary_min) as min_salary,
      MAX(salary_max) as max_salary, COUNT(*) as data_points, AVG(experience_years) as avg_experience
      FROM job_salary_insights WHERE 1=1`;
    const params = [];
    if (job_title) { params.push(`%${job_title}%`); sql += ` AND job_title LIKE $${params.length}`; }
    if (company_id) { params.push(company_id); sql += ` AND company_id = $${params.length}`; }
    sql += ` GROUP BY job_title ORDER BY avg_salary DESC LIMIT 50`;

    const insights = await queryMany(sql, params);
    res.json({ success: true, insights });
  } catch (err) { next(err); }
});

router.post('/salary-insights', authenticate, async (req, res, next) => {
  try {
    const { job_title, company_name, company_id, salary_min, salary_max, experience_years, location } = req.body;
    if (!job_title) return res.status(400).json({ error: 'job_title required' });

    const avg = salary_min && salary_max ? (salary_min + salary_max) / 2 : salary_min || salary_max || 0;
    const id = crypto.randomUUID();
    await query(`INSERT INTO job_salary_insights (id, job_title, company_id, company_name, salary_min, salary_max, salary_avg, experience_years, location, submitted_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, job_title, company_id||null, company_name||null, salary_min||null, salary_max||null, avg, experience_years||null, location||null, req.user.id]);

    res.status(201).json({ success: true, message: 'Salary data submitted anonymously' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════
// RECOMMENDATIONS (AI-powered skill matching)
// ═══════════════════════════════════════════════════════════════

router.get('/recommendations', authenticate, async (req, res, next) => {
  try {
    const candidateSkills = await queryMany('SELECT skill_name FROM job_skills WHERE user_id = $1', [req.user.id]);
    if (candidateSkills.length === 0) return res.json({ success: true, recommendations: [], message: 'Add skills to your profile to get recommendations' });

    const jobs = await queryMany(`SELECT j.*, c.name as company_name, c.logo_url as company_logo
      FROM local_job_postings j LEFT JOIN company_profiles c ON j.company_id = c.id
      WHERE j.status = 'active' ORDER BY j.created_at DESC LIMIT 100`);

    const scored = jobs.map(job => {
      const jobSkills = (() => { try { return JSON.parse(job.skills_required || '[]'); } catch { return []; } })();
      const score = computeMatchScore(candidateSkills, jobSkills);
      return { ...job, match_score: score, skills_required: jobSkills };
    }).sort((a, b) => b.match_score - a.match_score);

    res.json({ success: true, recommendations: scored.slice(0, 20) });
  } catch (err) { next(err); }
});

module.exports = router;
