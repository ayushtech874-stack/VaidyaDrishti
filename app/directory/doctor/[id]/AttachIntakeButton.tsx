'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AttachIntakeButtonProps {
  intakeId: string;
  doctorId: string;
  doctorName: string;
  clinicId?: string;
}

export default function AttachIntakeButton({ intakeId, doctorId, doctorName, clinicId }: AttachIntakeButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  async function handleAttachIntake() {
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/patient/attach-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake_id: intakeId,
          doctor_id: doctorId,
          clinic_id: clinicId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to attach intake to doctor');

      setSuccessMsg(`✓ Triage report successfully attached to Dr. ${doctorName}'s active OPD queue!`);
      setTimeout(() => {
        router.push(`/patient/signup?intake_id=${intakeId}`);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error attaching intake to doctor queue.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 space-y-2 text-left shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase text-emerald-900 tracking-wider">
          📋 Pending AI Triage Report Available
        </span>
        <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
          ID: {intakeId.slice(0, 8)}
        </span>
      </div>
      <p className="text-xs text-emerald-800 leading-relaxed">
        You have an active AI triage pre-screening report. Click below to attach it directly to <strong>Dr. {doctorName}</strong>&apos;s OPD queue.
      </p>

      {errorMsg && (
        <div className="bg-red-100 border border-red-300 text-red-700 p-2 rounded text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {successMsg ? (
        <div className="bg-emerald-100 border border-emerald-400 text-emerald-900 p-2 rounded text-xs font-bold text-center">
          {successMsg}
        </div>
      ) : (
        <button
          onClick={handleAttachIntake}
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
        >
          <span>{isSubmitting ? 'Attaching to OPD Queue...' : `Attach Triage Report to Dr. ${doctorName} →`}</span>
        </button>
      )}
    </div>
  );
}
