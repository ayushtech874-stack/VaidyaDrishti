'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ManageFacilitiesPage() {
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/directory/public');
      const data = await res.json();
      if (data.clinics) setClinics(data.clinics);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (clinicId: string, isDeactivated: boolean) => {
    setProcessingId(clinicId);
    setMsg('');
    try {
      const res = await fetch('/api/admin/deactivate-clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic_id: clinicId, is_deactivated: isDeactivated }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      setMsg(data.message || 'Facility status updated successfully.');
      setClinics((prev) =>
        prev.map((c) => (c.id === clinicId ? { ...c, is_deactivated: isDeactivated } : c))
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
              FACILITY MANAGEMENT
            </span>
            <h1 className="text-2xl font-heading font-extrabold text-[var(--color-ink)] mt-1">Medical Facility Management</h1>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Manage multi-specialty hospitals and OPD centers listed on VaidyaDrishti.
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
          <div className="p-8 text-center text-xs text-[var(--color-ink-muted)]">Loading medical facilities...</div>
        ) : (
          <div className="card-surface p-6 shadow-sm border border-[var(--color-border)] space-y-4">
            <h2 className="text-sm font-heading font-extrabold text-[var(--color-ink)] border-b border-[var(--color-border)] pb-2">
              Registered OPD Centers ({clinics.length})
            </h2>

            {clinics.length === 0 ? (
              <p className="text-xs text-[var(--color-ink-muted)]">No facilities registered yet.</p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {clinics.map((clinic) => {
                  const isActive = !clinic.is_deactivated;
                  return (
                    <div key={clinic.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[var(--color-ink)]">{clinic.name}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isActive ? 'bg-[var(--color-violet-soft)] text-[var(--color-violet)]' : 'bg-rose-50 text-rose-800'
                            }`}
                          >
                            {isActive ? 'LIVE ACTIVE' : 'DEACTIVATED'}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-ink-muted)]">{clinic.address || 'Central District'} ({clinic.city || 'Bhagalpur'})</p>
                        <p className="text-[10px] text-[var(--color-ink-muted)] font-data font-bold">Code: JOIN_{clinic.code}</p>
                      </div>

                      <button
                        disabled={processingId === clinic.id}
                        onClick={() => handleDeactivate(clinic.id, isActive)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full transition cursor-pointer ${
                          isActive
                            ? 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                            : 'btn-primary'
                        }`}
                      >
                        {processingId === clinic.id
                          ? 'Updating...'
                          : isActive
                          ? 'Deactivate Facility'
                          : 'Re-Activate Facility'}
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
