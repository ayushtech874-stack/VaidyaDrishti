import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testSupabaseDdlApi() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const ref = supabaseUrl.replace('https://', '').split('.')[0];

  console.log(`Ref: ${ref}`);

  const sql = `
    ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_auth_user_id ON public.patients (auth_user_id) WHERE auth_user_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS public.patient_medical_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
      field_type TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.patient_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.patient_medical_history ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
  `;

  // Endpoint 1: Supabase API SQL endpoint
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
    const text = await res.text();
    console.log('API Response:', text);
  } catch (e: any) {
    console.error('Fetch error:', e.message);
  }
}

testSupabaseDdlApi();
