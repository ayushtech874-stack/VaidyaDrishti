-- Create patients table
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    age INT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create intakes table
CREATE TABLE IF NOT EXISTS public.intakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    structured_data JSONB,
    urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high')),
    red_flags TEXT[],
    status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'doctor_reviewed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create doctors table
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
);

-- Enable RLS on all three tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Phase 1 Temporary Open RLS Policies
DROP POLICY IF EXISTS "Allow public read access to patients" ON public.patients;
DROP POLICY IF EXISTS "Allow public insert access to patients" ON public.patients;
CREATE POLICY "Allow public read access to patients" ON public.patients FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to patients" ON public.patients FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to intakes" ON public.intakes;
DROP POLICY IF EXISTS "Allow public insert access to intakes" ON public.intakes;
DROP POLICY IF EXISTS "Allow public update access to intakes" ON public.intakes;
CREATE POLICY "Allow public read access to intakes" ON public.intakes FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to intakes" ON public.intakes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to intakes" ON public.intakes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public read access to doctors" ON public.doctors;
DROP POLICY IF EXISTS "Allow public insert access to doctors" ON public.doctors;
CREATE POLICY "Allow public read access to doctors" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to doctors" ON public.doctors FOR INSERT WITH CHECK (true);
