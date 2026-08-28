'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import HeaderNavbar from '@/components/HeaderNavbar';

export default function PublicDirectoryPage() {
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('Bhagalpur');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [clinics, setClinics] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'all', label: 'All Specialties', icon: '🩺' },
    { id: 'genmed', label: 'Fever / General Checkup', icon: '🌡️' },
    { id: 'ortho', label: 'Bones / Joints / Injury', icon: '🦴' },
    { id: 'cardio', label: 'Heart / Chest / Breathing', icon: '🫀' },
    { id: 'peds', label: 'Pediatrics / Child Care', icon: '👶' },
    { id: 'derm', label: 'Skin / Hair / Allergy', icon: '🧴' },
  ];

  useEffect(() => {
    // Fetch live directory data
    fetch('/api/directory/public')
      .then((res) => res.json())
      .then((data) => {
        if (data.cities && data.cities.length > 0) {
          setCities(data.cities);
          if (!data.cities.includes(selectedCity)) {
            setSelectedCity(data.cities[0]);
          }
        }
        if (data.clinics) setClinics(data.clinics);
        if (data.doctors) setDoctors(data.doctors);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredClinics = clinics.filter((c) => (c.city || 'Bhagalpur').toLowerCase() === selectedCity.toLowerCase());

  const filteredDoctors = doctors.filter((d) => {
    const docCity = d.clinics?.city || 'Bhagalpur';
    const cityMatch = docCity.toLowerCase() === selectedCity.toLowerCase();
    if (!cityMatch) return false;
    if (selectedCategory === 'all') return true;

    const spec = (d.qualifications || '' + (d.department?.name || '')).toLowerCase();
    if (selectedCategory === 'genmed' && (spec.includes('general') || spec.includes('medicine') || spec.includes('mbbs'))) return true;
    if (selectedCategory === 'ortho' && (spec.includes('ortho') || spec.includes('bone') || spec.includes('joint'))) return true;
    if (selectedCategory === 'cardio' && (spec.includes('cardio') || spec.includes('heart') || spec.includes('chest'))) return true;
    if (selectedCategory === 'peds' && (spec.includes('pediatric') || spec.includes('child'))) return true;
    if (selectedCategory === 'derm' && (spec.includes('skin') || spec.includes('derm'))) return true;

    return false;
  });

  return (
    <div className="min-h-screen bg-[var(--color-cream-soft)] text-[var(--color-ink)] flex flex-col">
      {/* Global Header Navigation Bar with Logo & Site Name */}
      <HeaderNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* City Selector Hero Section */}
        <div className="card-surface p-6 sm:p-8 border border-[var(--color-border)] text-center space-y-4 shadow-sm bg-gradient-to-b from-white via-white to-[var(--color-cream-soft)]">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
            <span>✨ VERIFIED RMP HEALTHCARE PROVIDER DIRECTORY</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-navy)] tracking-tight">
            Find RMP Doctors & Accredited Medical Facilities
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] max-w-xl mx-auto leading-relaxed">
            Browse verified RMP practitioners and medical centers in your city. Consult online, view clinical credentials, or message via WhatsApp.
          </p>

          {/* Interactive City Dropdown Selector */}
          <div className="pt-2 flex flex-wrap justify-center items-center gap-3">
            <label className="text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider">
              Select City:
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="p-2.5 text-sm font-extrabold border-2 border-[var(--color-navy)] rounded-xl bg-white text-[var(--color-navy)] shadow-xs min-w-[200px] cursor-pointer hover:border-blue-700 transition"
            >
              {(cities.length > 0 ? cities : ['Bhagalpur', 'Patna']).map((city) => (
                <option key={city} value={city}>
                  📍 {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Specialty Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 text-xs scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-[var(--color-navy)] text-white shadow-md scale-102'
                  : 'bg-white text-[var(--color-navy)] border border-[var(--color-border)] hover:bg-slate-50 hover:shadow-2xs'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Directory Listings */}
        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--color-ink-muted)] font-medium space-y-3 card-surface border">
            <div className="animate-spin text-3xl">⏳</div>
            <p>Loading verified healthcare providers in {selectedCity}...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Doctors Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold text-[var(--color-navy)] flex items-center gap-2">
                  <span>🩺</span> Verified RMP Doctors in {selectedCity} ({filteredDoctors.length})
                </h2>
                <Link
                  href="/doctor/register"
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                  <span>+</span> Are you a doctor? Register here
                </Link>
              </div>

              {filteredDoctors.length === 0 ? (
                <div className="card-surface p-8 text-center text-xs text-[var(--color-ink-muted)] border">
                  No verified doctors currently listed under this specialty in {selectedCity}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDoctors.map((doc) => (
                    <div
                      key={doc.id}
                      className="card-surface p-5 border border-[var(--color-border)] hover:shadow-md hover:border-blue-300 transition-all space-y-3.5 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3.5">
                          {/* Doctor Avatar / Photo */}
                          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-[var(--color-navy)] flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-2xs overflow-hidden">
                            {doc.photo_url ? (
                              <img src={doc.photo_url} alt={doc.name} className="w-full h-full object-cover" />
                            ) : (
                              '🩺'
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="inline-block text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase tracking-wider mb-1">
                              VERIFIED RMP
                            </span>
                            <h3 className="text-base font-extrabold text-[var(--color-navy)] truncate">{doc.name}</h3>
                            <p className="text-xs text-[var(--color-ink-muted)] font-medium">{doc.qualifications || 'MBBS Physician'}</p>
                            <p className="text-[11px] font-mono text-blue-700 mt-0.5 font-bold">
                              Reg: {doc.rmp_registration_number || 'RMP-VERIFIED'}
                            </p>
                          </div>
                        </div>

                        {doc.short_bio && (
                          <p className="text-xs text-slate-600 line-clamp-2 italic font-serif bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                            "{doc.short_bio}"
                          </p>
                        )}

                        <div className="text-xs text-slate-600 border-t border-slate-100 pt-2.5 flex items-center gap-1.5">
                          <span>🏥</span>
                          <span className="font-bold text-[var(--color-navy)]">{doc.clinics?.name || 'VaidyaDrishti Associated Clinic'}</span>
                          <span className="text-slate-400">({doc.clinics?.city || selectedCity})</span>
                        </div>
                      </div>

                      <div className="pt-2.5 flex items-center justify-between gap-2 border-t border-slate-100">
                        <Link
                          href={`/directory/doctor/${doc.id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-block"
                        >
                          View Full Profile →
                        </Link>

                        <Link
                          href={`/patient/dashboard/new-consultation?doctor_id=${doc.id}`}
                          className="btn-primary text-xs py-2 px-4 inline-block font-bold shadow-xs hover:scale-102 transition-transform"
                        >
                          Start Consultation
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clinics / Facilities Section */}
            <div>
              <h2 className="text-lg font-extrabold text-[var(--color-navy)] mb-4 flex items-center gap-2">
                <span>🏥</span> Live Medical Facilities in {selectedCity} ({filteredClinics.length})
              </h2>

              {filteredClinics.length === 0 ? (
                <div className="card-surface p-8 text-center text-xs text-[var(--color-ink-muted)] border">
                  No verified clinics currently listed in {selectedCity}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredClinics.map((clinic) => (
                    <div
                      key={clinic.id}
                      className="card-surface p-5 border border-[var(--color-border)] hover:shadow-md hover:border-blue-300 transition-all space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[9px] font-extrabold bg-blue-100 text-[var(--color-navy)] px-2 py-0.5 rounded uppercase tracking-wider">
                          VERIFIED FACILITY
                        </span>
                        <h3 className="text-base font-extrabold text-[var(--color-navy)] mt-1.5">{clinic.name}</h3>
                        <p className="text-xs text-[var(--color-ink-muted)]">{clinic.address || 'Central OPD District'}</p>
                      </div>

                      <div className="pt-2.5 flex items-center justify-between border-t border-slate-100">
                        <Link
                          href={`/directory/clinic/${clinic.id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          View Facility Profile & Contact →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[var(--color-border)] py-6 px-4 text-center text-xs text-[var(--color-ink-muted)] space-y-1">
        <p className="font-bold text-[var(--color-navy)]">VaidyaDrishti Healthcare Platform</p>
        <p>Compliant with Telemedicine Practice Guidelines (TPG 2020) & Digital Personal Data Protection Act (DPDP Act 2023).</p>
      </footer>
    </div>
  );
}
