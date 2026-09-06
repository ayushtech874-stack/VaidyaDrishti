'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DoctorApprovalsPage() {
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchPendingApplications();
  }, []);

  const fetchPendingApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/doctor-approvals');
      const data = await res.json();
      if (data.doctors) {
        setPendingDoctors(data.doctors);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (doctorId: string, action: 'approve' | 'reject') => {
    setProcessingId(doctorId);
    setMsg('');
    try {
      const res = await fetch('/api/admin/doctor-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: doctorId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      setMsg(`Doctor application ${action}d successfully!`);
      setPendingDoctors((prev) => prev.filter((d) => d.id !== doctorId));
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-cream)] py-10 px-4 font-sans text-[var(--color-ink)]">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card-surface p-6 flex justify-between items-center border border-[var(--color-border)] shadow-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--color-violet-soft)] text-[var(--color-violet)] px-2.5 py-0.5 rounded-full border border-[var(--color-violet)]/20">
              RMP VERIFICATION QUEUE
            </span>
            <h1 className="text-xl font-heading font-extrabold text-[var(--color-ink)] mt-1">Doctor Self-Registration Approvals</h1>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Verify submitted RMP licenses and credentials before granting directory listing.
            </p>
          </div>
          <Link href="/admin" className="btn-secondary text-xs py-2 px-4">
            ← Back to Portal
          </Link>
        </div>

        {msg && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-[var(--radius-md)] text-xs font-bold">
            {msg}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--color-ink-muted)]">Loading pending applications...</div>
        ) : pendingDoctors.length === 0 ? (
          <div className="card-surface p-8 text-center text-xs text-[var(--color-ink-muted)]">
            No pending doctor applications awaiting review right now.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingDoctors.map((doc) => (
              <div key={doc.id} className="card-surface p-6 border-2 border-[var(--color-border)] space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-heading font-extrabold text-[var(--color-ink)]">{doc.name}</h3>
                    <p className="text-xs text-[var(--color-ink-muted)]">{doc.email} | {doc.phone}</p>
                    <p className="text-xs text-[var(--color-violet)] font-bold font-data mt-1">
                      RMP Reg #: <span className="font-mono text-[var(--color-ink)]">{doc.rmp_registration_number}</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-[var(--color-urgent-medium-bg)] text-[var(--color-urgent-medium)] px-2.5 py-1 rounded-full border border-[var(--color-urgent-medium)]/30">
                    PENDING APPROVAL ⏳
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-[var(--color-cream)] p-4 rounded-[var(--radius-md)] border border-[var(--color-border)]">
                  <div>
                    <p className="font-bold text-[var(--color-ink)]">Qualifications & Bio:</p>
                    <p className="text-[var(--color-ink-muted)]">{doc.qualifications || 'MBBS'}</p>
                    <p className="text-[var(--color-ink-muted)] italic mt-1">{doc.short_bio || 'No bio provided'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-[var(--color-ink)]">Facility Affiliation:</p>
                    <p className="text-[var(--color-ink-muted)]">{doc.clinics?.name || 'New Facility Sub-flow'}</p>
                    <p className="text-[var(--color-ink-muted)]">{doc.clinics?.city || doc.city || 'Bhagalpur'}</p>
                  </div>
                </div>

                {doc.license_doc_url && (
                  <div>
                    <a
                      href={doc.license_doc_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      📄 View Submitted License Proof →
                    </a>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
                  <button
                    disabled={processingId === doc.id}
                    onClick={() => handleApprovalAction(doc.id, 'reject')}
                    className="btn-destructive text-xs py-2 px-4"
                  >
                    Reject Application
                  </button>
                  <button
                    disabled={processingId === doc.id}
                    onClick={() => handleApprovalAction(doc.id, 'approve')}
                    className="btn-primary text-xs py-2 px-4 shadow"
                  >
                    {processingId === doc.id ? 'Processing...' : 'Approve Doctor Application ✓'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
