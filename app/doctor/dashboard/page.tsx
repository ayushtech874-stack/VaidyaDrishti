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
  const activeTab = resolvedParams?.tab || 'pending'; // 'pending' | 'history'

  const supabase = await createClient();

  const { data: intakes, error } = await supabase
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
        name,
        age,
        phone
      )
    `);

  const allIntakes = intakes || [];

  // Filter based on active tab: 'pending' (Pending Review) vs 'history' (Reviewed)
  const pendingIntakes = allIntakes.filter((i: any) => i.status !== 'doctor_reviewed');
  const reviewedIntakes = allIntakes.filter((i: any) => i.status === 'doctor_reviewed');

  const displayedList = activeTab === 'history' ? reviewedIntakes : pendingIntakes;

  // Sort intakes: urgency_level (high first, medium, low) then created_at (newest first)
  const sortedIntakes = displayedList.sort((a: any, b: any) => {
    const rankA = getUrgencyRank(a.urgency_level);
    const rankB = getUrgencyRank(b.urgency_level);
    if (rankA !== rankB) return rankA - rankB;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Triage & Intake Portal
          </h2>
          <p className="text-sm text-slate-500">
            Assigned to: <strong className="text-emerald-700 font-semibold">Dr. Ramesh Chandra (On-Duty RMP)</strong>
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          Failed to load intakes queue: {error.message}
        </div>
      )}

      {/* Tabs Navigation: Pending Queue vs History */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <Link
          href="/doctor/dashboard?tab=pending"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab !== 'history'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>📋 Active Queue (Left to Treat)</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            activeTab !== 'history' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {pendingIntakes.length}
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
          <span>📚 Treated History</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            activeTab === 'history' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {reviewedIntakes.length}
          </span>
        </Link>
      </div>

      {/* Intake Cards List */}
      {sortedIntakes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          {activeTab === 'history'
            ? 'No treated intakes in history yet.'
            : '🎉 All caught up! No pending patients waiting for triage review.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedIntakes.map((intake: any) => {
            const urgency = intake.urgency_level;
            const patient = intake.patients;
            const isReviewed = intake.status === 'doctor_reviewed';

            return (
              <Link
                key={intake.id}
                href={`/doctor/intake/${intake.id}`}
                className={`block bg-white border rounded-2xl p-5 shadow-sm transition hover:shadow-md ${
                  urgency === 'high'
                    ? 'border-red-300 hover:border-red-400 bg-red-50/20'
                    : urgency === 'medium'
                    ? 'border-amber-300 hover:border-amber-400 bg-amber-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 text-lg">
                        {patient?.name || 'Unknown Patient'}
                      </span>
                      <span className="text-sm text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                        Age: {patient?.age} yrs
                      </span>
                      {isReviewed && (
                        <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">
                          ✓ Treated & Reviewed
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Phone: {patient?.phone} • Submitted {formatTimeAgo(intake.created_at)}
                    </div>
                  </div>

                  {/* Urgency Badge */}
                  <div>
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
                    {!urgency && (
                      <span className="inline-flex items-center gap-1 bg-slate-400 text-white text-xs px-3 py-1 rounded-full">
                        ⏳ Processing...
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
                <p className="text-slate-600 text-sm line-clamp-2 italic">
                  "{intake.raw_text}"
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
