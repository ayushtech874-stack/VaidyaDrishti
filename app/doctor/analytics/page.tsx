import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 0;

export default async function DoctorAnalyticsPage() {
  const supabase = await createClient();

  let summary: any = null;
  let summaryError: string | null = null;

  // Try querying SQL VIEW first
  const { data: viewData, error: viewErr } = await supabase
    .from('clinic_performance_summary')
    .select('*')
    .maybeSingle();

  if (viewData && !viewErr) {
    summary = viewData;
  } else {
    // Graceful Fallback: Compute metrics directly from DB tables if view is not executed yet
    try {
      const { data: intakes } = await supabase.from('intakes').select('urgency_level, status');
      const { data: corrections } = await supabase
        .from('doctor_corrections')
        .select('original_urgency, corrected_urgency');
      const { data: metrics } = await supabase
        .from('pilot_metrics')
        .select('review_duration_seconds, was_urgency_overridden, is_blind_sample');

      const allIntakes = intakes || [];
      const allCorrections = corrections || [];
      const allMetrics = metrics || [];

      const totalIntakes = allIntakes.length;
      const highUrgency = allIntakes.filter((i) => i.urgency_level === 'high').length;
      const mediumUrgency = allIntakes.filter((i) => i.urgency_level === 'medium').length;
      const lowUrgency = allIntakes.filter((i) => i.urgency_level === 'low').length;

      const falseHighFlags = allCorrections.filter(
        (c) => c.original_urgency === 'high' && c.corrected_urgency !== 'high'
      ).length;

      const missedHighFlags = allCorrections.filter(
        (c) => c.original_urgency !== 'high' && c.corrected_urgency === 'high'
      ).length;

      const totalSeconds = allMetrics.reduce((sum, m) => sum + (m.review_duration_seconds || 0), 0);
      const avgSeconds = allMetrics.length > 0 ? Math.round(totalSeconds / allMetrics.length) : 0;

      const blindSamples = allMetrics.filter((m) => m.is_blind_sample);
      const blindAgreed = blindSamples.filter((m) => !m.was_urgency_overridden).length;
      const blindAgreementPct =
        blindSamples.length > 0 ? Math.round((blindAgreed / blindSamples.length) * 100) : null;

      summary = {
        total_intakes: totalIntakes,
        high_urgency_count: highUrgency,
        medium_urgency_count: mediumUrgency,
        low_urgency_count: lowUrgency,
        false_high_flags: falseHighFlags,
        missed_high_flags: missedHighFlags,
        avg_active_review_seconds: avgSeconds,
        blind_sample_agreement_pct: blindAgreementPct,
        total_blind_samples: blindSamples.length,
      };
    } catch (fallbackErr: any) {
      summaryError = fallbackErr?.message || 'Failed to compute analytics summary.';
    }
  }

  const totalIntakes = summary?.total_intakes || 0;
  const highCount = summary?.high_urgency_count || 0;
  const mediumCount = summary?.medium_urgency_count || 0;
  const lowCount = summary?.low_urgency_count || 0;
  const falseHigh = summary?.false_high_flags || 0;
  const missedHigh = summary?.missed_high_flags || 0;
  const avgSeconds = summary?.avg_active_review_seconds || 0;
  const blindAgreement = summary?.blind_sample_agreement_pct;
  const totalBlind = summary?.total_blind_samples || 0;

  function formatDuration(sec: number): string {
    if (sec === 0) return '--';
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    return `${mins}m ${remSec}s`;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Pilot Clinical Analytics & Safety Dashboard
          </h2>
          <p className="text-sm text-slate-500">
            Real-world performance, recall %, false-flag rate, and review efficiency metrics
          </p>
        </div>
        <Link
          href="/doctor/dashboard"
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
        >
          ← Back to Queue
        </Link>
      </div>

      {summaryError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">
          Note: SQL view loading warning (using direct calculation): {summaryError}
        </div>
      )}

      {/* Top Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Total Intakes
          </span>
          <div className="text-3xl font-extrabold text-slate-900">{totalIntakes}</div>
          <span className="text-xs text-slate-500">Processed in Pilot</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Avg Active Review Time
          </span>
          <div className="text-3xl font-extrabold text-indigo-600">
            {formatDuration(avgSeconds)}
          </div>
          <span className="text-xs text-slate-500">Active tab time / case</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            False High Flags
          </span>
          <div className="text-3xl font-extrabold text-amber-600">{falseHigh}</div>
          <span className="text-xs text-slate-500">Over-triaged cases</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Blind Sample Agreement
          </span>
          <div className="text-3xl font-extrabold text-emerald-600">
            {blindAgreement !== null && blindAgreement !== undefined ? `${blindAgreement}%` : 'N/A'}
          </div>
          <span className="text-xs text-slate-500">Un-anchored ground truth</span>
        </div>
      </div>

      {/* Detailed Section Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Urgency Distribution Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            📊 Urgency Distribution
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
              <span className="text-sm font-bold text-red-900 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600"></span> High Urgency
              </span>
              <span className="text-base font-bold text-red-950">{highCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span> Medium Urgency
              </span>
              <span className="text-base font-bold text-amber-950">{mediumCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600"></span> Low Urgency
              </span>
              <span className="text-base font-bold text-emerald-950">{lowCount}</span>
            </div>
          </div>
        </div>

        {/* Safety & Triage Accuracy Breakdown Card */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            🛡️ Safety & Triage Accuracy Breakdown
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="block text-xs text-slate-900 font-bold">
                  False-Flag Rate (Over-triaged)
                </strong>
                <span className="text-xs text-slate-500">Cases downgraded by doctor</span>
              </div>
              <span className="font-extrabold text-amber-600 text-sm">{falseHigh} cases</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="block text-xs text-slate-900 font-bold">
                  Missed High Flags (Under-triaged)
                </strong>
                <span className="text-xs text-slate-500">Cases upgraded by doctor</span>
              </div>
              <span className="font-extrabold text-red-600 text-sm">{missedHigh} cases</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <strong className="block text-xs text-slate-900 font-bold">
                  Blind Sample Audits
                </strong>
                <span className="text-xs text-slate-500">Un-anchored doctor reviews</span>
              </div>
              <span className="font-extrabold text-indigo-600 text-sm">{totalBlind} total</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
