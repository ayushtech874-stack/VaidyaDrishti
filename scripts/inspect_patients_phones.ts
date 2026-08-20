import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPatientsPhones() {
  console.log('🔍 Inspecting Patients Table Rows in Supabase...');

  const { data: patients, error } = await supabase.from('patients').select('*');
  console.log('Patients count:', patients?.length || 0);
  console.log('Error:', error);
  console.log('Patients Rows:', JSON.stringify(patients, null, 2));
}

inspectPatientsPhones();
