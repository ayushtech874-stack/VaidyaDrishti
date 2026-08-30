import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Doctor login required.' }, { status: 401 });
    }

    const body = await req.json();
    const { patient_id, scheduled_at, notes } = body;

    if (!patient_id || !scheduled_at) {
      return NextResponse.json({ error: 'patient_id and scheduled_at are required.' }, { status: 400 });
    }

    // 1. Fetch Doctor Profile
    const { data: doc } = await supabaseAdmin
      .from('doctors')
      .select('id, name, clinic_id')
      .eq('id', user.id)
      .single();

    if (!doc) {
      return NextResponse.json({ error: 'Only empaneled doctors can schedule appointments.' }, { status: 403 });
    }

    // 2. Doctor-Initiated Appointment Scheduling: Insert as status = 'booked' immediately
    const { data: appt, error: apptErr } = await supabaseAdmin
      .from('appointments')
      .insert([
        {
          patient_id,
          doctor_id: doc.id,
          clinic_id: doc.clinic_id,
          scheduled_at,
          status: 'booked',
          notes: notes || 'Doctor-initiated consultation appointment',
        },
      ])
      .select('*')
      .single();

    if (apptErr) {
      return NextResponse.json({ error: apptErr.message }, { status: 500 });
    }

    // 3. Automated Patient Thread Notification
    const formattedTime = new Date(scheduled_at).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const docDisplayName = /^dr\.?/i.test((doc.name || '').trim())
      ? doc.name.trim()
      : `Dr. ${(doc.name || '').trim()}`;

    const notifText = `${docDisplayName} has scheduled your appointment for ${formattedTime}. Reply here if you need to reschedule.`;

    // Find or create conversation thread between doctor and patient
    let { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('patient_id', patient_id)
      .eq('doctor_id', doc.id)
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await supabaseAdmin
        .from('conversations')
        .insert([{ patient_id, doctor_id: doc.id, last_message_at: new Date().toISOString() }])
        .select('id')
        .single();
      conv = newConv;
    }

    if (conv) {
      // Post notification message to thread
      await supabaseAdmin.from('messages').insert([
        {
          conversation_id: conv.id,
          sender_type: 'doctor',
          sender_id: doc.id,
          content: notifText,
        },
      ]);

      await supabaseAdmin
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conv.id);
    }

    return NextResponse.json({
      success: true,
      message: `Appointment scheduled successfully for ${formattedTime}. Patient notified.`,
      appointment: appt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
