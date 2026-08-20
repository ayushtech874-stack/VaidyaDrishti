import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExecSql() {
  const sql = `
    ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_auth_user_id ON public.patients (auth_user_id) WHERE auth_user_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_phone ON public.patients (phone);

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

  console.log('Testing RPC exec_sql with sql_query parameter...');
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  console.log('Result:', data);
  console.log('Error:', error);
}

testExecSql();
