'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PatientTimelinePage() {
  const [patient, setPatient] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTimeline() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/timeline/patient');
        const data = await res.json();
        if (res.ok && data.timeline) {
          setPatient(data.patient);
          setTimeline(data.timeline);
        }
      } catch (err) {
        console.error('Error loading timeline:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadTimeline();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] pb-12">
      <header className="bg-[var(--color-navy)] text-white py-5 px-4 shadow-md border-b border-[var(--color-border-on-navy)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/patient/dashboard"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-white/20 transition"
            >
              ← Back to Patient Dashboard
            </Link>
            <h1 className="text-xl font-extrabold text-white">📜 Unified Care Continuity Timeline</h1>
          </div>
          <span className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full font-bold">
            Cross-Clinic History
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="border-b border-[var(--color-border)] pb-3">
          <h2 className="text-lg font-extrabold text-[var(--color-navy)]">
            Chronological Care History Feed ({timeline.length} Events)
          </h2>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Unified medical history across all VaidyaDrishti clinics, tele-consultations, e-prescriptions, and documents
          </p>
        </div>

        {isLoading ? (
          <p className="text-xs text-[var(--color-ink-muted)] italic text-center py-12">Loading unified care timeline...</p>
        ) : timeline.length === 0 ? (
          <div className="card-surface p-12 text-center space-y-3">
            <span className="text-4xl">📜</span>
            <h3 className="text-base font-bold text-[var(--color-navy)]">No Medical Events Found</h3>
            <p className="text-xs text-[var(--color-ink-muted)] max-w-md mx-auto">
              Your care continuity timeline is currently empty. Intakes, tele-consultations, e-prescriptions, and uploaded documents will be recorded here automatically.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-[var(--color-blue)] space-y-6">
            {timeline.map((event) => {
              const dateLabel = new Date(event.date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={event.id} className="relative group">
                  {/* Event Marker Node */}
                  <div className="absolute -left-[31px] top-1.5 w-6 h-6 rounded-full bg-[var(--color-navy)] text-white text-xs flex items-center justify-center shadow-md">
                    {event.icon}
                  </div>

                  <div className="card-surface p-5 shadow-sm space-y-2 hover:border-[var(--color-blue)] transition">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-[var(--color-blue-soft)] text-[var(--color-navy)]">
                          {event.event_type}
                        </span>
                        <h3 className="text-sm font-extrabold text-[var(--color-navy)]">
                          {event.title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-data font-bold text-[var(--color-ink-muted)]">
                        🕒 {dateLabel}
                      </span>
                    </div>

                    {event.doctor_name && (
                      <p className="text-xs font-bold text-[var(--color-blue)]">
                        👨‍⚕️ Practitioner: {event.doctor_name}
                      </p>
                    )}

                    {event.details && (
                      <p className="text-xs text-[var(--color-ink)] leading-relaxed italic bg-[var(--color-cream)] p-3 rounded-xl border border-[var(--color-border)]">
                        &quot;{event.details}&quot;
                      </p>
                    )}

                    {event.items && event.items.length > 0 && (
                      <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-900 uppercase">Prescribed Medications:</span>
                        <ul className="text-xs text-emerald-950 font-bold divide-y divide-emerald-200">
                          {event.items.map((m: any) => (
                            <li key={m.id} className="py-1 flex justify-between">
                              <span>💊 {m.drug_name} ({m.dosage})</span>
                              <span className="font-normal text-[11px]">{m.frequency} x {m.duration_days} Days</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
