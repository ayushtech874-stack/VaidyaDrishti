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

  useEffect(() => {
    setIntakes(initialIntakes);
  }, [initialIntakes]);

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
      {/* ⚠️ DISTINCT UNLINKED ACCOUNT WARNING BANNER */}
      {isUnlinkedAccount && (
        <div className="bg-[var(--color-urgent-medium-bg)] border-2 border-[var(--color-urgent-medium)] rounded-2xl p-5 shadow-sm text-[var(--color-ink)] space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">⚠️</span>
            <div>
              <h3 className="text-base font-extrabold text-[var(--color-navy)]">
                Unlinked Doctor Account Warning
              </h3>
              <p className="text-xs text-[var(--color-ink-muted)]">
                This account is currently not linked to a specific clinic queue or doctor assignment.
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] bg-white/80 border border-[var(--color-border)] p-3 rounded-xl font-medium">
            Contact your Super-Admin to link this account to a clinic queue, or visit{' '}
            <Link href="/admin/onboarding" className="underline font-bold text-[var(--color-navy)]">
              /admin/onboarding
            </Link>{' '}
            to assign clinic credentials.
          </p>
        </div>
      )}

      {/* Mandatory Password Change Modal for Temporary Credentials */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[var(--color-urgent-medium)] space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-[var(--color-urgent-medium-bg)] text-[var(--color-urgent-medium)] rounded-full flex items-center justify-center text-2xl mx-auto font-bold">
                🔐
              </div>
              <h3 className="text-xl font-bold text-[var(--color-navy)]">
                Action Required: Set New Password
              </h3>
              <p className="text-xs text-[var(--color-ink-muted)]">
                You logged in with a temporary admin-generated password. Please create your private secure password to access your patient queue.
              </p>
            </div>

            {passwordResetError && (
              <div className="bg-[var(--color-urgent-high-bg)] border border-[var(--color-urgent-high)] text-[var(--color-urgent-high)] p-3 rounded-xl text-xs font-semibold">
                {passwordResetError}
              </div>
            )}

            <form onSubmit={handleForcePasswordChange} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                  New Private Password (min 8 chars) *
                </label>
                <input
                  type="password"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3 text-sm focus:outline-none focus:border-[var(--color-blue)]"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={confirmPasswordVal}
                  onChange={(e) => setConfirmPasswordVal(e.target.value)}
                  className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3 text-sm focus:outline-none focus:border-[var(--color-blue)]"
                  required
                  minLength={8}
                />
              </div>

              <button type="submit" disabled={isResettingPassword} className="btn-primary w-full text-sm py-3">
                {isResettingPassword ? 'Updating Password...' : 'Save New Password & Enter Queue →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] pb-3">
        <button
          type="button"
          onClick={() => handleTabChange('pending')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-150 ${
            activeTab === 'pending'
              ? 'bg-[var(--color-navy)] text-white shadow-md'
              : 'bg-white text-[var(--color-navy)] border border-[var(--color-border)] hover:bg-[var(--color-blue-soft)]'
          }`}
        >
          <span>📋 Active Waiting Queue</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-data ${
              activeTab === 'pending' ? 'bg-[var(--color-blue)] text-white' : 'bg-[var(--color-cream-deep)] text-[var(--color-ink)]'
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
              ? 'bg-[var(--color-urgent-medium)] text-white shadow-md'
              : 'bg-white text-[var(--color-navy)] border border-[var(--color-border)] hover:bg-[var(--color-blue-soft)]'
          }`}
        >
          <span>🩺 Under Consultation</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-data ${
              activeTab === 'in_progress' ? 'bg-[var(--color-navy)] text-white' : 'bg-[var(--color-cream-deep)] text-[var(--color-ink)]'
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
              ? 'bg-[var(--color-urgent-low)] text-white shadow-md'
              : 'bg-white text-[var(--color-navy)] border border-[var(--color-border)] hover:bg-[var(--color-blue-soft)]'
          }`}
        >
          <span>✅ Treated & Cured History</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-data ${
              activeTab === 'history' ? 'bg-[var(--color-navy)] text-white' : 'bg-[var(--color-cream-deep)] text-[var(--color-ink)]'
            }`}
          >
            {reviewedIntakes.length}
          </span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-[var(--color-urgent-high)] space-y-4">
            <div className="flex items-center gap-3 text-[var(--color-urgent-high)]">
              <div className="w-10 h-10 bg-[var(--color-urgent-high-bg)] rounded-full flex items-center justify-center text-xl font-bold">
                🗑️
              </div>
              <h3 className="text-lg font-bold text-[var(--color-navy)]">
                Delete Patient Intake Record?
              </h3>
            </div>

            <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
              Are you sure you want to permanently delete this intake record from your clinic dashboard?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteIntake}
                className="btn-destructive text-sm"
              >
                Yes, Delete Record →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Queue List */}
      {currentList.length === 0 ? (
        <div className="card-surface p-12 text-center text-[var(--color-ink-muted)] space-y-2">
          <span className="text-3xl">📋</span>
          <p className="text-base font-bold text-[var(--color-navy)]">
            {isUnlinkedAccount
              ? '⚠️ Unlinked Account: No clinic queue associated with this login.'
              : activeTab === 'history'
              ? 'No treated & cured patient records in history yet.'
              : activeTab === 'in_progress'
              ? 'No patients currently inside the consultation room.'
              : '🎉 All caught up! No pending patients waiting in your clinic queue.'}
          </p>
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
                className="card-surface p-6 shadow-sm transition-all hover:shadow-md space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-[var(--color-navy)] text-white font-data text-sm font-bold px-3 py-1.5 rounded-lg shadow-sm">
                      #{queuePosition}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          href={`/doctor/intake/${intake.id}`}
                          className="font-extrabold text-[var(--color-navy)] text-xl hover:text-[var(--color-blue)] transition"
                        >
                          {patient?.name || 'Unknown Patient'}
                        </Link>

                        <span className="text-xs font-bold text-[var(--color-ink-muted)] bg-[var(--color-cream-deep)] px-2.5 py-0.5 rounded-full font-data">
                          Age: {patient?.age} yrs
                        </span>

                        {isReviewedStatus(status) && (
                          <span className="text-xs bg-[var(--color-urgent-low-bg)] text-[var(--color-urgent-low)] px-2.5 py-0.5 rounded-full font-bold">
                            ✅ Treated & Cured
                          </span>
                        )}
                        {isConsultationStatus(status) && (
                          <span className="text-xs bg-[var(--color-urgent-medium-bg)] text-[var(--color-urgent-medium)] px-2.5 py-0.5 rounded-full font-bold">
                            🩺 Under Consultation
                          </span>
                        )}
                        {isPendingStatus(status) && (
                          <span className="text-xs bg-[var(--color-blue-soft)] text-[var(--color-navy)] px-2.5 py-0.5 rounded-full font-bold">
                            ⏳ Waiting in Queue
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[var(--color-ink-muted)] font-data">
                        Phone: {patient?.phone} • Submitted {formatTimeAgo(intake.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Urgency Badge Pair */}
                  <div>
                    {urgency === 'high' && (
                      <span className="badge-high font-extrabold text-xs px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                        🔴 HIGH URGENCY
                      </span>
                    )}
                    {urgency === 'medium' && (
                      <span className="badge-medium font-bold text-xs px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                        🟡 MEDIUM URGENCY
                      </span>
                    )}
                    {urgency === 'low' && (
                      <span className="badge-low font-semibold text-xs px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                        🟢 LOW URGENCY
                      </span>
                    )}
                  </div>
                </div>

                {intake.red_flags && intake.red_flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {intake.red_flags.map((flag: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-xs font-semibold bg-[var(--color-urgent-high-bg)] text-[var(--color-urgent-high)] border border-[var(--color-urgent-high)] px-2.5 py-1 rounded-md"
                      >
                        ⚠️ {flag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="bg-[var(--color-blue-soft)] border border-[var(--color-blue)]/20 rounded-xl p-4 text-xs text-[var(--color-ink)] space-y-1">
                  <span className="font-bold text-[var(--color-navy)] block text-[11px] uppercase tracking-wider">
                    📋 Clinical Symptom Overview:
                  </span>
                  <p className="leading-relaxed font-medium italic">
                    {synthesis || `"${intake.raw_text}"`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between border-t border-[var(--color-border)] pt-3 gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="text-[var(--color-ink-muted)]">Queue Shift:</span>
                    <button
                      type="button"
                      disabled={isFirst || isUpdating === intake.id}
                      onClick={() => swapLadderPosition(index, 'up')}
                      className="btn-secondary text-xs py-1 px-3"
                    >
                      ▲ Move Up
                    </button>
                    <button
                      type="button"
                      disabled={isLast || isUpdating === intake.id}
                      onClick={() => swapLadderPosition(index, 'down')}
                      className="btn-secondary text-xs py-1 px-3"
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
                        className="bg-[var(--color-urgent-medium)] text-white text-xs font-bold px-3 py-2 rounded-lg"
                      >
                        🩺 Consultation Room
                      </button>
                    )}

                    {!isReviewedStatus(status) && (
                      <button
                        type="button"
                        disabled={isUpdating === intake.id}
                        onClick={() => changePatientStatus(intake.id, 'treated')}
                        className="bg-[var(--color-urgent-low)] text-white text-xs font-bold px-3 py-2 rounded-lg"
                      >
                        ✅ Mark Treated
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isUpdating === intake.id}
                      onClick={() => setDeleteTargetId(intake.id)}
                      className="text-[var(--color-urgent-high)] border border-[var(--color-urgent-high)] px-2.5 py-2 rounded-lg text-xs font-bold"
                    >
                      🗑️
                    </button>

                    <Link
                      href={`/doctor/intake/${intake.id}`}
                      className="btn-primary text-xs py-2 px-4 flex items-center gap-1"
                    >
                      Open Details →
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
    <Suspense fallback={<div className="p-8 text-center text-[var(--color-ink-muted)]">Loading clinical dashboard...</div>}>
      <DashboardContent {...props} />
    </Suspense>
  );
}
