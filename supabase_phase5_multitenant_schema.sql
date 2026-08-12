-- ===================================================
-- VaidyaDrishti — Phase 5: Multi-Clinic Tenant Isolation & Admin Schema
-- ===================================================

-- 1. Create Clinics Table
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default pilot clinic
INSERT INTO clinics (id, name, code, address)
VALUES ('00000000-0000-0000-0000-000000000001', 'VaidyaDrishti Pilot Central Clinic', 'PILOT_CLINIC_1', 'New Delhi, India')
ON CONFLICT (code) DO NOTHING;

-- 2. Add clinic_id columns to doctors, patients, intakes, and audit_logs
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE intakes ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) DEFAULT '00000000-0000-0000-0000-000000000001';

-- Update existing default doctors to pilot clinic
UPDATE doctors SET clinic_id = '00000000-0000-0000-0000-000000000001' WHERE clinic_id IS NULL;
UPDATE patients SET clinic_id = '00000000-0000-0000-0000-000000000001' WHERE clinic_id IS NULL;
UPDATE intakes SET clinic_id = '00000000-0000-0000-0000-000000000001' WHERE clinic_id IS NULL;

-- 3. Enable RLS on Clinics
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on clinics"
ON clinics FOR SELECT
TO authenticated
USING (true);

-- Indexes for lightning fast multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_intakes_clinic_id ON intakes(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_doctors_clinic_id ON doctors(clinic_id);
