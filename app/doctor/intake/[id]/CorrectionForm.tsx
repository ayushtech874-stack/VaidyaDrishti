'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DoctorCorrectionForm({
  intakeId,
  initialStructured,
  currentUrgency,
}: {
  intakeId: string;
  initialStructured: any;
  currentUrgency: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState(initialStructured?.duration || '');
  const [severity, setSeverity] = useState(initialStructured?.severity || '');
  const [primarySymptoms, setPrimarySymptoms] = useState(
    (initialStructured?.primary_symptoms || []).join(', ')
  );
  const [associatedSymptoms, setAssociatedSymptoms] = useState(
    (initialStructured?.associated_symptoms || []).join(', ')
  );
  const [forcedUrgency, setForcedUrgency] = useState<string>(currentUrgency || 'low');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const correctedData = {
      ...initialStructured,
      duration: duration.trim(),
      severity: severity.trim(),
      primary_symptoms: primarySymptoms
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean),
      associated_symptoms: associatedSymptoms
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean),
      extraction_confidence: 'high' as const, // Upgraded by doctor review
    };

    try {
      const res = await fetch('/api/doctor/correct-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake_id: intakeId,
          corrected_structured_data: correctedData,
          forced_urgency_level: forcedUrgency,
          doctor_notes: doctorNotes.trim(),
        }),
      });

      if (res.ok) {
        setIsOpen(false);
        router.refresh();
      } else {
        alert('Failed to save correction.');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting correction.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-300 transition flex items-center gap-1.5"
      >
        ✏️ Edit / Correct AI Extraction & Urgency
      </button>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 my-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h4 className="font-bold text-slate-900 text-sm">
          Doctor Clinical Override & Correction
        </h4>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-600 text-xs font-bold"
        >
          ✕ Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Duration
            </label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Severity
            </label>
            <input
              type="text"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Clinical Urgency Level (Override Rules)
          </label>
          <select
            value={forcedUrgency}
            onChange={(e) => setForcedUrgency(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold"
          >
            <option value="high">🔴 HIGH URGENCY</option>
            <option value="medium">🟡 MEDIUM URGENCY</option>
            <option value="low">🟢 LOW URGENCY</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Primary Symptoms (comma-separated)
          </label>
          <input
            type="text"
            value={primarySymptoms}
            onChange={(e) => setPrimarySymptoms(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Associated Symptoms (comma-separated)
          </label>
          <input
            type="text"
            value={associatedSymptoms}
            onChange={(e) => setAssociatedSymptoms(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Doctor Clinical Notes & Override Rationale
          </label>
          <textarea
            rows={2}
            value={doctorNotes}
            onChange={(e) => setDoctorNotes(e.target.value)}
            placeholder="Document clinical reasoning for urgency or symptom correction..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg transition"
        >
          {isSubmitting ? 'Saving Correction...' : 'Save Clinical Override & Log Audit Trail'}
        </button>
      </form>
    </div>
  );
}
