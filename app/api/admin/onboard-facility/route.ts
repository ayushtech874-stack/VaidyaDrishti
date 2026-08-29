// ==============================================================================
// 🛡️ HARD ADMIN-PATIENT-DATA ISOLATION GUARANTEE
// This route must never return patient-identifiable data — admin access is
// strictly limited to facility/doctor management and aggregate metrics only.
// ==============================================================================

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let pass = 'VaidyaDoc2026!';
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    // 1. Server-side Super-Admin Role Gate
    let isSuperAdmin = false;
    if (user) {
      const userEmailNorm = user.email?.toLowerCase().trim();
      if (
        user.user_metadata?.role === 'super_admin' ||
        user.app_metadata?.role === 'super_admin' ||
        userEmailNorm === 'admin@vaidyadrishti.com'
      ) {
        isSuperAdmin = true;
      }
    }

    if (!isSuperAdmin && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized. Super-Admin authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      facility_name,
      facility_code,
      facility_type,
      address,
      department_name,
      doctor_name,
      doctor_email,
      doctor_rmp_number,
      qualifications,
      is_general_triage,
      auto_verify,
    } = body;

    if (!facility_name || !facility_code || !doctor_name || !doctor_email) {
      return NextResponse.json({ error: 'Missing required onboarding parameters.' }, { status: 400 });
    }

    const tempPassword = generateTempPassword();
    const isVerifiedVal = Boolean(auto_verify);
    const isLiveVal = Boolean(auto_verify);

    // 2. Create Supabase Auth Account
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: doctor_email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: doctor_name.trim(), role: 'doctor' },
      app_metadata: { role: 'doctor' },
    });

    let doctorUserId = authData?.user?.id;
    if (authErr) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users.users.find((u) => u.email?.toLowerCase().trim() === doctor_email.trim().toLowerCase());
      if (existingUser) {
        doctorUserId = existingUser.id;
      } else {
        return NextResponse.json({ error: `Auth Error: ${authErr.message}` }, { status: 500 });
      }
    }

    if (!doctorUserId) {
      return NextResponse.json({ error: 'Failed to resolve Doctor Auth User ID.' }, { status: 500 });
    }

    // 3. Create or Fetch Clinic Record
    let clinicId: string;
    const { data: existingClinic } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('code', facility_code.trim().toUpperCase())
      .maybeSingle();

    if (existingClinic) {
      clinicId = existingClinic.id;
    } else {
      const { data: newClinic, error: clinicErr } = await supabaseAdmin
        .from('clinics')
        .insert([
          {
            name: facility_name.trim(),
            code: facility_code.trim().toUpperCase(),
            facility_type: facility_type || 'hospital',
            address: address || 'OPD Medical Complex',
            is_verified: isVerifiedVal,
            is_live: isLiveVal,
          },
        ])
        .select('id')
        .single();

      if (clinicErr) throw clinicErr;
      clinicId = newClinic.id;
    }

    // 4. Create Department if specified
    let departmentId: string | null = null;
    if (department_name) {
      const deptCode = `DEPT_${facility_code.trim().toUpperCase()}_${department_name.trim().toUpperCase().replace(/\s+/g, '')}`;
      const { data: newDept } = await supabaseAdmin
        .from('departments')
        .insert([
          {
            clinic_id: clinicId,
            name: department_name.trim(),
            code: deptCode,
          },
        ])
        .select('id')
        .single();

      if (newDept) {
        departmentId = newDept.id;
      }
    }

    // 5. Create Doctor Profile with EXPLICIT doctors.id === authUser.id!
    const { data: doctorRow, error: doctorErr } = await supabaseAdmin
      .from('doctors')
      .upsert([
        {
          id: doctorUserId, // STRICT EQUALITY GUARANTEE: doctors.id === auth.users.id
          name: doctor_name.trim(),
          email: doctor_email.trim(),
          rmp_registration_number: doctor_rmp_number || 'VERIFIED-RMP',
          qualifications: qualifications || 'MBBS, MD',
          clinic_id: clinicId,
          department_id: departmentId,
          role: 'doctor',
          is_general_triage: Boolean(is_general_triage),
          is_verified: isVerifiedVal,
          is_live: isLiveVal,
        },
      ])
      .select('id')
      .single();

    if (doctorErr) throw doctorErr;

    // 6. AUTOMATED POST-ONBOARDING CHECK: Verify doctors.id === auth.users.id
    if (doctorRow.id !== doctorUserId) {
      return NextResponse.json(
        { error: `Critical ID Mismatch: Doctor table ID (${doctorRow.id}) does not match Auth User ID (${doctorUserId}).` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully onboarded ${facility_name}!`,
      credentials: {
        email: doctor_email.trim(),
        temp_password: tempPassword,
        doctor_id: doctorUserId,
        id_verified: true,
      },
      clinic_id: clinicId,
      facility_code: facility_code.trim().toUpperCase(),
      is_verified: isVerifiedVal,
      is_live: isLiveVal,
    });
  } catch (err: any) {
    console.error('Onboarding Error:', err);
    return NextResponse.json({ error: err.message || 'Onboarding failed.' }, { status: 500 });
  }
}
