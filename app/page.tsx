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
          {/* Portal 1: Patient Web Intake (Unauthenticated, Frictionless) */}
          <Link
            href="/patient/intake"
            className="card-surface p-6 hover:shadow-md hover:border-[var(--color-blue)] transition flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2">
              <span className="text-3xl block">💬</span>
              <span className="inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                Zero-Friction Intake
              </span>
              <h2 className="text-lg font-extrabold text-[var(--color-navy)] group-hover:text-[var(--color-blue)] transition">
                Patient Web Intake
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                Scan hospital QR code to submit voice/text grievances. <strong>No login required.</strong>
              </p>
            </div>
            <span className="text-xs font-extrabold text-[var(--color-blue)] group-hover:translate-x-1 transition-transform inline-block">
              Start QR Intake →
            </span>
          </Link>

          {/* Portal 2: My Patient Dashboard (Authenticated Account) */}
          <Link
            href="/patient/dashboard"
            className="card-surface p-6 hover:shadow-md hover:border-[var(--color-blue)] transition flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2">
              <span className="text-3xl block">📱</span>
              <span className="inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-[var(--color-blue-soft)] text-[var(--color-navy)] font-bold">
                Patient Account
              </span>
              <h2 className="text-lg font-extrabold text-[var(--color-navy)] group-hover:text-[var(--color-blue)] transition">
                My Patient Dashboard
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                Sign in to view past visit history, self-reported medical records, and past prescriptions.
              </p>
            </div>
            <span className="text-xs font-extrabold text-[var(--color-blue)] group-hover:translate-x-1 transition-transform inline-block">
              Open Patient Portal →
            </span>
          </Link>

          {/* Portal 3: Doctor & Admin Portal */}
          <Link
            href="/doctor/login"
            className="card-surface p-6 hover:shadow-md hover:border-[var(--color-blue)] transition flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2">
              <span className="text-3xl block">👨‍⚕️</span>
              <span className="inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold">
                Clinical OPD Portal
              </span>
              <h2 className="text-lg font-extrabold text-[var(--color-navy)] group-hover:text-[var(--color-blue)] transition">
                Doctor & Admin Portal
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                RMP doctor queue management, executive command portal, and multi-tenant onboarding.
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
