-- Migration: Jobs Schema

CREATE TABLE IF NOT EXISTS local_job_postings (
    id TEXT PRIMARY KEY,
    employer_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    salary_range TEXT NOT NULL,
    job_type TEXT DEFAULT 'Full-Time',
    address TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    geohash TEXT,
    requirements TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    applicant_id TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_phone TEXT NOT NULL,
    experience_summary TEXT,
    status TEXT DEFAULT 'applied',
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_category ON local_job_postings(category);
CREATE INDEX IF NOT EXISTS idx_jobs_geohash ON local_job_postings(geohash);
