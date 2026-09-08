import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function applyRlsPoliciesPg() {
  console.log('🛠️ Applying Database-Level RLS Defense-in-Depth Policies...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const ref = supabaseUrl.replace('https://', '').split('.')[0];
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'VaidyaSuperAdmin2026!';

  const connectionStrings = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    `postgresql://postgres.${ref}:${encodeURIComponent(dbPassword)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${encodeURIComponent(dbPassword)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${encodeURIComponent(dbPassword)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`,
  ].filter(Boolean) as string[];

  const rlsSql = `
    -- 1. Enable RLS on patient_medical_history
    ALTER TABLE public.patient_medical_history ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Patients select own medical history" ON public.patient_medical_history;
    DROP POLICY IF EXISTS "Doctors select patient medical history on relationship" ON public.patient_medical_history;
    DROP POLICY IF EXISTS "Allow public read access to patient_medical_history" ON public.patient_medical_history;

    -- Patient access policy
    CREATE POLICY "Patients select own medical history" ON public.patient_medical_history
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = patient_medical_history.patient_id
          AND (p.auth_user_id = auth.uid() OR p.managed_by_auth_user_id = auth.uid())
      )
    );

    -- Doctor access policy restricted to active relationship
    CREATE POLICY "Doctors select patient medical history on relationship" ON public.patient_medical_history
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.intakes i
        WHERE i.patient_id = patient_medical_history.patient_id
          AND (i.doctor_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.doctors d WHERE d.id = i.doctor_id AND d.email = (auth.jwt() ->> 'email')
          ))
      )
    );

    -- 2. Enable RLS on prescriptions
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
          AND (i.doctor_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.doctors d WHERE d.id = i.doctor_id AND d.email = (auth.jwt() ->> 'email')
          ))
      )
    );
  `;

  for (const connStr of connectionStrings) {
    try {
      console.log(`Connecting to Postgres...`);
      const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 4000 });
      await client.connect();
      console.log('🎉 Connected to PostgreSQL Database!');
      await client.query(rlsSql);
      console.log('✅ DATABASE RLS POLICIES APPLIED SUCCESSFULLY TO POSTGRESQL!');
      await client.end();
      return;
    } catch (e: any) {
      console.warn(`Connection failed:`, e.message);
    }
  }
}

applyRlsPoliciesPg();
