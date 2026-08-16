'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface DashboardClientViewProps {
  initialIntakes: any[];
  doctorDisplayName: string;
  doctorRmpNo: string;
  clinicDisplayName: string;
  mustChangePassword?: boolean;
  isUnlinkedAccount?: boolean;
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

function isConsultationStatus(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return s === 'in_progress' || s === 'in-progress' || s === 'in_consultation' || s === 'consultation' || s === 'under_consultation';
}

function isReviewedStatus(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return s === 'doctor_reviewed' || s === 'reviewed' || s === 'treated' || s === 'cured' || s === 'completed' || s === 'done';
}

function isPendingStatus(status?: string): boolean {
  return !isConsultationStatus(status) && !isReviewedStatus(status);
}

function getStoredStatusOverrides(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('vaidyadrishti_status_overrides');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStatusOverride(intakeId: string, status: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredStatusOverrides();
    current[intakeId] = status;
    localStorage.setItem('vaidyadrishti_status_overrides', JSON.stringify(current));
  } catch (e) {
    console.warn('localStorage error:', e);
  }
}

function removeStatusOverride(intakeId: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredStatusOverrides();
    delete current[intakeId];
    localStorage.setItem('vaidyadrishti_status_overrides', JSON.stringify(current));
  } catch (e) {
    console.warn('localStorage error:', e);
  }
}

function applyOverrides(rawIntakes: any[]): any[] {
  const overrides = getStoredStatusOverrides();
  return rawIntakes.map((i) => ({
    ...i,
    status: overrides[i.id] || i.status,
  }));
}

function DashboardContent({
  initialIntakes,
  isUnlinkedAccount,
}: DashboardClientViewProps) {
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const initialTab =
    tabParam === 'in_progress' ? 'in_progress' : tabParam === 'history' ? 'history' : 'pending';

  const [intakes, setIntakes] = useState<any[]>(initialIntakes);
  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'history'>(initialTab);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Force Password Reset state
  const [showPasswordResetModal, setShowPasswordResetModal] = useState<boolean>(
    Boolean(initialIntakes && (initialIntakes as any).mustChangePassword)
  );
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [passwordResetError, setPasswordResetError] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  async function handleForcePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPasswordVal.length < 8) {
      setPasswordResetError('Password must be at least 8 characters long.');
      return;
    }
    if (newPasswordVal !== confirmPasswordVal) {
      setPasswordResetError('Passwords do not match.');
      return;
    }

    setIsResettingPassword(true);
    setPasswordResetError('');

    try {
      const res = await fetch('/api/doctor/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPasswordVal }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      setShowPasswordResetModal(false);
    } catch (err: any) {
      setPasswordResetError(err.message || 'Error changing password.');
    } finally {
      setIsResettingPassword(false);
    }
  }

  // Sync initial intakes prop
  useEffect(() => {
    setIntakes(initialIntakes);
  }, [initialIntakes]);

  // Sync activeTab if URL searchParams change
  useEffect(() => {
    if (tabParam === 'in_progress' || tabParam === 'history' || tabParam === 'pending') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'pending' | 'in_progress' | 'history') => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `/doctor/dashboard?tab=${tab}`);
  };

  const effectiveIntakes = applyOverrides(intakes);

  const pendingIntakes = effectiveIntakes.filter((i) => isPendingStatus(i.status));
  const inProgressIntakes = effectiveIntakes.filter((i) => isConsultationStatus(i.status));
  const reviewedIntakes = effectiveIntakes.filter((i) => isReviewedStatus(i.status));

  let currentList: any[] = [];
  if (activeTab === 'history') {
    currentList = reviewedIntakes;
  } else if (activeTab === 'in_progress') {
    currentList = inProgressIntakes;
  } else {
    currentList = pendingIntakes;
  }

  async function confirmDeleteIntake() {
    if (!deleteTargetId) return;
    const targetId = deleteTargetId;
    setIsUpdating(targetId);

    removeStatusOverride(targetId);
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

  async function changePatientStatus(intakeId: string, newStatus: 'pending' | 'in_progress' | 'treated') {
    setIsUpdating(intakeId);

    const dbStatusMap: Record<string, string> = {
      pending: 'pending_review',
      in_progress: 'in_progress',
      treated: 'doctor_reviewed',
    };

    const targetDbStatus = dbStatusMap[newStatus];
    saveStatusOverride(intakeId, targetDbStatus);

    setIntakes((prev) =>
      prev.map((item) => (item.id === intakeId ? { ...item, status: targetDbStatus } : item))
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

  async function swapLadderPosition(currentIndex: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const currentItem = currentList[currentIndex];
    const targetItem = currentList[targetIndex];

    setIsUpdating(currentItem.id);

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
      {/* ⚠️ ITEM 3: DISTINCT UNLINKED ACCOUNT WARNING BANNER */}
      {isUnlinkedAccount && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm text-amber-950 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">⚠️</span>
            <div>
              <h3 className="text-base font-extrabold text-amber-900">
                Unlinked Account Warning
              </h3>
              <p className="text-xs text-amber-800">
                This account is currently not linked to a specific clinic queue or doctor assignment.
              </p>
            </div>
          </div>
          <p className="text-xs text-amber-700 bg-white/80 border border-amber-200/80 p-3 rounded-xl font-medium">
            Contact your Super-Admin to link this account to a clinic queue, or visit{' '}
            <Link href="/admin/onboarding" className="underline font-bold text-amber-900">
              /admin/onboarding
            </Link>{' '}
            to assign clinic credentials.
          </p>
        </div>
      )}

      {/* Mandatory Password Change Modal for Temporary Credentials */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-amber-300 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center text-2xl mx-auto font-bold">
                🔐
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Action Required: Set New Password
              </h3>
              <p className="text-xs text-slate-600">
                You logged in with a temporary admin-generated password. Please create your private secure password to access your patient queue.
              </p>
            </div>

            {passwordResetError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs font-semibold">
                {passwordResetError}
              </div>
            )}

            <form onSubmit={handleForcePasswordChange} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Private Password (min 8 chars) *
                </label>
                <input
                  type="password"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={confirmPasswordVal}
                  onChange={(e) => setConfirmPasswordVal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={isResettingPassword}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm py-3 rounded-xl shadow transition"
              >
                {isResettingPassword ? 'Updating Password...' : 'Save New Password & Enter Queue →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => handleTabChange('pending')}
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
          onClick={() => handleTabChange('in_progress')}
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
          onClick={() => handleTabChange('history')}
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
          {isUnlinkedAccount
            ? '⚠️ Unlinked Account: No clinic queue associated with this login.'
            : activeTab === 'history'
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

                        {isReviewedStatus(status) && (
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                            ✅ Treated & Cured
                          </span>
                        )}
                        {isConsultationStatus(status) && (
                          <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                            🩺 Under Consultation Room
                          </span>
                        )}
                        {isPendingStatus(status) && (
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

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-xs text-slate-800 space-y-1">
                  <span className="font-bold text-indigo-900 block text-[11px] uppercase tracking-wider">
                    📋 Clinical Symptom Overview:
                  </span>
                  <p className="leading-relaxed font-medium italic">
                    {synthesis || `"${intake.raw_text}"`}
                  </p>
                </div>

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
                    {!isConsultationStatus(status) && !isReviewedStatus(status) && (
                      <button
                        type="button"
                        disabled={isUpdating === intake.id}
                        onClick={() => changePatientStatus(intake.id, 'in_progress')}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm active:scale-95"
                      >
                        🩺 Send to Consultation Room
                      </button>
                    )}

                    {!isReviewedStatus(status) && (
                      <button
                        type="button"
                        disabled={isUpdating === intake.id}
                        onClick={() => changePatientStatus(intake.id, 'treated')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm active:scale-95"
                      >
                        ✅ Mark Treated & Cured
                      </button>
                    )}

                    {!isPendingStatus(status) && (
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

export default function DashboardClientView(props: DashboardClientViewProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading dashboard view...</div>}>
      <DashboardContent {...props} />
    </Suspense>
  );
}
