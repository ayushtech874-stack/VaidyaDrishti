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
        className="btn-secondary text-xs py-2 px-3.5 font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
      >
        <span>🔄 Reassign Specialist Doctor</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-[var(--color-ink)]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-[var(--color-white)] rounded-[var(--radius-lg)] p-6 max-w-md w-full shadow-2xl border border-[var(--color-border)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-heading font-extrabold text-[var(--color-ink)] flex items-center gap-2">
                <span>🔄</span> Reassign Patient to Specialist
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {successMsg ? (
              <div className="bg-[var(--color-teal-soft)] border border-[var(--color-teal-deep)]/20 text-[var(--color-teal-deep)] p-4 rounded-[var(--radius-md)] text-center text-xs font-bold">
                {successMsg}
              </div>
            ) : (
              <form onSubmit={handleReassign} className="space-y-4">
                {errorMsg && (
                  <div className="bg-[var(--color-urgent-high-bg)] border border-[var(--color-urgent-high)] text-[var(--color-urgent-high)] p-3 rounded-[var(--radius-md)] text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1.5">
                    Select Target RMP Specialist *
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-xs font-bold text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)]"
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
                  <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1.5">
                    Clinical Reassignment Note / Reason
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Reassigning to Pediatrics/Cardiology based on secondary symptom review..."
                    className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="btn-secondary text-xs py-2 px-4 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary text-xs py-2 px-4 cursor-pointer shadow"
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
