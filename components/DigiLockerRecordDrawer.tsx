'use client';

import React, { useState, useEffect } from 'react';

interface DigiLockerRecordDrawerProps {
  patientId: string;
  patientName: string;
  relationship?: string;
  onClose: () => void;
}

export default function DigiLockerRecordDrawer({
  patientId,
  patientName,
  relationship = 'self',
  onClose,
}: DigiLockerRecordDrawerProps) {
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'history' | 'documents'>('prescriptions');
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function fetchDigiLockerData() {
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
        setErrorMsg('Failed to load DigiLocker health records.');
      } finally {
        setLoading(false);
      }
    }
    if (patientId) {
      fetchDigiLockerData();
    }
  }, [patientId]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-white min-h-screen shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="bg-[#0F172A] text-white p-6 flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-extrabold uppercase tracking-wider">
              <span>🔐 DigiLocker Patient Health Record</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">{patientName}</h2>
            <p className="text-xs text-slate-400">
              Profile: <span className="font-semibold text-slate-200 uppercase">{relationship}</span> | ID: {patientId.slice(0, 8)}...
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`flex-1 py-3 px-4 border-b-2 text-center transition cursor-pointer ${
              activeTab === 'prescriptions'
                ? 'border-blue-600 text-blue-600 bg-white font-extrabold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            💊 Past Prescriptions ({prescriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 border-b-2 text-center transition cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 bg-white font-extrabold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            📋 Chronic Profile ({medicalHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 py-3 px-4 border-b-2 text-center transition cursor-pointer ${
              activeTab === 'documents'
                ? 'border-blue-600 text-blue-600 bg-white font-extrabold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            📄 Lab Reports & PDFs ({documents.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 font-medium">
              Loading encrypted health record from DigiLocker repository...
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-rose-50 text-rose-800 rounded-xl text-xs font-bold">{errorMsg}</div>
          ) : (
            <>
              {/* TAB 1: PAST PRESCRIPTIONS */}
              {activeTab === 'prescriptions' && (
                <div className="space-y-4">
                  {prescriptions.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-8 text-center">
                      No previous prescriptions recorded for this profile.
                    </p>
                  ) : (
                    prescriptions.map((rx) => (
                      <div key={rx.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                          <span className="font-extrabold text-[#0F172A]">
                            Rx Issued by {rx.doctors?.name || 'Empaneled RMP'}
                          </span>
                          <span className="text-slate-500 font-medium">
                            {new Date(rx.issued_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Medications Prescribed:
                          </span>
                          {(rx.prescription_items || []).map((item: any, idx: number) => (
                            <div key={idx} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 flex justify-between">
                              <div>
                                <span className="font-bold text-slate-900">{item.medicine_name}</span>
                                <span className="text-slate-500 text-[11px] block">{item.dosage} — {item.frequency}</span>
                              </div>
                              <span className="text-slate-500 font-semibold text-[11px]">{item.duration}</span>
                            </div>
                          ))}
                        </div>

                        {rx.notes && (
                          <p className="text-xs text-slate-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
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
                    <p className="text-xs text-slate-500 italic py-8 text-center">
                      No chronic conditions or allergies recorded.
                    </p>
                  ) : (
                    medicalHistory.map((item) => (
                      <div key={item.id} className="p-4 border border-slate-200 rounded-xl bg-white space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                            {item.field_type || item.category || 'CONDITION'}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900">{item.value || item.title}</span>
                        </div>
                        {item.description && <p className="text-xs text-slate-600">{item.description}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: UPLOADED LAB REPORTS */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  {documents.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-8 text-center">
                      No lab reports or diagnostic documents uploaded yet.
                    </p>
                  ) : (
                    documents.map((doc) => (
                      <div key={doc.id} className="p-4 border border-slate-200 rounded-xl bg-white flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-extrabold text-slate-900 block">📄 {doc.document_name}</span>
                          <span className="text-[10px] text-slate-400 block">
                            Uploaded: {new Date(doc.created_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200 transition"
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
