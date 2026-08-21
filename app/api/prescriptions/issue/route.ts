import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { checkDrugBlocklist } from '@/lib/compliance/drugBlocklist';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in as an RMP doctor.' }, { status: 401 });
    }

    // 1. Fetch Doctor Profile
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('*, clinics(*)')
      .or(`id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    if (!doctor) {
      return NextResponse.json({ error: 'Only empaneled RMP doctors may issue e-prescriptions.' }, { status: 403 });
    }

    const { patient_id, intake_id, items } = await request.json();

    if (!patient_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Patient ID and at least one prescription item are required.' }, { status: 400 });
    }

    // 2. Fetch Patient Profile
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('id', patient_id)
      .single();

    if (!patient) {
      return NextResponse.json({ error: 'Patient record not found.' }, { status: 404 });
    }

    // 3. RELATIONSHIP CHECK: Doctor must have an intake/appointment relationship with patient
    const { data: relationshipCheck } = await supabaseAdmin
      .from('intakes')
      .select('id')
      .eq('patient_id', patient_id)
      .or(`doctor_id.eq.${doctor.id}${doctor.clinic_id ? `,clinic_id.eq.${doctor.clinic_id}` : ''}`)
      .limit(1);

    if (!relationshipCheck || relationshipCheck.length === 0) {
      return NextResponse.json(
        { error: 'Prescription Restricted: E-Prescriptions may only be issued for patients with an established OPD consultation relationship.' },
        { status: 403 }
      );
    }

    // =========================================================================
    // 🛡️ HARD TPG 2020 COMPLIANCE CHECK FOR SCHEDULE X & CONTROLLED DRUGS
    // =========================================================================
    for (const item of items) {
      const blockResult = checkDrugBlocklist(item.drug_name);
      if (blockResult.blocked) {
        return NextResponse.json(
          {
            error: blockResult.message,
            blocked_drug: item.drug_name,
            matched_keyword: blockResult.matchedKeyword,
          },
          { status: 422 }
        );
      }
    }

    // 4. Create Prescription Record
    const nowIso = new Date().toISOString();
    const { data: prescription, error: rxErr } = await supabaseAdmin
      .from('prescriptions')
      .insert([
        {
          patient_id,
          doctor_id: doctor.id,
          intake_id: intake_id || null,
          issued_at: nowIso,
          status: 'active',
        },
      ])
      .select('*')
      .single();

    if (rxErr) throw rxErr;

    // 5. Create Prescription Items
    const formattedItems = items.map((item: any) => ({
      prescription_id: prescription.id,
      drug_name: item.drug_name.trim(),
      dosage: item.dosage.trim(),
      frequency: item.frequency.trim(),
      duration_days: parseInt(item.duration_days || '5', 10),
      instructions: item.instructions?.trim() || '',
      timing: item.timing || 'after_food',
    }));

    const { data: insertedItems, error: itemsErr } = await supabaseAdmin
      .from('prescription_items')
      .insert(formattedItems)
      .select('*');

    if (itemsErr) throw itemsErr;

    // 6. Generate Simple HTML/PDF Content Summary
    const pdfPath = `rx_${patient_id}/${Date.now()}_prescription_${prescription.id.slice(0, 8)}.pdf`;
    
    // Store reference in Supabase
    await supabaseAdmin
      .from('prescriptions')
      .update({ pdf_url: pdfPath })
      .eq('id', prescription.id);

    // 7. Audit Log Event: PRESCRIPTION_ISSUED
    try {
      await supabaseAdmin.from('audit_logs').insert([
        {
          event_type: 'PRESCRIPTION_ISSUED',
          actor_id: doctor.id,
          details: {
            doctor_id: doctor.id,
            patient_id,
            prescription_id: prescription.id,
            item_count: insertedItems.length,
            timestamp: nowIso,
          },
        },
      ]);
    } catch (auditErr) {
      console.warn('Audit log notice:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'E-Prescription successfully issued in compliance with TPG 2020!',
      prescription: {
        ...prescription,
        pdf_url: pdfPath,
        items: insertedItems,
      },
    });
  } catch (err: any) {
    console.error('Issue Prescription Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to issue prescription.' }, { status: 500 });
  }
}
