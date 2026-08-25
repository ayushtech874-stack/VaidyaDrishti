import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDoctorKeys() {
  const { data } = await supabase.from('doctors').select('*').limit(1);
  if (data && data[0]) {
    console.log('Doctors Keys:', Object.keys(data[0]));
  }
}

inspectDoctorKeys();
