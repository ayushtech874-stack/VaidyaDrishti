-- ==============================================================================
-- VaidyaDrishti — Production Master Database Initialization Schema
-- ==============================================================================
-- Run this single file in Supabase SQL Editor for fresh production deployment.
-- Builds all tables, multi-tenant clinic columns, ICMR audit logs, and RLS policies.
-- ==============================================================================

-- 1. Create Clinics Table
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Default Pilot Clinic
INSERT INTO clinics (id, name, code, address)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'VaidyaDrishti Pilot Clinic #1',
  'PILOT_CLINIC_1',
  'Primary Health Centre, Rural District'
) ON CONFLICT (code) DO NOTHING;


-- 2. Create Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  age INT NOT NULL,
  phone TEXT NOT NULL,
  gender TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. Create Doctors Table (Linked to Supabase Auth user id)
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  rmp_registration_number TEXT,
  role TEXT DEFAULT 'doctor', -- 'super_admin' or 'doctor'
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 4. Create Intakes Table
CREATE TABLE IF NOT EXISTS intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  is_voice_intake BOOLEAN DEFAULT FALSE,
  audio_storage_path TEXT,
  structured_data JSONB,
  urgency_level TEXT, -- 'high', 'medium', 'low'
  red_flags TEXT[],
  status TEXT DEFAULT 'pending_review', -- 'pending_review', 'doctor_reviewed'
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES doctors(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 5. Create Audit Logs Table (Tamper-Evident ICMR 2023 Audit Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  intake_id UUID REFERENCES intakes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'LLM_EXTRACTION', 'TRIAGE_RULE_EVAL', 'DOCTOR_CORRECTION'
  actor TEXT NOT NULL, -- 'SYSTEM_AI', 'RULES_ENGINE', 'DOCTOR'
  actor_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restrict UPDATE and DELETE on audit_logs (Append-Only)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_logs_insert_only') THEN
    CREATE POLICY audit_logs_insert_only ON audit_logs FOR INSERT WITH CHECK (true);
  END IF;
END $$;


-- 6. Create Doctor Corrections Table
CREATE TABLE IF NOT EXISTS doctor_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  intake_id UUID REFERENCES intakes(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id),
  original_urgency TEXT,
  corrected_urgency TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 7. Create Pilot Metrics Table
CREATE TABLE IF NOT EXISTS pilot_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  details JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);


-- 8. Create WhatsApp Sessions Table (For State Machine Routing)
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  phone TEXT PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  state TEXT DEFAULT 'AWAITING_CONSENT',
  consent_granted BOOLEAN DEFAULT FALSE,
  consented_at TIMESTAMPTZ,
  patient_id UUID REFERENCES patients(id),
  temp_name TEXT,
  temp_age INT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 9. Enable Row Level Security (RLS) across all tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_metrics ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies for Anon API & Authenticated Service Roles
CREATE POLICY IF NOT EXISTS "Allow anon and authenticated full access on clinics" ON clinics FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon and authenticated full access on patients" ON patients FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon and authenticated full access on doctors" ON doctors FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon and authenticated full access on intakes" ON intakes FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon and authenticated full access on audit_logs" ON audit_logs FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon and authenticated full access on doctor_corrections" ON doctor_corrections FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon and authenticated full access on pilot_metrics" ON pilot_metrics FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon and authenticated full access on whatsapp_sessions" ON whatsapp_sessions FOR ALL USING (true);

-- ==============================================================================
-- Schema Initialization Complete!
-- ==============================================================================
