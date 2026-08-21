import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPhase6aDbLive() {
  console.log('🔍 VERIFYING DATABASE CONNECTION & PHASE 6A DDL TABLES...\n');

  // 1. Verify patients table auth_user_id column
  const { data: patientRows, error: pErr } = await supabase
    .from('patients')
    .select('id, name, phone, auth_user_id')
    .limit(3);

  console.log('1. PATIENTS TABLE QUERY RESULT:');
  console.log('   Error:', pErr ? pErr.message : 'None (SUCCESS)');
  console.log('   Sample Rows:', JSON.stringify(patientRows, null, 2));

  // 2. Verify patient_medical_history table
  const { data: histRows, error: hErr } = await supabase
    .from('patient_medical_history')
    .select('*')
    .limit(3);

  console.log('\n2. PATIENT_MEDICAL_HISTORY TABLE QUERY RESULT:');
  console.log('   Error:', hErr ? hErr.message : 'None (SUCCESS)');
  console.log('   Rows Count:', histRows?.length || 0);

  // 3. Verify patient_documents table
  const { data: docRows, error: dErr } = await supabase
    .from('patient_documents')
    .select('*')
    .limit(3);

  console.log('\n3. PATIENT_DOCUMENTS TABLE QUERY RESULT:');
  console.log('   Error:', dErr ? dErr.message : 'None (SUCCESS)');
  console.log('   Rows Count:', docRows?.length || 0);

  // 4. Verify patient-documents Storage Bucket
  const { data: buckets } = await supabase.storage.listBuckets();
  const patientBucket = buckets?.find((b) => b.name === 'patient-documents');

  console.log('\n4. STORAGE BUCKET VERIFICATION:');
  console.log('   Bucket patient-documents Found:', Boolean(patientBucket));
  console.log('   Bucket Public Flag:', patientBucket?.public ? 'Public' : 'Private (Correct)');

  console.log('\n========================================================================');
  if (!pErr && !hErr && !dErr && patientBucket) {
    console.log('🎉 ALL DATABASE TABLES & STORAGE BUCKETS ARE PROPERLY CONNECTED & READY!');
  } else {
    console.log('⚠️ Database schema verification detected pending DDL commands.');
  }
  console.log('========================================================================\n');
}

verifyPhase6aDbLive();
