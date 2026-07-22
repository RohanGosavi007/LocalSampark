CREATE TABLE IF NOT EXISTS medical_providers (
    id TEXT PRIMARY KEY,
    provider_name TEXT NOT NULL,
    type TEXT NOT NULL,
    license_no TEXT,
    zone TEXT,
    status TEXT DEFAULT 'pending',
    is_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dummy data to populate the tables for demo
INSERT OR IGNORE INTO medical_providers (id, provider_name, type, license_no, zone, status, is_verified) 
VALUES 
('med_1', 'Dr. Sharma Clinic', 'Clinic', 'MED-12345', 'North Zone', 'active', 1),
('med_2', 'City Pharmacy', 'Pharmacy', 'PHM-98765', 'East Zone', 'active', 1),
('med_3', 'HealthFirst Lab', 'Diagnostic', 'DIA-55555', 'South Zone', 'pending', 0);

INSERT OR IGNORE INTO crm_leads (id, first_name, last_name, phone, lead_source, status) 
VALUES 
('lead_1', 'Rajesh', 'Kumar', '+919876543210', 'Website Inquiry', 'new'),
('lead_2', 'Sneha', 'Patel', '+919876543211', 'Referral', 'contacted'),
('lead_3', 'Amit', 'Singh', '+919876543212', 'Social Media', 'converted');
