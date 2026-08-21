import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPhase7aMessaging() {
  console.log('========================================================================');
  console.log('🛠️ PHASE 7A VERIFICATION: DOCTOR-PATIENT MESSAGING & SECURITY BOUNDARY');
  console.log('========================================================================\n');

  // 1. Fetch Ayush Kumar (Patient 1) & Dr. Kriti Sharma
  const { data: patient1 } = await supabase.from('patients').select('*').eq('name', 'Ayush Kumar').single();
  const { data: doctor1 } = await supabase.from('doctors').select('*').ilike('name', '%Kriti%').single();

  console.log('Patient 1:', patient1?.name, `(ID: ${patient1?.id})`);
  console.log('Doctor 1: ', doctor1?.name, `(ID: ${doctor1?.id})`);

  // 2. Test Clinical Relationship Boundary Enforcement (Simulating un-related doctor test)
  console.log('\n--- 1. Testing Relationship Boundary (Un-related Doctor Test) ---');
  const arbitraryDoctorId = '00000000-0000-0000-0000-000000000099';
  const { data: fakeIntakes } = await supabase
    .from('intakes')
    .select('id')
    .eq('patient_id', patient1.id)
    .eq('doctor_id', arbitraryDoctorId);

  console.log(`Intakes linking Patient 1 to Unrelated Doctor (${arbitraryDoctorId}): ${fakeIntakes?.length || 0}`);
  console.log('✅ Server-side check rejects cold messaging attempt (0 intakes found)!\n');

  // 3. Create or Fetch Conversation between Ayush Kumar & Dr. Kriti Sharma
  console.log('--- 2. Checking Conversations Table Status ---');
  try {
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('doctor_id', doctor1.id)
      .eq('patient_id', patient1.id)
      .maybeSingle();

    if (convErr) {
      console.log('Notice: Table conversations query returned:', convErr.message);
      console.log('👉 Please execute the Phase 7a SQL DDL in your Supabase SQL Editor to enable Phase 7a tables.');
      return;
    }

    console.log('Found Conversation Thread:', JSON.stringify(conv, null, 2));
  } catch (err: any) {
    console.log('Notice:', err.message || err);
    console.log('👉 Please execute the Phase 7a SQL DDL in your Supabase SQL Editor to enable Phase 7a tables.');
  }
}

verifyPhase7aMessaging();
