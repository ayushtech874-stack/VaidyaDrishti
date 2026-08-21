'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import WebVoiceRecorder from '@/app/patient/intake/WebVoiceRecorder';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = [
  { id: 'all', label: 'All Facilities' },
  { id: 'General Physician / Fever', label: '🩺 General Physician / Fever' },
  { id: 'Heart/chest/breathing', label: '🫀 Heart / Chest / Breathing' },
  { id: 'Bones/joints/injury', label: '🦴 Bones / Joints / Injury' },
  { id: 'Eye Care', label: '👁️ Eye Care & Vision' },
  { id: 'Pediatrics / Child Health', label: '👶 Child Health' },
];

export default function NewConsultationPage() {
  const [patient, setPatient] = useState<any>(null);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedFacility, setSelectedFacility] = useState<any>(null);
  const [resolvedDoctor, setResolvedDoctor] = useState<any>(null);
  const [symptoms, setSymptoms] = useState('');
  const [hasConsent, setHasConsent] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isResolvingDoc, setIsResolvingDoc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const router = useRouter();
  const supabase = createClient();

  // 1. Fetch Patient Profile & Verified Live Facilities
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/patient/login');
          return;
        }

        // Fetch patient
        const { data: pat } = await supabase
          .from('patients')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        setPatient(pat);

        // Fetch verified live facilities
        const { data: facs } = await supabase
          .from('clinics')
          .select('id, name, code, is_verified, is_live')
          .eq('is_verified', true)
          .eq('is_live', true);

        setFacilities(facs || []);
      } catch (e) {
        console.error('Error loading facilities:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [supabase, router]);

  // Handle selecting a facility & resolving doctor
  async function handleSelectFacility(facility: any) {
    setSelectedFacility(facility);
    setResolvedDoctor(null);
    setIsResolvingDoc(true);
    setErr('');

    try {
      const categoryParam = selectedCategory !== 'all' ? selectedCategory : '';
      const res = await fetch(`/api/patient/resolve-doctor?clinic_id=${facility.id}&category=${encodeURIComponent(categoryParam)}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to resolve doctor for facility.');
      setResolvedDoctor(data.doctor);
    } catch (e: any) {
      setErr(e.message || 'Error resolving practitioner.');
    } finally {
      setIsResolvingDoc(false);
    }
  }

  // Handle Voice Recording completion
  function handleVoiceTranscribed(transcriptText: string) {
    setSymptoms((prev) => (prev ? `${prev}\n${transcriptText}` : transcriptText));
  }

  // Handle Submission with Mandatory Consent Gate
  async function handleSubmitConsultation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFacility || !resolvedDoctor || !symptoms.trim() || !hasConsent) return;

    setIsSubmitting(true);
    setMsg('');
    setErr('');

    try {
      const res = await fetch('/api/structure-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patient.id, // EXISTING PATIENT RECORD
          clinic_id: selectedFacility.id,
          doctor_id: resolvedDoctor.doctorId,
          department_id: resolvedDoctor.departmentId,
          raw_text: symptoms.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit consultation intake.');

      setMsg('🎉 Consultation intake successfully submitted to doctor queue!');
      setTimeout(() => router.push('/patient/dashboard'), 2000);
    } catch (e: any) {
      setErr(e.message || 'Error submitting consultation intake.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredFacilities = facilities.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || f.name.toLowerCase().includes(q) || (f.city || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] pb-12">
      <header className="bg-[var(--color-navy)] text-white py-5 px-4 shadow-md border-b border-[var(--color-border-on-navy)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/patient/dashboard"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-white/20 transition"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-xl font-extrabold text-white">➕ Start a New Consultation</h1>
          </div>
          <span className="text-xs bg-[var(--color-blue)] text-white px-3 py-1 rounded-full font-bold">
            Network Facilities Directory
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        {msg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl text-xs font-extrabold">
            {msg}
          </div>
        )}

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-xs font-extrabold">
            {err}
          </div>
        )}

        {/* STEP 1: Select Facility */}
        <div className="card-surface p-6 shadow-sm space-y-4">
          <div className="border-b border-[var(--color-border)] pb-3">
            <h2 className="text-base font-extrabold text-[var(--color-navy)]">
              Step 1 — Browse Verified Medical Centers & Clinics
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Select a facility to initiate a new consultation. Only verified and live facilities are listed.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Box */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search hospital or clinic name, city..."
              className="bg-white border border-[var(--color-border)] rounded-xl p-2.5 text-xs font-bold w-full sm:w-72 focus:outline-none focus:border-[var(--color-blue)]"
            />

            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition ${
                    selectedCategory === cat.id
                      ? 'bg-[var(--color-navy)] text-white'
                      : 'bg-white border border-[var(--color-border)] text-[var(--color-navy)] hover:bg-[var(--color-blue-soft)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <p className="text-xs text-[var(--color-ink-muted)] italic text-center py-6">Loading network facilities...</p>
          ) : filteredFacilities.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-muted)] italic text-center py-6">No matching verified facilities found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredFacilities.map((fac) => {
                const isSelected = selectedFacility?.id === fac.id;
                const isHospital = (fac.code || '').toUpperCase().includes('HOSP');
                return (
                  <button
                    key={fac.id}
                    onClick={() => handleSelectFacility(fac)}
                    className={`p-4 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-2 border-[var(--color-navy)] bg-[var(--color-blue-soft)]/50 shadow-md'
                        : 'border-[var(--color-border)] bg-white hover:border-[var(--color-blue)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--color-navy)] text-white">
                          {isHospital ? '🏥 Hospital' : '🩺 Clinic'}
                        </span>
                        <span className="text-[10px] font-data text-[var(--color-ink-muted)]">
                          Code: {fac.code}
                        </span>
                      </div>
                      <h3 className="text-xs font-extrabold text-[var(--color-navy)]">{fac.name}</h3>
                    </div>
                    {isSelected && <span className="text-xs text-[var(--color-navy)] font-bold">✓ Selected</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* STEP 2: Doctor & Symptom Intake Form */}
        {selectedFacility && (
          <div className="card-surface p-6 shadow-sm space-y-6 border-2 border-[var(--color-navy)]">
            <div className="border-b border-[var(--color-border)] pb-3">
              <h2 className="text-base font-extrabold text-[var(--color-navy)]">
                Step 2 — Consultation Details for {selectedFacility.name}
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Your profile details are pre-filled below. Describe your new symptoms to initiate triage.
              </p>
            </div>

            {/* Resolved Doctor Banner */}
            {isResolvingDoc ? (
              <p className="text-xs text-[var(--color-ink-muted)] italic">Resolving attending practitioner...</p>
            ) : resolvedDoctor ? (
              <div className="bg-white p-4 rounded-xl border border-[var(--color-border)] space-y-1">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                  👨‍⚕️ Assigned RMP Practitioner
                </span>
                <h3 className="text-sm font-extrabold text-[var(--color-navy)]">
                  Dr. {resolvedDoctor.doctorName}
                </h3>
                <p className="text-[11px] text-[var(--color-ink-muted)]">
                  Facility: {resolvedDoctor.facilityName} ({resolvedDoctor.resolutionSource})
                </p>
              </div>
            ) : null}

            {/* Pre-Filled Profile */}
            {patient && (
              <div className="bg-[var(--color-cream)] p-4 rounded-xl border border-[var(--color-border)] space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-[var(--color-ink-muted)]">
                  Pre-filled Patient Identity (Linked to Account):
                </span>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-[var(--color-navy)]">
                  <span>👤 Name: {patient.name}</span>
                  <span>🎂 Age: {patient.age} Yrs</span>
                  <span>⚧️ Gender: {patient.sex}</span>
                  <span>📞 Phone: {patient.phone}</span>
                </div>
              </div>
            )}

            {/* Symptom Input Form */}
            <form onSubmit={handleSubmitConsultation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1.5">
                  Describe Symptoms & Medical Issue *
                </label>

                {/* Voice Recorder Component */}
                <div className="mb-3">
                  <WebVoiceRecorder onTranscriptionComplete={handleVoiceTranscribed} />
                </div>

                <textarea
                  required
                  rows={4}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Having severe knee pain for 4 days, swelling, difficulty walking..."
                  className="w-full bg-white border border-[var(--color-border)] rounded-xl p-3.5 text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-blue)]"
                />
              </div>

              {/* 🛡️ MANDATORY EXPLICIT CONSENT RECONFIRMATION CHECKBOX GATE */}
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consentCheck"
                    required
                    checked={hasConsent}
                    onChange={(e) => setHasConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[var(--color-navy)] border-slate-300 focus:ring-0"
                  />
                  <label htmlFor="consentCheck" className="text-xs text-amber-950 font-bold leading-relaxed cursor-pointer">
                    Confirm you consent to sharing your intake symptoms, medical history, and health records with Dr. {resolvedDoctor?.doctorName || 'Practitioner'} at {selectedFacility.name} to support continuity of care under DPDP Act 2023. *
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !hasConsent || !symptoms.trim() || !resolvedDoctor}
                className="btn-primary w-full py-4 text-xs font-bold disabled:opacity-50 shadow-md"
              >
                {isSubmitting ? 'Submitting Consultation Intake...' : 'Submit New Consultation Intake →'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
