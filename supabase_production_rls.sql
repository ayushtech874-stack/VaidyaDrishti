-- VaidyaDrishti Production RLS Security Lock-Down
-- Mandated before live pilot deployment under DPDP Act 2023 & ICMR Guidelines

-- 1. Patients Table: Authenticated Doctors ONLY
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to patients" ON public.patients;
DROP POLICY IF EXISTS "Allow public insert access to patients" ON public.patients;
DROP POLICY IF EXISTS "Doctor auth required for patients" ON public.patients;

CREATE POLICY "Doctor auth required for patients select" ON public.patients 
FOR SELECT USING (auth.role() = 'authenticated' OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow public insert for patient intake form" ON public.patients 
FOR INSERT WITH CHECK (true);

-- 2. Intakes Table: Authenticated Doctors ONLY for Select/Update
ALTER TABLE public.intakes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to intakes" ON public.intakes;
DROP POLICY IF EXISTS "Allow public insert access to intakes" ON public.intakes;
DROP POLICY IF EXISTS "Allow public update access to intakes" ON public.intakes;

CREATE POLICY "Allow public insert for patient intake" ON public.intakes 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Doctor auth required for intakes read" ON public.intakes 
FOR SELECT USING (auth.role() = 'authenticated' OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Doctor auth required for intakes update" ON public.intakes 
FOR UPDATE USING (auth.role() = 'authenticated' OR auth.jwt() ->> 'role' = 'service_role');

-- 3. Pilot Metrics & Analytics: Service Role & Auth Doctors ONLY
ALTER TABLE public.pilot_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to pilot_metrics" ON public.pilot_metrics;
DROP POLICY IF EXISTS "Allow public insert access to pilot_metrics" ON public.pilot_metrics;

CREATE POLICY "Doctor auth required for pilot_metrics" ON public.pilot_metrics 
FOR ALL USING (auth.role() = 'authenticated' OR auth.jwt() ->> 'role' = 'service_role');
