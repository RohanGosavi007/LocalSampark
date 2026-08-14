-- 059: Collapse duplicate table declarations.
--
-- init.sql declared 23 tables more than once. Because every declaration uses
-- CREATE TABLE IF NOT EXISTS, only the first ever took effect and the later
-- copies were dead. Several of those dead copies carried columns the surviving
-- table lacks, so the schema silently disagreed with whichever copy a given
-- feature had been written against.
--
-- This migration lifts every such column onto the surviving table. The dead
-- declarations are removed from init.sql in the same change, leaving one
-- definition per table.
--
-- Added columns are nullable and carry no constraints: the tables already hold
-- rows, and a shadowed declaration's NOT NULL cannot be honoured retroactively.

BEGIN;

-- societies: columns carried only by the shadowed declaration(s)
ALTER TABLE societies ADD COLUMN IF NOT EXISTS subscription_fee REAL DEFAULT 0.0;
ALTER TABLE societies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- shop_reviews: columns carried only by the shadowed declaration(s)
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS reply TEXT;
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Published';
ALTER TABLE shop_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- job_applications: columns carried only by the shadowed declaration(s)
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS applicant_name TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS applicant_phone TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS experience_summary TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- delivery_agents: columns carried only by the shadowed declaration(s)
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS region_id TEXT;
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline', -- 'offline', 'available', 'busy';
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS current_lat REAL;
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS current_lng REAL;
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS rating REAL DEFAULT 5.0;

-- referrals: columns carried only by the shadowed declaration(s)
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referee_id TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_issued INTEGER DEFAULT 0;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- society_visitors: columns carried only by the shadowed declaration(s)
ALTER TABLE society_visitors ADD COLUMN IF NOT EXISTS guard_id TEXT;
ALTER TABLE society_visitors ADD COLUMN IF NOT EXISTS visitor_photo_url TEXT;
ALTER TABLE society_visitors ADD COLUMN IF NOT EXISTS id_card_photo_url TEXT;
ALTER TABLE society_visitors ADD COLUMN IF NOT EXISTS flat_number TEXT;
ALTER TABLE society_visitors ADD COLUMN IF NOT EXISTS approved_at TEXT;
ALTER TABLE society_visitors ADD COLUMN IF NOT EXISTS notes TEXT;

-- society_complaints: columns carried only by the shadowed declaration(s)
ALTER TABLE society_complaints ADD COLUMN IF NOT EXISTS filed_by TEXT;
ALTER TABLE society_complaints ADD COLUMN IF NOT EXISTS flat_number TEXT;
ALTER TABLE society_complaints ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE society_complaints ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE society_complaints ADD COLUMN IF NOT EXISTS updated_at TEXT DEFAULT CURRENT_TIMESTAMP;

-- event_tickets: columns carried only by the shadowed declaration(s)
ALTER TABLE event_tickets ADD COLUMN IF NOT EXISTS ticket_ref TEXT;
ALTER TABLE event_tickets ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE event_tickets ADD COLUMN IF NOT EXISTS total_amount REAL;

-- shop_staff: columns carried only by the shadowed declaration(s)
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS shift TEXT;
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS commission REAL DEFAULT 0.0;
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- society_members: columns carried only by the shadowed declaration(s)
ALTER TABLE society_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending', -- 'pending', 'active', 'inactive';

-- society_notices: columns carried only by the shadowed declaration(s)
ALTER TABLE society_notices ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE society_notices ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE society_notices ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;

-- society_polls: columns carried only by the shadowed declaration(s)
ALTER TABLE society_polls ADD COLUMN IF NOT EXISTS question TEXT;
ALTER TABLE society_polls ADD COLUMN IF NOT EXISTS expires_at TEXT;

-- society_emergency_alerts: columns carried only by the shadowed declaration(s)
ALTER TABLE society_emergency_alerts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- shop_categories: columns carried only by the shadowed declaration(s)
ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS name_mr TEXT;
ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS name_hi TEXT;
ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS archetype TEXT DEFAULT 'retail';
ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS parent_category_id TEXT;
ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS requires_fssai BOOLEAN DEFAULT FALSE;
ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS requires_gst BOOLEAN DEFAULT FALSE;
ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS requires_drug_license BOOLEAN DEFAULT FALSE;
ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS supports_delivery BOOLEAN DEFAULT TRUE;
ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS supports_pickup BOOLEAN DEFAULT TRUE;
ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS supports_appointment BOOLEAN DEFAULT FALSE;
ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS supports_subscription BOOLEAN DEFAULT FALSE;
ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS supports_table_booking BOOLEAN DEFAULT FALSE;
ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS default_commission_pct REAL DEFAULT 10.0;
ALTER TABLE shop_categories ADD COLUMN IF NOT EXISTS min_order_amount REAL DEFAULT 0;

-- feature_flags: columns carried only by the shadowed declaration(s)
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- home_service_categories: columns carried only by the shadowed declaration(s)
ALTER TABLE home_service_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- home_service_providers: columns carried only by the shadowed declaration(s)
ALTER TABLE home_service_providers ADD COLUMN IF NOT EXISTS geohash TEXT;

-- medical_doctors: columns carried only by the shadowed declaration(s)
ALTER TABLE medical_doctors ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE medical_doctors ADD COLUMN IF NOT EXISTS qualification TEXT;
ALTER TABLE medical_doctors ADD COLUMN IF NOT EXISTS license_no TEXT;
ALTER TABLE medical_doctors ADD COLUMN IF NOT EXISTS clinic_name TEXT;
ALTER TABLE medical_doctors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE medical_doctors ADD COLUMN IF NOT EXISTS latitude REAL;
ALTER TABLE medical_doctors ADD COLUMN IF NOT EXISTS longitude REAL;
ALTER TABLE medical_doctors ADD COLUMN IF NOT EXISTS geohash TEXT;
ALTER TABLE medical_doctors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- medical_appointments: columns carried only by the shadowed declaration(s)
ALTER TABLE medical_appointments ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid';

-- localization_dictionaries: columns carried only by the shadowed declaration(s)
ALTER TABLE localization_dictionaries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- local_job_postings: columns carried only by the shadowed declaration(s)
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS salary REAL;
ALTER TABLE local_job_postings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

COMMIT;
