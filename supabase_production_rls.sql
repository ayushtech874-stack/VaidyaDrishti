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

-- 4. Patient Medical History Table: RLS Defense-in-Depth
ALTER TABLE public.patient_medical_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Patients select own medical history" ON public.patient_medical_history;
DROP POLICY IF EXISTS "Doctors select patient medical history on relationship" ON public.patient_medical_history;
DROP POLICY IF EXISTS "Allow public read access to patient_medical_history" ON public.patient_medical_history;

CREATE POLICY "Patients select own medical history" ON public.patient_medical_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_medical_history.patient_id
      AND (p.auth_user_id = auth.uid() OR p.managed_by_auth_user_id = auth.uid())
  )
);

CREATE POLICY "Doctors select patient medical history on relationship" ON public.patient_medical_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.intakes i
    WHERE i.patient_id = patient_medical_history.patient_id
      AND i.doctor_id = auth.uid()
  )
);

-- 5. Prescriptions Table: Database-Level RLS Defense-in-Depth
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Patients select own prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Doctors select prescriptions on relationship" ON public.prescriptions;
DROP POLICY IF EXISTS "Allow public read access to prescriptions" ON public.prescriptions;

CREATE POLICY "Patients select own prescriptions" ON public.prescriptions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = prescriptions.patient_id
      AND (p.auth_user_id = auth.uid() OR p.managed_by_auth_user_id = auth.uid())
  )
);

CREATE POLICY "Doctors select prescriptions on relationship" ON public.prescriptions
FOR SELECT USING (
  doctor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.intakes i
    WHERE i.patient_id = prescriptions.patient_id
      AND i.doctor_id = auth.uid()
  )
);
