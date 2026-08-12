export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-wide text-emerald-400">
              VaidyaDrishti
            </h1>
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700">
              Doctor Clinical Dashboard
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4">{children}</main>
    </div>
  );
}
