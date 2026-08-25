'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function AddFamilyProfilePage() {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    relationship: 'spouse',
    phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/patient/add-family-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add family profile');
      }

      setSuccessMsg(`Family profile for ${data.profile?.name || formData.name} added successfully!`);
      setFormData({ name: '', age: '', gender: 'Male', relationship: 'spouse', phone: '' });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-cream-soft)] py-10 px-4">
      <div className="max-w-md mx-auto card-surface p-8 shadow-lg border border-[var(--color-border)] space-y-6">
        <div>
          <span className="text-[10px] font-bold uppercase bg-blue-100 text-[var(--color-navy)] px-2.5 py-0.5 rounded">
            MULTI-PROFILE FAMILY ACCOUNTS
          </span>
          <h1 className="text-xl font-extrabold text-[var(--color-navy)] mt-2">Add Family Member Profile</h1>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            Manage consultations, prescriptions, and medical history for family members under your account.
          </p>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold space-y-3">
            <p>✅ {successMsg}</p>
            <div>
              <Link href="/patient/dashboard" className="btn-primary text-xs py-2 px-3 inline-block">
                ← Return to Patient Dashboard
              </Link>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-lg text-xs font-bold">
            ❌ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Full Name *</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Sunita Devi"
              className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Age (Years) *</label>
              <input
                type="number"
                name="age"
                required
                min="0"
                max="120"
                value={formData.age}
                onChange={handleChange}
                placeholder="38"
                className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Gender *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Relationship to Account Holder *</label>
            <select
              name="relationship"
              value={formData.relationship}
              onChange={handleChange}
              className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
            >
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="parent">Parent</option>
              <option value="other">Other Dependent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Phone Number (Optional)</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Defaults to primary account phone"
              className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
            />
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-sm font-bold shadow">
            {loading ? 'Adding Profile...' : 'Save Family Profile →'}
          </button>
        </form>

        <div className="pt-2 border-t text-center">
          <Link href="/patient/dashboard" className="text-xs font-bold text-blue-600 hover:underline">
            ← Cancel & Return to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
