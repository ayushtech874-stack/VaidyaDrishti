import Link from 'next/link';
import { redirect } from 'next/navigation';
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

interface PageProps {
  searchParams: Promise<{ as_doctor_id?: string }>;
}

export default async function DoctorDashboardPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const asDoctorId = resolvedSearchParams.as_doctor_id;

  const serverSupabase = await createServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();

  let doctorProfile: any = null;
  let clinicProfile: any = null;

  let isSuperAdmin = false;

  if (user) {
    const userEmailNorm = user.email?.toLowerCase().trim();
    const isSuperAdminMeta =
      user.user_metadata?.role === 'super_admin' ||
      user.app_metadata?.role === 'super_admin' ||
      userEmailNorm === 'admin@vaidyadrishti.com';

    // 1. Resilient Dual Lookup: Search doctor profile by ID OR by Email
    const { data: docData } = await supabaseAdmin
      .from('doctors')
      .select('id, name, email, rmp_registration_number, clinic_id, department_id, role')
      .or(`id.eq.${user.id}${userEmailNorm ? `,email.eq.${userEmailNorm}` : ''}`)
      .maybeSingle();

    if (docData?.role === 'super_admin' || isSuperAdminMeta) {
      isSuperAdmin = true;
    }

    // Role Separation Guard: Super-Admin logins route directly to /admin unless in inspection mode
    if (isSuperAdmin && !asDoctorId) {
      redirect('/admin');
    }

    if (asDoctorId) {
      // Super-Admin inspecting specific doctor queue
      const { data: targetDoc } = await supabaseAdmin
        .from('doctors')
        .select('id, name, email, rmp_registration_number, clinic_id, department_id, role')
        .eq('id', asDoctorId)
        .maybeSingle();

      if (targetDoc) {
        doctorProfile = targetDoc;
        if (targetDoc.clinic_id) {
          const { data: clinicData } = await supabaseAdmin
            .from('clinics')
            .select('id, name, code, address')
            .eq('id', targetDoc.clinic_id)
            .maybeSingle();
          clinicProfile = clinicData;
        }
      }
    } else if (docData) {
      doctorProfile = docData;

      if (docData.clinic_id) {
        const { data: clinicData } = await supabaseAdmin
          .from('clinics')
          .select('id, name, code, address')
          .eq('id', docData.clinic_id)
          .maybeSingle();
        clinicProfile = clinicData;
      }
    }
  }

  const doctorDisplayName = doctorProfile?.name || user?.email || 'On-Duty RMP Doctor';
  const doctorRmpNo = doctorProfile?.rmp_registration_number || 'VERIFIED-RMP';

  const clinicDisplayName = clinicProfile?.name
    ? `Clinic Queue: ${clinicProfile.name}`
    : 'No clinic assigned to this account';

  const clinicId = doctorProfile?.clinic_id;

  const isUnlinkedAccount = !clinicId;

  // 2. BULLETPROOF QUEUE QUERY: Queries intakes by clinic_id (using valid DB schema columns)
  let allIntakes: any[] = [];

  if (!isUnlinkedAccount && clinicId) {
    const { data: primaryData, error: primaryErr } = await supabaseAdmin
      .from('intakes')
      .select(`
        id,
        clinic_id,
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
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });

    if (primaryErr) {
      console.error('Doctor Dashboard Intakes Query Error:', primaryErr);
    } else {
      allIntakes = (primaryData || []) as any[];
    }
  }

  return (
    <div className="space-y-6">
      {/* Super-Admin View-As Notice Banner */}
      {asDoctorId && (
        <div className="bg-purple-900 text-white p-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span>👁️ Super-Admin Inspection Mode:</span>
            <span className="font-normal text-purple-200">Viewing Doctor Queue as <strong>{doctorDisplayName}</strong> ({clinicProfile?.name || 'No Clinic Assigned'})</span>
          </div>
          <Link
            href="/admin"
            className="bg-white text-purple-950 px-3 py-1 rounded-lg text-xs font-extrabold hover:bg-purple-100 transition"
          >
            ← Exit Inspection Mode
          </Link>
        </div>
      )}

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
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            {clinicDisplayName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/doctor/messages"
            className="bg-[var(--color-navy)] hover:opacity-90 text-white border border-[var(--color-border)] text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm"
          >
            <span>💬 Patient Messages</span>
          </Link>
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
        mustChangePassword={false}
        isUnlinkedAccount={isUnlinkedAccount}
      />
    </div>
  );
}
