import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyPhase6aSchema() {
  console.log('🛠️ Applying Phase 6a Schema Updates for Patient Dashboard & Account System...\n');

  // 1. Check if auth_user_id column exists on patients table, add if missing
  const { data: patientsSample, error: pErr } = await supabase
    .from('patients')
    .select('id, name, phone, age, gender')
    .limit(1);

  console.log('Existing Patients Table Sample:', patientsSample, 'Error:', pErr);

  // Use RPC or REST query to ensure columns & tables exist
  // We will run DDL commands via Supabase SQL or REST if available, or create tables programmatically
  // Let's create an RPC or execute SQL via postgres connection if needed, or verify table structures.
  
  console.log('Checking tables: patient_medical_history & patient_documents...');
  
  const { error: histErr } = await supabase.from('patient_medical_history').select('id').limit(1);
  console.log('patient_medical_history check error (42P01 if missing):', histErr?.code, histErr?.message);

  const { error: docErr } = await supabase.from('patient_documents').select('id').limit(1);
  console.log('patient_documents check error (42P01 if missing):', docErr?.code, docErr?.message);
}

applyPhase6aSchema();
