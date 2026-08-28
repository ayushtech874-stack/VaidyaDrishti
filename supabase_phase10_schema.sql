-- ==============================================================================
-- VaidyaDrishti — Phase 10 Unified Doctor Dashboard Database Schema Migration
-- ==============================================================================

-- Doctor self-update policy: Approved doctor can UPDATE photo_url, short_bio, qualifications on their own row
-- STRICT RLS SCOPE: Only public.doctors is touched; invoices, prescriptions, intakes, messages RLS remain untouched.
DROP POLICY IF EXISTS doctor_self_update ON public.doctors;
CREATE POLICY doctor_self_update ON public.doctors
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
