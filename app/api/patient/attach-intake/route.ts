import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/patient/attach-intake
 * 
 * Attaches a pre-screened, unassigned intake (intake_id) to a specific doctor's queue.
 * Performs a single SQL UPDATE on the original intakes row.
 * Does NOT invoke Groq LLM or create duplicate audit_log entries.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { intake_id, doctor_id, clinic_id } = body;

    if (!intake_id) {
      return NextResponse.json({ error: 'intake_id is required' }, { status: 400 });
    }
    if (!doctor_id) {
      return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });
    }

    // Fetch existing intake to enforce unattached single-use guard
    const { data: existingIntake, error: intakeErr } = await supabase
      .from('intakes')
      .select('id, doctor_id, patient_id')
      .eq('id', intake_id)
      .maybeSingle();

    if (intakeErr || !existingIntake) {
      return NextResponse.json({ error: 'Specified intake record not found.' }, { status: 404 });
    }

    if (existingIntake.doctor_id) {
      return NextResponse.json({
        error: 'This intake has already been attached to a doctor queue and cannot be re-attached.',
        already_attached: true,
      }, { status: 409 });
    }

    // Verify doctor exists
    const { data: doc, error: docErr } = await supabase
      .from('doctors')
      .select('id, clinic_id, name')
      .eq('id', doctor_id)
      .single();

    if (docErr || !doc) {
      return NextResponse.json({ error: 'Selected doctor not found' }, { status: 404 });
    }

    const targetClinicId = clinic_id || doc.clinic_id || '00000000-0000-0000-0000-000000000001';

    // Single SQL UPDATE on original intake row (only if doctor_id is currently null)
    const { error: updateError } = await supabase
      .from('intakes')
      .update({
        doctor_id: doc.id,
        clinic_id: targetClinicId,
        status: 'pending_review',
      })
      .eq('id', intake_id)
      .is('doctor_id', null);

    if (updateError) {
      return NextResponse.json({ error: `Failed to attach doctor: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      intake_id,
      doctor_id: doc.id,
      doctor_name: doc.name,
      message: `Intake successfully attached to Dr. ${doc.name}'s OPD queue.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
