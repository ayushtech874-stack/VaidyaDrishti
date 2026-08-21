'use client';

import { useState } from 'react';

interface PrescriptionItemInput {
  drug_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions: string;
  timing: string;
}

interface IssuePrescriptionModalProps {
  patientId: string;
  patientName: string;
  intakeId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function IssuePrescriptionModal({
  patientId,
  patientName,
  intakeId,
  isOpen,
  onClose,
  onSuccess,
}: IssuePrescriptionModalProps) {
  const [items, setItems] = useState<PrescriptionItemInput[]>([
    { drug_name: '', dosage: '', frequency: 'Twice daily', duration_days: 5, instructions: '', timing: 'after_food' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  function handleAddItem() {
    setItems((prev) => [
      ...prev,
      { drug_name: '', dosage: '', frequency: 'Twice daily', duration_days: 5, instructions: '', timing: 'after_food' },
    ]);
  }

  function handleRemoveItem(index: number) {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleItemChange(index: number, field: keyof PrescriptionItemInput, value: any) {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Check empty fields
    for (const item of items) {
      if (!item.drug_name.trim() || !item.dosage.trim()) {
        setErrorMsg('Please specify drug name and dosage for all prescription items.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/prescriptions/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          intake_id: intakeId,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to issue prescription.');
      }

      setSuccessMsg('E-Prescription successfully issued in compliance with TPG 2020!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to issue prescription.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card-surface p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border-2 border-[var(--color-navy)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div>
            <h2 className="text-lg font-extrabold text-[var(--color-navy)]">
              💊 Issue E-Prescription (TPG 2020 Compliant)
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Patient: <strong className="text-[var(--color-navy)]">{patientName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[var(--color-ink-muted)] hover:text-black font-bold p-1"
          >
            ✕ Close
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border-2 border-red-500 text-red-900 p-3 rounded-xl text-xs font-bold space-y-1">
            <span className="block text-sm">⚠️ TPG 2020 Compliance / Prescription Block:</span>
            <p>{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-900 p-3 rounded-xl text-xs font-bold">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="bg-[var(--color-cream)] p-4 rounded-xl border border-[var(--color-border)] space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[var(--color-navy)] uppercase">
                    Medication #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-xs text-red-600 font-bold hover:underline"
                    >
                      Remove Item
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                      Medication / Drug Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={item.drug_name}
                      onChange={(e) => handleItemChange(idx, 'drug_name', e.target.value)}
                      placeholder="e.g. Paracetamol, Amoxicillin..."
                      className="w-full bg-white border border-[var(--color-border)] rounded-lg p-2 text-xs font-bold focus:outline-none focus:border-[var(--color-blue)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                      Dosage Strength *
                    </label>
                    <input
                      type="text"
                      required
                      value={item.dosage}
                      onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                      placeholder="e.g. 500 mg, 10 ml..."
                      className="w-full bg-white border border-[var(--color-border)] rounded-lg p-2 text-xs focus:outline-none focus:border-[var(--color-blue)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                      Frequency
                    </label>
                    <select
                      value={item.frequency}
                      onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                      className="w-full bg-white border border-[var(--color-border)] rounded-lg p-2 text-xs focus:outline-none focus:border-[var(--color-blue)]"
                    >
                      <option value="Once daily">Once daily (1-0-0)</option>
                      <option value="Twice daily">Twice daily (1-0-1)</option>
                      <option value="Thrice daily">Thrice daily (1-1-1)</option>
                      <option value="As needed (PRN)">As needed (PRN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={item.duration_days}
                      onChange={(e) => handleItemChange(idx, 'duration_days', parseInt(e.target.value || '1', 10))}
                      className="w-full bg-white border border-[var(--color-border)] rounded-lg p-2 text-xs focus:outline-none focus:border-[var(--color-blue)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                      Food Timing
                    </label>
                    <select
                      value={item.timing}
                      onChange={(e) => handleItemChange(idx, 'timing', e.target.value)}
                      className="w-full bg-white border border-[var(--color-border)] rounded-lg p-2 text-xs focus:outline-none focus:border-[var(--color-blue)]"
                    >
                      <option value="after_food">After Food</option>
                      <option value="before_food">Before Food</option>
                      <option value="anytime">Anytime</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                    Specific Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    value={item.instructions}
                    onChange={(e) => handleItemChange(idx, 'instructions', e.target.value)}
                    placeholder="e.g. Take with warm water before bedtime..."
                    className="w-full bg-white border border-[var(--color-border)] rounded-lg p-2 text-xs focus:outline-none focus:border-[var(--color-blue)]"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full bg-[var(--color-blue-soft)] text-[var(--color-navy)] border border-[var(--color-blue)]/30 hover:bg-[var(--color-blue-soft)]/80 text-xs font-bold py-2 rounded-xl transition"
          >
            ➕ Add Another Medication
          </button>

          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed font-medium">
            🔒 <strong>TPG 2020 Compliance Notice:</strong> Schedule X, Narcotics, and Psychotropic drugs are strictly blocked. Issuing an e-prescription logs an immutable audit event under your RMP license.
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2.5 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs py-2.5 px-5 font-bold"
            >
              {isSubmitting ? 'Issuing Prescription...' : 'Issue E-Prescription →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
