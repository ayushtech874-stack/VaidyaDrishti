'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/admin/doctor-approvals');
      const data = await res.json();
      if (data.doctors) {
        setDoctors(data.doctors);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleToggleActive = async (doctorId: string, currentIsActive: boolean) => {
    setActionMsg('');
    const newStatus = !currentIsActive;
    try {
      const res = await fetch('/api/admin/deactivate-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: doctorId, is_active: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update doctor status');

      setActionMsg(`Doctor ${newStatus ? 'reactivated' : 'deactivated'} successfully.`);
      fetchDoctors();
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-cream-soft)] py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-xs font-bold text-blue-600 hover:underline">
              ← Admin Dashboard
            </Link>
            <h1 className="text-2xl font-extrabold text-[var(--color-navy)] mt-1">Approved Doctor Management</h1>
          </div>
          <Link href="/admin/facilities" className="btn-secondary text-xs py-2 px-3">
            Facility Management →
          </Link>
        </div>

        {actionMsg && (
          <div className="p-3 bg-blue-50 border border-blue-300 text-blue-900 rounded-xl text-xs font-bold">
            ℹ️ {actionMsg}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading approved doctors...</div>
        ) : (
          <div className="card-surface p-6 border shadow-sm space-y-4">
            <h2 className="text-sm font-extrabold text-[var(--color-navy)]">
              Empaneled RMP Doctors ({doctors.length})
            </h2>

            {doctors.length === 0 ? (
              <p className="text-xs text-slate-500">No doctors registered yet.</p>
            ) : (
              <div className="space-y-3">
                {doctors.map((doc) => {
                  const isActive = doc.is_active !== false;
                  return (
                    <div
                      key={doc.id}
                      className="p-4 border rounded-xl bg-white flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[var(--color-navy)]">{doc.name}</span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                              isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isActive ? 'ACTIVE ✓' : 'DEACTIVATED 🚫'}
                          </span>
                        </div>
                        <p className="text-slate-500">{doc.qualifications || 'MBBS Physician'} | Reg: {doc.rmp_registration_number || 'VERIFIED'}</p>
                        <p className="text-slate-400 text-[10px]">Clinic: {doc.clinics?.name || 'Central Facility'}</p>
                      </div>

                      <button
                        onClick={() => handleToggleActive(doc.id, isActive)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                          isActive
                            ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                        }`}
                      >
                        {isActive ? 'Deactivate Doctor' : 'Reactivate Doctor'}
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
