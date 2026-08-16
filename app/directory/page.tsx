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

  const supabase = createClient();

  const twilioNumberRaw = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || '+14155238886';
  const twilioNumberClean = twilioNumberRaw.replace(/\D/g, '');

  useEffect(() => {
    async function loadVerifiedFacilities() {
      const { data: clinicsData } = await supabase
        .from('clinics')
        .select('id, name, code, address, facility_type, is_verified, is_live')
        .eq('is_verified', true)
        .eq('is_live', true);

      const { data: doctorsData } = await supabase
        .from('doctors')
        .select('id, name, qualifications, rmp_registration_number, clinic_id, department_id, is_verified, is_live')
        .eq('is_verified', true)
        .eq('is_live', true);

      const { data: deptsData } = await supabase
        .from('departments')
        .select('id, name, code, clinic_id');

      setFacilities(clinicsData || []);
      setDoctors(doctorsData || []);
      setDepartments(deptsData || []);
    }

    loadVerifiedFacilities();
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
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Directory Hero Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-[var(--color-blue-soft)] text-[var(--color-navy)] px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
            <span>🏥 Verified Medical Directory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-navy)] tracking-tight">
            VaidyaDrishti Tele-Consultation Directory
          </h1>
          <p className="text-base text-[var(--color-ink-muted)] max-w-2xl mx-auto leading-relaxed">
            Discover verified RMP practitioners and OPD hospital departments. Scan QR code or click to initiate direct WhatsApp tele-triage.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="card-surface p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[260px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search hospital, clinic, or specialty..."
              className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3.5 text-base focus:outline-none focus:border-[var(--color-blue)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                filterType === 'all'
                  ? 'bg-[var(--color-navy)] text-white shadow-sm'
                  : 'bg-[var(--color-cream-deep)] text-[var(--color-ink)] hover:bg-[var(--color-blue-soft)]'
              }`}
            >
              All ({facilities.length})
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

        {/* Facilities Cards Grid */}
        {filteredFacilities.length === 0 ? (
          <div className="card-surface p-12 text-center space-y-3">
            <span className="text-4xl">🏥</span>
            <h3 className="text-lg font-bold text-[var(--color-navy)]">No Verified Facilities Found</h3>
            <p className="text-xs text-[var(--color-ink-muted)] max-w-md mx-auto">
              No medical facilities match your search criteria, or newly registered facilities are currently undergoing Super-Admin verification.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredFacilities.map((facility) => {
              const facilityDocs = doctors.filter((d) => d.clinic_id === facility.id);
              const facilityDepts = departments.filter((d) => d.clinic_id === facility.id);
              const qrJoinCode = `JOIN_${facility.code}`;
              const whatsappDeepLink = `https://wa.me/${twilioNumberClean}?text=${encodeURIComponent(qrJoinCode)}`;

              return (
                <div
                  key={facility.id}
                  className="card-surface p-6 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between hover:bg-[var(--color-blue-soft)]/20"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded mb-1 bg-[var(--color-blue-soft)] text-[var(--color-navy)]">
                          {facility.facility_type === 'hospital' ? '🏥 Multi-Specialty Hospital' : '🩺 Doctor OPD Clinic'}
                        </span>
                        <h3 className="text-xl font-extrabold text-[var(--color-navy)] leading-snug">
                          {facility.name}
                        </h3>
                      </div>
                      <span className="badge-low text-[10px] font-bold px-2.5 py-1 rounded-md shrink-0">
                        ✓ Verified RMP
                      </span>
                    </div>

                    <p className="text-xs text-[var(--color-ink-muted)]">
                      📍 {facility.address || 'OPD Medical Complex'}
                    </p>

                    {/* Registered Doctors List */}
                    {facilityDocs.length > 0 && (
                      <div className="bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3.5 space-y-2 text-xs">
                        <span className="font-bold text-[var(--color-navy)] block text-[11px] uppercase tracking-wider">
                          Consulting RMP Practitioners:
                        </span>
                        {facilityDocs.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between text-[var(--color-ink)]">
                            <span className="font-bold text-[var(--color-navy)]">👨‍⚕️ {doc.name}</span>
                            <span className="text-[10px] bg-white border border-[var(--color-border)] text-[var(--color-blue)] px-2 py-0.5 rounded font-data">
                              {doc.rmp_registration_number || 'VERIFIED-RMP'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Departments Badge List */}
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

                  {/* Action Buttons */}
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
