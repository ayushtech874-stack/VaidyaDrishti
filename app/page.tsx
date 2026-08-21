import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 bg-[var(--color-blue-soft)] text-[var(--color-navy)] px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider">
            <span>🏥 Multi-Tenant AI Tele-Triage Platform</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--color-navy)] tracking-tight">
            VaidyaDrishti
          </h1>
          <p className="text-base text-[var(--color-ink-muted)] max-w-xl mx-auto leading-relaxed">
            AI-Assisted Tele-Triage & OPD Clinical Decision Support for Indian Hospitals & RMP Practitioners
          </p>
        </div>

        {/* 3 Main Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {/* Portal 1: Quick Symptom Check (Anonymous, Zero-Friction) */}
          <Link
            href="/patient/intake"
            className="card-surface p-6 hover:shadow-md hover:border-[var(--color-blue)] transition flex flex-col justify-between space-y-4 group border-2 border-emerald-300 bg-emerald-50/20"
          >
            <div className="space-y-2">
              <span className="text-3xl block">🩺</span>
              <span className="inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                No Login Required
              </span>
              <h2 className="text-lg font-extrabold text-[var(--color-navy)] group-hover:text-[var(--color-blue)] transition">
                Quick Symptom Check
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                Frictionless OPD intake for QR code scanning or walk-in visits. <strong>Never requires an account.</strong>
              </p>
            </div>
            <span className="text-xs font-extrabold text-emerald-700 group-hover:translate-x-1 transition-transform inline-block">
              Start Quick Intake →
            </span>
          </Link>

          {/* Portal 2: My Patient Dashboard (Authenticated Patient Portal) */}
          <Link
            href="/patient/dashboard"
            className="card-surface p-6 hover:shadow-md hover:border-[var(--color-blue)] transition flex flex-col justify-between space-y-4 group border-2 border-[var(--color-navy)]"
          >
            <div className="space-y-2">
              <span className="text-3xl block">📱</span>
              <span className="inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-[var(--color-blue-soft)] text-[var(--color-navy)] font-bold">
                Full Patient Account
              </span>
              <h2 className="text-lg font-extrabold text-[var(--color-navy)] group-hover:text-[var(--color-blue)] transition">
                My Dashboard
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                Login/signup to track all visits, message doctors, view e-prescriptions, book appointments, & start new consultations.
              </p>
            </div>
            <span className="text-xs font-extrabold text-[var(--color-blue)] group-hover:translate-x-1 transition-transform inline-block">
              Open My Dashboard →
            </span>
          </Link>

          {/* Portal 3: Doctor & Clinic Staff Login */}
          <Link
            href="/doctor/login"
            className="card-surface p-6 hover:shadow-md hover:border-[var(--color-blue)] transition flex flex-col justify-between space-y-4 group border border-[var(--color-border)]"
          >
            <div className="space-y-2">
              <span className="text-3xl block">👨‍⚕️</span>
              <span className="inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold">
                Medical Staff
              </span>
              <h2 className="text-lg font-extrabold text-[var(--color-navy)] group-hover:text-[var(--color-blue)] transition">
                Doctor / Clinic Login
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                RMP doctor OPD queue management, tele-consultations, and facility admin dashboard.
              </p>
            </div>
            <span className="text-xs font-extrabold text-[var(--color-blue)] group-hover:translate-x-1 transition-transform inline-block">
              Doctor Sign In →
            </span>
          </Link>
        </div>

        <p className="text-xs text-[var(--color-ink-muted)] max-w-lg mx-auto">
          Compliant with Telemedicine Practice Guidelines (TPG 2020) & Digital Personal Data Protection Act (DPDP Act 2023).
        </p>
      </div>
    </div>
  );
}
