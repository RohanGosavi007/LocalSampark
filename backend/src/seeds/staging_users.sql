-- LocalSampark Staging Environments Users Seeds

-- 1. Insert Region Admin & Super Admin test accounts
INSERT INTO users (id, phone_number, full_name, role, is_active)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '+919999999901', 'Super Admin Test', 'super_admin', true),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', '+919999999902', 'Dhanori Admin Test', 'admin', true)
ON CONFLICT (phone_number) DO NOTHING;

-- 2. Insert Merchant & Delivery Agent test accounts
INSERT INTO users (id, phone_number, full_name, role, is_active)
VALUES 
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', '+919999999903', 'Ramesh Merchant Test', 'user', true),
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', '+919999999904', 'Sanjay Agent Test', 'user', true)
ON CONFLICT (phone_number) DO NOTHING;

-- 3. Insert regular Resident test account
INSERT INTO users (id, phone_number, full_name, role, is_active)
VALUES 
  ('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', '+919999999905', 'Amit Resident Test', 'user', true)
ON CONFLICT (phone_number) DO NOTHING;

-- 4. Set up pre-funded wallets for merchant, agent, and resident
INSERT INTO wallets (user_id, balance)
VALUES
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 5000.00),
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 1500.00),
  ('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 2500.00)
ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance;
