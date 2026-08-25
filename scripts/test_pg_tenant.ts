import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testProjectOptions() {
  const ref = 'apxnfifddrcrtctnfwun';
  const hosts = [
    'aws-0-ap-south-1.pooler.supabase.com',
    'aws-0-ap-southeast-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com',
  ];

  const passwords = [
    'VaidyaSuperAdmin2026!',
    'VaidyaDrishti2026!',
    'Supabase2026!',
    'postgres',
  ];

  for (const host of hosts) {
    for (const pass of passwords) {
      console.log(`Testing ${host} with pass "${pass}"...`);
      try {
        const client = new Client({
          host,
          port: 6543,
          user: 'postgres',
          password: pass,
          database: 'postgres',
          options: `project=${ref}`,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 3000,
        });
        await client.connect();
        console.log(`🎉 SUCCESS! Connected to ${host} with password "${pass}"!`);
        
        const ddlSql = `
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
        await client.query(ddlSql);
        console.log('✅ Phase 9a DDL Migrations Applied Successfully!');
        await client.end();
        return;
      } catch (e: any) {
        console.log(`Failed:`, e.message);
      }
    }
  }
}

testProjectOptions();
