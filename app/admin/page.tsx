import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';

import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function SuperAdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isSuperAdmin =
    user &&
    (user.user_metadata?.role === 'super_admin' ||
      user.app_metadata?.role === 'super_admin' ||
      user.email?.toLowerCase().trim() === 'admin@vaidyadrishti.com');

  if (!isSuperAdmin) {
    redirect('/admin/login');
  }

  const { data: clinics } = await supabase.from('clinics').select('*');
  const { data: doctors } = await supabase.from('doctors').select('*');
  const { data: intakes } = await supabase.from('intakes').select('id, urgency_level, status, created_at, clinic_id');

  const totalClinics = clinics?.length || 0;
  const totalDoctors = doctors?.length || 0;
  const totalIntakes = intakes?.length || 0;
  const highIntakes = (intakes || []).filter((i) => i.urgency_level === 'high').length;

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] pb-12">
      {/* Visually Distinct Navy Super-Admin Top Header Bar */}
      <header className="bg-[var(--color-navy)] text-white py-6 px-4 border-b border-[var(--color-border-on-navy)] shadow-md">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-[var(--color-blue)]/30 text-[var(--color-blue-soft)] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <span>👑 Super-Admin Platform Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: '#FFFFFF' }}>
              VaidyaDrishti Executive Portal
            </h1>
            <p className="text-xs text-[var(--color-blue-soft)] mt-0.5">
              Network-wide multi-tenant management, hospital onboarding, QR posters & directory control
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/onboarding"
              className="bg-[var(--color-blue)] hover:bg-blue-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg transition shadow-sm"
            >
              ➕ Onboard Facility & Doctor
            </Link>
            <Link
              href="/admin/qr-generator"
              className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg transition shadow-sm"
            >
              🖨️ QR Poster Generator
            </Link>
            <Link
              href="/directory"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg transition shadow-sm"
            >
              🌐 Public Directory
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 space-y-8">
        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-surface p-6 shadow-sm">
            <span className="block text-xs font-bold text-[var(--color-ink-muted)] uppercase tracking-wider mb-1">
              Active Facilities
            </span>
            <div className="text-4xl font-extrabold text-[var(--color-navy)] font-heading">{totalClinics}</div>
            <span className="text-xs text-[var(--color-ink-muted)] font-medium">Registered Hospitals & OPDs</span>
          </div>

          <div className="card-surface p-6 shadow-sm">
            <span className="block text-xs font-bold text-[var(--color-ink-muted)] uppercase tracking-wider mb-1">
              Empaneled RMP Doctors
            </span>
            <div className="text-4xl font-extrabold text-[var(--color-blue)] font-heading">{totalDoctors}</div>
            <span className="text-xs text-[var(--color-ink-muted)] font-medium">Authenticated RMP Accounts</span>
          </div>

          <div className="card-surface p-6 shadow-sm">
            <span className="block text-xs font-bold text-[var(--color-ink-muted)] uppercase tracking-wider mb-1">
              Network Total Intakes
            </span>
            <div className="text-4xl font-extrabold text-[var(--color-ink)] font-heading">{totalIntakes}</div>
            <span className="text-xs text-[var(--color-ink-muted)] font-medium">Total Intakes Processed Across Network</span>
          </div>

          <div className="card-surface p-6 shadow-sm">
            <span className="block text-xs font-bold text-[var(--color-ink-muted)] uppercase tracking-wider mb-1">
              Critical Emergency Cases
            </span>
            <div className="text-4xl font-extrabold text-[var(--color-urgent-high)] font-heading">{highIntakes}</div>
            <span className="text-xs text-[var(--color-ink-muted)] font-medium">High Urgency Red Flags</span>
          </div>
        </div>

        {/* 🏥 Table 1: All Registered Facilities (6 Facilities) */}
        <div className="card-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <h3 className="text-lg font-bold text-[var(--color-navy)] flex items-center gap-2">
              🏥 All Registered Facilities & OPD Clinics ({totalClinics})
            </h3>
            <span className="text-xs bg-[var(--color-blue-soft)] text-[var(--color-navy)] font-bold px-2.5 py-1 rounded-md">
              Network Facilities List
            </span>
          </div>

          {clinics && clinics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-cream)] text-[var(--color-ink-muted)] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Facility Name</th>
                    <th className="py-3 px-3">Join Code (Identifier)</th>
                    <th className="py-3 px-3">Facility Type</th>
                    <th className="py-3 px-3">Empaneled Doctor</th>
                    <th className="py-3 px-3 font-data text-right">Intakes Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] font-data">
                  {clinics.map((clinic: any) => {
                    const assignedDoc = (doctors || []).find((d) => d.clinic_id === clinic.id);
                    const clinicIntakesCount = (intakes || []).filter((i) => i.clinic_id === clinic.id).length;
                    return (
                      <tr key={clinic.id} className="hover:bg-[var(--color-blue-soft)]/50 transition">
                        <td className="py-3 px-3 font-bold text-[var(--color-ink)] font-sans">{clinic.name}</td>
                        <td className="py-3 px-3 text-[var(--color-blue)] font-bold font-mono">JOIN_{clinic.code}</td>
                        <td className="py-3 px-3 text-[var(--color-ink-muted)] font-semibold font-sans uppercase">
                          {clinic.facility_type === 'hospital' ? '🏥 Hospital' : '🩺 Clinic'}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          {assignedDoc ? (
                            <span className="font-bold text-[var(--color-navy)]">👨‍⚕️ {assignedDoc.name}</span>
                          ) : (
                            <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[10px] font-bold">
                              ⚠️ Pending Doctor Assignment
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-[var(--color-navy)]">
                          {clinicIntakesCount} intakes
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-ink-muted)] italic">No facilities registered yet.</p>
          )}
        </div>

        {/* 👨‍⚕️ Table 2: Empaneled RMP Doctors & Queue Inspection */}
        <div className="card-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <h3 className="text-lg font-bold text-[var(--color-navy)] flex items-center gap-2">
              👨‍⚕️ Empaneled RMP Doctors & Queue Inspection Actions ({totalDoctors})
            </h3>
            <span className="text-xs bg-[var(--color-blue-soft)] text-[var(--color-navy)] font-bold px-2.5 py-1 rounded-md">
              Multi-Tenant Network Active
            </span>
          </div>

          {doctors && doctors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-cream)] text-[var(--color-ink-muted)] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Doctor Name</th>
                    <th className="py-3 px-3">Email Account</th>
                    <th className="py-3 px-3">RMP Reg Number</th>
                    <th className="py-3 px-3">Assigned Facility</th>
                    <th className="py-3 px-3 text-right">Inspection Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] font-data">
                  {doctors.map((doc: any) => {
                    const facility = (clinics || []).find((c) => c.id === doc.clinic_id);
                    return (
                      <tr key={doc.id} className="hover:bg-[var(--color-blue-soft)]/50 transition">
                        <td className="py-3 px-3 font-bold text-[var(--color-ink)] font-sans">{doc.name}</td>
                        <td className="py-3 px-3 text-[var(--color-ink-muted)]">{doc.email}</td>
                        <td className="py-3 px-3 text-[var(--color-blue)] font-semibold">{doc.rmp_registration_number || 'RMP-VERIFIED'}</td>
                        <td className="py-3 px-3 text-[var(--color-ink-muted)] font-semibold font-sans">{facility?.name || 'Unassigned'}</td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/doctor/dashboard?as_doctor_id=${doc.id}`}
                            className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1 font-sans"
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
            <p className="text-sm text-[var(--color-ink-muted)] italic">No doctors registered yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
