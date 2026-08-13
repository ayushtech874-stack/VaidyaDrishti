import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import KillSwitchButton from './KillSwitchButton';
import SignOutButton from '@/components/SignOutButton';

export const revalidate = 0;

function getUrgencyRank(level: string | null): number {
  if (level === 'high') return 1;
  if (level === 'medium') return 2;
  if (level === 'low') return 3;
  return 4; // null or pending
}

function formatTimeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default async function DoctorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const resolvedParams = await searchParams;
  const activeTab = resolvedParams?.tab || 'pending'; // 'pending' | 'in_progress' | 'history'

  const supabase = await createClient();

  // Get currently logged-in authenticated user
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

  // Fetch intakes
  let query = supabase.from('intakes').select(`
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
  `);

  if (doctorProfile?.clinic_id && doctorProfile.role !== 'super_admin') {
    query = query.eq('clinic_id', doctorProfile.clinic_id);
  }

  let allIntakes: any[] = [];
  const { data: primaryData, error: primaryError } = await query;

  if (primaryError && primaryError.message?.includes('clinic_id')) {
    const { data: fallbackData } = await supabase.from('intakes').select(`
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
    `);
    allIntakes = fallbackData || [];
  } else {
    allIntakes = primaryData || [];
  }

  // Filter based on active tab: 'pending' vs 'in_progress' vs 'history'
  const pendingIntakes = allIntakes.filter((i: any) => i.status !== 'doctor_reviewed' && i.status !== 'in_progress');
  const inProgressIntakes = allIntakes.filter((i: any) => i.status === 'in_progress');
  const reviewedIntakes = allIntakes.filter((i: any) => i.status === 'doctor_reviewed');

  let displayedList: any[] = [];
  if (activeTab === 'history') {
    displayedList = reviewedIntakes;
  } else if (activeTab === 'in_progress') {
    displayedList = inProgressIntakes;
  } else {
    displayedList = pendingIntakes;
  }

  // Sort active queue: Urgency level (high first) then creation date
  const sortedIntakes = displayedList.sort((a: any, b: any) => {
    const rankA = getUrgencyRank(a.urgency_level);
    const rankB = getUrgencyRank(b.urgency_level);
    if (rankA !== rankB) return rankA - rankB;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const doctorDisplayName = doctorProfile?.name || user?.email || 'On-Duty RMP Doctor';
  const doctorRmpNo = doctorProfile?.rmp_registration_number || 'VERIFIED-RMP';
  const clinicDisplayName = clinicProfile?.name || 'Assigned Clinic';

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header */}
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

      {/* 3-Tab Navigation: Active Queue vs In Examination vs Treated & Cured History */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-2">
        <Link
          href="/doctor/dashboard?tab=pending"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'pending'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>📋 Active Waiting Queue</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'pending' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {pendingIntakes.length}
          </span>
        </Link>

        <Link
          href="/doctor/dashboard?tab=in_progress"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'in_progress'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>👀 Under Examination</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'in_progress' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {inProgressIntakes.length}
          </span>
        </Link>

        <Link
          href="/doctor/dashboard?tab=history"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>✅ Treated & Cured History</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'history' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {reviewedIntakes.length}
          </span>
        </Link>
      </div>

      {/* Intake Cards List with Queue Position Numbering & Reordering */}
      {sortedIntakes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          {activeTab === 'history'
            ? 'No treated & cured patient records in history yet.'
            : activeTab === 'in_progress'
            ? 'No patients currently under examination.'
            : '🎉 All caught up! No pending patients waiting in your clinic queue.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedIntakes.map((intake: any, index: number) => {
            const urgency = intake.urgency_level;
            const patient = intake.patients;
            const status = intake.status;
            const queuePosition = index + 1;

            return (
              <div
                key={intake.id}
                className={`bg-white border rounded-2xl p-5 shadow-sm transition hover:shadow-md ${
                  urgency === 'high'
                    ? 'border-red-300 bg-red-50/20'
                    : urgency === 'medium'
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3">
                    {/* Queue Position Numbering Badge */}
                    <div className="bg-slate-900 text-white font-extrabold text-sm px-3 py-1.5 rounded-xl flex items-center justify-center shadow-sm">
                      #{queuePosition}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          href={`/doctor/intake/${intake.id}`}
                          className="font-bold text-slate-900 text-lg hover:text-emerald-700 transition"
                        >
                          {patient?.name || 'Unknown Patient'}
                        </Link>

                        <span className="text-sm text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                          Age: {patient?.age} yrs
                        </span>

                        {/* Status Badges near Patient Name */}
                        {status === 'doctor_reviewed' && (
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                            ✅ Treated & Cured
                          </span>
                        )}
                        {status === 'in_progress' && (
                          <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                            👀 Under Examination
                          </span>
                        )}
                        {status !== 'doctor_reviewed' && status !== 'in_progress' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-semibold">
                            ⏳ Waiting in Queue
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400">
                        Phone: {patient?.phone} • Submitted {formatTimeAgo(intake.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Urgency Badge & Reordering Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {urgency === 'high' && (
                      <span className="inline-flex items-center gap-1.5 bg-red-600 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-full shadow-sm animate-pulse">
                        🔴 HIGH URGENCY
                      </span>
                    )}
                    {urgency === 'medium' && (
                      <span className="inline-flex items-center gap-1.5 bg-amber-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow-sm">
                        🟡 MEDIUM URGENCY
                      </span>
                    )}
                    {urgency === 'low' && (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-full">
                        🟢 LOW URGENCY
                      </span>
                    )}
                  </div>
                </div>

                {/* Red Flags Tags */}
                {intake.red_flags && intake.red_flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {intake.red_flags.map((flag: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-xs font-semibold bg-red-100 text-red-800 border border-red-200 px-2.5 py-1 rounded-md"
                      >
                        ⚠️ {flag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Snippet preview */}
                <p className="text-slate-600 text-sm line-clamp-2 italic mb-4">
                  "{intake.raw_text}"
                </p>

                {/* Doctor Action Controls: Shift Order & View Details */}
                <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 gap-3">
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                    <span>Shift Priority:</span>
                    <form action={async () => {
                      'use server';
                      const s = await createClient();
                      await s.from('intakes').update({ urgency_level: 'high' }).eq('id', intake.id);
                    }}>
                      <button type="submit" className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-xs border border-red-200">
                        ▲ Shift to #1 Emergency
                      </button>
                    </form>
                    <form action={async () => {
                      'use server';
                      const s = await createClient();
                      await s.from('intakes').update({ urgency_level: 'medium' }).eq('id', intake.id);
                    }}>
                      <button type="submit" className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold px-2 py-1 rounded text-xs border border-amber-200">
                        🟡 Medium Priority
                      </button>
                    </form>
                  </div>

                  <Link
                    href={`/doctor/intake/${intake.id}`}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
                  >
                    Open Intake Details & Past History →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
