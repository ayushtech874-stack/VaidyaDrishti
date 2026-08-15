'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminOnboardingPage() {
  const [facilityName, setFacilityName] = useState('');
  const [facilityCode, setFacilityCode] = useState('');
  const [facilityType, setFacilityType] = useState<'clinic' | 'hospital'>('hospital');
  const [address, setAddress] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorEmail, setDoctorEmail] = useState('');
  const [doctorRmp, setDoctorRmp] = useState('');
  const [qualifications, setQualifications] = useState('MBBS, MD');
  const [autoVerify, setAutoVerify] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setResultData(null);

    try {
      const res = await fetch('/api/admin/onboard-facility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_name: facilityName,
          facility_code: facilityCode,
          facility_type: facilityType,
          address: address,
          department_name: departmentName,
          doctor_name: doctorName,
          doctor_email: doctorEmail,
          doctor_rmp_number: doctorRmp,
          qualifications: qualifications,
          auto_verify: autoVerify,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to onboard facility');

      setResultData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            🏥 Super-Admin Onboarding Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Register new Hospitals, OPD Departments, and RMP Doctors into VaidyaDrishti
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/qr-generator"
            className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold px-3 py-1.5 rounded-lg transition"
          >
            🖨️ QR Poster Generator
          </Link>
          <Link
            href="/directory"
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-lg transition"
          >
            🌐 Public Directory
          </Link>
          <Link
            href="/admin"
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg transition"
          >
            ← Admin Dashboard
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Success Credentials Display Card */}
      {resultData && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <h3 className="text-lg font-bold text-emerald-950">
                Facility & Doctor Onboarded Successfully!
              </h3>
              <p className="text-xs text-emerald-800">
                Facility Join Code: <code className="bg-white px-2 py-0.5 rounded font-bold border border-emerald-200">JOIN_{resultData.facility_code}</code>
              </p>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl p-4 space-y-2 text-sm text-slate-800">
            <p className="font-bold text-slate-900 border-b border-slate-100 pb-1">
              🔑 Copy & Relay Credentials to Doctor:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block">Doctor Login Email:</span>
                <code className="font-bold text-indigo-700">{resultData.credentials?.email}</code>
              </div>
              <div>
                <span className="text-slate-500 block">Temporary Generated Password:</span>
                <code className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded select-all">
                  {resultData.credentials?.temp_password}
                </code>
              </div>
            </div>
            <p className="text-xs text-slate-400 pt-1">
              Status: {resultData.is_verified ? '✅ Verified & Live' : '⏳ Pending Verification (Unpublished from Directory)'}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/admin/qr-generator?code=${resultData.facility_code}`}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition"
            >
              🖨️ Generate & Download QR Poster →
            </Link>
            <button
              onClick={() => setResultData(null)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-4 py-2 rounded-xl transition"
            >
              Onboard Another Facility
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        {/* Section 1: Facility Information */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <span>🏥</span> Section 1: Hospital / Clinic Metadata
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Facility Name *
              </label>
              <input
                type="text"
                value={facilityName}
                onChange={(e) => {
                  setFacilityName(e.target.value);
                  if (!facilityCode) {
                    setFacilityCode(
                      `HOSP_${e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)}`
                    );
                  }
                }}
                placeholder="e.g. City Care Super Specialty Hospital"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Facility Type *
              </label>
              <select
                value={facilityType}
                onChange={(e) => setFacilityType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="hospital">Hospital (Multi-Department)</option>
                <option value="clinic">Clinic (Single OPD)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Unique Join Code (QR Identifier) *
              </label>
              <input
                type="text"
                value={facilityCode}
                onChange={(e) => setFacilityCode(e.target.value.toUpperCase())}
                placeholder="e.g. HOSP_CITYCARE"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Address / Location
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Main Road, Medical OPD Complex, District 1"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Department & Doctor Registration */}
        <div className="space-y-4 pt-2">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <span>👨‍⚕️</span> Section 2: OPD Department & Lead RMP Doctor
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                OPD Specialty / Department Name
              </label>
              <input
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                placeholder="e.g. General Medicine OPD"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Doctor Full Name *
              </label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g. Dr. Rajiv Ranjan"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Doctor Login Email *
              </label>
              <input
                type="email"
                value={doctorEmail}
                onChange={(e) => setDoctorEmail(e.target.value)}
                placeholder="e.g. dr.rajiv@vaidyadrishti.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                RMP Registration License *
              </label>
              <input
                type="text"
                value={doctorRmp}
                onChange={(e) => setDoctorRmp(e.target.value)}
                placeholder="e.g. RMP-IND-2026-888"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Medical Qualifications
              </label>
              <input
                type="text"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                placeholder="e.g. MBBS, MD (General Medicine)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Regulatory Verification Gate */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoVerify}
              onChange={(e) => setAutoVerify(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Verify RMP Credentials & Publish Live immediately (`is_verified` & `is_live`)
              </span>
              <span className="text-xs text-slate-500 block">
                If unchecked, the facility will remain hidden from the public directory until verified by Super-Admin.
              </span>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold text-base py-3.5 rounded-xl shadow transition"
        >
          {isSubmitting ? 'Onboarding Facility & Doctor...' : 'Complete Onboarding & Generate Credentials →'}
        </button>
      </form>
    </div>
  );
}
