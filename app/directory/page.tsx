'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import HeaderNavbar from '@/components/HeaderNavbar';

import CitySearchAutocomplete from '@/components/CitySearchAutocomplete';

const DEFAULT_CITIES = [
  'Bhagalpur',
  'Patna',
  'Muzaffarpur',
  'Gaya',
  'Darbhanga',
  'Purnia',
  'Varanasi',
  'Lucknow',
  'Ranchi',
  'Dhanbad',
  'Jamshedpur',
  'Gorakhpur',
  'Agra',
];

export default function PublicDirectoryPage() {
  const [selectedCity, setSelectedCity] = useState<string>('Bhagalpur');
  const [customLocation, setCustomLocation] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [cities, setCities] = useState<string[]>(DEFAULT_CITIES);
  const [clinics, setClinics] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 3000);

    async function fetchDirectory() {
      try {
        const res = await fetch('/api/directory/public');
        const data = await res.json();
        if (isMounted) {
          const fetchedCities = data.cities || [];
          const mergedCities = Array.from(new Set([...DEFAULT_CITIES, ...fetchedCities]));
          setCities(mergedCities);
          if (data.clinics) setClinics(data.clinics);
          if (data.doctors) setDoctors(data.doctors);
        }
      } catch (err) {
        console.error('Failed to load directory:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDirectory();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const activeLocationName = customLocation || selectedCity;

  // Filter doctors by selected city & specialty
  const filteredDoctors = doctors.filter((doc) => {
    if (!selectedCity) return true;
    const docCity = doc.clinics?.city || doc.city || 'Bhagalpur';
    const matchesCity = docCity.toLowerCase() === selectedCity.toLowerCase();
    if (!matchesCity) return false;

    if (selectedSpecialty !== 'all') {
      const specMatch = (doc.qualifications || doc.specialty || '').toLowerCase().includes(selectedSpecialty.toLowerCase());
      if (!specMatch) return false;
    }
    return true;
  });

  // Filter clinics by selected city
  const filteredClinics = clinics.filter((clinic) => {
    if (!selectedCity) return false;
    const clinicCity = clinic.city || 'Bhagalpur';
    return clinicCity.toLowerCase() === selectedCity.toLowerCase();
  });

  const specialties = [
    { id: 'all', name: 'All Specialties', icon: '🩺' },
    { id: 'general', name: 'General Medicine', icon: '🩺' },
    { id: 'orthopedics', name: 'Orthopedics', icon: '🦴' },
    { id: 'cardiology', name: 'Cardiology', icon: '❤️' },
    { id: 'pediatrics', name: 'Pediatrics', icon: '👶' },
    { id: 'dermatology', name: 'Dermatology', icon: '🧴' },
    { id: 'neurology', name: 'Neurology', icon: '🧠' },
    { id: 'ent', name: 'ENT Specialist', icon: '👂' },
    { id: 'gynecology', name: 'Gynecology', icon: '🩺' },
    { id: 'dental', name: 'Dental Care', icon: '🦷' },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] flex flex-col font-sans">
      <HeaderNavbar />

      {/* Asymmetric Split Hero Banner */}
      <section className="py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Hero Panel (Light Cream Panel) */}
          <div className="md:col-span-7 bg-[var(--color-white)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-8 sm:p-12 shadow-[var(--shadow-card)] flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-violet-soft)] text-[var(--color-violet)] text-xs font-bold tracking-wide mb-6">
                <span>✨ RMP Tele-Triage & Verified Directory</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-[var(--color-ink)] leading-tight tracking-tight">
                Find Top Healthcare Specialists Near You
              </h1>

              <p className="text-sm sm:text-base text-[var(--color-ink-muted)] mt-3 leading-relaxed max-w-xl">
                Discover accredited RMP practitioners, specialty clinics, and hospitals in Tier-2 & Tier-3 locations across India.
              </p>
            </div>

            {/* Nationwide City Search Autocomplete Controls */}
            <div className="mt-8 space-y-3 pt-6 border-t border-[var(--color-border)]">
              <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
                Select Practice Location (Search 1,200+ Indian Cities) *
              </label>
              
              <CitySearchAutocomplete
                selectedCity={selectedCity}
                onSelectCity={(cityName) => {
                  setSelectedCity(cityName);
                  setCustomLocation('');
                }}
              />

              <input
                type="text"
                placeholder="Or type custom Pincode / Landmark..."
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] text-[var(--color-ink)] text-xs font-medium rounded-[var(--radius-md)] px-4 py-2.5 focus:outline-none focus:border-[var(--color-violet)] placeholder:text-[var(--color-ink-faint)]"
              />
            </div>
          </div>

          {/* Right Hero Panel (Consistent Branding + Location Map-Pin Visual) */}
          <div className="hidden md:flex md:col-span-5 bg-[var(--color-teal-deep)] text-white rounded-[var(--radius-lg)] p-8 sm:p-10 relative overflow-hidden flex-col justify-between shadow-xl">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 rounded-full bg-[var(--color-violet)]/20 blur-3xl pointer-events-none"></div>

            <div>
              {/* Brand Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1 shadow-sm">
                    <Image src="/icon.svg" alt="VaidyaDrishti" width={24} height={24} className="object-contain" />
                  </div>
                  <span className="text-lg font-heading font-extrabold text-white tracking-tight">
                    VaidyaDrishti
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-[var(--color-teal-soft)] border border-white/10">
                  <span>🛡️ DPDP Act 2023 Compliant</span>
                </div>
              </div>

              <h2 className="text-2xl lg:text-3xl font-heading font-extrabold text-white mt-2 leading-tight">
                Find Accredited RMP Healthcare Near You Across India
              </h2>
            </div>

            {/* Stylized Location Map Pin Visual SVG */}
            <div className="my-6 flex justify-center">
              <svg className="w-full h-44 text-[var(--color-teal-soft)] opacity-95" viewBox="0 0 320 180" fill="none">
                <rect x="10" y="10" width="300" height="160" rx="16" fill="white" fillOpacity="0.05" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                <path d="M40 140C90 110 120 150 170 120C220 90 260 130 290 100" stroke="white" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="6 6" />
                {/* Map Pins */}
                <g transform="translate(160, 60)">
                  <circle cx="0" cy="0" r="28" fill="#6C4CE0" fillOpacity="0.25" className="animate-ping" />
                  <path d="M0 -18C-8.28 -18 -15 -11.28 -15 -3C-15 10 0 25 0 25C0 25 15 10 15 -3C15 -11.28 8.28 -18 0 -18Z" fill="#6C4CE0" stroke="white" strokeWidth="2" />
                  <circle cx="0" cy="-3" r="5" fill="white" />
                </g>
                <g transform="translate(80, 110)">
                  <path d="M0 -12C-5.5 -12 -10 -7.5 -10 -2C-10 7 0 16 0 16C0 16 10 7 10 -2C10 -7.5 5.5 -12 0 -12Z" fill="#FAF6EE" stroke="#0F3D3E" strokeWidth="1.5" />
                  <circle cx="0" cy="-2" r="3" fill="#0F3D3E" />
                </g>
                <g transform="translate(240, 90)">
                  <path d="M0 -12C-5.5 -12 -10 -7.5 -10 -2C-10 7 0 16 0 16C0 16 10 7 10 -2C10 -7.5 5.5 -12 0 -12Z" fill="#FAF6EE" stroke="#0F3D3E" strokeWidth="1.5" />
                  <circle cx="0" cy="-2" r="3" fill="#0F3D3E" />
                </g>
              </svg>
            </div>

            {/* Floating Trust Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/95 text-[var(--color-ink)] p-3 rounded-[var(--radius-md)] shadow-md">
                <div className="font-heading font-extrabold text-xs">Verified RMP</div>
                <div className="text-[10px] text-[var(--color-ink-muted)]">TPG 2020 Guidelines</div>
              </div>
              <div className="bg-white/95 text-[var(--color-ink)] p-3 rounded-[var(--radius-md)] shadow-md">
                <div className="font-heading font-extrabold text-xs">20+ OPD Clinics</div>
                <div className="text-[10px] text-[var(--color-ink-muted)]">Live Tele-Triage</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Specialty Pill Category Bar */}
      <section className="py-3 bg-[var(--color-white)] border-y border-[var(--color-border)] sticky top-[61px] z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {specialties.map((spec) => {
              const active = selectedSpecialty === spec.id;
              return (
                <button
                  key={spec.id}
                  onClick={() => setSelectedSpecialty(spec.id)}
                  className={`px-4 py-2 rounded-[var(--radius-full)] text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    active
                      ? 'bg-[var(--color-violet)] text-white shadow-md'
                      : 'bg-[var(--color-cream)] text-[var(--color-ink)] hover:bg-[var(--color-teal-soft)] border border-[var(--color-border)]'
                  }`}
                >
                  <span>{spec.icon}</span>
                  <span>{spec.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Directory Listings */}
      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full space-y-10">
        {loading ? (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-between">
              <div className="h-6 w-48 bg-[var(--color-border)]/50 animate-pulse rounded-md" />
              <div className="h-6 w-24 bg-[var(--color-border)]/50 animate-pulse rounded-full" />
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[var(--color-white)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 animate-pulse flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="w-16 h-16 rounded-[var(--radius-md)] bg-[var(--color-border)]/60 shrink-0" />
                  <div className="space-y-2.5 w-full max-w-md">
                    <div className="h-5 w-44 bg-[var(--color-border)]/70 rounded-md" />
                    <div className="h-3 w-60 bg-[var(--color-border)]/40 rounded-md" />
                    <div className="h-3 w-36 bg-[var(--color-border)]/40 rounded-md" />
                  </div>
                </div>
                <div className="w-32 h-9 bg-[var(--color-border)]/60 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        ) : !selectedCity ? (
          <div className="py-16 px-6 rounded-[var(--radius-lg)] bg-[var(--color-white)] border border-[var(--color-border)] text-center space-y-4 max-w-xl mx-auto my-8 shadow-[var(--shadow-card)]">
            <div className="w-16 h-16 rounded-full bg-[var(--color-violet-soft)] text-[var(--color-violet)] text-3xl mx-auto flex items-center justify-center">
              📍
            </div>
            <h2 className="text-xl font-heading font-extrabold text-[var(--color-ink)]">Select Your Location to View Doctors</h2>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed max-w-md mx-auto">
              Please choose a city from the menu above or click <span className="text-[var(--color-violet)] font-bold">"Auto-Detect Location"</span> to discover verified RMP practitioners and medical facilities in your area.
            </p>
          </div>
        ) : (
          <>
            {/* SECTION 1: VERIFIED DOCTORS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-heading font-extrabold text-[var(--color-ink)] tracking-tight">
                    Verified Doctors in {activeLocationName || selectedCity}
                  </h2>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                    Empaneled RMP practitioners available for OPD triage and tele-consultations
                  </p>
                </div>
                <span className="text-xs bg-[var(--color-violet-soft)] text-[var(--color-violet)] font-bold px-3 py-1 rounded-full border border-[var(--color-violet)]/20">
                  {filteredDoctors.length} {filteredDoctors.length === 1 ? 'Doctor' : 'Doctors'} Listed
                </span>
              </div>

              {filteredDoctors.length === 0 ? (
                <div className="py-12 px-6 rounded-[var(--radius-lg)] bg-[var(--color-white)] border border-[var(--color-border)] text-center space-y-4 max-w-xl mx-auto my-4 shadow-xs">
                  <div className="w-14 h-14 rounded-full bg-[var(--color-teal-soft)] text-[var(--color-teal-deep)] text-2xl mx-auto flex items-center justify-center font-bold">
                    🏥
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-heading font-extrabold text-[var(--color-ink)]">
                      No Verified Doctors Listed in {activeLocationName || selectedCity} Yet
                    </h3>
                    <p className="text-xs text-[var(--color-ink-muted)] max-w-md mx-auto leading-relaxed">
                      Are you an RMP practitioner or specialty clinic in <span className="font-bold text-[var(--color-ink)]">{activeLocationName || selectedCity}</span>? Register your practice to start accepting tele-triage consultations.
                    </p>
                  </div>
                  <Link
                    href="/doctor/register"
                    className="btn-primary inline-flex py-2.5 px-5 text-xs font-bold shadow-sm"
                  >
                    <span>🩺 Register as RMP Doctor in {activeLocationName || selectedCity} →</span>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col space-y-4">
                  {filteredDoctors.map((doc) => {
                    const clinicName = doc.clinics?.name || 'Central Facility Complex';
                    return (
                      <div
                        key={doc.id}
                        className="card-surface p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-[var(--color-violet)] transition-colors duration-200"
                      >
                        {/* Avatar & Info */}
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-[var(--radius-md)] bg-[var(--color-teal-soft)] border border-[var(--color-border)] flex items-center justify-center text-2xl font-bold text-[var(--color-teal-deep)] shrink-0 overflow-hidden">
                            {doc.photo_url ? (
                              <img src={doc.photo_url} alt={doc.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>👨‍⚕️</span>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-heading font-extrabold text-[var(--color-ink)]">{doc.name}</h3>
                              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                RMP VERIFIED ✓
                              </span>
                            </div>

                            <p className="text-xs text-[var(--color-violet)] font-bold">
                              {doc.qualifications || 'MBBS Physician'}
                              <span className="text-[var(--color-ink-muted)] mx-2">•</span>
                              <span className="text-[var(--color-ink)] font-data">Reg: {doc.rmp_registration_number || 'VERIFIED-RMP'}</span>
                            </p>

                            <p className="text-xs text-[var(--color-ink-muted)] flex items-center gap-1.5 pt-0.5">
                              <span>🏥 {clinicName}</span>
                              <span>•</span>
                              <span>📍 {doc.clinics?.city || doc.city || selectedCity}</span>
                            </p>

                            {doc.short_bio && (
                              <p className="text-xs text-[var(--color-ink-muted)] line-clamp-2 pt-1 max-w-xl">
                                {doc.short_bio}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* CTA */}
                        <div className="w-full md:w-auto flex flex-col gap-2 shrink-0">
                          <Link
                            href={`/directory/doctor/${doc.id}`}
                            className="btn-primary text-xs py-3 px-6 shadow-md text-center"
                          >
                            Book Consultation →
                          </Link>
                          <span className="text-[10px] text-[var(--color-ink-muted)] text-center">
                            Instant OPD Triage
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 2: MEDICAL FACILITIES */}
            <div className="space-y-4 pt-6 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-heading font-extrabold text-[var(--color-ink)] tracking-tight">
                    Accredited Medical Facilities in {activeLocationName || selectedCity}
                  </h2>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                    Hospitals & Diagnostic Centers with Empaneled OPD Roster
                  </p>
                </div>
              </div>

              {filteredClinics.length === 0 ? (
                <p className="text-xs text-[var(--color-ink-muted)] italic">No medical facilities registered for this location.</p>
              ) : (
                <div className="flex flex-col space-y-4">
                  {filteredClinics.map((clinic) => {
                    const empaneledDocs = doctors.filter((d) => d.clinic_id === clinic.id);
                    return (
                      <div
                        key={clinic.id}
                        className="card-surface p-6 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🏥</span>
                              <h3 className="text-lg font-heading font-extrabold text-[var(--color-ink)]">{clinic.name}</h3>
                              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[var(--color-violet-soft)] text-[var(--color-violet)]">
                                MULTI-SPECIALTY FACILITY
                              </span>
                            </div>
                            <p className="text-xs text-[var(--color-ink-muted)]">
                              {clinic.address || 'Central OPD Complex'}, {clinic.city || selectedCity}
                            </p>
                          </div>

                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--color-cream)] text-[var(--color-ink)] border border-[var(--color-border)]">
                            {empaneledDocs.length} Empaneled {empaneledDocs.length === 1 ? 'Doctor' : 'Doctors'}
                          </span>
                        </div>

                        {empaneledDocs.length > 0 && (
                          <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
                            <span className="text-[11px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider block">
                              Empaneled Medical Specialists:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {empaneledDocs.map((d) => (
                                <Link
                                  key={d.id}
                                  href={`/directory/doctor/${d.id}`}
                                  className="text-xs bg-[var(--color-cream)] hover:bg-[var(--color-teal-soft)] text-[var(--color-ink)] px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] transition flex items-center gap-1.5"
                                >
                                  <span>👨‍⚕️</span>
                                  <span className="font-bold">{d.name}</span>
                                  <span className="text-[var(--color-ink-muted)]">({d.qualifications || 'Physician'})</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-ink-muted)] bg-[var(--color-teal-deep)] text-white mt-12">
        <p>© 2026 VaidyaDrishti Tele-Triage Network. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
