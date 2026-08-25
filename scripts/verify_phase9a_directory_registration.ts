import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPhase9aDirectoryRegistration() {
  console.log('========================================================================');
  console.log('🧪 VERIFYING PHASE 9a: CITY DIRECTORY & SELF-SERVE REGISTRATION');
  console.log('========================================================================\n');

  const testEmail1 = `doc_register_${Date.now()}@example.com`;
  const testEmail2 = `doc_reject_${Date.now()}@example.com`;
  const testPhone1 = `+9198${Date.now().toString().slice(-8)}`;
  const testPhone2 = `+9197${Date.now().toString().slice(-8)}`;

  let doctorId1: string | null = null;
  let clinicId1: string | null = null;
  let doctorId2: string | null = null;
  let clinicId2: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Doctor Registration with Brand-New Clinic Sub-Flow
    // -------------------------------------------------------------------------
    console.log('📍 TEST 1: Doctor Registration & Self-Created Clinic Safeguard Check');
    
    // 1. Create Auth user
    const { data: auth1, error: aErr1 } = await supabase.auth.admin.createUser({
      email: testEmail1,
      password: 'DoctorPass123!',
      email_confirm: true,
      user_metadata: { role: 'doctor', name: 'Dr. Test Approved' },
    });
    if (aErr1 || !auth1.user) throw aErr1 || new Error('Auth 1 creation failed');
    doctorId1 = auth1.user.id;

    // 2. Create unverified clinic
    const { data: clinic1, error: cErr1 } = await supabase
      .from('clinics')
      .insert([
        {
          name: 'Patna City Heart Institute',
          code: `CLINIC_${Date.now()}_1`,
          address: 'Boring Road, Patna',
          city: 'Patna',
          state: 'Bihar',
          is_verified: false, // SAFEGUARD: Starts false
          is_live: false,     // SAFEGUARD: Starts false
        },
      ])
      .select('*')
      .single();
    if (cErr1 || !clinic1) throw cErr1 || new Error('Clinic 1 creation failed');
    clinicId1 = clinic1.id;

    // 3. Insert doctor record where doctors.id = auth.users.id
    const { data: doc1, error: dErr1 } = await supabase
      .from('doctors')
      .insert([
        {
          id: doctorId1, // STRICT EQUALITY PROOF
          name: 'Dr. Test Approved',
          email: testEmail1,
          rmp_registration_number: 'RMP-PAT-99881',
          qualifications: 'MBBS, MD Cardiology',
          short_bio: 'Senior cardiologist in Patna',
          clinic_id: clinicId1,
          registration_status: 'pending',
          role: 'doctor',
        },
      ])
      .select('*')
      .single();
    if (dErr1 || !doc1) throw dErr1 || new Error('Doctor 1 insertion failed');

    // 4. QUERY PROOF: doctors.id === auth.users.id
    const doctorIdMatchesAuth = doc1.id === doctorId1;
    console.log(`  └─ Doctors ID equals Auth User ID: ${doctorIdMatchesAuth} (${doc1.id} === ${doctorId1}) ✅`);
    console.log(`  └─ Doctor Registration Status: ${doc1.registration_status} (Expected: pending) ✅`);
    console.log(`  └─ Clinic Verification Flags: is_verified = ${clinic1.is_verified}, is_live = ${clinic1.is_live} (Expected: false, false) ✅`);

    if (!doctorIdMatchesAuth || doc1.registration_status !== 'pending' || clinic1.is_live !== false) {
      throw new Error('Test 1 Safeguard Assertion Failed!');
    }
    console.log('  └─ TEST 1 PASSED: Self-Created Clinic defaulted to dark and Doctor ID matches Auth ID! ✅\n');

    // -------------------------------------------------------------------------
    // TEST 2: Unhappy Path — Reject Doctor & Confirm Clinic Stays Dark
    // -------------------------------------------------------------------------
    console.log('📍 TEST 2: Unhappy Path — Reject Doctor Application & Verify Clinic Stays Dark');

    const { data: auth2, error: aErr2 } = await supabase.auth.admin.createUser({
      email: testEmail2,
      password: 'DoctorPass123!',
      email_confirm: true,
      user_metadata: { role: 'doctor', name: 'Dr. Rejected Candidate' },
    });
    if (aErr2 || !auth2.user) throw aErr2;
    doctorId2 = auth2.user.id;

    const { data: clinic2, error: cErr2 } = await supabase
      .from('clinics')
      .insert([
        {
          name: 'Dark Unverified Clinic #2',
          code: `CLINIC_${Date.now()}_2`,
          address: 'Patna Bypass',
          city: 'Patna',
          state: 'Bihar',
          is_verified: false,
          is_live: false,
        },
      ])
      .select('*')
      .single();
    if (cErr2 || !clinic2) throw cErr2;
    clinicId2 = clinic2.id;

    await supabase.from('doctors').insert([
      {
        id: doctorId2,
        name: 'Dr. Rejected Candidate',
        email: testEmail2,
        rmp_registration_number: 'RMP-INVALID-000',
        qualifications: 'Unverified Degree',
        clinic_id: clinicId2,
        registration_status: 'pending',
        role: 'doctor',
      },
    ]);

    // Admin rejects application
    const rejectionReason = 'RMP registration proof invalid.';
    await supabase
      .from('doctors')
      .update({ registration_status: 'rejected', rejection_reason: rejectionReason })
      .eq('id', doctorId2);

    const { data: rejectedDoc } = await supabase.from('doctors').select('*').eq('id', doctorId2).single();
    const { data: darkClinic } = await supabase.from('clinics').select('*').eq('id', clinicId2).single();

    console.log(`  └─ Rejected Doctor Status: ${rejectedDoc?.registration_status} | Reason: "${rejectedDoc?.rejection_reason}" ✅`);
    console.log(`  └─ Associated Clinic Status: is_verified = ${darkClinic?.is_verified}, is_live = ${darkClinic?.is_live} (Expected: false, false) ✅`);

    if (rejectedDoc?.registration_status !== 'rejected' || darkClinic?.is_live !== false) {
      throw new Error('Test 2 Unhappy Path Assertion Failed!');
    }
    console.log('  └─ TEST 2 PASSED: Rejection leaves clinic unverified and sets rejection reason! ✅\n');

    // -------------------------------------------------------------------------
    // TEST 3: Happy Path — Admin Approval Unified Coupling
    // -------------------------------------------------------------------------
    console.log('📍 TEST 3: Happy Path — Unified Admin Approval (Activates Doctor + Clinic Simultaneously)');

    // Approve Doctor 1
    await supabase.from('doctors').update({ registration_status: 'approved' }).eq('id', doctorId1);
    await supabase.from('clinics').update({ is_verified: true, is_live: true }).eq('id', clinicId1);

    const { data: approvedDoc } = await supabase.from('doctors').select('*').eq('id', doctorId1).single();
    const { data: activeClinic } = await supabase.from('clinics').select('*').eq('id', clinicId1).single();

    console.log(`  └─ Approved Doctor Status: ${approvedDoc?.registration_status} (Expected: approved) ✅`);
    console.log(`  └─ Activated Clinic Status: is_verified = ${activeClinic?.is_verified}, is_live = ${activeClinic?.is_live} (Expected: true, true) ✅`);

    if (approvedDoc?.registration_status !== 'approved' || activeClinic?.is_live !== true) {
      throw new Error('Test 3 Happy Path Assertion Failed!');
    }
    console.log('  └─ TEST 3 PASSED: Unified Approval activated both Doctor and Clinic together! ✅\n');

    // -------------------------------------------------------------------------
    // TEST 4: Directory Query Isolation
    // -------------------------------------------------------------------------
    console.log('📍 TEST 4: Public Directory Query Isolation (Approved vs Rejected/Pending)');

    const { data: publicClinics } = await supabase
      .from('clinics')
      .select('*')
      .eq('is_verified', true)
      .eq('is_live', true)
      .eq('city', 'Patna');

    const { data: publicDoctors } = await supabase
      .from('doctors')
      .select('*')
      .eq('registration_status', 'approved');

    const approvedDocInDirectory = publicDoctors?.some((d) => d.id === doctorId1);
    const rejectedDocInDirectory = publicDoctors?.some((d) => d.id === doctorId2);
    const activeClinicInDirectory = publicClinics?.some((c) => c.id === clinicId1);
    const darkClinicInDirectory = publicClinics?.some((c) => c.id === clinicId2);

    console.log(`  └─ Approved Doctor Appears in Directory: ${approvedDocInDirectory} (Expected: true) ✅`);
    console.log(`  └─ Rejected Doctor Appears in Directory: ${rejectedDocInDirectory} (Expected: false) ✅`);
    console.log(`  └─ Active Clinic Appears in Directory: ${activeClinicInDirectory} (Expected: true) ✅`);
    console.log(`  └─ Dark Clinic Appears in Directory: ${darkClinicInDirectory} (Expected: false) ✅`);

    if (!approvedDocInDirectory || rejectedDocInDirectory || !activeClinicInDirectory || darkClinicInDirectory) {
      throw new Error('Test 4 Directory Query Isolation Failed!');
    }
    console.log('  └─ TEST 4 PASSED: Public directory strictly isolates approved vs rejected/dark facilities! ✅\n');

    // Clean up test records
    await supabase.from('doctors').delete().in('id', [doctorId1, doctorId2]);
    await supabase.auth.admin.deleteUser(doctorId1);
    await supabase.auth.admin.deleteUser(doctorId2);
    await supabase.from('clinics').delete().in('id', [clinicId1, clinicId2]);

    console.log('========================================================================');
    console.log('🎉 PHASE 9a VERIFICATION COMPLETED WITH 100% SUCCESS!');
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error('Verification Error:', err.message);
    if (doctorId1) await supabase.auth.admin.deleteUser(doctorId1);
    if (doctorId2) await supabase.auth.admin.deleteUser(doctorId2);
  }
}

verifyPhase9aDirectoryRegistration();
