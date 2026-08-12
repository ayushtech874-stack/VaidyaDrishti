-- Phase 2 SQL Schema Additions for VaidyaDrishti

-- Track WhatsApp conversational session state
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    state TEXT NOT NULL DEFAULT 'AWAITING_CONSENT', -- 'AWAITING_CONSENT' | 'AWAITING_DEMOGRAPHICS' | 'AWAITING_SYMPTOMS'
    consent_granted BOOLEAN DEFAULT FALSE,
    consented_at TIMESTAMPTZ,
    temp_name TEXT,
    temp_age INT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add voice metadata columns to intakes table
ALTER TABLE public.intakes 
ADD COLUMN IF NOT EXISTS is_voice_intake BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS audio_storage_path TEXT,
ADD COLUMN IF NOT EXISTS voice_asr_confidence TEXT;

-- Enable RLS on whatsapp_sessions
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Phase 1/2 Temporary Open RLS Policies for whatsapp_sessions
DROP POLICY IF EXISTS "Allow public read access to whatsapp_sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Allow public insert access to whatsapp_sessions" ON public.whatsapp_sessions;
DROP POLICY IF EXISTS "Allow public update access to whatsapp_sessions" ON public.whatsapp_sessions;

CREATE POLICY "Allow public read access to whatsapp_sessions" ON public.whatsapp_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to whatsapp_sessions" ON public.whatsapp_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to whatsapp_sessions" ON public.whatsapp_sessions FOR UPDATE USING (true);
