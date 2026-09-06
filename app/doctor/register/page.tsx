'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AuthSplitLayout from '@/components/AuthSplitLayout';

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
  const supabase = createClient();

  useEffect(() => {
    // Check if user is already logged in (e.g. via Google OAuth) to pre-fill email/name
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setFormData((prev) => ({
          ...prev,
          email: prev.email || user.email || '',
          name: prev.name || user.user_metadata?.full_name || user.user_metadata?.name || '',
        }));
      }
    });

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
    <AuthSplitLayout
      headline="Register Medical Practice"
      subtext="RMP Self-Service Verification Portal. Applications undergo admin review prior to directory listing."
      altLinkPrompt="Already registered as a doctor?"
      altLinkText="Log In to Portal"
      altLinkHref="/doctor/login"
      redirectNext="/doctor/register"
      badges={[
        { icon: '👨‍⚕️', title: 'Verified RMP Doctors', subtitle: 'TPG 2020 Guidelines Compliant' },
        { icon: '📜', title: 'License Verification', subtitle: 'Secure RMP Proof Storage' },
        { icon: '🏥', title: 'Clinic Listing', subtitle: 'Tier-2 & 3 Tele-Triage Network' },
      ]}
      errorMsg={errorMsg}
    >
      {successMsg ? (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-[var(--radius-md)] text-xs font-semibold">
          <p className="font-extrabold text-sm text-emerald-950">✅ Application Submitted!</p>
          <p className="mt-1.5 leading-relaxed">{successMsg}</p>
          <div className="mt-4">
            <Link href="/doctor/login" className="btn-dark text-xs py-2 px-4 inline-block">
              Go to Doctor Login →
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-[var(--color-ink)]">
          {/* Section 1: Credentials */}
          <div className="space-y-3">
            <h3 className="text-xs font-heading font-extrabold text-[var(--color-ink)] uppercase tracking-wider border-b border-[var(--color-border)] pb-1">
              1. Doctor Credentials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">Full Name (with Dr.) *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full p-2.5 text-xs border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-cream)] font-medium text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="doctor@hospital.com"
                  className="w-full p-2.5 text-xs border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-cream)] font-medium text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)] font-data"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">Password *</label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full p-2.5 text-xs border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-cream)] font-medium text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+919876543210"
                  className="w-full p-2.5 text-xs border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-cream)] font-medium text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)] font-data"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">RMP Registration No *</label>
                <input
                  type="text"
                  name="rmp_registration_number"
                  required
                  value={formData.rmp_registration_number}
                  onChange={handleChange}
                  placeholder="e.g. MCI-2018-98745"
                  className="w-full p-2.5 text-xs border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-cream)] font-medium text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)] font-data"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">Specialty / Department *</label>
                <select
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-cream)] font-medium text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)]"
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
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">Qualifications</label>
              <input
                type="text"
                name="qualifications"
                value={formData.qualifications}
                onChange={handleChange}
                placeholder="e.g. MBBS, MD (General Medicine)"
                className="w-full p-2.5 text-xs border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-cream)] font-medium text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)]"
              />
            </div>
          </div>

          {/* Section 2: Facility */}
          <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
            <h3 className="text-xs font-heading font-extrabold text-[var(--color-ink)] uppercase tracking-wider border-b border-[var(--color-border)] pb-1">
              2. Facility Affiliation
            </h3>

            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="useNewClinic"
                checked={useNewClinic}
                onChange={(e) => setUseNewClinic(e.target.checked)}
                className="w-4 h-4 text-[var(--color-violet)] rounded accent-[var(--color-violet)]"
              />
              <label htmlFor="useNewClinic" className="text-xs font-bold text-[var(--color-ink)] cursor-pointer">
                Register a NEW Clinic / Hospital
              </label>
            </div>

            {!useNewClinic ? (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">Select Existing Verified Facility *</label>
                <select
                  name="clinic_id"
                  value={formData.clinic_id}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-cream)] font-medium text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)]"
                >
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city || 'Bhagalpur'})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 bg-[var(--color-teal-soft)] border border-[var(--color-teal-deep)]/20 rounded-[var(--radius-md)] space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">Clinic / Hospital Name *</label>
                  <input
                    type="text"
                    name="new_clinic_name"
                    required={useNewClinic}
                    value={formData.new_clinic_name}
                    onChange={handleChange}
                    placeholder="e.g. City Care Hospital"
                    className="w-full p-2.5 text-xs border border-[var(--color-border)] rounded-[var(--radius-md)] bg-white text-[var(--color-ink)] font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">City *</label>
                    <input
                      type="text"
                      name="new_clinic_city"
                      required={useNewClinic}
                      value={formData.new_clinic_city}
                      onChange={handleChange}
                      placeholder="e.g. Bhagalpur"
                      className="w-full p-2.5 text-xs border border-[var(--color-border)] rounded-[var(--radius-md)] bg-white text-[var(--color-ink)] font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">State *</label>
                    <input
                      type="text"
                      name="new_clinic_state"
                      required={useNewClinic}
                      value={formData.new_clinic_state}
                      onChange={handleChange}
                      placeholder="Bihar"
                      className="w-full p-2.5 text-xs border border-[var(--color-border)] rounded-[var(--radius-md)] bg-white text-[var(--color-ink)] font-medium"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Verification Document */}
          <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
            <h3 className="text-xs font-heading font-extrabold text-[var(--color-ink)] uppercase tracking-wider border-b border-[var(--color-border)] pb-1">
              3. Verification Proof Document
            </h3>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">Upload RMP License / Degree (PDF / Image) *</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileChange}
                className="w-full p-2 text-xs border border-[var(--color-border)] rounded-[var(--radius-md)] bg-[var(--color-cream)] text-[var(--color-ink)]"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full btn-dark py-3.5 text-sm font-bold shadow-md mt-4">
            {loading ? 'Submitting Application...' : 'Submit Doctor Registration Application →'}
          </button>
        </form>
      )}
    </AuthSplitLayout>
  );
}
