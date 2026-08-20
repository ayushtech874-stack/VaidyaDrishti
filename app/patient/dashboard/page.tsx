import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import PatientDashboardClientView from './PatientDashboardClientView';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function PatientDashboardPage() {
  const serverSupabase = await createServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();

  if (!user) {
    redirect('/patient/login');
  }

  // Fetch patient profile linked to this auth user
  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  // If patient has not verified phone or linked record yet, redirect to verify-phone
  if (!patient) {
    redirect('/patient/verify-phone');
  }

  // Fetch patient's past intakes (My Visits)
  const { data: intakes } = await supabaseAdmin
    .from('intakes')
    .select(`
      id,
      clinic_id,
      doctor_id,
      raw_text,
      structured_data,
      urgency_level,
      status,
      created_at,
      clinics (
        name,
        code,
        address
      ),
      doctors (
        name,
        rmp_registration_number,
        qualifications
      )
    `)
    .eq('patient_id', patient.id)
    .order('created_at', { ascending: false });

  // Fetch self-reported medical history
  let medicalHistory: any[] = [];
  try {
    const { data: historyData } = await supabaseAdmin
      .from('patient_medical_history')
      .select('*')
      .eq('patient_id', patient.id)
      .order('updated_at', { ascending: false });
    medicalHistory = historyData || [];
  } catch (e) {
    console.warn('Medical history query notice:', e);
  }

  // Fetch patient uploaded documents
  let documents: any[] = [];
  try {
    const { data: docsData } = await supabaseAdmin
      .from('patient_documents')
      .select('*')
      .eq('patient_id', patient.id)
      .order('uploaded_at', { ascending: false });
    documents = docsData || [];
  } catch (e) {
    console.warn('Patient documents query notice:', e);
  }

  return (
    <PatientDashboardClientView
      patient={patient}
      initialIntakes={intakes || []}
      initialMedicalHistory={medicalHistory}
      initialDocuments={documents}
    />
  );
}
