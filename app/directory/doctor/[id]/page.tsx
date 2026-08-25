import React from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DoctorProfilePage({ params }: PageProps) {
  const { id } = await params;

  const { data: doctor } = await supabase
    .from('doctors')
    .select('*, clinics(id, name, city, state, phone, address, is_verified, is_live)')
    .eq('id', id)
    .single();

  if (!doctor) {
    return (
      <main className="min-h-screen bg-[var(--color-cream-soft)] py-12 px-4 text-center">
        <div className="max-w-md mx-auto card-surface p-8 border">
          <h1 className="text-xl font-bold text-gray-800">Doctor Profile Not Found</h1>
          <Link href="/directory" className="text-xs font-bold text-blue-600 hover:underline mt-4 inline-block">
            ← Back to Directory
          </Link>
        </div>
      </main>
    );
  }

  const twilioNumber = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || '+14155238886';
  const cleanNumber = twilioNumber.replace(/[^0-9]/g, '');
  const waDeepLink = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(`JOIN ${doctor.clinics?.code || 'CLINIC'}`)}`;
  const qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(waDeepLink)}`;

  return (
    <main className="min-h-screen bg-[var(--color-cream-soft)] py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/directory" className="text-xs font-bold text-blue-600 hover:underline inline-block mb-2">
          ← Back to Public Directory
        </Link>

        {/* Doctor Header Profile Card */}
        <div className="card-surface p-8 border border-[var(--color-border)] shadow-md space-y-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
            <div className="w-24 h-24 rounded-full bg-blue-100 text-[var(--color-navy)] flex items-center justify-center font-bold text-4xl shadow-inner flex-shrink-0">
              🩺
            </div>

            <div className="space-y-2 flex-1">
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded uppercase">
                VERIFIED RMP PRACTITIONER
              </span>
              <h1 className="text-2xl font-extrabold text-[var(--color-navy)]">{doctor.name}</h1>
              <p className="text-sm font-semibold text-gray-700">{doctor.qualifications || 'MBBS Physician'}</p>
              <p className="text-xs font-mono text-blue-700 font-bold">RMP License: {doctor.rmp_registration_number}</p>

              <div className="pt-2 text-xs text-gray-600">
                🏥 Affiliated Facility: <span className="font-bold text-[var(--color-navy)]">{doctor.clinics?.name}</span> ({doctor.clinics?.city || 'Bhagalpur'})
              </div>
            </div>
          </div>

          {doctor.short_bio && (
            <div className="p-4 bg-gray-50 border rounded text-xs text-gray-700 italic font-serif">
              "{doctor.short_bio}"
            </div>
          )}

          {/* ADDENDUM 5c: SIDE-BY-SIDE CONTACT OPTIONS */}
          <div className="pt-6 border-t space-y-4">
            <h3 className="text-xs font-extrabold text-[var(--color-navy)] uppercase tracking-wider text-center">
              Consultation & Intake Options (Both 100% Free)
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
                    Zero-friction online symptom intake. Describe symptoms via text or voice note.
                  </p>
                </div>
                <Link
                  href={`/patient/intake?doctor_id=${doctor.id}`}
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
                      <img src={qrCodeDataUrl} alt="WhatsApp Intake QR Code" className="w-24 h-24 mx-auto border p-1 rounded bg-white shadow-sm" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
