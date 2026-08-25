-- ==============================================================================
-- VaidyaDrishti — Phase 9b Multi-Profile Family Accounts Database Schema Migration
-- ==============================================================================

-- 1. Scoped Unique Index: Primary Account Holders must have unique phone numbers.
-- Managed family profiles under the same primary account can share the family phone.
DROP INDEX IF EXISTS idx_patients_phone;
DROP INDEX IF EXISTS idx_patients_primary_phone;

CREATE UNIQUE INDEX idx_patients_primary_phone 
ON public.patients(phone) 
WHERE auth_user_id IS NOT NULL AND managed_by_auth_user_id IS NULL;

-- 2. General non-unique index for fast phone lookups
CREATE INDEX idx_patients_phone ON public.patients(phone);

-- 3. Patients Schema Extensions
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS managed_by_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS relationship TEXT DEFAULT 'self';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 4. Index for managed_by_auth_user_id
CREATE INDEX IF NOT EXISTS idx_patients_managed_by_auth_user_id ON public.patients(managed_by_auth_user_id);

-- 5. Update existing primary account holders to relationship = 'self' if null
UPDATE public.patients SET relationship = 'self' WHERE relationship IS NULL;
UPDATE public.patients SET display_name = name WHERE display_name IS NULL OR display_name = '';
