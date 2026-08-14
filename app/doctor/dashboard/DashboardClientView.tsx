'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardClientViewProps {
  initialIntakes: any[];
  doctorDisplayName: string;
  doctorRmpNo: string;
  clinicDisplayName: string;
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

export default function DashboardClientView({
  initialIntakes,
  doctorDisplayName,
  doctorRmpNo,
  clinicDisplayName,
}: DashboardClientViewProps) {
  const [intakes, setIntakes] = useState<any[]>(initialIntakes);
  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'history'>('pending');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Sync initial intakes prop
  useEffect(() => {
    setIntakes(initialIntakes);
  }, [initialIntakes]);

  // Instant local filtering (<10ms)
  const pendingIntakes = intakes.filter((i) => i.status !== 'doctor_reviewed' && i.status !== 'in_progress');
  const inProgressIntakes = intakes.filter((i) => i.status === 'in_progress');
  const reviewedIntakes = intakes.filter((i) => i.status === 'doctor_reviewed');

  let currentList: any[] = [];
  if (activeTab === 'history') {
    currentList = reviewedIntakes;
  } else if (activeTab === 'in_progress') {
    currentList = inProgressIntakes;
  } else {
    currentList = pendingIntakes;
  }

  // Delete Patient Intake Record
  async function confirmDeleteIntake() {
    if (!deleteTargetId) return;
    const targetId = deleteTargetId;
    setIsUpdating(targetId);

    // Instant local removal
    setIntakes((prev) => prev.filter((i) => i.id !== targetId));
    setDeleteTargetId(null);

    try {
      await fetch('/api/doctor/reorder-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake_id: targetId, action: 'delete' }),
      });
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsUpdating(null);
    }
  }

  // 1-Click Status Transition Action (Persisted in DB)
  async function changePatientStatus(intakeId: string, newStatus: 'pending' | 'in_progress' | 'treated') {
    setIsUpdating(intakeId);

    const dbStatusMap = {
      pending: 'pending_review',
      in_progress: 'in_progress',
      treated: 'doctor_reviewed',
    };

    // Instant local state update (<10ms)
    setIntakes((prev) =>
      prev.map((item) => (item.id === intakeId ? { ...item, status: dbStatusMap[newStatus] } : item))
    );

    try {
      await fetch('/api/doctor/reorder-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake_id: intakeId, action: newStatus }),
      });
    } catch (err) {
      console.error('Status transition error:', err);
    } finally {
      setIsUpdating(null);
    }
  }

  // Instant Ladder Position Swap Action (Move Up / Move Down)
  async function swapLadderPosition(currentIndex: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const currentItem = currentList[currentIndex];
    const targetItem = currentList[targetIndex];

    setIsUpdating(currentItem.id);

    // Instant local state swap (<10ms)
    const newIntakes = [...intakes];
    const itemAIdx = newIntakes.findIndex((i) => i.id === currentItem.id);
    const itemBIdx = newIntakes.findIndex((i) => i.id === targetItem.id);

    if (itemAIdx !== -1 && itemBIdx !== -1) {
      const temp = newIntakes[itemAIdx];
      newIntakes[itemAIdx] = newIntakes[itemBIdx];
      newIntakes[itemBIdx] = temp;
      setIntakes(newIntakes);
    }

    try {
      await fetch('/api/doctor/reorder-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake_id: currentItem.id,
          action: 'swap',
          swap_intake_id: targetItem.id,
          current_pos: currentIndex + 1,
          target_pos: targetIndex + 1,
        }),
      });
    } catch (err) {
      console.error('Ladder swap error:', err);
    } finally {
      setIsUpdating(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Instant 0ms Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${
            activeTab === 'pending'
              ? 'bg-emerald-600 text-white shadow-md scale-[1.02]'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>📋 Active Waiting Queue</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full ${
              activeTab === 'pending' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-800'
            }`}
          >
            {pendingIntakes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('in_progress')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${
            activeTab === 'in_progress'
              ? 'bg-amber-500 text-white shadow-md scale-[1.02]'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>🩺 Under Consultation / Heard Grievance (Not Treated Yet)</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full ${
              activeTab === 'in_progress' ? 'bg-amber-800 text-white' : 'bg-slate-200 text-slate-800'
            }`}
          >
            {inProgressIntakes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white shadow-md scale-[1.02]'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>✅ Treated & Cured History</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full ${
              activeTab === 'history' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'
            }`}
          >
            {reviewedIntakes.length}
          </span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-red-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-900">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-xl font-bold">
                🗑️
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Delete Patient Intake Record?
              </h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this intake record from your clinic dashboard?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteIntake}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow transition"
              >
                Yes, Delete Record →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Queue List */}
      {currentList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          {activeTab === 'history'
            ? 'No treated & cured patient records in history yet.'
            : activeTab === 'in_progress'
            ? 'No patients currently inside the consultation room.'
            : '🎉 All caught up! No pending patients waiting in your clinic queue.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {currentList.map((intake: any, index: number) => {
            const urgency = intake.urgency_level;
            const patient = intake.patients;
            const status = intake.status;
            const queuePosition = index + 1;
            const synthesis = intake.structured_data?.clinical_synthesis;
            const isFirst = index === 0;
            const isLast = index === currentList.length - 1;

            return (
              <div
                key={intake.id}
                className={`bg-white border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md ${
                  urgency === 'high'
                    ? 'border-red-300 bg-red-50/20'
                    : urgency === 'medium'
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3">
                    {/* Queue Position Badge */}
                    <div className="bg-slate-900 text-white font-extrabold text-sm px-3.5 py-2 rounded-xl flex items-center justify-center shadow-sm">
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

                        {status === 'doctor_reviewed' && (
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                            ✅ Treated & Cured
                          </span>
                        )}
                        {status === 'in_progress' && (
                          <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                            🩺 Under Consultation Room
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

                {/* Short AI Clinical Description Snippet */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-xs text-slate-800 space-y-1">
                  <span className="font-bold text-indigo-900 block text-[11px] uppercase tracking-wider">
                    📋 Clinical Symptom Overview:
                  </span>
                  <p className="leading-relaxed font-medium italic">
                    {synthesis || `"${intake.raw_text}"`}
                  </p>
                </div>

                {/* Sleek Action Footer: Ladder Controls + Direct Status Shift Buttons */}
                <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="text-slate-500 font-medium">Ladder Shift:</span>
                    <button
                      type="button"
                      disabled={isFirst || isUpdating === intake.id}
                      onClick={() => swapLadderPosition(index, 'up')}
                      className="bg-indigo-50 hover:bg-indigo-100 disabled:opacity-30 text-indigo-800 font-bold px-3 py-1.5 rounded-lg border border-indigo-200 transition active:scale-95"
                    >
                      ▲ Move Up
                    </button>
                    <button
                      type="button"
                      disabled={isLast || isUpdating === intake.id}
                      onClick={() => swapLadderPosition(index, 'down')}
                      className="bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition active:scale-95"
                    >
                      ▼ Move Down
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Stage Transition Quick Buttons */}
                    {status !== 'in_progress' && status !== 'doctor_reviewed' && (
                      <button
                        type="button"
                        disabled={isUpdating === intake.id}
                        onClick={() => changePatientStatus(intake.id, 'in_progress')}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm active:scale-95"
                      >
                        🩺 Send to Consultation Room
                      </button>
                    )}

                    {status !== 'doctor_reviewed' && (
                      <button
                        type="button"
                        disabled={isUpdating === intake.id}
                        onClick={() => changePatientStatus(intake.id, 'treated')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm active:scale-95"
                      >
                        ✅ Mark Treated & Cured
                      </button>
                    )}

                    {status !== 'pending_review' && (
                      <button
                        type="button"
                        disabled={isUpdating === intake.id}
                        onClick={() => changePatientStatus(intake.id, 'pending')}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold px-2.5 py-2 rounded-xl transition"
                      >
                        📋 Move Back to Waiting Queue
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isUpdating === intake.id}
                      onClick={() => setDeleteTargetId(intake.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-2.5 py-2 rounded-xl transition active:scale-95"
                      title="Delete Record"
                    >
                      🗑️
                    </button>

                    <Link
                      href={`/doctor/intake/${intake.id}`}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm active:scale-95 flex items-center gap-1"
                    >
                      Open Full Details →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
