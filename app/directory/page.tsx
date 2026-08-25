'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PublicDirectoryPage() {
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('Bhagalpur');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [clinics, setClinics] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'all', label: 'All Specialties' },
    { id: 'genmed', label: 'Fever / General Checkup' },
    { id: 'ortho', label: 'Bones / Joints / Injury' },
    { id: 'cardio', label: 'Heart / Chest / Breathing' },
    { id: 'peds', label: 'Pediatrics / Child Care' },
    { id: 'derm', label: 'Skin / Hair / Allergy' },
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

    const spec = (d.qualifications || '' + d.department?.name || '').toLowerCase();
    if (selectedCategory === 'genmed' && (spec.includes('general') || spec.includes('medicine') || spec.includes('mbbs'))) return true;
    if (selectedCategory === 'ortho' && (spec.includes('ortho') || spec.includes('bone') || spec.includes('joint'))) return true;
    if (selectedCategory === 'cardio' && (spec.includes('cardio') || spec.includes('heart') || spec.includes('chest'))) return true;
    if (selectedCategory === 'peds' && (spec.includes('pediatric') || spec.includes('child'))) return true;
    if (selectedCategory === 'derm' && (spec.includes('skin') || spec.includes('derm'))) return true;

    return false;
  });

  return (
    <main className="min-h-screen bg-[var(--color-cream-soft)] py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="card-surface p-6 border border-[var(--color-border)] text-center space-y-3 shadow-sm">
          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-full">
            VERIFIED HEALTHCARE PROVIDER DIRECTORY
          </span>
          <h1 className="text-2xl font-extrabold text-[var(--color-navy)]">Find RMP Doctors & Facilities</h1>
          <p className="text-xs text-[var(--color-ink-muted)] max-w-xl mx-auto">
            Browse verified RMP practitioners and medical centers. Consult online, send grievances, or message via WhatsApp.
          </p>

          {/* City Selector Dropdown */}
          <div className="pt-3 flex flex-wrap justify-center items-center gap-2">
            <span className="text-xs font-bold text-[var(--color-navy)]">Select City:</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="p-2 text-sm font-bold border rounded bg-white text-[var(--color-navy)] shadow-sm min-w-[160px]"
            >
              {(cities.length > 0 ? cities : ['Bhagalpur', 'Patna']).map((city) => (
                <option key={city} value={city}>
                  📍 {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-[var(--color-navy)] text-white shadow'
                  : 'bg-white text-[var(--color-navy)] border border-[var(--color-border)] hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Directory Listings */}
        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--color-ink-muted)]">Loading verified doctors in {selectedCity}...</div>
        ) : (
          <div className="space-y-8">
            {/* Doctors Section */}
            <div>
              <h2 className="text-base font-extrabold text-[var(--color-navy)] mb-3">
                Verified RMP Doctors in {selectedCity} ({filteredDoctors.length})
              </h2>

              {filteredDoctors.length === 0 ? (
                <div className="card-surface p-6 text-center text-xs text-[var(--color-ink-muted)]">
                  No verified doctors currently listed under this specialty in {selectedCity}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDoctors.map((doc) => (
                    <div key={doc.id} className="card-surface p-5 border border-[var(--color-border)] hover:shadow-md transition space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-[var(--color-navy)] flex items-center justify-center font-bold text-lg flex-shrink-0">
                          🩺
                        </div>
                        <div className="flex-1">
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase">
                            VERIFIED RMP
                          </span>
                          <h3 className="text-base font-extrabold text-[var(--color-navy)]">{doc.name}</h3>
                          <p className="text-xs text-[var(--color-ink-muted)]">{doc.qualifications || 'MBBS Physician'}</p>
                          <p className="text-[11px] font-mono text-blue-700 mt-0.5">Reg: {doc.rmp_registration_number}</p>
                        </div>
                      </div>

                      {doc.short_bio && <p className="text-xs text-gray-600 line-clamp-2 italic font-serif">"{doc.short_bio}"</p>}

                      <div className="text-xs text-gray-600 border-t pt-2">
                        🏥 <span className="font-bold">{doc.clinics?.name}</span> ({doc.clinics?.city || selectedCity})
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2 border-t">
                        <Link
                          href={`/directory/doctor/${doc.id}`}
                          className="text-xs font-bold text-blue-600 hover:underline inline-block"
                        >
                          View Full Profile →
                        </Link>

                        <Link
                          href={`/patient/dashboard/new-consultation?doctor_id=${doc.id}`}
                          className="btn-primary text-xs py-1.5 px-3 inline-block"
                        >
                          Start Consultation
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clinics Section */}
            <div>
              <h2 className="text-base font-extrabold text-[var(--color-navy)] mb-3">
                Live Medical Facilities in {selectedCity} ({filteredClinics.length})
              </h2>

              {filteredClinics.length === 0 ? (
                <div className="card-surface p-6 text-center text-xs text-[var(--color-ink-muted)]">
                  No verified clinics currently listed in {selectedCity}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredClinics.map((clinic) => (
                    <div key={clinic.id} className="card-surface p-5 border border-[var(--color-border)] hover:shadow-md transition space-y-3">
                      <div>
                        <span className="text-[9px] font-bold bg-blue-100 text-[var(--color-navy)] px-2 py-0.5 rounded uppercase">
                          VERIFIED FACILITY
                        </span>
                        <h3 className="text-base font-extrabold text-[var(--color-navy)] mt-1">{clinic.name}</h3>
                        <p className="text-xs text-[var(--color-ink-muted)]">{clinic.address || 'Central District'}</p>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t">
                        <Link
                          href={`/directory/clinic/${clinic.id}`}
                          className="text-xs font-bold text-blue-600 hover:underline"
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
      </div>
    </main>
  );
}
