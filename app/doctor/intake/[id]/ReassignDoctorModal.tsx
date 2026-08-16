'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ReassignModalProps {
  intakeId: string;
  clinicId: string;
  currentDoctorId?: string;
}

export default function ReassignDoctorModal({ intakeId, clinicId, currentDoctorId }: ReassignModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const supabase = createClient();

  useEffect(() => {
    async function loadHospitalDoctors() {
      if (!clinicId) return;
      const { data } = await supabase
        .from('doctors')
        .select('id, name, qualifications, department_id, is_general_triage')
        .eq('clinic_id', clinicId);

      setDoctorsList(data || []);
      if (data && data.length > 0) {
        const otherDoc = data.find((d) => d.id !== currentDoctorId) || data[0];
        setSelectedDoctorId(otherDoc.id);
      }
    }
    if (isOpen) {
      loadHospitalDoctors();
    }
  }, [isOpen, clinicId]);

  async function handleReassign(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/doctor/reassign-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake_id: intakeId,
          target_doctor_id: selectedDoctorId,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reassign intake');

      setSuccessMsg(data.message || 'Intake reassigned successfully!');
      setTimeout(() => {
        setIsOpen(false);
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error reassigning intake.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-extrabold px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
      >
        <span>🔄 Reassign Specialist Doctor</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-indigo-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>🔄</span> Reassign Patient to Specialist
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {successMsg ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl text-center text-sm font-bold">
                {successMsg}
              </div>
            ) : (
              <form onSubmit={handleReassign} className="space-y-4">
                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Target RMP Specialist *
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  >
                    {doctorsList.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({doc.qualifications || 'MBBS'}) {doc.is_general_triage ? '⭐ [General Triage Doctor]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Clinical Reassignment Note / Reason
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Reassigning to Pediatrics/Cardiology based on secondary symptom review..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow transition"
                  >
                    {isSubmitting ? 'Reassigning...' : 'Confirm Reassignment →'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
