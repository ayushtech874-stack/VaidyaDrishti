'use client';

import { useState } from 'react';

interface PriorityShiftButtonsProps {
  intakeId: string;
  currentUrgency: string;
  position: number;
  totalInQueue: number;
  onShiftSuccess?: () => void;
}

export default function PriorityShiftButtons({
  intakeId,
  currentUrgency,
  position,
  totalInQueue,
}: PriorityShiftButtonsProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  async function handlePriorityChange(newUrgency: string, action?: string) {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/doctor/reorder-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake_id: intakeId,
          new_urgency: newUrgency,
          action,
        }),
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to reorder queue position:', err);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold font-sans">
      <span className="text-[var(--color-ink-muted)] font-medium">Reorder Queue:</span>

      {/* Elevate to Emergency #1 */}
      <button
        type="button"
        disabled={isUpdating || currentUrgency === 'high'}
        onClick={() => handlePriorityChange('high')}
        className="badge-high disabled:opacity-40 font-bold px-3 py-1.5 rounded-full transition shadow-sm flex items-center gap-1 active:scale-95 cursor-pointer"
      >
        🚨 #1 Emergency Priority
      </button>

      {/* Move to Medium Priority */}
      <button
        type="button"
        disabled={isUpdating || currentUrgency === 'medium'}
        onClick={() => handlePriorityChange('medium')}
        className="badge-medium disabled:opacity-40 font-bold px-3 py-1.5 rounded-full transition shadow-sm flex items-center gap-1 active:scale-95 cursor-pointer"
      >
        🟡 Medium Priority
      </button>

      {/* Move to Low Priority */}
      <button
        type="button"
        disabled={isUpdating || currentUrgency === 'low'}
        onClick={() => handlePriorityChange('low')}
        className="badge-low disabled:opacity-40 font-bold px-3 py-1.5 rounded-full transition shadow-sm flex items-center gap-1 active:scale-95 cursor-pointer"
      >
        🟢 Low Priority
      </button>

      {isUpdating && (
        <span className="text-xs text-[var(--color-violet)] font-bold animate-pulse ml-1">
          ⏳ Updating position...
        </span>
      )}
    </div>
  );
}
