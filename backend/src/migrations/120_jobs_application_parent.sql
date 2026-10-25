-- ─────────────────────────────────────────────────────────────────────────────
-- 120: job applications and referrals can be stored; a posting does not need a
--      salary or an address
--
-- The jobs feature has three posting tables, from three stages of its life:
--
--   job_vacancies        a shop's "we're hiring" notice (the first version)
--   job_postings         created by a later schema file; no code writes to it
--   local_job_postings   the recruitment module the web and mobile apps use —
--                        postings, applications, resumes, interviews
--
-- and the tables around them were still tied to the wrong ones.
--
-- 1. job_applications.job_id was `UUID REFERENCES job_vacancies(id)`.
--    POST /jobs/apply writes the id of a local_job_postings row there, the
--    constraint looked for it in job_vacancies, and every application was
--    rejected. Applications are written for both kinds of posting, so there is
--    no single parent table: the constraint is dropped and the column becomes
--    TEXT, the type of the ids actually stored in it. The link to the posting
--    is still enforced where an application is created — the route loads the
--    posting first and answers 404 without one.
--
-- 2. job_referrals.job_id was to reference job_postings (116 added that
--    constraint for parity with SQLite; the line has been removed from 116,
--    and this drops it wherever it was applied). Referral links are for
--    postings in local_job_postings.
--
-- 3. local_job_postings.salary_range and .address were NOT NULL. The posting
--    form asks for a title and a category; POST /jobs/postings writes NULL for
--    the rest when they are left blank, which this refused.
--
-- NOT EXECUTED: no PostgreSQL instance was available in this environment.
-- Review before applying to production.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_job_id_fkey;
ALTER TABLE job_applications ALTER COLUMN job_id TYPE TEXT USING job_id::text;

ALTER TABLE job_referrals DROP CONSTRAINT IF EXISTS job_referrals_job_id_fkey;

ALTER TABLE local_job_postings ALTER COLUMN salary_range DROP NOT NULL;
ALTER TABLE local_job_postings ALTER COLUMN address DROP NOT NULL;
