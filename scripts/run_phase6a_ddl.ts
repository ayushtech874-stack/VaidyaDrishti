import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runPhase6aDDL() {
  console.log('🛠️ Executing Phase 6a SQL DDL Migrations...');

  // Extract reference ID from NEXT_PUBLIC_SUPABASE_URL (e.g. https://<ref>.supabase.co)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const ref = supabaseUrl.replace('https://', '').split('.')[0];
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // Direct Supabase Postgres Connection strings:
  // Transaction pooler or Direct connection using Supabase db password or service role key connection if enabled
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
  
  let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString && ref && dbPassword) {
    connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`;
  }

  if (!connectionString) {
    console.log('No direct postgres connection string. Using Supabase Management API / SQL execution...');
    // We can also connect via pooler or execute via pg if we have the password
    console.log(`Ref: ${ref}`);
  }

  // Let's try connecting with available connection string options
  const hostCandidates = [
    connectionString,
    dbPassword ? `postgresql://postgres.${ref}:${encodeURIComponent(dbPassword)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres` : null,
    dbPassword ? `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres` : null,
  ].filter(Boolean) as string[];

  let connected = false;

  for (const connStr of hostCandidates) {
    try {
      console.log(`Trying postgres connection: ${connStr.replace(/:[^:@]+@/, ':****@')}...`);
      const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 });
      await client.connect();
      console.log('✅ Connected to PostgreSQL Database!');

      const sql = `
        -- 1. Add auth_user_id column to patients table if not exists
        ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

        -- 2. Create unique index for patients auth_user_id
        CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_auth_user_id ON public.patients (auth_user_id) WHERE auth_user_id IS NOT NULL;

        -- 3. Create patient_medical_history table
        CREATE TABLE IF NOT EXISTS public.patient_medical_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
          field_type TEXT NOT NULL,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT now()
        );

        -- 4. Create patient_documents table
        CREATE TABLE IF NOT EXISTS public.patient_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
          file_path TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_type TEXT NOT NULL,
          uploaded_at TIMESTAMPTZ DEFAULT now()
        );

        -- 5. Enable Row Level Security (RLS) on tables
        ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.patient_medical_history ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
      `;

      await client.query(sql);
      console.log('🎉 Phase 6a DDL Migrations Executed Successfully!');
      await client.end();
      connected = true;
      break;
    } catch (e: any) {
      console.warn('Connection failed:', e.message);
    }
  }

  if (!connected) {
    console.error('⚠️ Could not connect via direct PG pooler without SUPABASE_DB_PASSWORD. Checking alternative DDL execution methods...');
  }
}

runPhase6aDDL();
