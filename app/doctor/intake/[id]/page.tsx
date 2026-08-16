import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DoctorCorrectionForm from './CorrectionForm';
import IntakeStageActions from './IntakeStageActions';

export const revalidate = 0;

export default async function DoctorIntakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  const supabase = await createClient();

  const { data: intake, error } = await supabase
    .from('intakes')
    .select(`
      id,
      raw_text,
      structured_data,
      urgency_level,
      red_flags,
      status,
      created_at,
      patients (
        id,
        name,
        age,
        phone
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !intake) {
    console.error(`Intake detail not found or query error for id [${id}]:`, error?.message);
    notFound();
  }

  // Optional voice columns fetch
  let is_voice_intake = false;
  let audio_storage_path = null;
  let voice_asr_confidence = null;

  try {
    const { data: voiceMeta } = await supabase
      .from('intakes')
      .select('is_voice_intake, audio_storage_path, voice_asr_confidence')
      .eq('id', id)
      .maybeSingle();

    if (voiceMeta) {
      is_voice_intake = !!voiceMeta.is_voice_intake;
      audio_storage_path = voiceMeta.audio_storage_path || null;
      voice_asr_confidence = voiceMeta.voice_asr_confidence || null;
    }
  } catch {
    // optional columns
  }

  const patient = intake.patients as any;
  const structured = intake.structured_data as any;
  const urgency = intake.urgency_level;
  const confidence = structured?.extraction_confidence || 'medium';

  // Fetch past cured medical history records for this patient
  let pastHistoryList: any[] = [];
  if (patient?.id) {
    const { data: historyData } = await supabase
      .from('intakes')
      .select('id, raw_text, structured_data, urgency_level, status, created_at, reviewed_at')
      .eq('patient_id', patient.id)
      .neq('id', id)
      .order('created_at', { ascending: false });

    pastHistoryList = historyData || [];
  }

  // Generate short-lived signed URL for private audio if audio_storage_path exists
  let audioSignedUrl = null;
  if (audio_storage_path) {
    if (audio_storage_path.startsWith('http')) {
      audioSignedUrl = audio_storage_path;
    } else {
      try {
        const { data: signedData } = await supabase.storage
          .from('patient-voice-notes')
          .createSignedUrl(audio_storage_path, 3600);
        audioSignedUrl = signedData?.signedUrl || null;
      } catch {
        // storage bucket optional
      }
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/doctor/dashboard"
          className="text-sm text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm"
        >
          ← Back to Dashboard Queue
        </Link>
        <div className="flex items-center gap-2">
          {intake.status === 'in_progress' && (
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 animate-pulse">
              🩺 Under Consultation / Grievance Heard
            </span>
          )}
          {intake.status === 'doctor_reviewed' && (
            <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
              ✅ Treated & Cured Record
            </span>
          )}
          {is_voice_intake && (
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full border border-purple-200">
              🎙️ Voice Note Intake
            </span>
          )}
          <span className="text-xs text-slate-400 font-mono">
            ID: {intake.id.slice(0, 8)}...
          </span>
        </div>
      </div>

      {/* Patient Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {patient?.name || 'Unknown Patient'}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span>Age: <strong>{patient?.age} yrs</strong></span>
            <span>•</span>
            <span>Phone: <strong>{patient?.phone}</strong></span>
            <span>•</span>
            <span>Submitted: <strong>{new Date(intake.created_at).toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Urgency Badge */}
        <div>
          {urgency === 'high' && (
            <span className="inline-flex items-center gap-2 bg-red-600 text-white font-extrabold text-sm px-4 py-2 rounded-xl shadow">
              🔴 HIGH URGENCY
            </span>
          )}
          {urgency === 'medium' && (
            <span className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold text-sm px-4 py-2 rounded-xl shadow">
              🟡 MEDIUM URGENCY
            </span>
          )}
          {urgency === 'low' && (
            <span className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow">
              🟢 LOW URGENCY
            </span>
          )}
        </div>
      </div>

      {/* Voice Note Audio Player Section */}
      {is_voice_intake && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-purple-950 font-bold text-base flex items-center gap-2">
              🎙️ Patient Voice Note Recording
            </h3>
            {voice_asr_confidence === 'low' && (
              <span className="text-xs bg-red-100 text-red-800 font-bold px-2.5 py-1 rounded-md border border-red-200">
                ⚠️ Low ASR Confidence
              </span>
            )}
          </div>

          {audioSignedUrl ? (
            <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-inner">
              <audio controls src={audioSignedUrl} className="w-full">
                Your browser does not support the audio element.
              </audio>
            </div>
          ) : (
            <p className="text-xs text-purple-700 italic">
              Audio recording available on WhatsApp or processing storage link.
            </p>
          )}
        </div>
      )}

      {/* Patient Past Cured Medical History & Previous Treatments Card */}
      {pastHistoryList.length > 0 && (
        <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-indigo-950 font-bold text-lg flex items-center gap-2">
            📚 Patient Past Cured Medical History & Previous Clinic Visits ({pastHistoryList.length})
          </h3>
          <div className="space-y-3">
            {pastHistoryList.map((prevIntake: any) => (
              <div key={prevIntake.id} className="bg-white border border-indigo-100 rounded-xl p-4 space-y-2 text-sm shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold border-b border-slate-100 pb-2">
                  <span>Visit Date: {new Date(prevIntake.created_at).toLocaleDateString()}</span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                    ✓ {prevIntake.status === 'doctor_reviewed' ? 'Treated & Cured' : prevIntake.status}
                  </span>
                </div>
                <p className="text-slate-800 font-medium italic">
                  "{prevIntake.raw_text}"
                </p>
                {prevIntake.structured_data?.primary_symptoms && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {prevIntake.structured_data.primary_symptoms.map((s: string, idx: number) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded border border-slate-200">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low Confidence Warning Banner */}
      {(confidence === 'low' || confidence === 'medium') && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-2xl text-amber-900 font-medium text-sm flex items-start gap-3 shadow-sm">
          <span className="text-2xl">⚠️</span>
          <div>
            <strong className="block text-amber-950 font-bold mb-0.5">
              Reviewer Note: AI extraction confidence is {confidence.toUpperCase()}
            </strong>
            Mandatory Clinical Safeguard: Please open and inspect the raw transcript section below before marking as reviewed.
          </div>
        </div>
      )}

      {/* Red Flags Alert Card */}
      {intake.red_flags && intake.red_flags.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 shadow-sm space-y-2">
          <h3 className="text-red-900 font-bold text-base flex items-center gap-2">
            🚨 Deterministic Protocol Red Flags Triggered:
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-800 font-medium">
            {intake.red_flags.map((flag: string, idx: number) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Structured Clinical Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900">
              Structured Clinical Summary (Decision Support)
            </h3>
            <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
              confidence === 'high' ? 'bg-emerald-100 text-emerald-800' :
              confidence === 'medium' ? 'bg-blue-100 text-blue-800' :
              'bg-amber-100 text-amber-800'
            }`}>
              AI Confidence: {confidence.toUpperCase()}
            </span>
          </div>

          <DoctorCorrectionForm
            intakeId={intake.id}
            initialStructured={structured}
            currentUrgency={intake.urgency_level}
          />
        </div>

        {/* AI Narrative Synthesis */}
        {structured?.clinical_synthesis && (
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-950 space-y-1">
            <span className="font-bold text-indigo-900 block text-xs uppercase tracking-wider">
              🤖 AI Clinical Narrative Synthesis:
            </span>
            <p className="leading-relaxed font-medium">
              {structured.clinical_synthesis}
            </p>
          </div>
        )}

        {structured ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Duration
              </span>
              <p className="font-semibold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">
                {structured.duration || 'Not specified'}
              </p>
            </div>

            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Severity (Patient Described)
              </span>
              <p className="font-semibold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">
                {structured.severity || 'Not specified'}
              </p>
            </div>

            <div className="md:col-span-2">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Primary Symptoms
              </span>
              <div className="flex flex-wrap gap-2">
                {structured.primary_symptoms && structured.primary_symptoms.length > 0 ? (
                  structured.primary_symptoms.map((sym: string, i: number) => (
                    <span
                      key={i}
                      className="bg-emerald-50 text-emerald-900 font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 text-sm"
                    >
                      {sym}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic">None stated</span>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Associated Symptoms
              </span>
              <div className="flex flex-wrap gap-2">
                {structured.associated_symptoms && structured.associated_symptoms.length > 0 ? (
                  structured.associated_symptoms.map((sym: string, i: number) => (
                    <span
                      key={i}
                      className="bg-slate-100 text-slate-800 font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-sm"
                    >
                      {sym}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic">None stated</span>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Relevant Medical History
              </span>
              <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                {structured.relevant_history || 'None stated'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 italic">Processing structured extraction...</p>
        )}
      </div>

      {/* Collapsible Original Raw Transcript */}
      <details id="raw-transcript-details" className="bg-[var(--color-blue-soft)] border border-[var(--color-blue)]/30 rounded-2xl shadow-sm group">
        <summary className="p-5 font-bold text-[var(--color-navy)] cursor-pointer flex items-center justify-between select-none">
          <span>📄 Original Patient Raw Transcript / ASR Text (Click to Expand & Verify)</span>
          <span className="text-[var(--color-navy)] text-sm group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>
        <div className="p-5 pt-0 border-t border-[var(--color-blue)]/20">
          <div className="bg-[var(--color-navy)] text-white p-4 rounded-xl font-data text-sm leading-relaxed whitespace-pre-wrap mt-3 border border-[var(--color-border-on-navy)]">
            {intake.raw_text}
          </div>
        </div>
      </details>

      {/* Action Footer with IntakeStageActions Client Component & Confirmation Modals */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-slate-600 space-y-1">
          <div>Current Workflow Stage: <strong className="text-slate-900 capitalize">{intake.status.replace('_', ' ')}</strong></div>
          <p className="text-xs text-slate-400">
            {intake.status === 'in_progress'
              ? 'Patient is currently in consultation room. Click below when checkup is finished.'
              : intake.status === 'doctor_reviewed'
              ? 'Record finalized and archived in Treated & Cured History.'
              : 'Click below to move patient to consultation room or mark as treated.'}
          </p>
        </div>

        <IntakeStageActions
          intakeId={intake.id}
          currentStatus={intake.status}
        />
      </div>
    </div>
  );
}
