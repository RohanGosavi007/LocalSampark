-- Migration: 022_gtm_feature_flags.sqlite.sql

CREATE TABLE IF NOT EXISTS feature_flags (
    feature_key TEXT PRIMARY KEY,
    phase INTEGER NOT NULL,
    is_enabled INTEGER DEFAULT 0,
    allowed_pincodes_json TEXT DEFAULT '[]',
    title TEXT NOT NULL,
    description TEXT,
    coming_soon_headline TEXT,
    coming_soon_message TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial 10x GTM Rollout Matrix
-- Phase 1 (The Wedge): Neighborhood Shops & Society Management (Active by default)
INSERT OR IGNORE INTO feature_flags (feature_key, phase, is_enabled, title, description, coming_soon_headline, coming_soon_message) VALUES
('neighborhood_shops', 1, 1, 'Neighborhood Shops', 'Hyperlocal local store ordering & delivery', 'Shops Coming Soon', 'We are onboarding your local neighborhood stores.'),
('society_management', 1, 1, 'Society Management', 'Gatekeeper, notices, maintenance & community management', 'Society Portal Coming Soon', 'Society management features are being enabled for your complex.');

-- Phase 2 (The Expansion): Home Services & Medical (Locked by default)
INSERT OR IGNORE INTO feature_flags (feature_key, phase, is_enabled, title, description, coming_soon_headline, coming_soon_message) VALUES
('home_services', 2, 0, 'Home Services', 'Plumbers, electricians, cleaners & technicians', 'Home Services Launching Soon!', 'We are handpicking verified local plumbers, electricians, and technicians in your area.'),
('medical', 2, 0, 'Medical & Health', 'Doctor appointments, local pharmacies & diagnostics', 'Medical Care Coming Soon!', 'Local pharmacies and clinic booking will be available in your pincode soon.');

-- Phase 3 (The Super-App): Jobs, Properties, Events, Multilingual (Locked by default)
INSERT OR IGNORE INTO feature_flags (feature_key, phase, is_enabled, title, description, coming_soon_headline, coming_soon_message) VALUES
('jobs', 3, 0, 'Local Jobs', 'Hyperlocal job postings and candidate matching', 'Local Job Portal Arriving Soon!', 'Find jobs within 5km of your location soon.'),
('properties', 3, 0, 'Properties', 'Buy, sell, and rent local real estate without brokers', 'Local Real Estate Coming Soon!', 'Direct buyer-to-owner property listings are preparing to launch.'),
('events', 3, 0, 'Community Events', 'Local gatherings, workshops, and society events', 'Local Events Coming Soon!', 'Discover workshops and events happening in your neighborhood soon.'),
('multilingual', 3, 0, 'Regional Languages', 'Support for regional local languages', 'Regional Languages Coming Soon!', 'Native language support will be enabled in an upcoming release.');
