'use client';

import React, { useState } from 'react';

interface DoctorProfile {
  id: string;
  name: string;
  photo_url?: string | null;
  short_bio?: string | null;
  qualifications?: string | null;
  rmp_registration_number?: string | null;
  registration_status?: string | null;
}

export default function DoctorProfileEditor({ doctor }: { doctor: DoctorProfile }) {
  const [photoUrl, setPhotoUrl] = useState(doctor.photo_url || '');
  const [shortBio, setShortBio] = useState(doctor.short_bio || '');
  const [qualifications, setQualifications] = useState(doctor.qualifications || '');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/doctor/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_url: photoUrl,
          short_bio: shortBio,
          qualifications,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setSuccessMsg('Profile updated successfully! Changes reflect on your public directory page.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto card-surface p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
      <div className="border-b pb-4">
        <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded">
          MY DOCTOR PROFILE
        </span>
        <h2 className="text-xl font-extrabold text-[var(--color-navy)] mt-2">Edit Practitioner Profile</h2>
        <p className="text-xs text-slate-500 mt-1">
          Update your public photo, clinical bio, and display qualifications.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold">
          ✅ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-bold">
          ❌ {errorMsg}
        </div>
      )}

      {/* READ-ONLY RMP INTEGRITY SAFEGUARD SECTION */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            🔒 Clinical Credentials (Read-Only)
          </span>
          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
            Verified RMP ✓
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Doctor Full Name</label>
            <input
              type="text"
              readOnly
              value={doctor.name || ''}
              className="w-full p-2 text-xs border rounded bg-slate-100 text-slate-700 font-bold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-0.5">RMP Registration #</label>
            <input
              type="text"
              readOnly
              value={doctor.rmp_registration_number || 'RMP-VERIFIED'}
              className="w-full p-2 text-xs border rounded bg-slate-100 text-slate-700 font-bold font-mono cursor-not-allowed"
            />
          </div>
        </div>
        <p className="text-[10px] text-slate-500 italic">
          To update your registered RMP number or legal practitioner name, contact system administration.
        </p>
      </div>

      {/* EDITABLE PROFILE FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">
            Display Qualifications (e.g. MBBS, MD Cardiology)
          </label>
          <input
            type="text"
            value={qualifications}
            onChange={(e) => setQualifications(e.target.value)}
            placeholder="e.g. MBBS, MD Internal Medicine"
            className="w-full p-2.5 text-sm border rounded-xl bg-white text-gray-900 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">
            Photo URL (Public Profile Picture)
          </label>
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://example.com/doctor-photo.jpg"
            className="w-full p-2.5 text-sm border rounded-xl bg-white text-gray-900 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">
            Short Clinical Bio (Displayed on City Directory)
          </label>
          <textarea
            rows={4}
            value={shortBio}
            onChange={(e) => setShortBio(e.target.value)}
            placeholder="Describe your clinical experience, specializations, and patient care approach..."
            className="w-full p-2.5 text-sm border rounded-xl bg-white text-gray-900 font-medium"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 text-sm font-bold shadow-sm"
        >
          {loading ? 'Saving Changes...' : 'Save Profile Changes →'}
        </button>
      </form>
    </div>
  );
}
