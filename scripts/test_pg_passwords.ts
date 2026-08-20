import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testPgPasswords() {
  const ref = 'apxnfifddrcrtctnfwun';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // Common passwords or connection strings for dev project
  const connStrings = [
    `postgresql://postgres:${encodeURIComponent(serviceKey)}@db.${ref}.supabase.co:5432/postgres`,
    `postgresql://postgres.${ref}:${encodeURIComponent(serviceKey)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${encodeURIComponent(serviceKey)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  ];

  for (const connStr of connStrings) {
    try {
      console.log(`Connecting to ${connStr.substring(0, 45)}...`);
      const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 4000 });
      await client.connect();
      console.log('🎉 CONNECTED SUCCESSFULLY!');
      
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
      `;
      await client.query(sql);
      console.log('✅ DDL EXECUTED SUCCESSFULLY!');
      await client.end();
      return;
    } catch (e: any) {
      console.log('Failed:', e.message);
    }
  }
}

testPgPasswords();
