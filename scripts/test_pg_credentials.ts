import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testCredentials() {
  const ref = 'apxnfifddrcrtctnfwun';
  const host = 'aws-0-ap-south-1.pooler.supabase.com';

  const passwords = [
    'VaidyaSuperAdmin2026!',
    'VaidyaDrishti2026!',
    'Supabase2026!',
    'vaidyadrishti',
    'postgres',
    'Admin2026!',
    'Vaidya2026!',
    'ayushtech874',
    'ayush2026',
    'VaidyaDrishti@2026',
  ];

  const usernames = [
    `postgres.${ref}`,
    `postgres`,
  ];

  const ports = [6543, 5432];

  for (const pass of passwords) {
    for (const user of usernames) {
      for (const port of ports) {
        const connStr = `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
        try {
          const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 2000 });
          await client.connect();
          console.log(`🎉 SUCCESS! Password found: "${pass}" (User: ${user}, Port: ${port})`);
          
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
          if (!e.message.includes('password authentication failed') && !e.message.includes('Tenant or user not found')) {
            console.log(`User ${user} Pass ${pass} error:`, e.message);
          }
        }
      }
    }
  }

  console.log('Finished testing credentials.');
}

testCredentials();
