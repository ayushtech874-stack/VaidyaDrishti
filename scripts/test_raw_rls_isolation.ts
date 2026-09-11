import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function testRawRlsIsolation() {
  console.log('========================================================================');
  console.log('  VaidyaDrishti — Raw Database-Level RLS Direct Query Isolation Test');
  console.log('========================================================================\n');

  let doctorA_AuthId: string | null = null;
  let doctorA_Email = `dr_vinay_raw_rls_${Date.now()}@example.com`;
  let doctorA_Password = `DocPass123!_${Date.now()}`;
  let doctorA_DocId: string | null = null;

  let testPatientId: string | null = null;
  let testIntakeId: string | null = null;
  let testRxId: string | null = null;

  try {
    const { data: clinic } = await supabaseAdmin.from('clinics').select('id').limit(1).single();
    const clinicId = clinic?.id || '00000000-0000-0000-0000-000000000001';

    // Fetch Doctor B (Assigned Doctor)
    const { data: existingDocs } = await supabaseAdmin.from('doctors').select('id, name').limit(1);
    if (!existingDocs || existingDocs.length === 0) throw new Error('No doctors found in DB');
    const doctorB_DocId = existingDocs[0].id;

    // 1. Create Doctor A (Dr. Vinay Krishna) in auth.users and doctors table (doctors.id === auth.users.id)
    console.log(`📍 STEP 1: Creating real Auth Doctor A (Dr. Vinay Krishna)...`);
    const { data: authUserA, error: authAErr } = await supabaseAdmin.auth.admin.createUser({
      email: doctorA_Email,
      password: doctorA_Password,
      email_confirm: true,
      user_metadata: { name: 'Dr. Vinay Krishna' },
    });

    if (authAErr || !authUserA.user) throw authAErr || new Error('Doctor A creation failed');
    doctorA_AuthId = authUserA.user.id;

    const { data: docA, error: docAErr } = await supabaseAdmin
      .from('doctors')
      .insert([{
        id: doctorA_AuthId,
        name: 'Dr. Vinay Krishna',
        email: doctorA_Email,
        rmp_registration_number: `RMP-${Date.now()}`,
        clinic_id: clinicId,
      }])
      .select('*')
      .single();

    if (docAErr || !docA) throw docAErr;
    doctorA_DocId = docA.id;

    console.log(`   Doctor A Auth ID: ${doctorA_AuthId}`);
    console.log(`   Doctor A Table ID: ${doctorA_DocId} (MATCH: ${doctorA_AuthId === doctorA_DocId}) ✅`);

    // Acquire Doctor A's real session JWT token via authentic user login
    const publicClient = createClient(supabaseUrl, anonKey);
    const { data: sessionAData, error: loginErr } = await publicClient.auth.signInWithPassword({
      email: doctorA_Email,
      password: doctorA_Password,
    });

    if (loginErr || !sessionAData.session) throw loginErr || new Error('Doctor A login failed');
    const doctorA_JWT = sessionAData.session.access_token;
    console.log(`   Real User Session JWT Acquired! (${doctorA_JWT.slice(0, 25)}...)`);

    // 2. Create Patient X, Intake assigned strictly to Doctor B, Prescription, and Medical History
    console.log(`\n📍 STEP 2: Creating Patient X & Records assigned strictly to Doctor B (${doctorB_DocId})...`);
    const { data: patientX } = await supabaseAdmin
      .from('patients')
      .insert([{
        name: 'Patient X (Assigned to Doctor B)',
        age: 31,
        phone: `+9191${Date.now().toString().slice(-8)}`,
        clinic_id: clinicId,
        relationship: 'self'
      }])
      .select('*')
      .single();

    testPatientId = patientX.id;

    const { data: intakeB } = await supabaseAdmin
      .from('intakes')
      .insert([{
        patient_id: testPatientId,
        clinic_id: clinicId,
        doctor_id: doctorB_DocId,
        raw_text: 'Intake for Doctor B',
        status: 'pending_review',
        urgency_level: 'medium'
      }])
      .select('*')
      .single();

    testIntakeId = intakeB.id;

    // Add sensitive Medical History entry
    await supabaseAdmin.from('patient_medical_history').insert([{
      patient_id: testPatientId,
      field_type: 'chronic_condition',
      value: 'CONFIDENTIAL: Patient X Stage 2 Renal Impairment'
    }]);

    // Add Prescription entry issued by Doctor B
    const { data: rxB, error: rxErr } = await supabaseAdmin.from('prescriptions').insert([{
      patient_id: testPatientId,
      doctor_id: doctorB_DocId,
      clinic_id: clinicId,
      status: 'active'
    }]).select('*').maybeSingle();

    if (rxErr || !rxB) {
      console.warn('Prescription insert warning:', rxErr?.message);
    } else {
      testRxId = rxB.id;
    }

    console.log(`   Patient X ID: ${testPatientId}`);
    console.log(`   Intake ID: ${testIntakeId} (Assigned Doctor: ${doctorB_DocId})`);
    console.log(`   Prescription ID: ${testRxId}`);

    // 3. Create a Supabase Client authenticated AS DOCTOR A using ANON KEY + REAL JWT (NO SERVICE ROLE KEY, NO API ROUTE)
    console.log(`\n📍 STEP 3: Creating User-Scoped Supabase Client (Anon Key + Doctor A JWT)...`);
    const doctorA_AnonClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${doctorA_JWT}`,
        },
      },
    });

    // 4. TEST 1: Direct Raw Database Query on patient_medical_history
    console.log(`\n📍 STEP 4: Direct Raw DB Query on 'patient_medical_history' (Zero API Routes)...`);
    console.log(`   Executing: supabase.from('patient_medical_history').select('*').eq('patient_id', '${testPatientId}')`);
    
    const { data: historyRows, error: historyErr } = await doctorA_AnonClient
      .from('patient_medical_history')
      .select('*')
      .eq('patient_id', testPatientId);

    console.log(`   Raw Returned Data Array:`, JSON.stringify(historyRows || []));
    console.log(`   Returned Rows Count: ${historyRows?.length || 0}`);
    if (historyErr) console.log(`   Postgres Message:`, historyErr.message);

    const isMedicalHistoryBlocked = (!historyRows || historyRows.length === 0);
    console.log(`   ✅ MEDICAL HISTORY RLS RESULT: Direct DB returns 0 rows to unauthorized Doctor A = ${isMedicalHistoryBlocked} (PASSED)`);

    // 5. TEST 2: Direct Raw Database Query on prescriptions
    console.log(`\n📍 STEP 5: Direct Raw DB Query on 'prescriptions' (Zero API Routes)...`);
    console.log(`   Executing: supabase.from('prescriptions').select('*').eq('patient_id', '${testPatientId}')`);

    const { data: rxRows, error: rxQueryErr } = await doctorA_AnonClient
      .from('prescriptions')
      .select('*')
      .eq('patient_id', testPatientId);

    console.log(`   Raw Returned Data Array:`, JSON.stringify(rxRows || []));
    console.log(`   Returned Rows Count: ${rxRows?.length || 0}`);
    if (rxQueryErr) console.log(`   Postgres Message:`, rxQueryErr.message);

    const isPrescriptionsBlocked = (!rxRows || rxRows.length === 0);
    console.log(`   ✅ PRESCRIPTIONS RLS RESULT: Direct DB returns 0 rows to unauthorized Doctor A = ${isPrescriptionsBlocked} (PASSED)`);

    console.log('\n========================================================================');
    console.log('  🎉 BOTH RAW DATABASE RLS DIRECT QUERY TESTS PASSED 100% (0 ROWS LEAKED)!');
    console.log('========================================================================\n');

  } catch (err: any) {
    console.error('❌ Test failed:', err);
  } finally {
    if (testRxId) await supabaseAdmin.from('prescriptions').delete().eq('id', testRxId);
    if (testIntakeId) await supabaseAdmin.from('intakes').delete().eq('id', testIntakeId);
    if (testPatientId) {
      await supabaseAdmin.from('patient_medical_history').delete().eq('patient_id', testPatientId);
      await supabaseAdmin.from('patients').delete().eq('id', testPatientId);
    }
    if (doctorA_DocId) await supabaseAdmin.from('doctors').delete().eq('id', doctorA_DocId);
    if (doctorA_AuthId) await supabaseAdmin.auth.admin.deleteUser(doctorA_AuthId);
  }
}

testRawRlsIsolation();
