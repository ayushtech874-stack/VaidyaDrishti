import { NextResponse } from 'next/server';
import { verifyClaimToken } from '@/lib/auth/claimToken';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token parameter is required.' }, { status: 400 });
    }

    const { valid, payload, error } = verifyClaimToken(token);
    if (!valid || !payload) {
      return NextResponse.json({ error: error || 'Invalid or expired claim token.' }, { status: 400 });
    }

    // Fetch patient row
    const { data: patient, error: patientErr } = await supabaseAdmin
      .from('patients')
      .select('id, name, phone, auth_user_id')
      .eq('id', payload.patientId)
      .maybeSingle();

    if (patientErr || !patient) {
      return NextResponse.json({ error: 'Associated patient record not found.' }, { status: 404 });
    }

    // Check if account has already been claimed!
    if (patient.auth_user_id) {
      return NextResponse.json({
        already_claimed: true,
        message: 'This patient dashboard account has already been claimed.',
      }, { status: 409 });
    }

    return NextResponse.json({
      valid: true,
      patient: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error verifying claim token.' }, { status: 500 });
  }
}
