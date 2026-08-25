import { NextResponse } from 'next/server';
import { verifyClaimToken } from '@/lib/auth/claimToken';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json({ error: 'token, email, and password are required.' }, { status: 400 });
    }

    const { valid, payload, error } = verifyClaimToken(token);
    if (!valid || !payload) {
      return NextResponse.json({ error: error || 'Invalid or expired claim token.' }, { status: 400 });
    }

    // 1. Fetch patient record
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id, name, phone, auth_user_id')
      .eq('id', payload.patientId)
      .single();

    if (!patient) {
      return NextResponse.json({ error: 'Patient record not found.' }, { status: 404 });
    }

    if (patient.auth_user_id) {
      return NextResponse.json({ error: 'This patient account has already been claimed.' }, { status: 409 });
    }

    // 🛑 PHASE 9b PHONE COLLISION SAFETY CHECK:
    // Verify phone number does not already belong to a different primary account or managed profile
    if (patient.phone) {
      const { data: collisionProfiles } = await supabaseAdmin
        .from('patients')
        .select('id, auth_user_id, managed_by_auth_user_id')
        .eq('phone', patient.phone)
        .neq('id', patient.id);

      const hasCollision = (collisionProfiles || []).some(
        (p) => p.auth_user_id !== null || p.managed_by_auth_user_id !== null
      );

      if (hasCollision) {
        return NextResponse.json(
          { error: 'Phone number is already associated with another primary account family profile.' },
          { status: 409 }
        );
      }
    }

    // 2. Create Supabase Auth User
    const { data: authUser, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name: patient.name, role: 'patient' },
    });

    if (createAuthErr || !authUser.user) {
      throw createAuthErr || new Error('Failed to create auth user.');
    }

    // 3. Link patient record to Auth User ID
    const { error: updateErr } = await supabaseAdmin
      .from('patients')
      .update({ auth_user_id: authUser.user.id })
      .eq('id', patient.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      message: 'Account successfully claimed and linked!',
      patient_id: patient.id,
    });
  } catch (err: any) {
    console.error('Claim Account Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to claim account.' }, { status: 500 });
  }
}
