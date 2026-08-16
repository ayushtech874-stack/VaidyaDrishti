import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';

export const revalidate = 0;

export default async function SuperAdminDashboardPage() {
  const supabase = await createClient();

  const { data: clinics } = await supabase.from('clinics').select('*');
  const { data: doctors } = await supabase.from('doctors').select('*');
  const { data: intakes } = await supabase.from('intakes').select('id, urgency_level, status, created_at');

  const totalClinics = clinics?.length || 1;
  const totalDoctors = doctors?.length || 1;
  const totalIntakes = intakes?.length || 0;
  const highIntakes = (intakes || []).filter((i) => i.urgency_level === 'high').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-6 px-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            👑 VaidyaDrishti — Super-Admin Command Portal
          </h2>
          <p className="text-sm text-slate-500">
            Network-wide multi-tenant management, hospital onboarding, QR posters & directory control
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/onboarding"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <span>➕ Onboard Facility & Doctor</span>
          </Link>
          <Link
            href="/admin/qr-generator"
            className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <span>🖨️ QR Poster Generator</span>
          </Link>
          <Link
            href="/directory"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <span>🌐 Public Directory</span>
          </Link>
          <SignOutButton />
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Active Facilities
          </span>
          <div className="text-3xl font-extrabold text-indigo-600">{totalClinics}</div>
          <span className="text-xs text-slate-500">Registered Hospitals & OPDs</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Empaneled RMP Doctors
          </span>
          <div className="text-3xl font-extrabold text-emerald-600">{totalDoctors}</div>
          <span className="text-xs text-slate-500">Authenticated RMP Accounts</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Network Total Intakes
          </span>
          <div className="text-3xl font-extrabold text-slate-900">{totalIntakes}</div>
          <span className="text-xs text-slate-500">Processed Across Network</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Critical Emergency Cases
          </span>
          <div className="text-3xl font-extrabold text-red-600">{highIntakes}</div>
          <span className="text-xs text-slate-500">High Urgency Red Flags</span>
        </div>
      </div>

      {/* Super-Admin Quick Action Toolbar */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md space-y-3">
        <h3 className="text-lg font-extrabold text-emerald-400 flex items-center gap-2">
          <span>⚡</span> Super-Admin Command Actions
        </h3>
        <p className="text-xs text-slate-300">
          Super-Admin command portal for managing hospitals, generating OPD posters, and inspecting doctor clinical queues.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/admin/onboarding"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition shadow"
          >
            ➕ Onboard New Hospital / OPD Clinic
          </Link>
          <Link
            href="/admin/qr-generator"
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition shadow"
          >
            🖨️ Print OPD WhatsApp QR Posters
          </Link>
          <Link
            href="/directory"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition shadow"
          >
            🌐 View / Manage Public Facility Directory
          </Link>
        </div>
      </div>

      {/* Empaneled RMP Doctors & Facilities Table with View As Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            👨‍⚕️ Empaneled RMP Doctors & Queue Inspection Actions
          </h3>
          <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-1 rounded-md">
            Multi-Tenant Network Active
          </span>
        </div>

        {doctors && doctors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Doctor Name</th>
                  <th className="py-2.5 px-3">Email Account</th>
                  <th className="py-2.5 px-3">RMP Reg Number</th>
                  <th className="py-2.5 px-3">Assigned Facility</th>
                  <th className="py-2.5 px-3 text-right">Inspection Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {doctors.map((doc: any) => {
                  const facility = (clinics || []).find((c) => c.id === doc.clinic_id);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{doc.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{doc.email}</td>
                      <td className="py-2.5 px-3 text-indigo-600 font-semibold">{doc.rmp_registration_number || 'RMP-VERIFIED'}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-semibold">{facility?.name || 'Unassigned'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/doctor/dashboard?as_doctor_id=${doc.id}`}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition shadow-sm inline-flex items-center gap-1 font-sans"
                        >
                          👁️ View Queue as Dr. {doc.name.split(' ')[1] || doc.name}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No doctors registered yet.</p>
        )}
      </div>
    </div>
  );
}
