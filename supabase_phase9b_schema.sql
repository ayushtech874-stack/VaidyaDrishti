-- ==============================================================================
-- VaidyaDrishti — Phase 9b Multi-Profile Family Accounts Database Schema Migration
-- ==============================================================================

-- 1. Drop strict unique index on patients.phone so family members can share phone number
DROP INDEX IF EXISTS idx_patients_phone;
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);

-- 2. Patients Schema Extensions
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS managed_by_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS relationship TEXT DEFAULT 'self';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 3. Index for managed_by_auth_user_id
CREATE INDEX IF NOT EXISTS idx_patients_managed_by_auth_user_id ON public.patients(managed_by_auth_user_id);

-- 4. Update existing primary account holders to relationship = 'self' if null
UPDATE public.patients SET relationship = 'self' WHERE relationship IS NULL;
UPDATE public.patients SET display_name = name WHERE display_name IS NULL OR display_name = '';
