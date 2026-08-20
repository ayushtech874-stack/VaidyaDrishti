import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPatientsAuthUserId() {
  console.log('🔍 Testing Patients Table Columns with Service Role Key...');

  const { data, error } = await supabase
    .from('patients')
    .select('id, name, phone, age, auth_user_id')
    .limit(5);

  console.log('Select Result:', data);
  console.log('Select Error:', error);
}

testPatientsAuthUserId();
