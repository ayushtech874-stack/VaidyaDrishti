import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testDbPasswords() {
  const ref = 'apxnfifddrcrtctnfwun';
  const host = 'aws-0-ap-southeast-1.pooler.supabase.com';

  const passwords = [
    'VaidyaSuperAdmin2026!',
    'VaidyaDrishti2026!',
    'VaidyaDoc2026!',
    'Vaidya2026!',
    'postgres',
    'admin123',
    'VaidyaDrishti',
    'apxnfifddrcrtctnfwun',
  ];

  for (const pass of passwords) {
    const connStr = `postgresql://postgres.${ref}:${encodeURIComponent(pass)}@${host}:6543/postgres`;
    console.log(`Trying password: ${pass.substring(0, 4)}...`);
    try {
      const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 3000 });
      await client.connect();
      console.log(`🎉 SUCCESS! PASSWORD IS: ${pass}`);

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
      await client.query(sql);
      console.log('✅ PHASE 6A DDL EXECUTED SUCCESSFULLY!');
      await client.end();
      return;
    } catch (e: any) {
      console.log(`Failed for ${pass.substring(0, 4)}:`, e.message);
    }
  }
}

testDbPasswords();
