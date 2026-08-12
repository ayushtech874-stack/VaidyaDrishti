-- Phase 4 SQL Schema Additions for VaidyaDrishti (Clinical Analytics & Blind Validation)

-- 1. Pilot performance & Blind Validation metrics tracking
CREATE TABLE IF NOT EXISTS public.pilot_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID REFERENCES public.intakes(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    active_review_seconds INT, -- active clinical review time (pauses on tab blur)
    is_blind_sample BOOLEAN DEFAULT FALSE,
    doctor_blind_urgency TEXT CHECK (doctor_blind_urgency IN ('low', 'medium', 'high')),
    ai_urgency_at_review TEXT CHECK (ai_urgency_at_review IN ('low', 'medium', 'high')),
    final_urgency_level TEXT CHECK (final_urgency_level IN ('low', 'medium', 'high')),
    was_downgraded BOOLEAN DEFAULT FALSE, -- False-Flag (High -> Medium/Low)
    was_upgraded BOOLEAN DEFAULT FALSE,   -- Missed-Flag (Low/Medium -> High)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Periodic Doctor Trust & qualitative feedback table
CREATE TABLE IF NOT EXISTS public.pilot_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    week_number INT,
    trust_rating INT CHECK (trust_rating BETWEEN 1 AND 5),
    time_saved_perception TEXT,
    qualitative_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on pilot tables
ALTER TABLE public.pilot_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_surveys ENABLE ROW LEVEL SECURITY;

-- Temporary / Auth RLS Policies
DROP POLICY IF EXISTS "Allow public read access to pilot_metrics" ON public.pilot_metrics;
DROP POLICY IF EXISTS "Allow public insert access to pilot_metrics" ON public.pilot_metrics;
CREATE POLICY "Allow public read access to pilot_metrics" ON public.pilot_metrics FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to pilot_metrics" ON public.pilot_metrics FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to pilot_surveys" ON public.pilot_surveys;
DROP POLICY IF EXISTS "Allow public insert access to pilot_surveys" ON public.pilot_surveys;
CREATE POLICY "Allow public read access to pilot_surveys" ON public.pilot_surveys FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to pilot_surveys" ON public.pilot_surveys FOR INSERT WITH CHECK (true);

-- 3. Comprehensive Clinical Performance & False-Flag Summary View
CREATE OR REPLACE VIEW public.clinic_performance_summary AS
SELECT
    COUNT(i.id) AS total_intakes,
    COUNT(CASE WHEN i.urgency_level = 'high' THEN 1 END) AS current_high_urgency_count,
    COUNT(CASE WHEN i.urgency_level = 'medium' THEN 1 END) AS current_medium_urgency_count,
    COUNT(CASE WHEN i.urgency_level = 'low' THEN 1 END) AS current_low_urgency_count,
    
    -- Blind Validation & Recall / Precision Metrics
    COUNT(CASE WHEN pm.is_blind_sample THEN 1 END) AS total_blind_samples,
    COUNT(CASE WHEN pm.is_blind_sample AND pm.doctor_blind_urgency = pm.ai_urgency_at_review THEN 1 END) AS blind_agreements,
    
    -- False-Flag (AI over-triaged) vs Missed-Flag (AI under-triaged) breakdown
    COUNT(CASE WHEN pm.was_downgraded THEN 1 END) AS false_high_flags,
    COUNT(CASE WHEN pm.was_upgraded THEN 1 END) AS missed_high_flags,
    
    ROUND(AVG(pm.active_review_seconds), 1) AS avg_active_review_seconds
FROM public.intakes i
LEFT JOIN public.pilot_metrics pm ON i.id = pm.intake_id;
