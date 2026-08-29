-- ==============================================================================
-- VaidyaDrishti — Phase 11 Database Schema & RLS Hardening Migration
-- ==============================================================================

-- 1. Add is_active column to doctors and clinics (default true)
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update existing records to true
UPDATE public.doctors SET is_active = TRUE WHERE is_active IS NULL;
UPDATE public.clinics SET is_active = TRUE WHERE is_active IS NULL;

-- 2. Hard Admin-Patient-Data RLS Isolation: Ensure RLS policies on patient data tables block super_admin auth sessions
-- Note: Service-role key can still be used internally if needed, but authenticated super_admin user sessions receive 0 rows on raw patient data tables.

-- RLS check on patients table
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_no_patient_access ON public.patients;
CREATE POLICY admin_no_patient_access ON public.patients
  FOR ALL
  USING (
    (auth.jwt() ->> 'role' <> 'super_admin') AND
    (auth.uid() = auth_user_id OR auth.uid() = managed_by_auth_user_id OR EXISTS (
      SELECT 1 FROM public.intakes i WHERE i.patient_id = patients.id AND i.doctor_id = auth.uid()
    ))
  );

-- RLS check on intakes table
ALTER TABLE public.intakes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_no_intake_access ON public.intakes;
CREATE POLICY admin_no_intake_access ON public.intakes
  FOR ALL
  USING (
    (auth.jwt() ->> 'role' <> 'super_admin') AND
    (doctor_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.patients p WHERE p.id = intakes.patient_id AND (p.auth_user_id = auth.uid() OR p.managed_by_auth_user_id = auth.uid())
    ))
  );
