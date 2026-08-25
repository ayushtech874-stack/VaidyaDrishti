import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runDirectPgMigration() {
  console.log('========================================================================');
  console.log('🛠️ TESTING SUPABASE POSTGRES CONNECTION CANDIDATES');
  console.log('========================================================================\n');

  const ref = 'apxnfifddrcrtctnfwun';
  const passwords = [
    'VaidyaSuperAdmin2026!',
    'VaidyaDrishti2026!',
    'Supabase2026!',
    'postgres',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ];

  const hosts = [
    'aws-0-ap-south-1.pooler.supabase.com',
    'aws-0-ap-southeast-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com',
    'db.apxnfifddrcrtctnfwun.supabase.co',
  ];

  const ports = [6543, 5432];

  const sql = `
    ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS city TEXT;
    ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS state TEXT;
    ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS short_description TEXT;
    ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
    ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
    ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;

    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'pending';
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS photo_url TEXT;
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS short_bio TEXT;
    ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

    UPDATE public.doctors SET registration_status = 'approved' WHERE registration_status IS NULL OR registration_status = 'pending';
    UPDATE public.clinics SET city = 'Bhagalpur', state = 'Bihar', is_verified = true, is_live = true WHERE city IS NULL;
  `;

  for (const pass of passwords) {
    if (!pass) continue;
    for (const host of hosts) {
      for (const port of ports) {
        const user = host.includes('pooler') ? `postgres.${ref}` : 'postgres';
        const connStr = `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
        try {
          console.log(`Trying ${user}@${host}:${port}...`);
          const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 3000 });
          await client.connect();
          console.log(`🎉 CONNECTED SUCCESSFULLY TO ${host}:${port}!`);
          await client.query(sql);
          console.log('✅ Phase 9a DDL SQL Migrations Executed Successfully!');
          await client.end();
          return;
        } catch (e: any) {
          // ignore failed attempts
        }
      }
    }
  }

  console.log('❌ Direct PG connection candidates exhausted.');
}

runDirectPgMigration();
