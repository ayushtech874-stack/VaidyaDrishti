import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testQuery() {
  const anonClient = createClient(supabaseUrl, anonKey);
  const serviceClient = createClient(supabaseUrl, serviceKey);

  console.log('Testing anon query on intakes...');
  const { data: anonData, error: anonErr } = await anonClient
    .from('intakes')
    .select('id, raw_text, patients(name)')
    .limit(1);
  console.log('Anon Query:', { count: anonData?.length, error: anonErr?.message });

  console.log('Testing service role query on intakes...');
  const { data: serviceData, error: serviceErr } = await serviceClient
    .from('intakes')
    .select('id, raw_text, patients(name)')
    .limit(1);
  console.log('Service Role Query:', { count: serviceData?.length, error: serviceErr?.message });
}

testQuery();
