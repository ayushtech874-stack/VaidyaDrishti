'use client';

import React, { useState } from 'react';
import MedicalHistoryDrawer from '@/components/MedicalHistoryDrawer';

interface PatientHistoryDrawerButtonProps {
  patientId: string;
  patientName: string;
}

export default function PatientHistoryDrawerButton({
  patientId,
  patientName,
}: PatientHistoryDrawerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-primary py-2 px-4 text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer"
      >
        <span>📂 View Full Patient History (VaidyaDrishti Health Record)</span>
      </button>

      {isOpen && (
        <MedicalHistoryDrawer
          patientId={patientId}
          patientName={patientName}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
