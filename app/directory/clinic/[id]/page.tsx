import React from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClinicProfilePage({ params }: PageProps) {
  const { id } = await params;

  const { data: clinic } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', id)
    .single();

  const { data: doctors } = await supabase
    .from('doctors')
    .select('*')
    .eq('clinic_id', id)
    .eq('registration_status', 'approved');

  if (!clinic) {
    return (
      <main className="min-h-screen bg-[var(--color-cream-soft)] py-12 px-4 text-center">
        <div className="max-w-md mx-auto card-surface p-8 border">
          <h1 className="text-xl font-bold text-gray-800">Facility Profile Not Found</h1>
          <Link href="/directory" className="text-xs font-bold text-blue-600 hover:underline mt-4 inline-block">
            ← Back to Directory
          </Link>
        </div>
      </main>
    );
  }

  const twilioNumber = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || '+14155238886';
  const cleanNumber = twilioNumber.replace(/[^0-9]/g, '');
  const waDeepLink = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(`JOIN ${clinic.code}`)}`;
  const qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(waDeepLink)}`;

  return (
    <main className="min-h-screen bg-[var(--color-cream-soft)] py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/directory" className="text-xs font-bold text-blue-600 hover:underline inline-block mb-2">
          ← Back to Public Directory
        </Link>

        {/* Facility Header Card */}
        <div className="card-surface p-8 border border-[var(--color-border)] shadow-md space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b pb-6">
            <div>
              <span className="text-[10px] font-bold bg-blue-100 text-[var(--color-navy)] px-2.5 py-0.5 rounded uppercase">
                VERIFIED MEDICAL FACILITY
              </span>
              <h1 className="text-2xl font-extrabold text-[var(--color-navy)] mt-1">{clinic.name}</h1>
              <p className="text-xs text-[var(--color-ink-muted)]">{clinic.address || 'Central District'} | {clinic.city || 'Bhagalpur'}, {clinic.state || 'Bihar'}</p>
              <p className="text-[11px] font-mono text-blue-700 font-bold mt-1">Facility Code: {clinic.code}</p>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full inline-block">
                Status: Live Verified ✅
              </span>
            </div>
          </div>

          {clinic.short_description && (
            <p className="text-xs text-gray-700 leading-relaxed font-medium">
              {clinic.short_description}
            </p>
          )}

          {/* ADDENDUM 5c: SIDE-BY-SIDE CONTACT OPTIONS */}
          <div className="pt-4 space-y-4">
            <h3 className="text-xs font-extrabold text-[var(--color-navy)] uppercase tracking-wider text-center">
              Facility Patient Intake Options (Both 100% Free)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Web Intake */}
              <div className="p-5 border-2 border-emerald-200 bg-emerald-50/20 rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    OPTION 1: WEBSITE FORM
                  </span>
                  <h4 className="text-sm font-extrabold text-[var(--color-navy)] mt-2">Send Grievance via Website</h4>
                  <p className="text-[11px] text-[var(--color-ink-muted)] mt-1">
                    Frictionless online OPD intake form. Describe symptoms via text or voice recording.
                  </p>
                </div>
                <Link
                  href={`/patient/intake?clinic_id=${clinic.id}`}
                  className="btn-primary text-xs py-2.5 px-4 text-center block w-full shadow"
                >
                  Start Web Intake →
                </Link>
              </div>

              {/* Option 2: WhatsApp Deep Link + QR Code */}
              <div className="p-5 border-2 border-emerald-500 bg-emerald-50/40 rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded">
                    OPTION 2: WHATSAPP (RECOMMENDED)
                  </span>
                  <h4 className="text-sm font-extrabold text-[var(--color-navy)] mt-2">Message on WhatsApp</h4>
                  <p className="text-[11px] text-[var(--color-ink-muted)] mt-1">
                    Send symptoms directly on WhatsApp to receive triage receipt & 48h account claim nudge link.
                  </p>
                </div>

                <div className="space-y-2 text-center">
                  <a
                    href={waDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg inline-block shadow transition"
                  >
                    💬 Message on WhatsApp →
                  </a>

                  {qrCodeDataUrl && (
                    <div className="pt-2 hidden md:block">
                      <p className="text-[10px] font-bold text-gray-600 mb-1">Desktop visitor? Scan with phone camera:</p>
                      {/* eslint-disable-next-html-link */}
                      <img src={qrCodeDataUrl} alt="Facility WhatsApp QR Code" className="w-24 h-24 mx-auto border p-1 rounded bg-white shadow-sm" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Affiliated Doctors Section */}
          <div className="pt-6 border-t space-y-3">
            <h3 className="text-sm font-extrabold text-[var(--color-navy)]">
              On-Duty Approved Doctors ({doctors?.length || 0})
            </h3>

            {(!doctors || doctors.length === 0) ? (
              <p className="text-xs text-[var(--color-ink-muted)]">No approved doctors currently listed at this facility.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {doctors.map((d) => (
                  <div key={d.id} className="p-3 border rounded bg-white flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-[var(--color-navy)]">{d.name}</p>
                      <p className="text-gray-500 text-[11px]">{d.qualifications}</p>
                    </div>
                    <Link
                      href={`/directory/doctor/${d.id}`}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Profile →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
