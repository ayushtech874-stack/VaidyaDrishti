-- Phase 3 SQL Schema Additions for VaidyaDrishti (Refined ICMR Compliance & Security)

-- 1. Audit log table for ICMR 2023 Guidelines Compliance (Immutable & Service-Role Restricted)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID REFERENCES public.intakes(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- 'LLM_EXTRACTION' | 'TRIAGE_RULE_EVAL' | 'DOCTOR_REVIEW' | 'DOCTOR_CORRECTION'
    actor TEXT NOT NULL, -- 'SYSTEM_AI' | 'RULES_ENGINE' | 'DOCTOR'
    details JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Doctor corrections table for AI feedback loop & Urgency Overrides
CREATE TABLE IF NOT EXISTS public.doctor_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID REFERENCES public.intakes(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    original_structured_data JSONB NOT NULL,
    corrected_structured_data JSONB NOT NULL,
    original_urgency_level TEXT,
    corrected_urgency_level TEXT,
    overrode_triage_rules BOOLEAN DEFAULT FALSE,
    doctor_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit_logs and doctor_corrections
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_corrections ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- IMMUTABLE AUDIT LOG POLICIES (Service Role Only Insert, No Delete/Update)
-- =========================================================================
DROP POLICY IF EXISTS "Allow public read access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow public insert access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Restrict audit log insert to service role" ON public.audit_logs;

-- Allow read access for dashboard audit views
CREATE POLICY "Allow public read access to audit_logs" ON public.audit_logs FOR SELECT USING (true);

-- Restrict INSERT access: Only service_role (server actions / backend API) can insert audit logs
CREATE POLICY "Restrict audit log insert to service role" ON public.audit_logs FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'role') = 'service_role' OR current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role'
);

-- NO UPDATE POLICY & NO DELETE POLICY EXISTS => UPDATE and DELETE are REJECTED by Postgres RLS!

-- Doctor Corrections Policies
DROP POLICY IF EXISTS "Allow public read access to doctor_corrections" ON public.doctor_corrections;
DROP POLICY IF EXISTS "Allow public insert access to doctor_corrections" ON public.doctor_corrections;
CREATE POLICY "Allow public read access to doctor_corrections" ON public.doctor_corrections FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to doctor_corrections" ON public.doctor_corrections FOR INSERT WITH CHECK (true);
