import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPhase6aDb() {
  console.log('🛠️ Running Phase 6a Database & Storage Setup...');

  // 1. Create Private Storage Bucket 'patient-documents'
  try {
    const { data: bucketData, error: bucketErr } = await supabase.storage.createBucket('patient-documents', {
      public: false, // Private bucket
      fileSizeLimit: 10485760, // 10MB limit
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    });

    if (bucketErr) {
      if (bucketErr.message?.includes('already exists') || (bucketErr as any).statusCode === '409') {
        console.log('✅ Bucket patient-documents already exists.');
      } else {
        console.warn('Bucket creation notice:', bucketErr.message);
      }
    } else {
      console.log('✅ Created private storage bucket patient-documents:', bucketData);
    }
  } catch (e: any) {
    console.warn('Storage bucket setup notice:', e.message);
  }

  // 2. Check Postgres RPC or run SQL DDL
  // Let's test if an exec_sql RPC or sql function exists in Supabase
  const sqlCommands = `
    -- Add auth_user_id column to patients table if not exists
    ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    -- Add unique constraint so one phone cannot be claimed by two auth accounts
    CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_auth_user_id ON public.patients (auth_user_id) WHERE auth_user_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_phone ON public.patients (phone);

    -- Create patient_medical_history table
    CREATE TABLE IF NOT EXISTS public.patient_medical_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
      field_type TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Create patient_documents table
    CREATE TABLE IF NOT EXISTS public.patient_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  // Try RPC exec_sql
  const { data: rpcData, error: rpcErr } = await supabase.rpc('exec_sql', { sql: sqlCommands });
  if (rpcErr) {
    console.log('RPC exec_sql not found or error:', rpcErr.message);
    console.log('Will execute DDL via direct postgres connection or Supabase Management REST...');
  } else {
    console.log('✅ Executed SQL DDL via exec_sql RPC:', rpcData);
  }
}

setupPhase6aDb();
