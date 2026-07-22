-- Migration: Medical & Health Schema

CREATE TABLE IF NOT EXISTS medical_doctors (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    qualification TEXT NOT NULL,
    license_no TEXT UNIQUE NOT NULL,
    clinic_name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    geohash TEXT,
    consultation_fee REAL DEFAULT 500.0,
    rating REAL DEFAULT 5.0,
    is_available INTEGER DEFAULT 1,
    is_verified INTEGER DEFAULT 0,
    serviced_pincodes_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    consultation_fee REAL NOT NULL,
    status TEXT DEFAULT 'confirmed',
    payment_status TEXT DEFAULT 'paid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON medical_doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_geohash ON medical_doctors(geohash);
