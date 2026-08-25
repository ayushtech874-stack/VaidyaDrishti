'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DoctorRegisterPage() {
  const [clinics, setClinics] = useState<any[]>([]);
  const [useNewClinic, setUseNewClinic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    rmp_registration_number: '',
    specialty: 'General Medicine',
    qualifications: 'MBBS, MD',
    short_bio: '',
    clinic_id: '',
    new_clinic_name: '',
    new_clinic_address: '',
    new_clinic_city: 'Bhagalpur',
    new_clinic_state: 'Bihar',
  });

  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetch('/api/directory/clinics')
      .then((res) => res.json())
      .then((data) => {
        if (data.clinics && data.clinics.length > 0) {
          setClinics(data.clinics);
          setFormData((prev) => ({ ...prev, clinic_id: data.clinics[0].id }));
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      let license_doc_base64 = '';
      let license_doc_filename = '';

      if (file) {
        license_doc_filename = file.name;
        license_doc_base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const res = await fetch('/api/doctor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          clinic_id: useNewClinic ? null : formData.clinic_id,
          license_doc_base64,
          license_doc_filename,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessMsg('Registration submitted successfully! Your account is under admin review. You can log in once approved.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-cream-soft)] py-10 px-4">
      <div className="max-w-2xl mx-auto card-surface p-8 shadow-lg border border-[var(--color-border)]">
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 bg-blue-100 text-[var(--color-navy)] font-bold text-xs rounded-full mb-2">
            RMP SELF-SERVICE REGISTRATION
          </span>
          <h1 className="text-2xl font-extrabold text-[var(--color-navy)]">Doctor & Clinic Registration</h1>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            Register your medical practice on VaidyaDrishti. Applications undergo verification before directory listing.
          </p>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-sm">
            <p className="font-bold">✅ Application Submitted!</p>
            <p className="mt-1">{successMsg}</p>
            <div className="mt-4">
              <Link href="/doctor/login" className="btn-primary text-xs py-2 px-4 inline-block">
                Go to Doctor Login →
              </Link>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-lg text-sm">
            <p className="font-bold">❌ Error</p>
            <p>{errorMsg}</p>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-[var(--color-navy)] border-b pb-1">1. Doctor Credentials</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Full Name (with Dr. prefix) *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="doctor@hospital.com"
                    className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Password *</label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+919876543210"
                    className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">RMP Registration Number *</label>
                  <input
                    type="text"
                    name="rmp_registration_number"
                    required
                    value={formData.rmp_registration_number}
                    onChange={handleChange}
                    placeholder="e.g. MCI-2018-98745"
                    className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Specialty / Department *</label>
                  <select
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleChange}
                    className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
                  >
                    <option value="General Medicine">General Medicine</option>
                    <option value="Orthopedics">Orthopedics (Bones/joints)</option>
                    <option value="Cardiology">Cardiology (Heart/breathing)</option>
                    <option value="Pediatrics">Pediatrics (Child care)</option>
                    <option value="Dermatology">Dermatology (Skin/hair)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Qualifications</label>
                <input
                  type="text"
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleChange}
                  placeholder="e.g. MBBS, MD (General Medicine)"
                  className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Short Profile Bio (~150 chars)</label>
                <textarea
                  name="short_bio"
                  rows={2}
                  value={formData.short_bio}
                  onChange={handleChange}
                  placeholder="Senior Consultant Physician with 12+ years experience in OPD care..."
                  className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-extrabold text-[var(--color-navy)] border-b pb-1">2. Facility Affiliation</h3>

              <div className="flex items-center space-x-3 mb-2">
                <input
                  type="checkbox"
                  id="useNewClinic"
                  checked={useNewClinic}
                  onChange={(e) => setUseNewClinic(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="useNewClinic" className="text-xs font-bold text-[var(--color-navy)] cursor-pointer">
                  Register a NEW Clinic / Hospital (Sub-flow)
                </label>
              </div>

              {!useNewClinic ? (
                <div>
                  <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Select Existing Verified Facility *</label>
                  <select
                    name="clinic_id"
                    value={formData.clinic_id}
                    onChange={handleChange}
                    className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
                  >
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city || 'Bhagalpur'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg space-y-3">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    SAFEGUARD: New clinics require admin verification before going live
                  </span>

                  <div>
                    <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Clinic / Hospital Name *</label>
                    <input
                      type="text"
                      name="new_clinic_name"
                      required={useNewClinic}
                      value={formData.new_clinic_name}
                      onChange={handleChange}
                      placeholder="e.g. City Care Hospital"
                      className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">City *</label>
                      <input
                        type="text"
                        name="new_clinic_city"
                        required={useNewClinic}
                        value={formData.new_clinic_city}
                        onChange={handleChange}
                        placeholder="e.g. Bhagalpur or Patna"
                        className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">State *</label>
                      <input
                        type="text"
                        name="new_clinic_state"
                        required={useNewClinic}
                        value={formData.new_clinic_state}
                        onChange={handleChange}
                        placeholder="Bihar"
                        className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Address</label>
                    <input
                      type="text"
                      name="new_clinic_address"
                      value={formData.new_clinic_address}
                      onChange={handleChange}
                      placeholder="Main Road, Near Station..."
                      className="w-full p-2.5 text-sm border rounded bg-white text-gray-900 font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-extrabold text-[var(--color-navy)] border-b pb-1">3. Verification Proof Document</h3>

              <div>
                <label className="block text-xs font-bold text-[var(--color-navy)] mb-1">Upload RMP License / Degree Certificate (PDF / Image) *</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileChange}
                  className="w-full p-2 text-xs border rounded bg-white text-gray-900"
                />
                <p className="text-[10px] text-[var(--color-ink-muted)] mt-1">
                  Uploaded to secure private storage bucket (`doctor-verification-docs`). Admin-only read access.
                </p>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-sm font-bold shadow-md">
              {loading ? 'Submitting Application...' : 'Submit Doctor Registration Application →'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
