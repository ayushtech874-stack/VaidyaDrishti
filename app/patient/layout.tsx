export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-900">
      <header className="bg-emerald-700 text-white p-4 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wide">VaidyaDrishti</h1>
          <span className="text-xs bg-emerald-800 px-2.5 py-1 rounded-full font-medium">
            Patient Portal
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto p-4">{children}</main>

      <footer className="bg-amber-100 border-t-2 border-amber-400 p-4 text-amber-900 text-xs text-center font-medium leading-relaxed shadow-inner">
        <div className="max-w-xl mx-auto">
          ⚠️ <strong>Medical Disclaimer:</strong> This assistant provides intake documentation support only and does <strong>NOT</strong> provide medical diagnosis or prescriptions. If you are experiencing a medical emergency, please go to the nearest hospital immediately or call emergency services.
        </div>
      </footer>
    </div>
  );
}
