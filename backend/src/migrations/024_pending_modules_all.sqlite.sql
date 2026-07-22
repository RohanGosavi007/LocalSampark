-- Migration: 024_pending_modules_all.sqlite.sql

-- A. Medical & Health Module
CREATE TABLE IF NOT EXISTS medical_doctors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    consultation_fee REAL DEFAULT 500.00,
    hospital_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    experience_years INTEGER DEFAULT 5,
    rating REAL DEFAULT 4.8,
    serviced_pincodes_json TEXT DEFAULT '[]',
    is_available INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_appointments (
    id TEXT PRIMARY KEY,
    appointment_ref TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    appointment_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed',
    consultation_fee REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(doctor_id) REFERENCES medical_doctors(id)
);

-- B. Local Jobs Module
CREATE TABLE IF NOT EXISTS job_postings (
    id TEXT PRIMARY KEY,
    shop_id TEXT,
    title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    category TEXT NOT NULL,
    salary_range TEXT NOT NULL,
    location_pincode TEXT NOT NULL,
    job_type TEXT DEFAULT 'Full-time',
    description TEXT,
    contact_phone TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_applications (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_phone TEXT NOT NULL,
    experience_summary TEXT,
    status TEXT DEFAULT 'submitted',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES job_postings(id)
);

-- C. Direct Properties Module (Extending existing property_listings table if needed)
CREATE TABLE IF NOT EXISTS property_inquiries (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(property_id) REFERENCES property_listings(id)
);

-- D. Community Events Module
CREATE TABLE IF NOT EXISTS community_events (
    id TEXT PRIMARY KEY,
    organizer_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    event_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    venue_address TEXT NOT NULL,
    pincode TEXT NOT NULL,
    ticket_price REAL DEFAULT 0.0,
    description TEXT,
    status TEXT DEFAULT 'upcoming',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_rsvps (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    attendee_name TEXT NOT NULL,
    attendee_phone TEXT NOT NULL,
    seats INTEGER DEFAULT 1,
    total_amount REAL DEFAULT 0.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(event_id) REFERENCES community_events(id)
);

-- E. Regional Multilingual Module
CREATE TABLE IF NOT EXISTS localization_dictionaries (
    id TEXT PRIMARY KEY,
    lang_code TEXT NOT NULL, -- 'hi', 'mr', 'kn', 'ta', 'te'
    translation_key TEXT NOT NULL,
    translation_value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lang_code, translation_key)
);

-- Seed Initial Default Data
-- Medical Seed
INSERT OR IGNORE INTO medical_doctors (id, name, specialization, consultation_fee, hospital_name, phone, experience_years, serviced_pincodes_json) VALUES
('doc_1', 'Dr. Rajesh Sharma', 'General Physician', 500.00, 'Care Clinic', '9876543211', 12, '["411001", "411002"]'),
('doc_2', 'Dr. Priya Patel', 'Pediatrician', 600.00, 'Sunshine Children Clinic', '9876543212', 8, '["411001"]');

-- Jobs Seed
INSERT OR IGNORE INTO job_postings (id, title, company_name, category, salary_range, location_pincode, job_type, description, contact_phone) VALUES
('job_1', 'Retail Store Cashier', 'SuperMart Local', 'Retail', '₹15,000 - ₹18,000/mo', '411001', 'Full-time', 'Manage POS counter and inventory sorting.', '9876543213'),
('job_2', 'Delivery Executive', 'LocalSampark Express', 'Logistics', '₹18,000 - ₹25,000/mo', '411001', 'Full-time', 'Hyperlocal delivery partner for neighborhood orders.', '9876543214');

-- Properties Seed
INSERT OR IGNORE INTO property_listings (id, user_id, title, description, property_type, listing_type, price, deposit, amenities, is_verified, is_active) VALUES
('prop_1', 'user_owner_1', 'Spacious 2BHK Apartment', 'Gated community with gym and security near MG Road.', 'flat', 'rent', 22000.00, 50000.00, '["gym", "parking"]', 1, 1),
('prop_2', 'user_owner_2', 'Commercial Shop Space', 'Prime road facing retail shop in Main Market.', 'commercial', 'sale', 4500000.00, 0.00, '["main_road"]', 1, 1);

-- Events Seed
INSERT OR IGNORE INTO community_events (id, organizer_id, title, category, event_date, time_slot, venue_address, pincode, ticket_price, description) VALUES
('evt_1', 'org_1', 'Neighborhood Organic Farming Workshop', 'Workshop', '2026-08-10', '10:00 AM - 01:00 PM', 'Community Hall, Sector 4', '411001', 0.00, 'Learn urban gardening techniques.'),
('evt_2', 'org_2', 'Local Art & Craft Mela', 'Cultural', '2026-08-15', '04:00 PM - 09:00 PM', 'Town Square Ground', '411001', 50.00, 'Support local artisans and handicraft vendors.');

-- Multilingual Seed
INSERT OR IGNORE INTO localization_dictionaries (id, lang_code, translation_key, translation_value) VALUES
('loc_1', 'hi', 'welcome_headline', 'लोकल संपर्क में आपका स्वागत है'),
('loc_2', 'mr', 'welcome_headline', 'लोकल संपर्क मध्ये आपले स्वागत आहे'),
('loc_3', 'hi', 'search_placeholder', 'दुकानें, सेवाएं और जॉब्स खोजें'),
('loc_4', 'mr', 'search_placeholder', 'दुकाने, सेवा आणि नोकऱ्या शोधा');
