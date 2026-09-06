'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ManageDoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/directory/public');
      const data = await res.json();
      if (data.doctors) setDoctors(data.doctors);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (doctorId: string, isDeactivated: boolean) => {
    setProcessingId(doctorId);
    setMsg('');
    try {
      const res = await fetch('/api/admin/deactivate-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: doctorId, is_deactivated: isDeactivated }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      setMsg(data.message || 'Doctor status updated successfully.');
      setDoctors((prev) =>
        prev.map((d) => (d.id === doctorId ? { ...d, is_deactivated: isDeactivated } : d))
      );
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-cream)] py-8 px-4 font-sans text-[var(--color-ink)]">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card-surface p-6 flex justify-between items-center border border-[var(--color-border)] shadow-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--color-violet-soft)] text-[var(--color-violet)] px-2.5 py-0.5 rounded-full border border-[var(--color-violet)]/20">
              ADMIN CONTROL PANEL
            </span>
            <h1 className="text-2xl font-heading font-extrabold text-[var(--color-ink)] mt-1">Approved Doctor Management</h1>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Manage approved RMP practitioners across all affiliated network clinics.
            </p>
          </div>
          <Link href="/admin" className="btn-secondary text-xs py-2 px-4">
            ← Back to Executive Portal
          </Link>
        </div>

        {msg && (
          <div className="p-3 bg-[var(--color-teal-soft)] border border-[var(--color-teal-deep)]/20 text-[var(--color-teal-deep)] rounded-[var(--radius-md)] text-xs font-bold">
            {msg}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--color-ink-muted)]">Loading approved doctors...</div>
        ) : (
          <div className="card-surface p-6 shadow-sm border border-[var(--color-border)] space-y-4">
            <h2 className="text-sm font-heading font-extrabold text-[var(--color-ink)] border-b border-[var(--color-border)] pb-2">
              Empaneled RMP Doctors ({doctors.length})
            </h2>

            {doctors.length === 0 ? (
              <p className="text-xs text-[var(--color-ink-muted)]">No doctors registered yet.</p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {doctors.map((doc) => {
                  const isActive = !doc.is_deactivated;
                  return (
                    <div key={doc.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[var(--color-ink)]">{doc.name}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {isActive ? 'ACTIVE' : 'DEACTIVATED'}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-ink-muted)]">{doc.qualifications || 'MBBS Physician'} | Reg: {doc.rmp_registration_number || 'VERIFIED'}</p>
                        <p className="text-[10px] text-[var(--color-ink-muted)]">Clinic: {doc.clinics?.name || 'Central Facility'}</p>
                      </div>

                      <button
                        disabled={processingId === doc.id}
                        onClick={() => handleDeactivate(doc.id, isActive)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full transition cursor-pointer ${
                          isActive
                            ? 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                            : 'btn-primary'
                        }`}
                      >
                        {processingId === doc.id
                          ? 'Updating...'
                          : isActive
                          ? 'Deactivate Account'
                          : 'Re-Activate Account'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
