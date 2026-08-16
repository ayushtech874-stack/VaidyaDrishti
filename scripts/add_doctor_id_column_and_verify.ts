import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDoctorIdColumnAndVerify() {
  console.log('🔍 STEP A: Checking columns of intakes table...');

  // Query intakes table selecting only basic valid columns
  const { data: rawIntakes, error: err1 } = await supabase
    .from('intakes')
    .select('id, patient_id, clinic_id, raw_text, urgency_level, status, created_at');

  console.log('RAW INTAKES IN DB WITHOUT doctor_id COLUMN:');
  console.log(JSON.stringify(rawIntakes, null, 2));

  // Let's test if we can run SQL DDL command via rpc exec_sql or add doctor_id
  console.log('\n🔍 STEP B: Testing query with clinic_id only in app/doctor/dashboard/page.tsx...');

  // Simulate dashboard query with clinic_id ONLY (excluding doctor_id column)
  const { data: clinicIntakes, error: err2 } = await supabase
    .from('intakes')
    .select(`
      id,
      clinic_id,
      raw_text,
      structured_data,
      urgency_level,
      red_flags,
      status,
      created_at,
      patients (
        id,
        name,
        age,
        phone
      )
    `)
    .eq('clinic_id', '00000000-0000-0000-0000-000000000022')
    .order('created_at', { ascending: false });

  console.log('\nCLINIC_ID QUERY RESULT COUNT:', clinicIntakes?.length || 0);
  console.log('CLINIC_ID QUERY DATA:', JSON.stringify(clinicIntakes, null, 2));
  console.log('CLINIC_ID QUERY ERROR:', err2);
}

addDoctorIdColumnAndVerify();
