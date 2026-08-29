import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import KillSwitchButton from './KillSwitchButton';
import SignOutButton from '@/components/SignOutButton';
import DashboardClientView from './DashboardClientView';
import DoctorWorkspaceLayout from './DoctorWorkspaceLayout';

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
      .select('id, name, email, rmp_registration_number, clinic_id, department_id, role, registration_status, rejection_reason')
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
        .select('id, name, email, rmp_registration_number, clinic_id, department_id, role, registration_status, rejection_reason')
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

  // 🛑 PHASE 11 GUARD: Deactivated Doctors (is_active === false) cannot access dashboard
  if (doctorProfile && doctorProfile.is_active === false && !isSuperAdmin) {
    return (
      <main className="min-h-screen bg-[var(--color-cream-soft)] py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full card-surface p-8 text-center space-y-6 shadow-xl border border-rose-200">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-rose-100 text-rose-800 text-2xl font-bold">
            🚫
          </div>
          <div>
            <span className="inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-rose-100 text-rose-900 font-bold mb-2">
              ACCOUNT DEACTIVATED
            </span>
            <h1 className="text-xl font-extrabold text-[var(--color-navy)]">
              Doctor Account Deactivated
            </h1>
            <p className="text-xs text-[var(--color-ink-muted)] mt-2 leading-relaxed">
              Your practitioner account has been deactivated by VaidyaDrishti administration. Access to OPD clinical queues and patient portals is suspended. Please contact the administrator.
            </p>
          </div>
          <div className="pt-4 border-t flex justify-center space-x-3">
            <SignOutButton />
          </div>
        </div>
      </main>
    );
  }

  // 🛑 PHASE 9a GUARD: Pending or Rejected Doctors cannot access active OPD queue
  if (doctorProfile && doctorProfile.registration_status && doctorProfile.registration_status !== 'approved' && !isSuperAdmin) {
    const isPending = doctorProfile.registration_status === 'pending';
    return (
      <main className="min-h-screen bg-[var(--color-cream-soft)] py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full card-surface p-8 text-center space-y-6 shadow-xl border border-[var(--color-border)]">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-amber-100 text-amber-800 text-2xl font-bold">
            {isPending ? '⏳' : '❌'}
          </div>
          <div>
            <span className="inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold mb-2">
              REGISTRATION STATUS: {doctorProfile.registration_status.toUpperCase()}
            </span>
            <h1 className="text-xl font-extrabold text-[var(--color-navy)]">
              {isPending ? 'Registration Under Review' : 'Registration Application Rejected'}
            </h1>
            <p className="text-xs text-[var(--color-ink-muted)] mt-2 leading-relaxed">
              {isPending
                ? 'Your doctor registration application and RMP credentials are currently being reviewed by VaidyaDrishti administration. Access to OPD clinical queues will be enabled once approved.'
                : doctorProfile.rejection_reason || 'Your application was rejected by administration.'}
            </p>
          </div>
          <div className="pt-4 border-t flex justify-center space-x-3">
            <SignOutButton />
          </div>
        </div>
      </main>
    );
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

  // Fetch workspace section datasets for doctor
  const docId = doctorProfile?.id || user?.id;

  let opdQueue: any[] = [];
  let messages: any[] = [];
  let appointments: any[] = [];
  let prescriptions: any[] = [];
  let invoices: any[] = [];

  if (docId) {
    // 1. Fetch OPD Queue with Family Member Context (display_name & relationship)
    if (clinicId) {
      const { data: qData } = await supabaseAdmin
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
            display_name,
            relationship,
            age,
            phone
          )
        `)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });
      opdQueue = qData || [];
    }

    // 2. Fetch Messages
    const { data: mData } = await supabaseAdmin
      .from('conversations')
      .select('*, patients(display_name, name, relationship)')
      .eq('doctor_id', docId)
      .order('updated_at', { ascending: false });
    messages = mData || [];

    // 3. Fetch Appointments
    const { data: aData } = await supabaseAdmin
      .from('appointments')
      .select('*, patients(display_name, name, relationship)')
      .eq('doctor_id', docId)
      .order('scheduled_at', { ascending: true });
    appointments = aData || [];

    // 4. Fetch Prescriptions
    const { data: pData } = await supabaseAdmin
      .from('prescriptions')
      .select('*, patients(display_name, name)')
      .eq('doctor_id', docId)
      .order('issued_at', { ascending: false });
    prescriptions = pData || [];

    // 5. Fetch Invoices
    const { data: iData } = await supabaseAdmin
      .from('invoices')
      .select('*, patients(display_name, name)')
      .eq('doctor_id', docId)
      .order('issued_at', { ascending: false });
    invoices = iData || [];
  }

  return (
    <DoctorWorkspaceLayout
      doctor={doctorProfile || { id: user?.id || '', name: doctorDisplayName }}
      opdQueue={opdQueue}
      messages={messages}
      appointments={appointments}
      prescriptions={prescriptions}
      invoices={invoices}
      analytics={{ total: opdQueue.length }}
      killSwitchActive={false}
      onToggleKillSwitch={() => {}}
    />
  );
}
