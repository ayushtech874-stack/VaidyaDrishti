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
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { intake_id, target_doctor_id, target_department_id, reason } = await request.json();

    if (!intake_id || !target_doctor_id) {
      return NextResponse.json({ error: 'Missing required reassignment parameters.' }, { status: 400 });
    }

    // 1. Fetch current intake details
    const { data: currentIntake } = await supabaseAdmin
      .from('intakes')
      .select('id, clinic_id, doctor_id, department_id')
      .eq('id', intake_id)
      .single();

    if (!currentIntake) {
      return NextResponse.json({ error: 'Intake record not found.' }, { status: 404 });
    }

    // 2. Fetch target doctor profile to verify clinic match
    const { data: targetDoc } = await supabaseAdmin
      .from('doctors')
      .select('id, name, clinic_id, department_id')
      .eq('id', target_doctor_id)
      .single();

    if (!targetDoc) {
      return NextResponse.json({ error: 'Target doctor not found.' }, { status: 404 });
    }

    const fromDoctorId = currentIntake.doctor_id;

    // 3. Update intakes table with new doctor_id and department_id
    await supabaseAdmin
      .from('intakes')
      .update({
        doctor_id: target_doctor_id,
        department_id: target_department_id || targetDoc.department_id || currentIntake.department_id,
      })
      .eq('id', intake_id);

    // 4. Log REASSIGNMENT event to immutable audit_logs table
    try {
      await supabaseAdmin.from('audit_logs').insert([
        {
          intake_id: intake_id,
          event_type: 'REASSIGNMENT',
          actor: user.email || user.id,
          details: {
            from_doctor_id: fromDoctorId,
            to_doctor_id: target_doctor_id,
            to_doctor_name: targetDoc.name,
            reason: reason || 'Clinical specialization triage reassignment',
            timestamp: new Date().toISOString(),
          },
        },
      ]);
    } catch (auditErr) {
      console.warn('Audit log notice:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Intake successfully reassigned to ${targetDoc.name}!`,
      new_doctor_id: target_doctor_id,
    });
  } catch (err: any) {
    console.error('Reassignment Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to reassign intake.' }, { status: 500 });
  }
}
