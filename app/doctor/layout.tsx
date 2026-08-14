import Image from 'next/image';

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="bg-slate-900 text-white py-3 px-4 shadow-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Embedded Logo Icon */}
            <div className="relative w-9 h-9 flex-shrink-0">
              <Image
                src="/icon.svg"
                alt="VaidyaDrishti Logo"
                width={36}
                height={36}
                className="rounded-lg shadow-sm"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-wide text-white">
                  Vaidya<span className="text-sky-400">Drishti</span>
                </h1>
                <span className="text-[10px] bg-sky-950 text-sky-300 font-bold px-2 py-0.5 rounded border border-sky-800">
                  Doctor Clinical Dashboard
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                AI Insight • Priority Care • Better Outcomes
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4">{children}</main>
    </div>
  );
}
