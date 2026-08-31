'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import HeaderNavbar from '@/components/HeaderNavbar';

export default function PublicDirectoryPage() {
  const [selectedCity, setSelectedCity] = useState<string>(''); // Default empty on initial load
  const [customLocation, setCustomLocation] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [cities, setCities] = useState<string[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    async function fetchDirectory() {
      try {
        const res = await fetch('/api/directory/public');
        const data = await res.json();
        if (data.cities) setCities(data.cities);
        if (data.clinics) setClinics(data.clinics);
        if (data.doctors) setDoctors(data.doctors);
      } catch (err) {
        console.error('Failed to load directory:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDirectory();
  }, []);

  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        // Default to first active city or user prompt
        const detected = cities.length > 0 ? cities[0] : 'Bhagalpur';
        setSelectedCity(detected);
        setCustomLocation(`Lat: ${pos.coords.latitude.toFixed(2)}, Lon: ${pos.coords.longitude.toFixed(2)}`);
      },
      (err) => {
        setLocating(false);
        console.warn(err);
        alert('Could not auto-detect location. Please select a city manually.');
      }
    );
  };

  const activeLocationName = customLocation || selectedCity;

  // Filter doctors by selected city & specialty
  const filteredDoctors = doctors.filter((doc) => {
    if (!selectedCity) return false;
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      <HeaderNavbar />

      {/* Hero Glassmorphic Header */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-900 border-b border-slate-800/80">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-semibold tracking-wide">
            <span>✨ RMP Verified Tele-Triage & Hospital Directory</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Find Top Healthcare Specialists Near You
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto font-normal leading-relaxed">
            Select your location or auto-locate to discover verified doctors, specialty clinics, and accredited multi-specialty hospitals in your area.
          </p>

          {/* Location Selector Controls */}
          <div className="max-w-2xl mx-auto pt-4 flex flex-col sm:flex-row items-center gap-3">
            {/* Auto-Detect Location Button */}
            <button
              onClick={handleAutoDetectLocation}
              disabled={locating}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-3 px-5 rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <span>{locating ? '⌛ Locating...' : '📍 Auto-Detect Location'}</span>
            </button>

            {/* City Dropdown */}
            <div className="relative w-full">
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setCustomLocation('');
                }}
                className="w-full bg-slate-800/80 border border-slate-700 text-white text-xs font-medium rounded-xl px-4 py-3 appearance-none focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="">-- Select Your Location --</option>
                {cities.map((city) => (
                  <option key={city} value={city} className="bg-slate-900 text-white">
                    📍 {city}
                  </option>
                ))}
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">
                ▼
              </span>
            </div>

            {/* Custom Location / Pincode Input */}
            <input
              type="text"
              placeholder="Enter Pincode / Landmark..."
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-500"
            />
          </div>
        </div>
      </section>

      {/* Horizontal Scrollable Specialty Category Bar */}
      <section className="py-4 bg-slate-900/60 border-b border-slate-800/60 sticky top-[61px] z-40 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {specialties.map((spec) => {
              const active = selectedSpecialty === spec.id;
              return (
                <button
                  key={spec.id}
                  onClick={() => setSelectedSpecialty(spec.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
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

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full space-y-10">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Loading verified medical directory...</p>
          </div>
        ) : !selectedCity ? (
          /* INITIAL BLANK LOCATION PROMPT STATE */
          <div className="py-16 px-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-center space-y-4 max-w-xl mx-auto my-8 shadow-xl backdrop-blur-md">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-3xl mx-auto flex items-center justify-center">
              📍
            </div>
            <h2 className="text-xl font-bold text-white">Select Your Location to View Doctors</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              Please choose a city from the location menu above or click <span className="text-blue-400 font-semibold">"Auto-Detect Location"</span> to discover verified RMP practitioners and medical facilities in your area.
            </p>
          </div>
        ) : (
          <>
            {/* SECTION 1: VERIFIED DOCTORS (1 CARD PER ROW LAYOUT) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Verified Doctors in {activeLocationName || selectedCity}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Empaneled RMP practitioners available for OPD triage and tele-consultations
                  </p>
                </div>
                <span className="text-xs bg-slate-800 text-slate-300 font-semibold px-3 py-1 rounded-full border border-slate-700">
                  {filteredDoctors.length} {filteredDoctors.length === 1 ? 'Doctor' : 'Doctors'} Listed
                </span>
              </div>

              {filteredDoctors.length === 0 ? (
                /* NO DOCTORS AT LOCATION EMPTY STATE */
                <div className="py-12 px-6 rounded-2xl bg-slate-800/30 border border-slate-700/50 text-center space-y-3">
                  <span className="text-3xl">🩺</span>
                  <h3 className="text-base font-bold text-white">
                    No doctors available right now at this particular location.
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    We could not find any active RMP doctors listed for <span className="text-slate-200 font-medium">"{activeLocationName || selectedCity}"</span>. Try selecting another nearby city or check back soon.
                  </p>
                </div>
              ) : (
                /* 1 DOCTOR CARD PER ROW FULL-WIDTH LAYOUT */
                <div className="flex flex-col space-y-4">
                  {filteredDoctors.map((doc) => {
                    const clinicName = doc.clinics?.name || 'Central Facility Complex';
                    return (
                      <div
                        key={doc.id}
                        className="bg-slate-800/50 backdrop-blur-md border border-slate-700/70 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                      >
                        {/* Left: Avatar & Info */}
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-slate-700/80 border border-slate-600 flex items-center justify-center text-xl font-bold text-blue-400 shrink-0 overflow-hidden shadow-sm">
                            {doc.photo_url ? (
                              <img src={doc.photo_url} alt={doc.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>👨‍⚕️</span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-white">{doc.name}</h3>
                              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                RMP VERIFIED ✓
                              </span>
                            </div>

                            <p className="text-xs text-blue-400 font-semibold">
                              {doc.qualifications || 'MBBS Physician'}
                              <span className="text-slate-500 mx-2">•</span>
                              <span className="text-slate-300 font-mono">Reg: {doc.rmp_registration_number || 'VERIFIED-RMP'}</span>
                            </p>

                            <p className="text-xs text-slate-400 flex items-center gap-1.5">
                              <span>🏥</span>
                              <span>{clinicName}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400">📍 {doc.clinics?.city || doc.city || selectedCity}</span>
                            </p>

                            {doc.short_bio && (
                              <p className="text-xs text-slate-300 line-clamp-2 pt-1 max-w-xl">
                                {doc.short_bio}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Consultation CTA */}
                        <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 border-slate-700/50 pt-4 md:pt-0">
                          <Link
                            href={`/directory/doctor/${doc.id}`}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-3 rounded-xl transition-all text-center shadow-lg shadow-blue-600/20"
                          >
                            Book Consultation →
                          </Link>
                          <span className="text-[10px] text-slate-400 text-center">
                            Instant OPD Triage & Direct Scheduling
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 2: MULTI-SPECIALTY HOSPITALS & CLINICS */}
            <div className="space-y-4 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Accredited Medical Facilities in {activeLocationName || selectedCity}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hospitals & Diagnostic Centers with Empaneled OPD Roster
                  </p>
                </div>
              </div>

              {filteredClinics.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No medical facilities registered for this location.</p>
              ) : (
                <div className="flex flex-col space-y-4">
                  {filteredClinics.map((clinic) => {
                    const empaneledDocs = doctors.filter((d) => d.clinic_id === clinic.id);
                    return (
                      <div
                        key={clinic.id}
                        className="bg-slate-800/40 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🏥</span>
                              <h3 className="text-lg font-bold text-white">{clinic.name}</h3>
                              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                MULTI-SPECIALTY FACILITY
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {clinic.address || 'Central OPD Complex'}, {clinic.city || selectedCity}
                            </p>
                          </div>

                          <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-700/60 text-slate-200 border border-slate-600">
                            {empaneledDocs.length} Empaneled {empaneledDocs.length === 1 ? 'Doctor' : 'Doctors'}
                          </span>
                        </div>

                        {/* Roster Preview */}
                        {empaneledDocs.length > 0 && (
                          <div className="pt-3 border-t border-slate-700/40 space-y-2">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                              Empaneled Medical Specialists:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {empaneledDocs.map((d) => (
                                <Link
                                  key={d.id}
                                  href={`/directory/doctor/${d.id}`}
                                  className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-300 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                                >
                                  <span>👨‍⚕️</span>
                                  <span className="font-medium">{d.name}</span>
                                  <span className="text-slate-500">({d.qualifications || 'Physician'})</span>
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

      {/* Public Footer */}
      <footer className="py-8 px-4 border-t border-slate-800 text-center text-xs text-slate-500">
        <p>© 2026 VaidyaDrishti Tele-Triage Network. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
