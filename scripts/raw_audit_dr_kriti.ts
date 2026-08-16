import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function rawAuditDrKriti() {
  console.log('=== STEP 1: RAW QUERY ON DOCTORS TABLE ===');
  const { data: docRows, error: docErr } = await supabase
    .from('doctors')
    .select('id, name, email, clinic_id, department_id, rmp_registration_number, role')
    .ilike('name', '%kriti%');

  console.log('DOCTORS_TABLE_QUERY_RESULT:', JSON.stringify(docRows, null, 2));
  console.log('DOCTORS_TABLE_QUERY_ERROR:', docErr);

  console.log('\n=== STEP 2: RAW QUERY ON SUPABASE AUTH USERS ===');
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  const kritiAuth = authData?.users.find((u) => u.email?.toLowerCase().includes('kriti'));

  console.log('AUTH_USER_OBJECT:', JSON.stringify(
    kritiAuth
      ? {
          id: kritiAuth.id,
          email: kritiAuth.email,
          role: kritiAuth.role,
          created_at: kritiAuth.created_at,
          last_sign_in_at: kritiAuth.last_sign_in_at,
        }
      : null,
    null,
    2
  ));
  console.log('AUTH_USERS_ERROR:', authErr);

  console.log('\n=== STEP 3: CHARACTER-BY-CHARACTER COMPARISON ===');
  const doctorTableId = docRows && docRows.length > 0 ? docRows[0].id : 'NOT_FOUND';
  const authUserId = kritiAuth ? kritiAuth.id : 'NOT_FOUND';

  console.log(`DOCTORS_TABLE_ID: "${doctorTableId}"`);
  console.log(`AUTH_USERS_ID:    "${authUserId}"`);
  console.log(`ARE_THEY_IDENTICAL: ${doctorTableId === authUserId ? 'YES' : 'NO'}`);

  console.log('\n=== STEP 4: RAW QUERY ON INTAKES FOR HEALING TOUCH HOSPITAL ===');
  const healingTouchClinicId = docRows && docRows.length > 0 ? docRows[0].clinic_id : '00000000-0000-0000-0000-000000000022';
  
  const { data: intakeRows, error: intakeErr } = await supabase
    .from('intakes')
    .select('id, clinic_id, doctor_id, raw_text, status, created_at')
    .eq('clinic_id', healingTouchClinicId);

  console.log('INTAKES_QUERY_RESULT:', JSON.stringify(intakeRows, null, 2));
  console.log('INTAKES_QUERY_ERROR:', intakeErr);

  // If Auth ID and Doctor Table ID differ, perform repair
  if (kritiAuth && docRows && docRows.length > 0 && doctorTableId !== authUserId) {
    console.log('\n=== REPAIRING DOCTOR ID & FOREIGN KEYS ===');
    const oldId = doctorTableId;
    const newId = authUserId;

    // a. Update Intakes doctor_id
    const { data: updatedIntakes, error: uIntakeErr } = await supabase
      .from('intakes')
      .update({ doctor_id: newId })
      .eq('doctor_id', oldId)
      .select('id, doctor_id');
    console.log('UPDATED_INTAKES_COUNT:', updatedIntakes?.length || 0);

    // b. Update Doctors row ID
    const oldRow = docRows[0];
    await supabase.from('doctors').delete().eq('id', oldId);
    const { data: newDocRow } = await supabase.from('doctors').insert([{ ...oldRow, id: newId }]).select('*');
    console.log('NEW_DOCTORS_ROW:', JSON.stringify(newDocRow, null, 2));
  }

  console.log('\n=== STEP 5: SIMULATING DOCTOR DASHBOARD QUERY ===');
  // Exact query executed by DoctorDashboardPage server component
  const simAuthId = kritiAuth?.id || doctorTableId;
  const simEmail = kritiAuth?.email || docRows?.[0]?.email;

  // 1. Fetch Doctor Profile
  const { data: dashDoc, error: dashDocErr } = await supabase
    .from('doctors')
    .select('id, name, email, rmp_registration_number, clinic_id, department_id, role')
    .or(`id.eq.${simAuthId}${simEmail ? `,email.eq.${simEmail}` : ''}`)
    .maybeSingle();

  console.log('DASHBOARD_DOCTOR_PROFILE_RESULT:', JSON.stringify(dashDoc, null, 2));
  console.log('DASHBOARD_DOCTOR_PROFILE_ERROR:', dashDocErr);

  if (dashDoc) {
    // 2. Fetch Intakes Queue
    const { data: dashIntakes, error: dashIntakeErr } = await supabase
      .from('intakes')
      .select(`
        id,
        clinic_id,
        doctor_id,
        raw_text,
        urgency_level,
        status,
        created_at,
        patients (
          id,
          name,
          age,
          phone
        )
      `)
      .or(`doctor_id.eq.${dashDoc.id},clinic_id.eq.${dashDoc.clinic_id}`)
      .order('created_at', { ascending: false });

    console.log('DASHBOARD_INTAKES_QUEUE_ROW_COUNT:', dashIntakes?.length || 0);
    console.log('DASHBOARD_INTAKES_QUEUE_FULL_DATA:', JSON.stringify(dashIntakes, null, 2));
    console.log('DASHBOARD_INTAKES_QUEUE_ERROR:', dashIntakeErr);
  }
}

rawAuditDrKriti();
