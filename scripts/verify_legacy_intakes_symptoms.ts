import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectRawIntakes() {
  console.log('🔍 Fetching raw rows from intakes table...\n');

  const { data: intakes, error } = await supabase.from('intakes').select('*');
  console.log('Raw Intakes:', JSON.stringify(intakes, null, 2), error);

  console.log('\n🔍 Fetching raw rows from patients table...\n');
  const { data: patients } = await supabase.from('patients').select('id, name, age, phone');
  console.log('Patients:', JSON.stringify(patients, null, 2));
}

inspectRawIntakes();
