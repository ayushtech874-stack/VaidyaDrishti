'use client';

import { useState } from 'react';
import DigiLockerRecordDrawer from '@/components/DigiLockerRecordDrawer';

interface IntakeStageActionsProps {
  intakeId: string;
  currentStatus: string;
  patientId?: string;
  patientName?: string;
  relationship?: string;
}

export default function IntakeStageActions({
  intakeId,
  currentStatus,
  patientId,
  patientName,
  relationship = 'self',
}: IntakeStageActionsProps) {
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [showTreatedModal, setShowTreatedModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDigiLocker, setShowDigiLocker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleStatusChange(targetAction: 'in_progress' | 'treated' | 'delete', targetTab?: string) {
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
        if (targetAction === 'delete') {
          window.location.href = '/doctor/dashboard';
        } else {
          window.location.href = `/doctor/dashboard?tab=${targetTab}`;
        }
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
      setShowDeleteModal(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Footer Buttons Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {patientId && (
          <button
            type="button"
            onClick={() => setShowDigiLocker(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl shadow-md transition active:scale-95 text-sm flex items-center gap-2 cursor-pointer"
          >
            <span>🔐</span> Fetch DigiLocker Health Record
          </button>
        )}

        {currentStatus !== 'in_progress' && currentStatus !== 'doctor_reviewed' && (
          <button
            type="button"
            onClick={() => setShowConsultModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-3 rounded-xl shadow-md transition active:scale-95 text-sm flex items-center gap-2 cursor-pointer"
          >
            <span>🩺</span> Move to Under Consultation Room
          </button>
        )}

        {currentStatus !== 'doctor_reviewed' && (
          <button
            type="button"
            onClick={() => setShowTreatedModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl shadow-md transition active:scale-95 text-sm flex items-center gap-2 cursor-pointer"
          >
            <span>✅</span> Mark as Treated & Cured
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-4 py-3 rounded-xl shadow-sm transition active:scale-95 text-sm flex items-center gap-1.5 cursor-pointer"
        >
          <span>🗑️</span> Delete Patient Intake
        </button>
      </div>

      {/* DigiLocker Drawer */}
      {showDigiLocker && patientId && (
        <DigiLockerRecordDrawer
          patientId={patientId}
          patientName={patientName || 'Patient'}
          relationship={relationship}
          onClose={() => setShowDigiLocker(false)}
        />
      )}

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

      {/* Confirmation Modal 3: Delete Intake Record */}
      {showDeleteModal && (
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
              Are you sure you want to permanently delete this intake record? This will remove the intake from your clinic queue and dashboard.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleStatusChange('delete')}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow transition disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete Permanently →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
