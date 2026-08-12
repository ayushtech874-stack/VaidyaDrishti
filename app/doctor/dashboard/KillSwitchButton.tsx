'use client';

import { useState } from 'react';

export default function KillSwitchButton() {
  const [isBypassed, setIsBypassed] = useState(false);

  function handleToggle() {
    const nextState = !isBypassed;
    setIsBypassed(nextState);
    if (nextState) {
      alert(
        '🛑 EMERGENCY AI KILL-SWITCH ACTIVATED\n\nAI structuring and red-flag rules are now bypassed. Displaying untouched raw patient transcripts only.'
      );
    } else {
      alert('✅ AI Decision Support Restored.');
    }
  }

  return (
    <button
      onClick={handleToggle}
      title="Immediately bypass AI structuring and show raw text only in case of misbehavior"
      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 border ${
        isBypassed
          ? 'bg-red-600 text-white border-red-700 animate-pulse'
          : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-300'
      }`}
    >
      🛑 {isBypassed ? 'AI Bypassed (Raw Only)' : 'AI Kill-Switch'}
    </button>
  );
}
