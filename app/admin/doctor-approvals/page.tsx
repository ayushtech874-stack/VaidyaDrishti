'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDoctorApprovalsPage() {
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});
  const [msg, setMsg] = useState('');

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/doctor-approvals');
      const data = await res.json();
      if (data.pendingDoctors) {
        setPendingDoctors(data.pendingDoctors);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (doctorId: string, action: 'approve' | 'reject') => {
    setActionLoading(doctorId);
    setMsg('');
    try {
      const res = await fetch('/api/admin/doctor-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: doctorId,
          action,
          rejection_reason: rejectionReasons[doctorId] || 'Credentials verification incomplete.',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      setMsg(data.message);
      fetchPending();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-cream-soft)] py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card-surface p-6 flex justify-between items-center border border-[var(--color-border)]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              ADMIN VERIFICATION QUEUE
            </span>
            <h1 className="text-xl font-extrabold text-[var(--color-navy)] mt-1">Doctor Self-Registration Approvals</h1>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Review RMP license proof, qualifications, and facility affiliation. Approving a doctor also activates any new clinic created.
            </p>
          </div>
          <Link href="/admin/dashboard" className="text-xs font-bold text-blue-600 hover:underline">
            ← Admin Dashboard
          </Link>
        </div>

        {msg && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold">
            ✅ {msg}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--color-ink-muted)]">Loading pending applications...</div>
        ) : pendingDoctors.length === 0 ? (
          <div className="card-surface p-8 text-center text-xs text-[var(--color-ink-muted)]">
            🎉 No pending doctor registration applications in queue.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingDoctors.map((doc) => (
              <div key={doc.id} className="card-surface p-6 border-2 border-amber-200 bg-amber-50/10 space-y-4">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-[var(--color-navy)]">{doc.name}</h3>
                    <p className="text-xs text-[var(--color-ink-muted)]">{doc.email} | {doc.phone}</p>
                    <p className="text-xs font-semibold text-gray-700 mt-1">
                      RMP Reg #: <span className="font-mono text-blue-700 font-bold">{doc.rmp_registration_number}</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-900 px-2.5 py-1 rounded">
                    Status: PENDING REVIEW
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-white border rounded text-xs">
                  <div>
                    <p className="font-bold text-[var(--color-navy)]">Qualifications & Bio:</p>
                    <p className="text-gray-700">{doc.qualifications}</p>
                    {doc.short_bio && <p className="text-gray-500 italic mt-1 font-serif">"{doc.short_bio}"</p>}
                  </div>

                  <div>
                    <p className="font-bold text-[var(--color-navy)]">Facility Affiliation:</p>
                    <p className="text-gray-700">
                      {doc.clinics?.name} ({doc.clinics?.city || 'Bhagalpur'})
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Clinic Status: {doc.clinics?.is_verified ? 'Verified ✅' : 'Unverified / Pending Safeguard ⚠️'}
                    </p>
                  </div>
                </div>

                {doc.licenseDocUrl && (
                  <div>
                    <a
                      href={doc.licenseDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-700 hover:underline bg-blue-50 px-3 py-1.5 rounded border border-blue-200"
                    >
                      <span>📄 View Uploaded RMP License Document</span>
                      <span>↗</span>
                    </a>
                  </div>
                )}

                <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-3">
                  <div className="flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="Optional rejection reason..."
                      value={rejectionReasons[doc.id] || ''}
                      onChange={(e) => setRejectionReasons({ ...rejectionReasons, [doc.id]: e.target.value })}
                      className="w-full p-2 text-xs border rounded bg-white text-gray-900"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleAction(doc.id, 'reject')}
                      disabled={actionLoading === doc.id}
                      className="px-4 py-2 bg-rose-100 text-rose-800 hover:bg-rose-200 font-bold text-xs rounded border border-rose-300 transition"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => handleAction(doc.id, 'approve')}
                      disabled={actionLoading === doc.id}
                      className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs rounded shadow transition"
                    >
                      {actionLoading === doc.id ? 'Approving...' : 'Approve Doctor & Facility ✅'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
