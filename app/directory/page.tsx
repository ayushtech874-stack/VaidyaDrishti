'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import HeaderNavbar from '@/components/HeaderNavbar';

export default function PublicDirectoryPage() {
  const [cities, setCities] = useState<string[]>(['Bhagalpur', 'Patna', 'Muzaffarpur', 'Gaya', 'Darbhanga', 'Purnia', 'Kolkata', 'Delhi', 'Mumbai']);
  const [selectedCity, setSelectedCity] = useState<string>('Bhagalpur');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customAddress, setCustomAddress] = useState<string>('');
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [clinics, setClinics] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const categories = [
    { id: 'all', label: 'All Specialties' },
    { id: 'genmed', label: 'General Medicine & Fever' },
    { id: 'ortho', label: 'Orthopedics & Joints' },
    { id: 'cardio', label: 'Cardiology & Heart' },
    { id: 'peds', label: 'Pediatrics & Child Health' },
    { id: 'derm', label: 'Dermatology & Skin' },
    { id: 'neuro', label: 'Neurology & Brain' },
    { id: 'ent', label: 'ENT & Throat' },
    { id: 'gynae', label: 'Gynecology & Women Health' },
    { id: 'dental', label: 'Dentistry & Dental' },
  ];

  useEffect(() => {
    // Fetch live directory data
    fetch('/api/directory/public')
      .then((res) => res.json())
      .then((data) => {
        if (data.cities && data.cities.length > 0) {
          // Merge unique cities
          const mergedCities = Array.from(new Set([...data.cities, ...cities]));
          setCities(mergedCities);
          if (!mergedCities.includes(selectedCity)) {
            setSelectedCity(mergedCities[0]);
          }
        }
        if (data.clinics) setClinics(data.clinics);
        if (data.doctors) setDoctors(data.doctors);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Handle Location Auto-Detect
  const handleAutoLocate = () => {
    setIsDetectingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // Defaulting smoothly to nearest hub
          setSelectedCity('Patna');
          setIsDetectingLocation(false);
        },
        () => {
          setIsDetectingLocation(false);
        }
      );
    } else {
      setIsDetectingLocation(false);
    }
  };

  const filteredClinics = clinics.filter(
    (c) => (c.city || 'Bhagalpur').toLowerCase() === selectedCity.toLowerCase()
  );

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
    if (selectedCategory === 'neuro' && (spec.includes('neuro') || spec.includes('brain'))) return true;
    if (selectedCategory === 'ent' && spec.includes('ent')) return true;
    if (selectedCategory === 'gynae' && (spec.includes('gynae') || spec.includes('women'))) return true;
    if (selectedCategory === 'dental' && (spec.includes('dental') || spec.includes('dentist'))) return true;

    return false;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 text-[#0F172A] flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Global Clean Header Navbar */}
      <HeaderNavbar />

      {/* Hero Section with Glassmorphism Design */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="relative rounded-3xl p-8 sm:p-12 overflow-hidden bg-gradient-to-br from-slate-900 via-[#0F172A] to-blue-950 text-white shadow-xl">
          {/* Glass Accent Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-md">
              Verified Medical Practitioners Network
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Find Top Healthcare Specialists Near You
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-normal">
              Browse registered doctors and accredited medical centers in your city. Inspect qualifications, clinic availability, and book consultations seamlessly.
            </p>

            {/* Location Selection & Auto-Detect Control */}
            <div className="pt-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition cursor-pointer appearance-none"
                >
                  {cities.map((city) => (
                    <option key={city} value={city} className="text-slate-900 font-medium">
                      Location: {city}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>

              {/* Auto Locate Button */}
              <button
                onClick={handleAutoLocate}
                disabled={isDetectingLocation}
                className="px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>📍</span>
                <span>{isDetectingLocation ? 'Locating...' : 'Auto-Detect Location'}</span>
              </button>

              {/* Address Search Field */}
              <input
                type="text"
                placeholder="Or enter area / pincode..."
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-slate-400 text-xs font-normal focus:outline-none focus:ring-2 focus:ring-blue-400 transition min-w-[200px]"
              />
            </div>
          </div>
        </div>

        {/* Full-Width Horizontal Scrollable Specialty Category Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Browse by Medical Specialty
            </h3>
            <span className="text-[11px] text-slate-400">Scroll horizontally →</span>
          </div>

          <div className="w-full overflow-x-auto whitespace-nowrap pb-2 pt-1 scrollbar-none flex gap-2.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex-shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#0F172A] text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic City Doctors Listing */}
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-500 font-medium bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200">
            Loading healthcare providers in {selectedCity}...
          </div>
        ) : (
          <div className="space-y-10">
            {/* Doctors Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
                  Verified Doctors in {selectedCity} ({filteredDoctors.length})
                </h2>
                <Link
                  href="/doctor/register"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                >
                  Doctor Registration →
                </Link>
              </div>

              {filteredDoctors.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200">
                  No verified practitioners listed under this specialty in {selectedCity} yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredDoctors.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white/80 backdrop-blur-md border border-slate-200/80 hover:border-blue-400/80 hover:shadow-xl transition-all duration-300 rounded-2xl p-6 flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            {/* Doctor Avatar Badge */}
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#0F172A] flex items-center justify-center font-bold text-lg overflow-hidden flex-shrink-0 shadow-xs">
                              {doc.photo_url ? (
                                <img src={doc.photo_url} alt={doc.name} className="w-full h-full object-cover" />
                              ) : (
                                doc.name.charAt(0) || 'D'
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  RMP Verified
                                </span>
                              </div>
                              <h3 className="text-base font-bold text-[#0F172A] group-hover:text-blue-600 transition-colors">
                                {doc.name}
                              </h3>
                              <p className="text-xs text-slate-500 font-medium">{doc.qualifications || 'MBBS Practitioner'}</p>
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                Reg: {doc.rmp_registration_number || 'VERIFIED-RMP'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {doc.short_bio && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100/80 font-normal">
                            "{doc.short_bio}"
                          </p>
                        )}

                        <div className="text-xs text-slate-500 pt-1 flex items-center gap-2 border-t border-slate-100">
                          <span className="font-medium text-slate-700">{doc.clinics?.name || 'Associated Clinic'}</span>
                          <span className="text-slate-400">• {doc.clinics?.city || selectedCity}</span>
                        </div>
                      </div>

                      {/* Action CTAs */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <Link
                          href={`/directory/doctor/${doc.id}`}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                        >
                          View Credentials →
                        </Link>

                        <Link
                          href={`/patient/dashboard/new-consultation?doctor_id=${doc.id}`}
                          className="bg-[#0F172A] hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs"
                        >
                          Book Consultation
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clinics Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
                Accredited Medical Facilities in {selectedCity} ({filteredClinics.length})
              </h2>

              {filteredClinics.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200">
                  No verified clinics currently listed in {selectedCity}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredClinics.map((clinic) => (
                    <div
                      key={clinic.id}
                      className="bg-white/80 backdrop-blur-md border border-slate-200/80 hover:border-blue-400/80 hover:shadow-xl transition-all duration-300 rounded-2xl p-6 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          Accredited Facility
                        </span>
                        <h3 className="text-base font-bold text-[#0F172A] mt-2">{clinic.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">{clinic.address || 'Central District'}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <Link
                          href={`/directory/clinic/${clinic.id}`}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                        >
                          View Facility Profile & Hours →
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
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">VaidyaDrishti Healthcare Network</p>
        <p className="mt-1">Telemedicine Practice Guidelines & Digital Personal Data Protection Compliant.</p>
      </footer>
    </div>
  );
}
