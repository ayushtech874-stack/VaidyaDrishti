'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PatientIntakePage() {
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [symptoms, setSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/structure-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patientName,
          age: parseInt(age, 10),
          gender,
          raw_text: symptoms,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit intake');

      setSubmittedSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting your consultation intake.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] py-8 px-4 sm:px-6 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full space-y-6">
        {/* Patient Form Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-[var(--color-blue-soft)] text-[var(--color-navy)] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <span>🩺 Official OPD Patient Registration</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-navy)] tracking-tight">
            VaidyaDrishti Tele-Triage Intake
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Please fill in your details and describe your medical symptoms clearly for doctor consultation.
          </p>
        </div>

        {submittedSuccess ? (
          <div className="card-surface p-8 text-center space-y-4 border-2 border-[var(--color-urgent-low)]">
            <div className="w-16 h-16 bg-[var(--color-urgent-low-bg)] text-[var(--color-urgent-low)] rounded-full flex items-center justify-center text-3xl font-bold mx-auto">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-navy)]">
              Intake Submitted Successfully!
            </h2>
            <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
              Your symptoms have been analyzed by VaidyaDrishti AI Triage and sent directly to the RMP Doctor&apos;s active OPD queue.
            </p>

            {/* Dashboard Account Claim Prompt */}
            <div className="bg-[var(--color-blue-soft)] border border-[var(--color-blue)]/30 p-4 rounded-xl space-y-2 text-left">
              <span className="text-xs font-bold text-[var(--color-navy)] block">
                📲 Want to track this visit, prescriptions & reminders long-term?
              </span>
              <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed">
                Create your VaidyaDrishti patient dashboard account to message your doctor, view e-prescriptions, and manage appointments.
              </p>
              <Link
                href="/patient/signup"
                className="inline-block text-xs font-extrabold text-[var(--color-blue)] hover:underline pt-1"
              >
                Create Free Patient Dashboard Account →
              </Link>
            </div>

            <button
              onClick={() => {
                setSubmittedSuccess(false);
                setSymptoms('');
              }}
              className="btn-primary w-full text-base py-3"
            >
              Submit Another Patient Intake →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card-surface p-6 sm:p-8 space-y-6">
            {errorMsg && (
              <div className="bg-[var(--color-urgent-high-bg)] border border-[var(--color-urgent-high)] text-[var(--color-urgent-high)] p-4 rounded-xl text-sm font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-white border border-[var(--color-border)] rounded-xl p-3.5 text-base text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-blue)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1.5">
                    Age (Years) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 34"
                    className="w-full bg-white border border-[var(--color-border)] rounded-xl p-3.5 text-base text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-blue)] font-data"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1.5">
                    Gender *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-white border border-[var(--color-border)] rounded-xl p-3.5 text-base text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-blue)] font-semibold"
                  >
                    <option value="Male">Male (पुरुष)</option>
                    <option value="Female">Female (महिला)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1.5">
                  Describe Symptoms & Problem (कष्ट विवरण) *
                </label>
                <textarea
                  required
                  rows={4}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Having fever for 3 days, chest heaviness, severe headache..."
                  className="w-full bg-white border border-[var(--color-border)] rounded-xl p-3.5 text-base text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-blue)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full text-base py-4 shadow-md"
            >
              {isSubmitting ? 'Submitting to Doctor Queue...' : 'Submit Consultation Intake →'}
            </button>
          </form>
        )}

        {/* DPDP Act 2023 Care Continuity Disclosure */}
        <div className="bg-[var(--color-blue-soft)] border border-[var(--color-blue)]/30 text-[var(--color-navy)] rounded-2xl p-4 text-xs space-y-1 text-center font-medium">
          <p className="font-bold">
            🛡️ Privacy & Care Continuity Notice (DPDP Act 2023)
          </p>
          <p className="text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
            By submitting this intake, you agree that your visit history, prescriptions, and health records may be visible to other VaidyaDrishti doctors you consult across network facilities, to support continuity of care.
          </p>
        </div>

        {/* Legal & Emergency Disclaimer Footer */}
        <div className="bg-[var(--color-urgent-high-bg)] border border-[var(--color-urgent-high)] text-[var(--color-urgent-high)] rounded-2xl p-4 text-xs space-y-1 text-center font-medium">
          <p className="font-bold">
            🚨 EMERGENCY NOTICE / आपातकालीन सूचना
          </p>
          <p className="text-[11px] leading-relaxed">
            If you are experiencing severe chest pain, extreme breathlessness, sudden paralysis, or severe trauma, please visit the nearest Emergency Casualty Ward immediately.
          </p>
        </div>
      </div>
    </main>
  );
}
