import Link from 'next/link';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import KillSwitchButton from './KillSwitchButton';
import SignOutButton from '@/components/SignOutButton';
import DashboardClientView from './DashboardClientView';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function DoctorDashboardPage() {
  const serverSupabase = await createServerClient();

  const { data: { user } } = await serverSupabase.auth.getUser();

  let doctorProfile: any = null;
  let clinicProfile: any = null;

  if (user) {
    const { data: docData } = await supabaseAdmin
      .from('doctors')
      .select('id, name, email, rmp_registration_number, clinic_id, department_id, role')
      .eq('id', user.id)
      .single();

    if (docData) {
      doctorProfile = docData;
      if (docData.clinic_id) {
        const { data: clinicData } = await supabaseAdmin
          .from('clinics')
          .select('name, code, facility_type')
          .eq('id', docData.clinic_id)
          .single();
        clinicProfile = clinicData;
      }
    }
  }

  const doctorDisplayName = doctorProfile?.name || user?.email || 'On-Duty RMP Doctor';
  const doctorRmpNo = doctorProfile?.rmp_registration_number || 'VERIFIED-RMP';
  const clinicDisplayName = clinicProfile?.name || 'Assigned Clinic';
  const clinicId = doctorProfile?.clinic_id;
  const doctorId = doctorProfile?.id;

  // STRICT SINGLE-DOCTOR QUEUE FILTERING (0 Null Fallback Leakage)
  let query = supabaseAdmin
    .from('intakes')
    .select(`
      id,
      clinic_id,
      doctor_id,
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

  if (doctorProfile?.role !== 'super_admin') {
    if (doctorId) {
      // STRICT FILTER BY DOCTOR_ID ONLY — No NULL fallback clause!
      query = query.eq('doctor_id', doctorId);
    } else if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }
  }

  let allIntakes: any[] = [];
  const { data: primaryData, error } = await query;

  if (error || !primaryData || primaryData.length === 0) {
    let fallbackQuery = supabaseAdmin
      .from('intakes')
      .select(`
        id,
        clinic_id,
        doctor_id,
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

    if (doctorProfile?.role !== 'super_admin' && doctorId) {
      fallbackQuery = fallbackQuery.eq('doctor_id', doctorId);
    } else if (doctorProfile?.role !== 'super_admin' && clinicId) {
      fallbackQuery = fallbackQuery.eq('clinic_id', clinicId);
    }

    const { data: fallbackData } = await fallbackQuery;
    allIntakes = (fallbackData || []) as any[];
  } else {
    allIntakes = primaryData as any[];
  }

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
        mustChangePassword={Boolean(doctorProfile?.must_change_password)}
      />
    </div>
  );
}
