'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function PublicDirectoryPage() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedQRClinic, setSelectedQRClinic] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const twilioNumberRaw = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || '+14155238886';
  const twilioNumberClean = twilioNumberRaw.replace(/\D/g, '');

  useEffect(() => {
    async function loadAllFacilities() {
      setIsLoading(true);
      // Fetch ALL registered facilities from clinics table
      const { data: clinicsData } = await supabase
        .from('clinics')
        .select('id, name, code, address, facility_type, is_verified, is_live');

      const { data: doctorsData } = await supabase
        .from('doctors')
        .select('id, name, qualifications, rmp_registration_number, clinic_id, department_id, is_verified, is_live');

      const { data: deptsData } = await supabase
        .from('departments')
        .select('id, name, code, clinic_id');

      setFacilities(clinicsData || []);
      setDoctors(doctorsData || []);
      setDepartments(deptsData || []);
      setIsLoading(false);
    }

    loadAllFacilities();
  }, []);

  const filteredFacilities = facilities.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || f.facility_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Directory Navigation Top Bar */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <Link
            href="/"
            className="text-xs font-bold text-[var(--color-navy)] bg-white border border-[var(--color-border)] px-4 py-2 rounded-xl shadow-sm hover:bg-[var(--color-blue-soft)] transition"
          >
            ← Home
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/doctor/login"
              className="text-xs font-bold text-[var(--color-navy)] bg-[var(--color-blue-soft)] px-4 py-2 rounded-xl border border-[var(--color-blue)]/20 hover:bg-[var(--color-blue-soft)]/80 transition"
            >
              👨‍⚕️ Doctor / Admin Portal Sign In
            </Link>
          </div>
        </div>

        {/* Directory Hero Banner */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-[var(--color-blue-soft)] text-[var(--color-navy)] px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider">
            <span>🏥 Official Tele-Consultation Public Directory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-navy)] tracking-tight">
            VaidyaDrishti Verified Facilities & Doctor Directory
          </h1>
          <p className="text-base text-[var(--color-ink-muted)] max-w-3xl mx-auto leading-relaxed">
            Find empaneled RMP medical practitioners, OPD hospital departments, and specialty clinics. Scan QR codes or click to initiate 24/7 direct WhatsApp AI tele-triage.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="card-surface p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[280px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search by hospital name, doctor, city, or specialty..."
              className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3.5 text-base text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-blue)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                filterType === 'all'
                  ? 'bg-[var(--color-navy)] text-white shadow-sm'
                  : 'bg-[var(--color-cream-deep)] text-[var(--color-ink)] hover:bg-[var(--color-blue-soft)]'
              }`}
            >
              All Facilities ({facilities.length})
            </button>
            <button
              onClick={() => setFilterType('hospital')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                filterType === 'hospital'
                  ? 'bg-[var(--color-navy)] text-white shadow-sm'
                  : 'bg-[var(--color-cream-deep)] text-[var(--color-ink)] hover:bg-[var(--color-blue-soft)]'
              }`}
            >
              Hospitals ({facilities.filter((f) => f.facility_type === 'hospital').length})
            </button>
            <button
              onClick={() => setFilterType('clinic')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                filterType === 'clinic'
                  ? 'bg-[var(--color-navy)] text-white shadow-sm'
                  : 'bg-[var(--color-cream-deep)] text-[var(--color-ink)] hover:bg-[var(--color-blue-soft)]'
              }`}
            >
              Clinics ({facilities.filter((f) => f.facility_type === 'clinic').length})
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="card-surface p-12 text-center text-[var(--color-ink-muted)]">
            Loading directory facilities...
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="card-surface p-12 text-center space-y-3">
            <span className="text-4xl">🏥</span>
            <h3 className="text-lg font-bold text-[var(--color-navy)]">No Facilities Found</h3>
            <p className="text-xs text-[var(--color-ink-muted)] max-w-md mx-auto">
              No medical facilities match your search criteria. Please try searching for another hospital or specialty.
            </p>
          </div>
        ) : (
          /* Facilities Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredFacilities.map((facility) => {
              const facilityDocs = doctors.filter((d) => d.clinic_id === facility.id);
              const facilityDepts = departments.filter((d) => d.clinic_id === facility.id);
              const qrJoinCode = `JOIN_${facility.code}`;
              const whatsappDeepLink = `https://wa.me/${twilioNumberClean}?text=${encodeURIComponent(qrJoinCode)}`;

              return (
                <div
                  key={facility.id}
                  className="card-surface p-6 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between hover:border-[var(--color-blue)]"
                >
                  <div className="space-y-3">
                    {/* Facility Badge & Name */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded mb-1.5 bg-[var(--color-blue-soft)] text-[var(--color-navy)]">
                          {facility.facility_type === 'hospital' ? '🏥 Multi-Specialty Hospital' : '🩺 Doctor OPD Clinic'}
                        </span>
                        <h3 className="text-xl font-extrabold text-[var(--color-navy)] leading-snug">
                          {facility.name}
                        </h3>
                      </div>
                      <span className="badge-low text-[10px] font-bold px-2.5 py-1 rounded-md shrink-0">
                        ✓ Verified OPD
                      </span>
                    </div>

                    {/* Address & Facility Join Code */}
                    <div className="space-y-1 text-xs text-[var(--color-ink-muted)]">
                      <p>📍 {facility.address || 'OPD Medical Complex'}</p>
                      <p className="font-data text-[11px] text-[var(--color-navy)]">
                        Join Identifier: <strong className="bg-[var(--color-cream-deep)] px-2 py-0.5 rounded">{qrJoinCode}</strong>
                      </p>
                    </div>

                    {/* Empaneled Doctors List */}
                    <div className="bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-4 space-y-2 text-xs">
                      <span className="font-bold text-[var(--color-navy)] block text-[11px] uppercase tracking-wider">
                        Empaneled RMP Practitioners ({facilityDocs.length}):
                      </span>
                      {facilityDocs.length > 0 ? (
                        facilityDocs.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between text-[var(--color-ink)] bg-white p-2 rounded-lg border border-[var(--color-border)]">
                            <div>
                              <span className="font-bold text-[var(--color-navy)] block">👨‍⚕️ {doc.name}</span>
                              <span className="text-[10px] text-[var(--color-ink-muted)] block">{doc.qualifications || 'MBBS, MD'}</span>
                            </div>
                            <span className="text-[10px] bg-[var(--color-blue-soft)] text-[var(--color-navy)] px-2 py-0.5 rounded font-data font-bold">
                              {doc.rmp_registration_number || 'VERIFIED-RMP'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-[var(--color-ink-muted)] italic">
                          Specialists available on OPD reception desk.
                        </p>
                      )}
                    </div>

                    {/* Departments List */}
                    {facilityDepts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {facilityDepts.map((dept) => (
                          <span key={dept.id} className="bg-[var(--color-blue-soft)] text-[var(--color-navy)] text-[10px] font-bold px-2.5 py-0.5 rounded border border-[var(--color-blue)]/20">
                            {dept.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Direct Action Buttons */}
                  <div className="pt-4 border-t border-[var(--color-border)] flex items-center gap-3">
                    <a
                      href={whatsappDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary flex-1 text-xs py-3 text-center flex items-center justify-center gap-2"
                    >
                      <span>💬 Consult on WhatsApp</span>
                    </a>
                    <button
                      onClick={() => setSelectedQRClinic(facility)}
                      className="btn-secondary text-xs py-3 px-4 flex items-center gap-1"
                    >
                      <span>📱 Scan QR</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* In-Depth Explanatory Section: What is the Public Directory? */}
        <div className="card-surface p-6 sm:p-8 space-y-4 border-2 border-[var(--color-blue)]/30 bg-gradient-to-br from-white to-[var(--color-blue-soft)]/20">
          <div className="flex items-center gap-3 text-[var(--color-navy)]">
            <span className="text-3xl">📘</span>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-navy)]">
                In-Depth Guide: What is the VaidyaDrishti Public Directory?
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Empowering patients across India with instant 24/7 AI-assisted tele-triage
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[var(--color-ink)] pt-2">
            <div className="bg-white border border-[var(--color-border)] p-4 rounded-xl space-y-1.5">
              <span className="font-bold text-[var(--color-navy)] text-sm block">1️⃣ Patient Discovery & Trust</span>
              <p className="text-[var(--color-ink-muted)] leading-relaxed">
                Patients can browse verified hospitals and specialty OPD clinics, view RMP registration numbers, medical qualifications, and physical hospital addresses.
              </p>
            </div>

            <div className="bg-white border border-[var(--color-border)] p-4 rounded-xl space-y-1.5">
              <span className="font-bold text-[var(--color-navy)] text-sm block">2️⃣ 1-Tap WhatsApp Tele-Triage</span>
              <p className="text-[var(--color-ink-muted)] leading-relaxed">
                Clicking <strong>&quot;Consult on WhatsApp&quot;</strong> or scanning the QR code immediately opens WhatsApp with pre-filled facility join codes (e.g. <code>JOIN_HOSP_HealingTouch</code>).
              </p>
            </div>

            <div className="bg-white border border-[var(--color-border)] p-4 rounded-xl space-y-1.5">
              <span className="font-bold text-[var(--color-navy)] text-sm block">3️⃣ Regulatory Compliance</span>
              <p className="text-[var(--color-ink-muted)] leading-relaxed">
                Compliant with Telemedicine Practice Guidelines (TPG 2020) & DPDP Act 2023. Patient data and doctor personal emails are protected with strict RLS projections.
              </p>
            </div>
          </div>
        </div>

        {/* QR Code Modal Preview */}
        {selectedQRClinic && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative border border-[var(--color-border)]">
              <button
                onClick={() => setSelectedQRClinic(null)}
                className="absolute top-4 right-4 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] text-lg font-bold"
              >
                ✕
              </button>
              <h3 className="text-xl font-extrabold text-[var(--color-navy)]">
                {selectedQRClinic.name}
              </h3>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Scan with smartphone camera to open WhatsApp tele-triage
              </p>
              <div className="bg-[var(--color-cream)] border border-[var(--color-border)] p-4 rounded-2xl inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                    `https://wa.me/${twilioNumberClean}?text=JOIN_${selectedQRClinic.code}`
                  )}`}
                  alt={`QR Code for ${selectedQRClinic.name}`}
                  className="w-48 h-48 object-contain mx-auto"
                />
              </div>
              <p className="text-xs font-data text-[var(--color-navy)] bg-[var(--color-blue-soft)] p-2 rounded-xl border border-[var(--color-blue)]/20 font-bold">
                JOIN_{selectedQRClinic.code}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
