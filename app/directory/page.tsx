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
      // STRICT VERIFICATION GATE: Only fetch facilities & doctors where is_verified = true AND is_live = true
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
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Directory Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          <span>🏥 Verified Medical Directory</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          VaidyaDrishti Tele-Consultation Hospital & Clinic Directory
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto">
          Find verified RMP doctors, OPD hospital departments, and clinics. Scan QR code or click to consult directly on WhatsApp.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Search hospital, clinic, or specialty..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
              filterType === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Facilities ({facilities.length})
          </button>
          <button
            onClick={() => setFilterType('hospital')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
              filterType === 'hospital'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Hospitals ({facilities.filter((f) => f.facility_type === 'hospital').length})
          </button>
          <button
            onClick={() => setFilterType('clinic')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
              filterType === 'clinic'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Clinics ({facilities.filter((f) => f.facility_type === 'clinic').length})
          </button>
        </div>
      </div>

      {/* Facilities Cards Grid */}
      {filteredFacilities.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <span className="text-4xl">🏥</span>
          <h3 className="text-lg font-bold text-slate-800">No Verified Facilities Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
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
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded mb-1 ${
                        facility.facility_type === 'hospital'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}>
                        {facility.facility_type === 'hospital' ? '🏥 Multi-Specialty Hospital' : '🩺 Doctor OPD Clinic'}
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                        {facility.name}
                      </h3>
                    </div>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
                      <span>✓</span> Verified RMP
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    📍 {facility.address || 'OPD Medical Complex'}
                  </p>

                  {/* Registered Doctors List */}
                  {facilityDocs.length > 0 && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 text-xs">
                      <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                        Consulting RMP Practitioners:
                      </span>
                      {facilityDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between text-slate-800">
                          <span className="font-bold text-emerald-950">👨‍⚕️ {doc.name}</span>
                          <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
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
                        <span key={dept.id} className="bg-indigo-50 text-indigo-900 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-100">
                          {dept.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* WhatsApp Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                  <a
                    href={whatsappDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs py-2.5 rounded-xl shadow text-center transition flex items-center justify-center gap-2"
                  >
                    <span>💬 Consult on WhatsApp</span>
                  </a>
                  <button
                    onClick={() => setSelectedQRClinic(facility)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2.5 rounded-xl transition flex items-center gap-1"
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
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedQRClinic(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold"
            >
              ✕
            </button>
            <h3 className="text-lg font-extrabold text-slate-900">
              {selectedQRClinic.name}
            </h3>
            <p className="text-xs text-slate-500">
              Scan with your smartphone camera to open WhatsApp tele-triage
            </p>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                  `https://wa.me/${twilioNumberClean}?text=JOIN_${selectedQRClinic.code}`
                )}`}
                alt={`QR Code for ${selectedQRClinic.name}`}
                className="w-48 h-48 object-contain mx-auto"
              />
            </div>
            <p className="text-[11px] font-mono text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
              JOIN_{selectedQRClinic.code}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
