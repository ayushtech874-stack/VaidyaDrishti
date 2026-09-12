'use client';

import { useState } from 'react';
import Link from 'next/link';

interface TriageResult {
  intake_id?: string;
  urgency_level: 'high' | 'medium' | 'low';
  clinical_synthesis: string;
  clinical_reasoning: string;
  recommended_specialty: string;
  red_flags: string[];
  primary_symptoms?: string[];
  duration?: string;
  severity?: string;
}

export default function PatientIntakePage() {
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [symptoms, setSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const [dpdpConsent, setDpdpConsent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dpdpConsent) {
      setErrorMsg('Please accept the DPDP Act 2023 privacy & data processing consent to proceed.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    setTriageResult(null);

    try {
      const res = await fetch('/api/structure-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patientName || 'Anonymous Patient',
          age: parseInt(age, 10) || 30,
          gender,
          raw_text: symptoms,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process symptom triage');

      const result: TriageResult = {
        intake_id: data.intake_id,
        urgency_level: data.urgency_level || 'low',
        clinical_synthesis: data.structured_data?.clinical_synthesis || 'Symptom analysis complete.',
        clinical_reasoning: data.clinical_reasoning || data.structured_data?.clinical_reasoning || 'Based on reported symptoms and age, this triage assessment helps determine appropriate care urgency.',
        recommended_specialty: data.recommended_specialty || data.structured_data?.recommended_specialty || 'General Physician',
        red_flags: data.red_flags || [],
        primary_symptoms: data.structured_data?.primary_symptoms || [],
        duration: data.structured_data?.duration || 'Not specified',
        severity: data.structured_data?.severity || 'Not specified',
      };

      setTriageResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error running symptom check.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopySummary() {
    if (!triageResult) return;
    const textToCopy = `[VaidyaDrishti AI Triage Report]
Patient: ${patientName || 'Anonymous'} (${age} Yrs, ${gender})
Urgency Level: ${triageResult.urgency_level.toUpperCase()}
Recommended Specialty: ${triageResult.recommended_specialty}
Symptoms: ${symptoms}
Clinical Synthesis: ${triageResult.clinical_synthesis}
Clinical Reasoning: ${triageResult.clinical_reasoning}
Red Flags: ${triageResult.red_flags.length > 0 ? triageResult.red_flags.join(', ') : 'None detected'}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  }

  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] py-10 px-4 sm:px-6 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-[var(--color-violet-soft)] text-[var(--color-violet)] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-[var(--color-violet)]/20 shadow-xs">
            <span>🩺 Instant AI Patient Tele-Triage Assistant</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-[var(--color-ink)] tracking-tight">
            Quick Symptom & Health Check
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)] max-w-lg mx-auto leading-relaxed">
            Describe your symptoms in your own words or regional language to receive instant AI triage urgency evaluation, clinical reasoning, and specialty doctor recommendations.
          </p>
        </div>

        {/* Triage Result Render Card */}
        {triageResult ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Urgency Status Banner */}
            <div
              className={`p-6 rounded-2xl border-2 shadow-sm text-left space-y-3 ${
                triageResult.urgency_level === 'high'
                  ? 'bg-[var(--color-urgent-high-bg)] border-[var(--color-urgent-high)] text-[var(--color-urgent-high)]'
                  : triageResult.urgency_level === 'medium'
                  ? 'bg-[var(--color-urgent-medium-bg)] border-[var(--color-urgent-medium)] text-[var(--color-urgent-medium)]'
                  : 'bg-[var(--color-urgent-low-bg)] border-[var(--color-urgent-low)] text-[var(--color-urgent-low)]'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {triageResult.urgency_level === 'high' ? '🚨' : triageResult.urgency_level === 'medium' ? '⚠️' : '✅'}
                  </span>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block opacity-80">
                      Triage Assessment
                    </span>
                    <h2 className="text-2xl font-heading font-extrabold capitalize">
                      {triageResult.urgency_level === 'high'
                        ? 'Emergency / High Priority'
                        : triageResult.urgency_level === 'medium'
                        ? 'Moderate Urgency Attention'
                        : 'Routine / Low Urgency Care'}
                    </h2>
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold border border-current">
                  Specialty: {triageResult.recommended_specialty}
                </div>
              </div>

              {/* Red Flags Alert if present */}
              {triageResult.red_flags.length > 0 && (
                <div className="bg-white p-3.5 rounded-xl border border-red-300 text-red-700 text-xs space-y-1">
                  <span className="font-extrabold block">🚨 Critical Clinical Red Flags Detected:</span>
                  <ul className="list-disc pl-4 space-y-0.5 font-semibold">
                    {triageResult.red_flags.map((rf, idx) => (
                      <li key={idx}>{rf}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Clinical Reasoning & Justification Card */}
            <div className="card-surface p-6 space-y-4 text-left border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center gap-2 text-[var(--color-navy)] font-heading font-bold text-base">
                <span>🧠 Clinical Reasoning & Assessment Rationale</span>
              </div>
              <p className="text-sm text-[var(--color-ink)] leading-relaxed bg-[var(--color-cream)] p-4 rounded-xl border border-[var(--color-border)]">
                {triageResult.clinical_reasoning}
              </p>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-[var(--color-border)]">
                  <span className="font-bold text-[var(--color-ink-muted)] block uppercase tracking-wider mb-1">
                    Synthesized Summary
                  </span>
                  <p className="text-[var(--color-ink)] font-medium leading-normal">
                    {triageResult.clinical_synthesis}
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-[var(--color-border)] space-y-2">
                  <div>
                    <span className="font-bold text-[var(--color-ink-muted)] block uppercase tracking-wider">
                      Primary Symptoms
                    </span>
                    <p className="text-[var(--color-ink)] font-semibold">
                      {triageResult.primary_symptoms?.join(', ') || symptoms}
                    </p>
                  </div>
                  <div className="flex gap-4 pt-1">
                    <div>
                      <span className="font-bold text-[var(--color-ink-muted)] block">Duration</span>
                      <span className="text-[var(--color-ink)] font-medium">{triageResult.duration}</span>
                    </div>
                    <div>
                      <span className="font-bold text-[var(--color-ink-muted)] block">Severity</span>
                      <span className="text-[var(--color-ink)] font-medium">{triageResult.severity}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statutory Telemedicine Guidelines (TPG 2020) Regulatory Banner */}
              <div className="bg-[var(--color-violet-soft)] border border-[var(--color-violet)]/30 rounded-xl p-4 text-xs space-y-1.5">
                <span className="font-bold text-[var(--color-violet)] block flex items-center gap-1.5">
                  <span>⚖️ Statutory Regulatory Disclosure (TPG 2020 Guidelines & NHA Compliance)</span>
                </span>
                <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
                  This triage summary provides automated pre-screening assistance and <strong>does not constitute a formal medical diagnosis or drug prescription</strong>. Under National Health Authority guidelines, AI cannot diagnose or treat patients directly. Please select a licensed Doctor from the directory below to receive professional medical consultation.
                </p>
              </div>

              {/* Action Hub - Patient Doctor Choice */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-extrabold text-[var(--color-navy)] uppercase tracking-wider block text-center">
                  👇 Next Steps: Choose Your Preferred Doctor or Clinic
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    href={`/directory?specialty=${encodeURIComponent(triageResult.recommended_specialty)}${triageResult.intake_id ? `&intake_id=${triageResult.intake_id}` : ''}`}
                    className="btn-primary flex items-center justify-center gap-2 py-3.5 text-sm shadow-md"
                  >
                    <span>🩺 Choose Doctor in {triageResult.recommended_specialty}</span>
                    <span>→</span>
                  </Link>

                  <button
                    onClick={handleCopySummary}
                    className="bg-white border-2 border-[var(--color-violet)] text-[var(--color-violet)] hover:bg-[var(--color-violet-soft)] font-bold py-3.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>{copiedSuccess ? '✓ Report Copied!' : '📋 Copy Triage Summary'}</span>
                  </button>
                </div>

                <div className="flex justify-between items-center pt-2 text-xs">
                  <button
                    onClick={() => {
                      setTriageResult(null);
                      setSymptoms('');
                    }}
                    className="text-[var(--color-violet)] hover:underline font-semibold"
                  >
                    ← Check Different Symptoms
                  </button>
                  <Link
                    href="/patient/signup"
                    className="text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] underline font-medium"
                  >
                    Create Free Patient Account →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Intake Submission Form */
          <form onSubmit={handleSubmit} className="card-surface p-6 sm:p-8 space-y-6">
            
            {/* Emergency Top Warning */}
            <div className="bg-[var(--color-urgent-high-bg)] border border-[var(--color-urgent-high)]/30 rounded-xl p-3.5 text-xs text-[var(--color-urgent-high)] font-semibold flex items-center justify-between gap-2">
              <span>🚨 <strong>Medical Emergency?</strong> Call <strong>108</strong> immediately for severe chest pain or trauma.</span>
            </div>

            {errorMsg && (
              <div className="bg-[var(--color-urgent-high-bg)] border border-[var(--color-urgent-high)] text-[var(--color-urgent-high)] p-4 rounded-xl text-sm font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1.5">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter your name or leave blank for anonymous check"
                  className="w-full bg-white border border-[var(--color-border)] rounded-xl p-3.5 text-base text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1.5">
                    Age (Years) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 28"
                    className="w-full bg-white border border-[var(--color-border)] rounded-xl p-3.5 text-base text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)] font-data"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1.5">
                    Gender *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-white border border-[var(--color-border)] rounded-xl p-3.5 text-base text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)] font-semibold"
                  >
                    <option value="Male">Male (पुरुष)</option>
                    <option value="Female">Female (महिला)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1.5">
                  Describe Symptoms & Medical Concern (कष्ट विवरण) *
                </label>
                <textarea
                  required
                  rows={4}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Describe how you are feeling, pain duration, body parts affected (in English, Hindi, or your regional language)..."
                  className="w-full bg-white border border-[var(--color-border)] rounded-xl p-3.5 text-base text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)]"
                />
                <span className="text-[11px] text-[var(--color-ink-muted)] block mt-1">
                  💡 Supports free-text in English, Hindi, Bhojpuri, Angika, and regional dialects.
                </span>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[var(--color-ink)] font-medium leading-relaxed bg-[var(--color-cream)] p-3.5 rounded-xl border border-[var(--color-border)]">
                  <input
                    type="checkbox"
                    checked={dpdpConsent}
                    onChange={(e) => setDpdpConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-violet)] focus:ring-[var(--color-violet)]"
                  />
                  <span>
                    <strong>DPDP Act 2023 Consent:</strong> I explicitly consent to VaidyaDrishti processing my entered symptoms for instant clinical tele-triage pre-screening and specialty doctor recommendations.
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !dpdpConsent}
              className="btn-primary w-full text-base py-4 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Analyzing Symptoms & Running AI Triage...' : 'Check Symptoms & Get AI Triage Report →'}
            </button>
          </form>
        )}

        {/* Regulatory & Care Continuity Footer */}
        <div className="bg-[var(--color-blue-soft)] border border-[var(--color-blue)]/30 text-[var(--color-navy)] rounded-2xl p-4 text-xs space-y-1 text-center font-medium">
          <p className="font-bold">
            🛡️ Privacy-First AI Tele-Triage (DPDP Act 2023 Compliant)
          </p>
          <p className="text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
            Your symptom check is processed securely to provide instant clinical triage guidance and help you connect with the right licensed doctor on VaidyaDrishti.
          </p>
        </div>

      </div>
    </main>
  );
}
