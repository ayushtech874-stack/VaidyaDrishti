import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkUrgency } from '@/lib/rules-engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const {
      intake_id,
      corrected_structured_data,
      forced_urgency_level,
      doctor_notes,
      doctor_id,
    } = await request.json();

    if (!intake_id || !corrected_structured_data) {
      return NextResponse.json(
        { error: 'Missing intake_id or corrected_structured_data' },
        { status: 400 }
      );
    }

    // 1. Fetch current intake record
    const { data: intake, error: fetchError } = await supabase
      .from('intakes')
      .select(`
        id,
        raw_text,
        structured_data,
        urgency_level,
        patients (
          age
        )
      `)
      .eq('id', intake_id)
      .single();

    if (fetchError || !intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 });
    }

    const originalStructuredData = intake.structured_data || {};
    const originalUrgencyLevel = intake.urgency_level || 'low';
    const patientAge = (intake.patients as any)?.age ?? null;

    // 2. Re-evaluate Triage Rules Engine on corrected structured data
    const calculatedTriage = checkUrgency(
      corrected_structured_data,
      patientAge,
      intake.raw_text
    );

    // Allow manual doctor urgency override if forced_urgency_level is provided
    const finalUrgencyLevel = forced_urgency_level || calculatedTriage.urgency_level;
    const overrodeRules = finalUrgencyLevel !== calculatedTriage.urgency_level;

    // 3. Save doctor correction & urgency override for fine-tuning dataset
    await supabase.from('doctor_corrections').insert([
      {
        intake_id,
        doctor_id: doctor_id || null,
        original_structured_data: originalStructuredData,
        corrected_structured_data: corrected_structured_data,
        original_urgency_level: originalUrgencyLevel,
        corrected_urgency_level: finalUrgencyLevel,
        overrode_triage_rules: overrodeRules,
        doctor_notes: doctor_notes || '',
      },
    ]);

    // 4. Update intake row with corrected structured data & updated triage results
    await supabase
      .from('intakes')
      .update({
        structured_data: corrected_structured_data,
        urgency_level: finalUrgencyLevel,
        red_flags: calculatedTriage.red_flags,
        status: 'doctor_reviewed',
      })
      .eq('id', intake_id);

    // 5. Write immutable audit log entry (ICMR 2023 Guidelines)
    await supabase.from('audit_logs').insert([
      {
        intake_id,
        doctor_id: doctor_id || null,
        event_type: 'DOCTOR_CORRECTION',
        actor: 'DOCTOR',
        details: {
          doctor_notes,
          original_structured: originalStructuredData,
          corrected_structured: corrected_structured_data,
          original_urgency: originalUrgencyLevel,
          corrected_urgency: finalUrgencyLevel,
          overrode_triage_rules: overrodeRules,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      intake_id,
      urgency_level: finalUrgencyLevel,
      red_flags: calculatedTriage.red_flags,
      overrode_rules: overrodeRules,
    });
  } catch (err: any) {
    console.error('Error recording doctor correction:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
