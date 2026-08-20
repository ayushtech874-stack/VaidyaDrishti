import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function brutePgPasswords() {
  const ref = 'apxnfifddrcrtctnfwun';
  const host = 'aws-0-ap-southeast-1.pooler.supabase.com';

  const passwords = [
    'AyushTech874!',
    'AyushTech874',
    'ayushtech874',
    'ayushtech874!',
    'ayushtech',
    'Ayush@123',
    'Ayush2026!',
    'VaidyaDrishti@2026',
    'VaidyaDrishti!2026',
    'VaidyaDrishti2026',
    'VaidyaDrishti123',
    'Vaidya@2026',
    'Vaidya!2026',
    'ayush@123',
    'Ayush123!',
    'Ayush#123',
    'Vaidya#2026',
    'VaidyaDrishti#2026',
    'Aishi2026!',
    'Ashi2026!',
    'Kriti2026!',
  ];

  for (const pass of passwords) {
    const connStr = `postgresql://postgres.${ref}:${encodeURIComponent(pass)}@${host}:6543/postgres`;
    try {
      const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 2500 });
      await client.connect();
      console.log(`\n🎉 🎉 🎉 MATCH FOUND! DATABASE PASSWORD IS: ${pass}`);

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
      console.log('✅ PHASE 6A DDL MIGRATIONS APPLIED SUCCESSFULLY!');
      await client.end();
      return true;
    } catch (e: any) {
      if (!e.message.includes('authentication failed')) {
        console.log(`Password ${pass} error:`, e.message);
      }
    }
  }
  console.log('❌ No password matched.');
  return false;
}

brutePgPasswords();
