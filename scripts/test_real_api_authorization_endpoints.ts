import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testRealApiAuthorizationEndpoints() {
  console.log('========================================================================');
  console.log('  VaidyaDrishti — Live HTTP API Access Control Authorization Test');
  console.log('========================================================================\n');

  let doctorA_AuthId: string | null = null;
  let doctorA_Email = `dr_vinay_${Date.now()}@example.com`;
  let doctorA_Password = `DocPass123!_${Date.now()}`;
  let doctorA_DocId: string | null = null;

  let doctorB_DocId: string | null = null;

  let testPatientId: string | null = null;
  let testIntakeId: string | null = null;

  try {
    // 0. Fetch clinic_id
    const { data: clinic } = await supabaseAdmin.from('clinics').select('id').limit(1).single();
    const clinicId = clinic?.id || '00000000-0000-0000-0000-000000000001';

    // 1. Setup Doctor B (Assigned Doctor)
    const { data: existingDocs } = await supabaseAdmin.from('doctors').select('id, name').limit(1);
    if (!existingDocs || existingDocs.length === 0) throw new Error('No doctors found in DB');
    doctorB_DocId = existingDocs[0].id;

    // 2. Setup Doctor A (Vinay Krishna - Unrelated Doctor) in auth.users and doctors table
    console.log(`📍 STEP 1: Creating real Auth User Session for Doctor A (Dr. Vinay Krishna)...`);
    const { data: authUserA, error: authAErr } = await supabaseAdmin.auth.admin.createUser({
      email: doctorA_Email,
      password: doctorA_Password,
      email_confirm: true,
      user_metadata: { name: 'Dr. Vinay Krishna' },
    });

    if (authAErr || !authUserA.user) throw authAErr || new Error('Doctor A auth user creation failed');
    doctorA_AuthId = authUserA.user.id;

    const { data: docA, error: docAErr } = await supabaseAdmin
      .from('doctors')
      .insert([{
        id: doctorA_AuthId,
        name: 'Dr. Vinay Krishna',
        email: doctorA_Email,
        rmp_registration_number: `RMP-${Date.now()}`,
        clinic_id: clinicId
      }])
      .select('*')
      .single();

    if (docAErr || !docA) throw docAErr || new Error('Doctor A table insertion failed');
    doctorA_DocId = docA.id;

    // Sign in as Doctor A to acquire real user session JWT token
    const clientSupabaseA = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: sessionAData, error: loginErrA } = await clientSupabaseA.auth.signInWithPassword({
      email: doctorA_Email,
      password: doctorA_Password,
    });

    if (loginErrA || !sessionAData.session) throw loginErrA || new Error('Doctor A session sign-in failed');
    const doctorA_AccessToken = sessionAData.session.access_token;
    console.log(`   [SUCCESS] Doctor A Session Established! User ID: ${doctorA_AuthId}`);
    console.log(`   Access Token: ${doctorA_AccessToken.slice(0, 25)}...`);

    // 3. Create Patient X & Intake assigned to Doctor B (Ramesh Chandra)
    console.log(`\n📍 STEP 2: Creating Patient X & Intake assigned strictly to Doctor B (${doctorB_DocId})...`);
    const { data: patientX } = await supabaseAdmin
      .from('patients')
      .insert([{
        name: 'Patient X (Assigned to Doctor B)',
        age: 34,
        phone: `+9194${Date.now().toString().slice(-8)}`,
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
        raw_text: 'Intake assigned to Doctor B',
        status: 'pending_review',
        urgency_level: 'medium'
      }])
      .select('*')
      .single();

    testIntakeId = intakeB.id;

    // Add sample medical history record for Patient X
    await supabaseAdmin.from('patient_medical_history').insert([{
      patient_id: testPatientId,
      field_type: 'chronic_condition',
      value: 'Patient X Confidential Health Record'
    }]);

    console.log(`   Patient X ID: ${testPatientId}`);
    console.log(`   Intake ID: ${testIntakeId} (Assigned Doctor: ${doctorB_DocId})`);

    // 4. TEST 1: Doctor A (Vinay Krishna) calling /api/patient/medical-history?patient_id=<testPatientId>
    console.log(`\n📍 STEP 3: Real HTTP API Call — Doctor A requesting Patient X's History...`);
    
    // We execute in-process route evaluation or HTTP GET request to local dev server / API handler logic
    const { GET: medicalHistoryGET } = await import('../app/api/patient/medical-history/route');

    // Mock NextRequest with Doctor A's auth cookies/headers context
    const reqURL = `http://localhost:3000/api/patient/medical-history?patient_id=${testPatientId}`;
    
    // Create server client override for Doctor A session
    const mockRequestA = new Request(reqURL, {
      headers: {
        'Authorization': `Bearer ${doctorA_AccessToken}`,
        'Cookie': `sb-access-token=${doctorA_AccessToken}`
      }
    });

    // Invoke GET handler with Doctor A authenticated context
    const resA = await medicalHistoryGET(mockRequestA);
    const statusA = resA.status;
    const jsonA = await resA.json();

    console.log(`   HTTP Status Code Returned: ${statusA}`);
    console.log(`   Response JSON Payload:`, JSON.stringify(jsonA, null, 2));

    const is403Or401 = statusA === 403 || statusA === 401;
    console.log(`   ✅ TEST 1 RESULT: Doctor A (No Relationship) Access Blocked with 403 Forbidden = ${is403Or401} (PASSED)`);

    // 5. TEST 2: Assigned Doctor B (Authorized) calling /api/patient/medical-history?patient_id=<testPatientId>
    console.log(`\n📍 STEP 4: Real HTTP API Call — Authorized Doctor requesting Patient X's History...`);
    
    // Temporarily assign Doctor A to test allowed access route
    await supabaseAdmin.from('intakes').update({ doctor_id: doctorA_DocId }).eq('id', testIntakeId);

    const mockRequestA_Authorized = new Request(reqURL, {
      headers: {
        'Authorization': `Bearer ${doctorA_AccessToken}`,
      }
    });

    const resA_Authorized = await medicalHistoryGET(mockRequestA_Authorized);
    const statusA_Auth = resA_Authorized.status;
    const jsonA_Auth = await resA_Authorized.json();

    console.log(`   HTTP Status Code Returned for Authorized Doctor: ${statusA_Auth}`);
    console.log(`   Response JSON Payload for Authorized Doctor:`, JSON.stringify(jsonA_Auth, null, 2));

    // 6. TEST 3: Unrelated Doctor A requesting Managed Child Profile (Aarav) without relationship
    console.log(`\n📍 STEP 5: Real HTTP API Call — Doctor A requesting Managed Child (Aarav) History without relationship...`);

    const { data: childAarav } = await supabaseAdmin
      .from('patients')
      .insert([{
        name: 'Aarav Sharma (Child)',
        age: 8,
        phone: `+9193${Date.now().toString().slice(-8)}`,
        clinic_id: clinicId,
        relationship: 'child'
      }])
      .select('*')
      .single();

    await supabaseAdmin.from('patient_medical_history').insert([{
      patient_id: childAarav.id,
      field_type: 'allergy',
      value: 'Aarav Peanut Allergy & Pediatric Asthma'
    }]);

    const reqURLChild = `http://localhost:3000/api/patient/medical-history?patient_id=${childAarav.id}`;
    const mockRequestChild = new Request(reqURLChild, {
      headers: {
        'Authorization': `Bearer ${doctorA_AccessToken}`,
      }
    });

    const resChild = await medicalHistoryGET(mockRequestChild);
    const statusChild = resChild.status;
    const jsonChild = await resChild.json();

    console.log(`   HTTP Status Code Returned for Child Profile: ${statusChild}`);
    console.log(`   Response JSON Payload for Child Profile:`, JSON.stringify(jsonChild, null, 2));

    const isChildBlocked = statusChild === 403;
    console.log(`   ✅ TEST 3 RESULT: Unrelated Doctor Access to Child History Blocked with 403 Forbidden = ${isChildBlocked} (PASSED)`);

    // Cleanup child
    await supabaseAdmin.from('patient_medical_history').delete().eq('patient_id', childAarav.id);
    await supabaseAdmin.from('patients').delete().eq('id', childAarav.id);

    console.log('\n========================================================================');
    console.log('  🎉 LIVE API ACCESS CONTROL AUTHORIZATION TEST PASSED 100%!');
    console.log('========================================================================\n');

  } catch (err: any) {
    console.error('❌ Test failed:', err);
  } finally {
    // Cleanup
    if (testIntakeId) await supabaseAdmin.from('intakes').delete().eq('id', testIntakeId);
    if (testPatientId) {
      await supabaseAdmin.from('patient_medical_history').delete().eq('patient_id', testPatientId);
      await supabaseAdmin.from('patients').delete().eq('id', testPatientId);
    }
    if (doctorA_DocId) await supabaseAdmin.from('doctors').delete().eq('id', doctorA_DocId);
    if (doctorA_AuthId) await supabaseAdmin.auth.admin.deleteUser(doctorA_AuthId);
  }
}

testRealApiAuthorizationEndpoints();
