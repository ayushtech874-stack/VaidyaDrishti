import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import KillSwitchButton from './KillSwitchButton';
import SignOutButton from '@/components/SignOutButton';
import DashboardClientView from './DashboardClientView';

export const revalidate = 0;

export default async function DoctorDashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  let doctorProfile: any = null;
  let clinicProfile: any = null;

  if (user) {
    const { data: docData } = await supabase
      .from('doctors')
      .select('id, name, email, rmp_registration_number, clinic_id, role')
      .eq('id', user.id)
      .single();

    if (docData) {
      doctorProfile = docData;
      if (docData.clinic_id) {
        const { data: clinicData } = await supabase
          .from('clinics')
          .select('name, code')
          .eq('id', docData.clinic_id)
          .single();
        clinicProfile = clinicData;
      }
    }
  }

  let query = supabase
    .from('intakes')
    .select(`
      id,
      clinic_id,
      raw_text,
      structured_data,
      urgency_level,
      red_flags,
      status,
      queue_position,
      created_at,
      patients (
        id,
        name,
        age,
        phone
      )
    `)
    .order('created_at', { ascending: false });

  if (doctorProfile?.clinic_id && doctorProfile.role !== 'super_admin') {
    query = query.eq('clinic_id', doctorProfile.clinic_id);
  }

  let allIntakes: any[] = [];
  const { data: primaryData, error: primaryError } = await query;

  if (primaryError) {
    const { data: fallbackData } = await supabase
      .from('intakes')
      .select(`
        id,
        raw_text,
        structured_data,
        urgency_level,
        red_flags,
        status,
        created_at,
        patients (
          id,
          name,
          age,
          phone
        )
      `)
      .order('created_at', { ascending: false });
    allIntakes = fallbackData || [];
  } else {
    allIntakes = primaryData || [];
  }

  const doctorDisplayName = doctorProfile?.name || user?.email || 'On-Duty RMP Doctor';
  const doctorRmpNo = doctorProfile?.rmp_registration_number || 'VERIFIED-RMP';
  const clinicDisplayName = clinicProfile?.name || 'Assigned Clinic';

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Triage & Intake Portal
          </h2>
          <p className="text-sm text-slate-600">
            Assigned RMP: <strong className="text-emerald-700 font-semibold">{doctorDisplayName}</strong>{' '}
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded ml-1">
              {doctorRmpNo}
            </span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Clinic Queue: <strong>{clinicDisplayName}</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/doctor/analytics"
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold px-3 py-1.5 rounded-lg transition"
          >
            📊 Analytics & Safety Metrics
          </Link>
          <KillSwitchButton />
          <SignOutButton />
        </div>
      </div>

      {/* Interactive Dashboard Client View */}
      <DashboardClientView
        initialIntakes={allIntakes}
        doctorDisplayName={doctorDisplayName}
        doctorRmpNo={doctorRmpNo}
        clinicDisplayName={clinicDisplayName}
      />
    </div>
  );
}
