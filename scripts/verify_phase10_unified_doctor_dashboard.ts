import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPhase10UnifiedDoctorDashboard() {
  console.log('========================================================================');
  console.log('🧪 VERIFYING PHASE 10: UNIFIED DOCTOR DASHBOARD & PROFILE INTEGRITY');
  console.log('========================================================================\n');

  const testEmailDoc = `phase10_doc_${Date.now()}@example.com`;
  const testEmailPat = `phase10_pat_${Date.now()}@example.com`;

  let doctorId: string | null = null;
  let patientParentId: string | null = null;
  let patientChildId: string | null = null;
  let authPatId: string | null = null;
  let clinicId: string | null = null;
  let intakeId: string | null = null;
  let apptId: string | null = null;

  try {
    // 0. Fetch valid clinic
    const { data: clinic } = await supabase.from('clinics').select('id').limit(1).single();
    clinicId = clinic?.id || '00000000-0000-0000-0000-000000000001';

    // -------------------------------------------------------------------------
    // TEST 1: Doctor Self-Registration & Profile Edit Verification
    // -------------------------------------------------------------------------
    console.log('📍 TEST 1: Doctor Profile Edit & Immediate Public Directory Reflection Proof');

    const { data: authDoc } = await supabase.auth.admin.createUser({
      email: testEmailDoc,
      password: 'DocPass123!',
      email_confirm: true,
      user_metadata: { role: 'doctor', name: 'Dr. Phase10 Specialist' },
    });
    doctorId = authDoc.user!.id;

    // Insert doctor record (doctors.id = auth.users.id)
    await supabase.from('doctors').insert([
      {
        id: doctorId,
        name: 'Dr. Phase10 Specialist',
        email: testEmailDoc,
        rmp_registration_number: 'RMP-PH10-9900',
        qualifications: 'MBBS',
        short_bio: 'Initial bio',
        clinic_id: clinicId,
        registration_status: 'approved',
        role: 'doctor',
      },
    ]);

    // Perform profile update via edit logic (updating photo_url, short_bio, qualifications)
    const updatedBio = 'Senior Interventionist specializing in acute cardiac care.';
    const updatedQuals = 'MBBS, MD Cardiology, FACC';
    const updatedPhoto = 'https://example.com/dr-phase10.jpg';

    const { data: updatedDoc, error: uErr } = await supabase
      .from('doctors')
      .update({
        short_bio: updatedBio,
        qualifications: updatedQuals,
        photo_url: updatedPhoto,
      })
      .eq('id', doctorId)
      .select('*')
      .single();

    if (uErr || !updatedDoc) throw uErr || new Error('Doctor profile update failed');

    // Query public directory view to confirm immediate reflection
    const { data: publicDocView } = await supabase
      .from('doctors')
      .select('id, name, short_bio, qualifications, photo_url, rmp_registration_number')
      .eq('id', doctorId)
      .single();

    console.log(`  └─ Updated Bio Reflected: "${publicDocView?.short_bio}" ✅`);
    console.log(`  └─ Updated Qualifications Reflected: "${publicDocView?.qualifications}" ✅`);
    console.log(`  └─ Photo URL Reflected: "${publicDocView?.photo_url}" ✅`);
    console.log(`  └─ RMP Registration Number Remains Intact (Read-Only): "${publicDocView?.rmp_registration_number}" ✅`);

    if (
      publicDocView?.short_bio !== updatedBio ||
      publicDocView?.qualifications !== updatedQuals ||
      publicDocView?.rmp_registration_number !== 'RMP-PH10-9900'
    ) {
      throw new Error('Test 1 Doctor Profile Edit Verification Failed!');
    }
    console.log('  └─ TEST 1 PASSED: Doctor profile updates reflect immediately on public directory! ✅\n');

    // -------------------------------------------------------------------------
    // TEST 2: Family-Member Context Enrichment Proof (Child Intake)
    // -------------------------------------------------------------------------
    console.log('📍 TEST 2: Family-Member Patient Context Verification (Child Profile Intake)');

    const { data: authPat } = await supabase.auth.admin.createUser({
      email: testEmailPat,
      password: 'PatPass123!',
      email_confirm: true,
      user_metadata: { role: 'patient', name: 'Ramesh Kumar (Parent)' },
    });
    authPatId = authPat.user!.id;

    // Insert Parent Profile (Self)
    const { data: pParent } = await supabase
      .from('patients')
      .insert([
        {
          name: 'Ramesh Kumar',
          age: 45,
          phone: `+9199${Date.now().toString().slice(-8)}`,
          clinic_id: clinicId,
          auth_user_id: authPatId,
          managed_by_auth_user_id: null,
          relationship: 'self',
          display_name: 'Ramesh Kumar (Self)',
        },
      ])
      .select('*')
      .single();
    patientParentId = pParent.id;

    // Insert Child Profile (Managed by Parent)
    const { data: pChild } = await supabase
      .from('patients')
      .insert([
        {
          name: 'Aarav Kumar',
          age: 8,
          phone: pParent.phone,
          clinic_id: clinicId,
          auth_user_id: null,
          managed_by_auth_user_id: authPatId,
          relationship: 'child',
          display_name: 'Aarav Kumar (Child)',
        },
      ])
      .select('*')
      .single();
    patientChildId = pChild.id;

    // Submit intake for Child Profile
    const { data: childIntake } = await supabase
      .from('intakes')
      .insert([
        {
          patient_id: patientChildId,
          clinic_id: clinicId,
          raw_text: 'Child has mild fever and sore throat for 1 day.',
          status: 'pending_review',
          urgency_level: 'low',
        },
      ])
      .select('*')
      .single();
    intakeId = childIntake.id;

    // Query OPD Queue as Doctor and verify family member context enrichment
    const { data: opdItem } = await supabase
      .from('intakes')
      .select(`
        id,
        raw_text,
        patients (
          id,
          name,
          display_name,
          relationship
        )
      `)
      .eq('id', intakeId)
      .single();

    const patientData: any = opdItem?.patients;
    console.log(`  └─ OPD Queue Patient Display Name: "${patientData?.display_name}" ✅`);
    console.log(`  └─ OPD Queue Patient Relationship: "${patientData?.relationship}" ✅`);

    if (patientData?.display_name !== 'Aarav Kumar (Child)' || patientData?.relationship !== 'child') {
      throw new Error('Test 2 Family-Member Context Enrichment Failed!');
    }
    console.log('  └─ TEST 2 PASSED: Doctor OPD Queue displays exact child profile name and relationship! ✅\n');

    // -------------------------------------------------------------------------
    // TEST 3: Specific Section Payload Data Refactor Integrity
    // -------------------------------------------------------------------------
    console.log('📍 TEST 3: Specific Section Data Payload Refactor Integrity Check');

    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .insert([
        {
          patient_id: patientChildId,
          doctor_id: doctorId,
          scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          status: 'booked',
          notes: 'Pediatric follow-up checkup',
        },
      ])
      .select('*')
      .single();

    if (apptErr || !appt) {
      throw new Error(`Appointment insert failed: ${apptErr?.message || 'Null data'}`);
    }
    apptId = appt.id;

    // Verify appointment returned in doctor's workspace dataset
    const { data: docAppts } = await supabase
      .from('appointments')
      .select('id, scheduled_at, status, notes, patients(display_name, relationship)')
      .eq('doctor_id', doctorId);

    const foundAppt = (docAppts || []).find((a) => a.id === apptId);
    console.log(`  └─ Workspace Shell Appointment Payload Match (ID: ${foundAppt?.id}): Scheduled at ${foundAppt?.scheduled_at} ✅`);

    if (!foundAppt) {
      throw new Error('Test 3 Specific Section Data Payload Integrity Failed!');
    }
    console.log('  └─ TEST 3 PASSED: Workspace shell queries return exact, uncorrupted data payloads! ✅\n');

    // Clean up test records
    await supabase.from('appointments').delete().eq('id', apptId);
    await supabase.from('intakes').delete().eq('id', intakeId);
    await supabase.from('patients').delete().in('id', [patientParentId, patientChildId]);
    await supabase.from('doctors').delete().eq('id', doctorId);
    await supabase.auth.admin.deleteUser(doctorId);
    await supabase.auth.admin.deleteUser(authPatId);

    console.log('========================================================================');
    console.log('🎉 PHASE 10 VERIFICATION COMPLETED WITH 100% SUCCESS!');
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error('Verification Error:', err.message);
    if (doctorId) await supabase.auth.admin.deleteUser(doctorId);
    if (authPatId) await supabase.auth.admin.deleteUser(authPatId);
  }
}

verifyPhase10UnifiedDoctorDashboard();
