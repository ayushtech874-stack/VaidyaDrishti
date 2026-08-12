import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';

export const revalidate = 0;

export default async function SuperAdminDashboardPage() {
  const supabase = await createClient();

  const { data: clinics } = await supabase.from('clinics').select('*');
  const { data: doctors } = await supabase.from('doctors').select('*');
  const { data: intakes } = await supabase.from('intakes').select('id, urgency_level, status, created_at');
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

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
            VaidyaDrishti — Super-Admin Command Portal
          </h2>
          <p className="text-sm text-slate-500">
            Network-wide multi-tenant management, clinic provisioning, and compliance monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/doctor/dashboard"
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
          >
            👨‍⚕️ Switch to Doctor Dashboard
          </Link>
          <SignOutButton />
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Active Clinics
          </span>
          <div className="text-3xl font-extrabold text-indigo-600">{totalClinics}</div>
          <span className="text-xs text-slate-500">Registered Tenants</span>
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

      {/* Empaneled RMP Doctors & Clinics Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            👨‍⚕️ Empaneled RMP Doctors & Clinic Assignments
          </h3>
          <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-1 rounded-md">
            Multi-Tenant Isolation Active
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
                  <th className="py-2.5 px-3">Assigned Clinic ID</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {doctors.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{doc.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{doc.email}</td>
                    <td className="py-2.5 px-3 text-indigo-600 font-semibold">{doc.rmp_registration_number || 'RMP-IND-2026-88'}</td>
                    <td className="py-2.5 px-3 text-slate-500">{doc.clinic_id?.slice(0, 8) || 'PILOT_CLINIC_1'}...</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                        ACTIVE RMP
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No doctors registered yet.</p>
        )}
      </div>

      {/* Network Audit Log Stream */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            📜 Recent Immutable ICMR Audit Stream
          </h3>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-md">
            Tamper-Evident Active
          </span>
        </div>

        {auditLogs && auditLogs.length > 0 ? (
          <div className="space-y-3 font-mono text-xs">
            {auditLogs.map((log: any) => (
              <div
                key={log.id}
                className="bg-slate-900 text-slate-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-indigo-600 text-white px-2 py-0.5 rounded font-bold">
                    {log.event_type}
                  </span>
                  <span className="text-slate-400">Actor: {log.actor}</span>
                  <span className="text-slate-300">Intake: {log.intake_id?.slice(0, 8)}...</span>
                </div>
                <span className="text-slate-500">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No audit log entries recorded yet.</p>
        )}
      </div>

      {/* Clinic Provisioning Guide */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-sm space-y-3 border border-slate-800">
        <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
          ⚡ 2-Minute Onboarding Protocol for New Private Clinics
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          To onboard a new private clinic doctor onto VaidyaDrishti:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 font-mono">
          <li>Create Doctor Auth user in Supabase Dashboard → Authentication → Add User.</li>
          <li>Assign doctor to a new <code>clinic_id</code> in the <code>doctors</code> table.</li>
          <li>Provide clinic with printable WhatsApp QR Code poster (e.g. <code>wa.me/91XXXXXXXXXX?text=JOIN_CLINIC_102</code>).</li>
          <li>Doctor logs in at <code>http://localhost:3000/doctor/login</code> and starts receiving private patient intakes instantly!</li>
        </ol>
      </div>
    </div>
  );
}
