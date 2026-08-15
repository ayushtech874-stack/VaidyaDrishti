'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function AdminQRGeneratorPage() {
  const [clinicsList, setClinicsList] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [assignedDoctor, setAssignedDoctor] = useState<any>(null);

  const supabase = createClient();

  // Dynamic Production Twilio WhatsApp Sender Number Config
  const twilioNumberRaw = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || '+14155238886';
  const twilioNumberClean = twilioNumberRaw.replace(/\D/g, '');

  useEffect(() => {
    async function loadData() {
      const { data: clinics } = await supabase.from('clinics').select('*');
      const { data: doctors } = await supabase.from('doctors').select('*');

      setClinicsList(clinics || []);
      setDoctorsList(doctors || []);

      if (clinics && clinics.length > 0) {
        setSelectedClinicId(clinics[0].id);
        setSelectedClinic(clinics[0]);
        const doc = (doctors || []).find((d) => d.clinic_id === clinics[0].id);
        setAssignedDoctor(doc || null);
      }
    }
    loadData();
  }, []);

  function handleClinicChange(id: string) {
    setSelectedClinicId(id);
    const foundClinic = clinicsList.find((c) => c.id === id);
    setSelectedClinic(foundClinic || null);
    const foundDoc = doctorsList.find((d) => d.clinic_id === id);
    setAssignedDoctor(foundDoc || null);
  }

  const qrJoinCode = selectedClinic ? `JOIN_${selectedClinic.code}` : 'JOIN_HOSP_HealingTouch';
  const whatsappDeepLink = `https://wa.me/${twilioNumberClean}?text=${encodeURIComponent(qrJoinCode)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(whatsappDeepLink)}`;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            🖨️ Dynamic WhatsApp QR Poster Generator
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate branded physical OPD posters for hospitals and doctor clinics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow transition flex items-center gap-2"
          >
            <span>🖨️ Print Poster (A4 / PDF)</span>
          </button>
          <Link
            href="/admin/onboarding"
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg transition"
          >
            ← Admin Onboarding
          </Link>
        </div>
      </div>

      {/* Selector Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 print:hidden">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          🏥 Select Hospital / Doctor Facility to Generate Poster:
        </label>
        <select
          value={selectedClinicId}
          onChange={(e) => handleClinicChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        >
          {clinicsList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code}) — {c.facility_type === 'hospital' ? 'Hospital OPD' : 'Doctor Clinic'}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
          <span>Target WhatsApp Sender: <code className="font-bold text-emerald-800">+{twilioNumberClean}</code></span>
          <span>Encoded WhatsApp Link: <code className="font-bold text-indigo-700">{qrJoinCode}</code></span>
        </div>
      </div>

      {/* PRINTABLE OPD POSTER TEMPLATE */}
      {selectedClinic && (
        <div className="bg-white border-4 border-emerald-800 rounded-3xl p-8 shadow-xl max-w-2xl mx-auto space-y-6 print:border-4 print:shadow-none print:max-w-none print:m-0 print:p-6">
          {/* Poster Header */}
          <div className="text-center space-y-2 border-b-2 border-emerald-100 pb-4">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-950 px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase">
              <span>🩺 VaidyaDrishti AI Tele-Triage OPD</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
              {selectedClinic.name}
            </h1>
            <p className="text-sm font-semibold text-emerald-800">
              {selectedClinic.address || 'OPD Medical Center Complex'}
            </p>
            {assignedDoctor && (
              <p className="text-xs font-bold text-slate-600">
                Consulting RMP: <span className="text-slate-900">{assignedDoctor.name}</span> ({assignedDoctor.qualifications || 'MBBS, MD'}) — License: <code className="text-emerald-800">{assignedDoctor.rmp_registration_number || 'VERIFIED-RMP'}</code>
              </p>
            )}
          </div>

          {/* QR Code Container */}
          <div className="bg-emerald-50/60 border-2 border-dashed border-emerald-300 rounded-3xl p-6 text-center space-y-4">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
              Scan QR Code to Start Tele-Consultation 📲
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              अपनी बीमारी का विवरण या आवाज रिकॉर्ड करके डॉक्टर से परामर्श लें
            </p>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-md border border-slate-200">
              <img
                src={qrImageUrl}
                alt={`WhatsApp QR Code for ${selectedClinic.name}`}
                className="w-56 h-56 mx-auto object-contain"
              />
            </div>

            <div className="bg-white border border-emerald-200 rounded-xl p-3 max-w-md mx-auto space-y-1 text-left text-xs">
              <p className="font-bold text-emerald-900 flex items-center justify-between">
                <span>📱 Scan with Smartphone Camera</span>
                <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">+{twilioNumberClean}</span>
              </p>
              <p className="text-slate-600">
                Opening WhatsApp will send code: <strong className="font-mono text-slate-900">{qrJoinCode}</strong>
              </p>
            </div>
          </div>

          {/* Patient Instructions Steps */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-lg font-black text-emerald-700 block">1️⃣ Scan</span>
              <span className="text-slate-600 font-medium block mt-0.5">Scan QR with Camera or WhatsApp</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-lg font-black text-emerald-700 block">2️⃣ Voice / Text</span>
              <span className="text-slate-600 font-medium block mt-0.5">Record voice notes in Hindi/Regional language</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-lg font-black text-emerald-700 block">3️⃣ Doctor Review</span>
              <span className="text-slate-600 font-medium block mt-0.5">Triage summary sent directly to Doctor OPD Queue</span>
            </div>
          </div>

          {/* Footer Legal & Compliance Notice */}
          <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3 space-y-0.5">
            <p className="font-semibold text-slate-500">
              VaidyaDrishti Telemedicine Platform — Compliant with TPG 2020 & DPDP Act 2023
            </p>
            <p>
              Emergency Warning: For life-threatening emergencies, please proceed immediately to the nearest Emergency Casualty Ward.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
