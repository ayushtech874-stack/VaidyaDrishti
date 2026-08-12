import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-4xl font-extrabold text-emerald-400">VaidyaDrishti</h1>
        <p className="text-slate-300 text-sm leading-relaxed">
          AI Teleconsultation Triage Assistant — Clinical Decision Support & Structured Intake
        </p>

        <div className="grid grid-cols-1 gap-4 pt-4">
          <Link
            href="/patient/intake"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 px-6 rounded-xl text-lg shadow-lg transition-all border border-emerald-500"
          >
            📋 Patient Intake Form
          </Link>

          <Link
            href="/doctor/dashboard"
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-4 px-6 rounded-xl text-lg shadow-lg transition-all border border-slate-700"
          >
            👨‍⚕️ Doctor Dashboard
          </Link>
        </div>

        <p className="text-xs text-slate-500 pt-6">
          Compliant with India Telemedicine Practice Guidelines (2020) & DPDP Act (2023).
        </p>
      </div>
    </div>
  );
}
