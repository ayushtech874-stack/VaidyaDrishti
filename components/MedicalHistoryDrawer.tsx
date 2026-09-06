'use client';

import React, { useState, useEffect } from 'react';

interface MedicalHistoryDrawerProps {
  patientId: string;
  patientName: string;
  relationship?: string;
  onClose: () => void;
}

export default function MedicalHistoryDrawer({
  patientId,
  patientName,
  relationship = 'self',
  onClose,
}: MedicalHistoryDrawerProps) {
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'history' | 'documents'>('prescriptions');
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function fetchRecordData() {
      try {
        setLoading(true);
        // Fetch prescriptions
        const rxRes = await fetch(`/api/prescriptions/list?patient_id=${patientId}`);
        const rxData = await rxRes.json();
        if (rxData.prescriptions) setPrescriptions(rxData.prescriptions);

        // Fetch medical history
        const histRes = await fetch(`/api/patient/medical-history?patient_id=${patientId}`);
        const histData = await histRes.json();
        if (histData.history) setMedicalHistory(histData.history);

        // Fetch uploaded documents
        const docRes = await fetch(`/api/patient/upload-document?patient_id=${patientId}`);
        const docData = await docRes.json();
        if (docData.documents) setDocuments(docData.documents);
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Failed to load VaidyaDrishti health records.');
      } finally {
        setLoading(false);
      }
    }
    if (patientId) {
      fetchRecordData();
    }
  }, [patientId]);

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-ink)]/70 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-[var(--color-cream)] min-h-screen shadow-2xl flex flex-col border-l border-[var(--color-border)]">
        {/* Header */}
        <div className="bg-[var(--color-teal-deep)] text-white p-6 flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-teal-soft)]/20 text-[var(--color-teal-soft)] text-[10px] font-extrabold uppercase tracking-wider">
              <span>🔐 VaidyaDrishti Health Record</span>
            </div>
            <h2 className="text-xl font-heading font-extrabold text-white tracking-tight">{patientName}</h2>
            <p className="text-xs text-[var(--color-teal-soft)]/80">
              Profile: <span className="font-semibold text-white uppercase">{relationship}</span> | ID: {patientId.slice(0, 8)}...
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-bold flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--color-border)] bg-[var(--color-white)] text-xs font-bold text-[var(--color-ink-muted)]">
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`flex-1 py-3.5 px-4 border-b-2 text-center transition cursor-pointer ${
              activeTab === 'prescriptions'
                ? 'border-[var(--color-violet)] text-[var(--color-violet)] bg-[var(--color-cream)] font-extrabold'
                : 'border-transparent hover:text-[var(--color-ink)]'
            }`}
          >
            💊 Past Prescriptions ({prescriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3.5 px-4 border-b-2 text-center transition cursor-pointer ${
              activeTab === 'history'
                ? 'border-[var(--color-violet)] text-[var(--color-violet)] bg-[var(--color-cream)] font-extrabold'
                : 'border-transparent hover:text-[var(--color-ink)]'
            }`}
          >
            📋 Chronic Profile ({medicalHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 py-3.5 px-4 border-b-2 text-center transition cursor-pointer ${
              activeTab === 'documents'
                ? 'border-[var(--color-violet)] text-[var(--color-violet)] bg-[var(--color-cream)] font-extrabold'
                : 'border-transparent hover:text-[var(--color-ink)]'
            }`}
          >
            📄 Lab Reports ({documents.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-16 text-center text-xs text-[var(--color-ink-muted)] font-medium">
              Loading encrypted health record repository...
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-[var(--color-urgent-high-bg)] text-[var(--color-urgent-high)] rounded-[var(--radius-md)] text-xs font-bold">{errorMsg}</div>
          ) : (
            <>
              {/* TAB 1: PAST PRESCRIPTIONS */}
              {activeTab === 'prescriptions' && (
                <div className="space-y-4">
                  {prescriptions.length === 0 ? (
                    <p className="text-xs text-[var(--color-ink-muted)] italic py-8 text-center">
                      No previous prescriptions recorded for this profile.
                    </p>
                  ) : (
                    prescriptions.map((rx) => (
                      <div key={rx.id} className="card-surface p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs border-b border-[var(--color-border)] pb-2">
                          <span className="font-extrabold text-[var(--color-ink)]">
                            Rx Issued by {rx.doctors?.name || 'Empaneled RMP'}
                          </span>
                          <span className="text-[var(--color-ink-muted)] font-medium">
                            {new Date(rx.issued_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider block">
                            Medications Prescribed:
                          </span>
                          {(rx.prescription_items || []).map((item: any, idx: number) => (
                            <div key={idx} className="text-xs bg-[var(--color-cream)] p-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] flex justify-between">
                              <div>
                                <span className="font-bold text-[var(--color-ink)]">{item.medicine_name}</span>
                                <span className="text-[var(--color-ink-muted)] text-[11px] block">{item.dosage} — {item.frequency}</span>
                              </div>
                              <span className="text-[var(--color-ink-muted)] font-semibold text-[11px]">{item.duration}</span>
                            </div>
                          ))}
                        </div>

                        {rx.notes && (
                          <p className="text-xs text-[var(--color-ink)] bg-[var(--color-violet-soft)] p-2.5 rounded-[var(--radius-md)] border border-[var(--color-violet)]/20">
                            <strong>Doctor Advice:</strong> {rx.notes}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: CHRONIC MEDICAL HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {medicalHistory.length === 0 ? (
                    <p className="text-xs text-[var(--color-ink-muted)] italic py-8 text-center">
                      No chronic conditions or allergies recorded.
                    </p>
                  ) : (
                    medicalHistory.map((item) => (
                      <div key={item.id} className="card-surface p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--color-violet-soft)] text-[var(--color-violet)]">
                            {item.field_type || item.category || 'CONDITION'}
                          </span>
                          <span className="text-xs font-extrabold text-[var(--color-ink)]">{item.value || item.title}</span>
                        </div>
                        {item.description && <p className="text-xs text-[var(--color-ink-muted)]">{item.description}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: UPLOADED LAB REPORTS */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  {documents.length === 0 ? (
                    <p className="text-xs text-[var(--color-ink-muted)] italic py-8 text-center">
                      No lab reports or diagnostic documents uploaded yet.
                    </p>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="card-surface p-4 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-extrabold text-[var(--color-ink)] block">📄 {doc.document_name}</span>
                          <span className="text-[10px] text-[var(--color-ink-muted)] block">
                            Uploaded: {new Date(doc.created_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary text-xs py-1.5 px-3"
                          >
                            View Document →
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
