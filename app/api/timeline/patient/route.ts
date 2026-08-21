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

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id, name')
      .eq('auth_user_id', user.id)
      .single();

    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found.' }, { status: 404 });
    }

    const patientId = patient.id;

    // 1. Fetch Intakes
    const { data: intakes } = await supabaseAdmin
      .from('intakes')
      .select('id, raw_text, structured_data, urgency_level, status, created_at, clinics(name), doctors(name)')
      .eq('patient_id', patientId);

    // 2. Fetch Appointments
    const { data: appts } = await supabaseAdmin
      .from('appointments')
      .select('id, scheduled_at, duration_minutes, status, notes, created_at, doctors(name)')
      .eq('patient_id', patientId);

    // 3. Fetch Prescriptions
    const { data: rxs } = await supabaseAdmin
      .from('prescriptions')
      .select('id, issued_at, pdf_url, status, doctors(name), prescription_items(*)')
      .eq('patient_id', patientId);

    // 4. Fetch Uploaded Documents
    const { data: docs } = await supabaseAdmin
      .from('patient_documents')
      .select('id, file_name, file_type, uploaded_at')
      .eq('patient_id', patientId);

    // Merge into Unified Timeline Feed
    const feed: any[] = [];

    (intakes || []).forEach((i: any) => {
      const clinicName = Array.isArray(i.clinics) ? i.clinics[0]?.name : i.clinics?.name;
      const docName = Array.isArray(i.doctors) ? i.doctors[0]?.name : i.doctors?.name;
      feed.push({
        id: `intake_${i.id}`,
        event_type: 'intake',
        date: i.created_at,
        title: `OPD Intake Visit: ${clinicName || 'Medical Center'}`,
        doctor_name: docName ? `Dr. ${docName}` : 'Empaneled RMP',
        urgency: i.urgency_level,
        status: i.status,
        details: i.raw_text || 'Symptom intake submitted',
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
        details: a.notes || 'Scheduled appointment',
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
        title: `Health Document Uploaded: ${d.file_name}`,
        details: `File Type: ${d.file_type}`,
        icon: '📁',
      });
    });

    // Sort reverse-chronologically by date
    feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ patient, timeline: feed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching unified patient timeline.' }, { status: 500 });
  }
}
