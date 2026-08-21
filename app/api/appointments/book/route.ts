import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { doctor_id, patient_id, scheduled_at, notes } = await request.json();

    if (!doctor_id || !patient_id || !scheduled_at) {
      return NextResponse.json({ error: 'doctor_id, patient_id, and scheduled_at are required.' }, { status: 400 });
    }

    // 1. Verify Relationship Check
    const { data: matchingDoctor } = await supabaseAdmin.from('doctors').select('clinic_id').eq('id', doctor_id).single();
    
    const { data: relationshipCheck } = await supabaseAdmin
      .from('intakes')
      .select('id')
      .eq('patient_id', patient_id)
      .or(`doctor_id.eq.${doctor_id}${matchingDoctor?.clinic_id ? `,clinic_id.eq.${matchingDoctor.clinic_id}` : ''}`)
      .limit(1);

    if (!relationshipCheck || relationshipCheck.length === 0) {
      return NextResponse.json(
        { error: 'Appointment Restricted: Appointments may only be scheduled with practitioners following an initial OPD consultation.' },
        { status: 403 }
      );
    }

    // 2. DOUBLE-BOOKING CHECK: Prevent duplicate booked appointments at same scheduled_at
    const { data: existingAppt } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor_id)
      .eq('scheduled_at', scheduled_at)
      .eq('status', 'booked')
      .maybeSingle();

    if (existingAppt) {
      return NextResponse.json(
        { error: 'This time slot has already been booked. Please select another slot.' },
        { status: 409 }
      );
    }

    // 3. Book Appointment
    const { data: appt, error: bookErr } = await supabaseAdmin
      .from('appointments')
      .insert([
        {
          doctor_id,
          patient_id,
          scheduled_at,
          duration_minutes: 15,
          status: 'booked',
          notes: notes?.trim() || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (bookErr) {
      if (bookErr.message?.includes('duplicate key') || bookErr.code === '23505') {
        return NextResponse.json(
          { error: 'This time slot has already been booked. Please select another slot.' },
          { status: 409 }
        );
      }
      throw bookErr;
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment successfully booked!',
      appointment: appt,
    });
  } catch (err: any) {
    console.error('Book Appointment Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to book appointment.' }, { status: 500 });
  }
}
