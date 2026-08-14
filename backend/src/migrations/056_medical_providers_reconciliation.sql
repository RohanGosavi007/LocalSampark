-- 056: Reconcile the duplicate medical_providers definitions.
--
-- init.sql declared medical_providers twice. Both used CREATE TABLE IF NOT
-- EXISTS, so the first (provider_name, license_no, zone, is_verified) always
-- won and the second (name, address, contact_number) was dead. The dead copy
-- nevertheless carried two columns the live table lacks, so they are added here
-- rather than lost, and the dead declaration is removed from init.sql.

BEGIN;

ALTER TABLE medical_providers ADD COLUMN IF NOT EXISTS address        TEXT;
ALTER TABLE medical_providers ADD COLUMN IF NOT EXISTS contact_number TEXT;

-- The admin Medical tab filters by verification state and zone.
CREATE INDEX IF NOT EXISTS idx_medical_providers_verified ON medical_providers(is_verified);
CREATE INDEX IF NOT EXISTS idx_medical_providers_zone     ON medical_providers(zone);

COMMIT;
