import React from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import HeaderNavbar from '@/components/HeaderNavbar';

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
    .select('*, clinics(id, name, city, state, phone, address, is_verified, is_live, code)')
    .eq('id', id)
    .single();

  if (!doctor) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)] flex flex-col font-sans">
        <HeaderNavbar />
        <main className="flex-1 py-12 px-4 text-center">
          <div className="max-w-md mx-auto card-surface p-8 border border-[var(--color-border)]">
            <h1 className="text-xl font-heading font-extrabold text-[var(--color-ink)]">Doctor Profile Not Found</h1>
            <Link href="/directory" className="text-xs font-bold text-[var(--color-violet)] hover:underline mt-4 inline-block">
              ← Back to Directory
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const twilioNumber = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || '+14155238886';
  const cleanNumber = twilioNumber.replace(/[^0-9]/g, '');
  const waDeepLink = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(`JOIN ${doctor.clinics?.code || 'CLINIC'}`)}`;
  const qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(waDeepLink)}`;

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] flex flex-col font-sans">
      <HeaderNavbar />
      <main className="flex-1 py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <Link href="/directory" className="text-xs font-bold text-[var(--color-violet)] hover:underline inline-block mb-2">
            ← Back to Public Directory
          </Link>

          {/* Doctor Header Profile Card */}
          <div className="card-surface p-8 border border-[var(--color-border)] shadow-md space-y-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
              <div className="w-24 h-24 rounded-full bg-[var(--color-teal-soft)] text-[var(--color-teal-deep)] flex items-center justify-center font-bold text-4xl shadow-inner flex-shrink-0">
                🩺
              </div>

              <div className="space-y-2 flex-1">
                <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase">
                  VERIFIED RMP PRACTITIONER
                </span>
                <h1 className="text-2xl font-heading font-extrabold text-[var(--color-ink)]">{doctor.name}</h1>
                <p className="text-sm font-bold text-[var(--color-violet)]">{doctor.qualifications || 'MBBS Physician'}</p>
                <p className="text-xs font-data text-[var(--color-ink-muted)] font-bold">RMP License: {doctor.rmp_registration_number}</p>

                <div className="pt-2 text-xs text-[var(--color-ink-muted)]">
                  🏥 Affiliated Facility: <span className="font-bold text-[var(--color-ink)]">{doctor.clinics?.name}</span> ({doctor.clinics?.city || 'Bhagalpur'})
                </div>
              </div>
            </div>

            {doctor.short_bio && (
              <div className="p-4 bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs text-[var(--color-ink)] italic font-serif">
                "{doctor.short_bio}"
              </div>
            )}

            {/* SIDE-BY-SIDE CONTACT OPTIONS */}
            <div className="pt-6 border-t border-[var(--color-border)] space-y-4">
              <h3 className="text-xs font-heading font-extrabold text-[var(--color-ink)] uppercase tracking-wider text-center">
                Consultation & Intake Options (Both 100% Free)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Web Intake */}
                <div className="p-5 border-2 border-[var(--color-violet)]/30 bg-[var(--color-violet-soft)]/30 rounded-[var(--radius-md)] space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase bg-[var(--color-violet)] text-white px-2.5 py-0.5 rounded-full">
                      OPTION 1: WEBSITE FORM
                    </span>
                    <h4 className="text-sm font-heading font-extrabold text-[var(--color-ink)] mt-2">Send Grievance via Website</h4>
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
                <div className="p-5 border-2 border-emerald-500 bg-emerald-50/40 rounded-[var(--radius-md)] space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
                      OPTION 2: WHATSAPP (RECOMMENDED)
                    </span>
                    <h4 className="text-sm font-heading font-extrabold text-[var(--color-ink)] mt-2">Message on WhatsApp</h4>
                    <p className="text-[11px] text-[var(--color-ink-muted)] mt-1">
                      Send symptoms directly on WhatsApp to receive triage receipt & account link.
                    </p>
                  </div>

                  <div className="space-y-2 text-center">
                    <a
                      href={waDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full inline-block shadow transition"
                    >
                      💬 Message on WhatsApp →
                    </a>

                    {qrCodeDataUrl && (
                      <div className="pt-2 hidden md:block">
                        <p className="text-[10px] font-bold text-[var(--color-ink-muted)] mb-1">Desktop visitor? Scan with phone camera:</p>
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
    </div>
  );
}
