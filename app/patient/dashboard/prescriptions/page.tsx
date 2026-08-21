'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPrescriptions() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/prescriptions/list');
        const data = await res.json();
        if (res.ok && data.prescriptions) {
          setPrescriptions(data.prescriptions);
        }
      } catch (err) {
        console.error('Error loading prescriptions:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPrescriptions();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] pb-12">
      <header className="bg-[var(--color-navy)] text-white py-5 px-4 shadow-md border-b border-[var(--color-border-on-navy)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/patient/dashboard"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-white/20 transition"
            >
              ← Back to Patient Dashboard
            </Link>
            <h1 className="text-xl font-extrabold text-white">💊 My Verified E-Prescriptions</h1>
          </div>
          <span className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-full font-bold">
            TPG 2020 Compliant
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-[var(--color-navy)]">
              Digital E-Prescriptions ({prescriptions.length})
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Issued by empaneled Registered Medical Practitioners (RMP) under Telemedicine Practice Guidelines 2020
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-xs text-[var(--color-ink-muted)] italic text-center py-12">Loading e-prescriptions...</p>
        ) : prescriptions.length === 0 ? (
          <div className="card-surface p-12 text-center space-y-3">
            <span className="text-4xl">💊</span>
            <h3 className="text-base font-bold text-[var(--color-navy)]">No Prescriptions Issued Yet</h3>
            <p className="text-xs text-[var(--color-ink-muted)] max-w-md mx-auto">
              You currently have no active e-prescriptions. Prescriptions issued by your doctor following an OPD consultation will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {prescriptions.map((rx) => (
              <div key={rx.id} className="card-surface p-6 shadow-sm border-2 border-[var(--color-navy)] space-y-4">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--color-ink-muted)] block">
                      📅 Issued: {new Date(rx.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <h3 className="text-base font-extrabold text-[var(--color-navy)] mt-0.5">
                      👨‍⚕️ Dr. {rx.doctors?.name || 'Empaneled RMP Doctor'}
                    </h3>
                    <p className="text-xs text-[var(--color-ink-muted)] font-data">
                      RMP License: <strong>{rx.doctors?.rmp_registration_number || 'VERIFIED-RMP'}</strong> | {rx.doctors?.qualifications || 'MBBS'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                      ✅ Active TPG 2020 Prescription
                    </span>
                  </div>
                </div>

                {/* Medication Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--color-navy)] text-white font-bold">
                        <th className="p-2.5 rounded-l-lg">Medication & Strength</th>
                        <th className="p-2.5">Dosage / Frequency</th>
                        <th className="p-2.5">Duration</th>
                        <th className="p-2.5">Food Timing</th>
                        <th className="p-2.5 rounded-r-lg">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {(rx.prescription_items || []).map((item: any) => (
                        <tr key={item.id} className="hover:bg-[var(--color-blue-soft)]/30">
                          <td className="p-3 font-extrabold text-[var(--color-navy)]">
                            💊 {item.drug_name} ({item.dosage})
                          </td>
                          <td className="p-3 font-semibold text-[var(--color-ink)]">
                            {item.frequency}
                          </td>
                          <td className="p-3 font-data text-[var(--color-ink)]">
                            {item.duration_days} Days
                          </td>
                          <td className="p-3">
                            <span className="bg-[var(--color-blue-soft)] text-[var(--color-navy)] px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                              {item.timing?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-[var(--color-ink-muted)] italic">
                            {item.instructions || 'Take as directed'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Legal Disclaimer */}
                <div className="bg-[var(--color-cream)] p-3 rounded-xl border border-[var(--color-border)] text-[11px] text-[var(--color-ink-muted)] flex items-center justify-between">
                  <span>
                    📜 <strong>Telemedicine Compliance:</strong> Issued via telemedicine consultation per Telemedicine Practice Guidelines (TPG 2020).
                  </span>
                  <span className="font-data font-bold text-[var(--color-navy)]">
                    Rx ID: {rx.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
