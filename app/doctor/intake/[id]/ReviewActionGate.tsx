'use client';

import { useState, useEffect } from 'react';

export default function ReviewActionGate({
  intakeId,
  confidence,
  status,
  markAsReviewedAction,
}: {
  intakeId: string;
  confidence: string;
  status: string;
  markAsReviewedAction: (formData: FormData) => Promise<void>;
}) {
  const isHighConfidence = confidence === 'high';
  const [hasExpandedRawText, setHasExpandedRawText] = useState(isHighConfidence);

  useEffect(() => {
    // Listen for expansion event on the raw transcript <details> element
    const detailsElem = document.getElementById('raw-transcript-details');
    if (!detailsElem) return;

    const handleToggle = () => {
      if ((detailsElem as HTMLDetailsElement).open) {
        setHasExpandedRawText(true);
      }
    };

    detailsElem.addEventListener('toggle', handleToggle);
    return () => detailsElem.removeEventListener('toggle', handleToggle);
  }, []);

  if (status === 'doctor_reviewed') {
    return (
      <span className="bg-emerald-100 text-emerald-800 font-bold px-4 py-2 rounded-xl text-sm">
        ✓ Marked as Reviewed
      </span>
    );
  }

  const isButtonDisabled = !isHighConfidence && !hasExpandedRawText;

  return (
    <div className="flex items-center gap-3">
      {isButtonDisabled && (
        <span className="text-xs text-amber-800 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300 font-semibold animate-pulse">
          🔒 Open Raw Transcript below to unlock review button
        </span>
      )}

      <form action={markAsReviewedAction}>
        <input type="hidden" name="intake_id" value={intakeId} />
        <button
          type="submit"
          disabled={isButtonDisabled}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl shadow-md transition active:scale-[0.99]"
        >
          Mark as Reviewed
        </button>
      </form>
    </div>
  );
}
