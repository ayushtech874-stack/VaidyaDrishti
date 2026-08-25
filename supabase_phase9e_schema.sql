-- ==============================================================================
-- VaidyaDrishti — Phase 9e Billing / Invoice Record-Keeping Schema Migration
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  consultation_type TEXT NOT NULL DEFAULT 'teleconsultation',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Index for doctor and patient lookup
CREATE INDEX IF NOT EXISTS idx_invoices_doctor_id ON public.invoices(doctor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_id ON public.invoices(clinic_id);

-- RLS Policy 1: Doctors can read/write ONLY their own issued invoices
DROP POLICY IF EXISTS doctor_invoice_isolation ON public.invoices;
CREATE POLICY doctor_invoice_isolation ON public.invoices
  FOR ALL
  USING (auth.uid() = doctor_id);

-- RLS Policy 2: Patients can read invoices issued to them or their managed family profiles
DROP POLICY IF EXISTS patient_invoice_read ON public.invoices;
CREATE POLICY patient_invoice_read ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = invoices.patient_id
        AND (p.auth_user_id = auth.uid() OR p.managed_by_auth_user_id = auth.uid())
    )
  );
