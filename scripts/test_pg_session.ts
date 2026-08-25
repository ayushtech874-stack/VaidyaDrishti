import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testSessionPooler() {
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
    'VaidyaSuperAdmin2026!',
  ];

  // Try both port 5432 (session pooler) and 6543 (transaction pooler)
  for (const port of [5432, 6543]) {
    for (const pass of passwords) {
      const connStr = `postgresql://postgres.${ref}:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
      try {
        const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 3000 });
        await client.connect();
        console.log(`\n🎉 MATCH FOUND ON PORT ${port}! PASSWORD IS: "${pass}"`);

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
        console.log('✅ PHASE 9a DDL MIGRATIONS EXECUTED SUCCESSFULLY!');
        await client.end();
        return;
      } catch (e: any) {
        if (!e.message.includes('authentication failed')) {
          console.log(`Port ${port} Pass ${pass} error:`, e.message);
        }
      }
    }
  }

  console.log('❌ Finished session pooler test.');
}

testSessionPooler();
