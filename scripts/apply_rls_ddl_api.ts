import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function applyRlsDdlApi() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const ref = supabaseUrl.replace('https://', '').split('.')[0];

  console.log(`Executing RLS DDL Migration on project ${ref}...`);

  const sql = `
    -- Enable RLS on patient_medical_history
    ALTER TABLE public.patient_medical_history ENABLE ROW LEVEL SECURITY;

    -- Drop all legacy open policies on patient_medical_history
    DROP POLICY IF EXISTS "Allow public read access to patient_medical_history" ON public.patient_medical_history;
    DROP POLICY IF EXISTS "Allow public insert access to patient_medical_history" ON public.patient_medical_history;
    DROP POLICY IF EXISTS "Patients select own medical history" ON public.patient_medical_history;
    DROP POLICY IF EXISTS "Doctors select patient medical history on relationship" ON public.patient_medical_history;

    -- Policy 1: Patients can SELECT their own history (or managed family members)
    CREATE POLICY "Patients select own medical history" ON public.patient_medical_history
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = patient_medical_history.patient_id
          AND (p.auth_user_id = auth.uid() OR p.managed_by_auth_user_id = auth.uid())
      )
    );

    -- Policy 2: Doctors can SELECT patient history ONLY IF an active doctor-patient relationship exists
    CREATE POLICY "Doctors select patient medical history on relationship" ON public.patient_medical_history
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.intakes i
        WHERE i.patient_id = patient_medical_history.patient_id
          AND i.doctor_id = auth.uid()
      )
    );
  `;

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    console.log('API Status:', res.status);
    const responseText = await res.text();
    console.log('API Response:', responseText);
  } catch (e: any) {
    console.error('Fetch error:', e.message);
  }
}

applyRlsDdlApi();
