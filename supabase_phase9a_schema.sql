-- ==============================================================================
-- VaidyaDrishti — Phase 9a Database Schema Migration
-- ==============================================================================

-- 1. Clinics Schema Extensions
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;

-- 2. Doctors Schema Extensions
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'pending';
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS short_bio TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. Populate existing doctors as approved so existing Phase 1-8 doctors stay active
UPDATE public.doctors SET registration_status = 'approved' WHERE registration_status IS NULL OR registration_status = 'pending';

-- 4. Populate existing clinic default cities and verification flags if null
UPDATE public.clinics SET city = 'Bhagalpur', state = 'Bihar', is_verified = true, is_live = true WHERE city IS NULL;
