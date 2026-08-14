'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface IntakeStageActionsProps {
  intakeId: string;
  currentStatus: string;
}

export default function IntakeStageActions({ intakeId, currentStatus }: IntakeStageActionsProps) {
  const router = useRouter();
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [showTreatedModal, setShowTreatedModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleStatusChange(targetAction: 'in_progress' | 'treated', targetTab: string) {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/doctor/reorder-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake_id: intakeId,
          action: targetAction,
        }),
      });

      if (res.ok) {
        // Redirect directly to the correct tab on dashboard
        window.location.href = `/doctor/dashboard?tab=${targetTab}`;
      } else {
        alert('Failed to update stage status. Please try again.');
      }
    } catch (err) {
      console.error('Status transition error:', err);
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
      setShowConsultModal(false);
      setShowTreatedModal(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Footer Buttons Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {currentStatus !== 'in_progress' && currentStatus !== 'doctor_reviewed' && (
          <button
            type="button"
            onClick={() => setShowConsultModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-md transition active:scale-95 text-sm flex items-center gap-2"
          >
            <span>🩺</span> Move to Under Consultation Room
          </button>
        )}

        {currentStatus !== 'doctor_reviewed' && (
          <button
            type="button"
            onClick={() => setShowTreatedModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-md transition active:scale-95 text-sm flex items-center gap-2"
          >
            <span>✅</span> Mark as Treated & Cured
          </button>
        )}
      </div>

      {/* Confirmation Modal 1: Move to Under Consultation Room */}
      {showConsultModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-900">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl font-bold">
                🩺
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Move to Under Consultation Room?
              </h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              This will update the patient's stage to <strong>Under Consultation / Grievance Heard</strong> and move their record into your active consultation room tab.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConsultModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleStatusChange('in_progress', 'in_progress')}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow transition disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Yes, Move Patient →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal 2: Mark as Treated & Cured */}
      {showTreatedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-emerald-900">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-xl font-bold">
                ✅
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Mark as Treated & Cured?
              </h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              This will finalize the clinical review and permanently archive this patient record in your <strong>Treated & Cured History</strong> database.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowTreatedModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleStatusChange('treated', 'history')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow transition disabled:opacity-50"
              >
                {isSubmitting ? 'Finalizing...' : 'Yes, Finalize & Archive →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
