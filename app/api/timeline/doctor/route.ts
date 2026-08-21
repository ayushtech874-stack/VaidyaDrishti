import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

    if (!patientId) {
      return NextResponse.json({ error: 'patient_id parameter is required.' }, { status: 400 });
    }

    // 1. Fetch Doctor Profile
    const { data: doc } = await supabaseAdmin
      .from('doctors')
      .select('id, name, clinic_id')
      .or(`id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    if (!doc) {
      return NextResponse.json({ error: 'Only empaneled doctors may access patient continuity timelines.' }, { status: 403 });
    }

    // =========================================================================
    // 🛡️ CRITICAL RELATIONSHIP CHECK FOR CROSS-CLINIC DOCTOR CONTINUITY VIEW
    // Doctor may view patient history ONLY IF they have an established intake,
    // appointment, or conversation relationship with that patient.
    // =========================================================================
    const { data: intakeRel } = await supabaseAdmin
      .from('intakes')
      .select('id')
      .eq('patient_id', patientId)
      .or(`doctor_id.eq.${doc.id}${doc.clinic_id ? `,clinic_id.eq.${doc.clinic_id}` : ''}`)
      .limit(1);

    const { data: apptRel } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('patient_id', patientId)
      .eq('doctor_id', doc.id)
      .limit(1);

    const { data: convRel } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('patient_id', patientId)
      .eq('doctor_id', doc.id)
      .limit(1);

    const hasRelationship = (intakeRel && intakeRel.length > 0) || (apptRel && apptRel.length > 0) || (convRel && convRel.length > 0);

    if (!hasRelationship) {
      return NextResponse.json(
        { error: 'Access Denied: You do not have an established consultation relationship with this patient.' },
        { status: 403 }
      );
    }

    // 2. Fetch Full Cross-Clinic Records for Patient
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    const { data: intakes } = await supabaseAdmin
      .from('intakes')
      .select('id, raw_text, structured_data, urgency_level, status, created_at, clinics(name), doctors(name)')
      .eq('patient_id', patientId);

    const { data: appts } = await supabaseAdmin
      .from('appointments')
      .select('id, scheduled_at, duration_minutes, status, notes, created_at, doctors(name)')
      .eq('patient_id', patientId);

    const { data: rxs } = await supabaseAdmin
      .from('prescriptions')
      .select('id, issued_at, pdf_url, status, doctors(name), prescription_items(*)')
      .eq('patient_id', patientId);

    const { data: docs } = await supabaseAdmin
      .from('patient_documents')
      .select('id, file_name, file_type, uploaded_at')
      .eq('patient_id', patientId);

    // Merge into Cross-Clinic Feed
    const feed: any[] = [];

    (intakes || []).forEach((i: any) => {
      const clinicName = Array.isArray(i.clinics) ? i.clinics[0]?.name : i.clinics?.name;
      const docName = Array.isArray(i.doctors) ? i.doctors[0]?.name : i.doctors?.name;
      feed.push({
        id: `intake_${i.id}`,
        event_type: 'intake',
        date: i.created_at,
        title: `OPD Intake Visit: ${clinicName || 'Network Facility'}`,
        doctor_name: docName ? `Dr. ${docName}` : 'Empaneled RMP',
        urgency: i.urgency_level,
        status: i.status,
        details: i.raw_text,
        structured: i.structured_data,
        icon: '📋',
      });
    });

    (appts || []).forEach((a: any) => {
      const docName = Array.isArray(a.doctors) ? a.doctors[0]?.name : a.doctors?.name;
      feed.push({
        id: `appt_${a.id}`,
        event_type: 'appointment',
        date: a.scheduled_at || a.created_at,
        title: `Tele-Consultation Appointment`,
        doctor_name: docName ? `Dr. ${docName}` : 'Empaneled RMP',
        status: a.status,
        details: a.notes,
        icon: '📅',
      });
    });

    (rxs || []).forEach((r: any) => {
      const docName = Array.isArray(r.doctors) ? r.doctors[0]?.name : r.doctors?.name;
      feed.push({
        id: `rx_${r.id}`,
        event_type: 'prescription',
        date: r.issued_at,
        title: `E-Prescription Issued (${r.prescription_items?.length || 0} Medications)`,
        doctor_name: docName ? `Dr. ${docName}` : 'Empaneled RMP',
        items: r.prescription_items,
        icon: '💊',
      });
    });

    (docs || []).forEach((d: any) => {
      feed.push({
        id: `doc_${d.id}`,
        event_type: 'document',
        date: d.uploaded_at,
        title: `Uploaded Document: ${d.file_name}`,
        details: `File Type: ${d.file_type}`,
        icon: '📁',
      });
    });

    feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ patient, cross_clinic_timeline: feed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching cross-clinic patient timeline.' }, { status: 500 });
  }
}
