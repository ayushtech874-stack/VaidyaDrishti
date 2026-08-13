'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import WebVoiceRecorder from './WebVoiceRecorder';

export default function PatientIntakePage() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [rawText, setRawText] = useState('');
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [clinicsList, setClinicsList] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedDoctorName, setSelectedDoctorName] = useState('');
  const [selectedClinicName, setSelectedClinicName] = useState('');

  const supabase = createClient();

  useEffect(() => {
    async function loadClinicsAndDoctors() {
      try {
        const { data: clinics } = await supabase.from('clinics').select('id, name, code, address');
        const { data: doctors } = await supabase.from('doctors').select('id, name, rmp_registration_number, clinic_id, department_id');

        setClinicsList(clinics || []);
        setDoctorsList(doctors || []);

        if (clinics && clinics.length > 0) {
          setSelectedClinicId(clinics[0].id);
          setSelectedClinicName(clinics[0].name);
        }
      } catch (err) {
        console.warn('Failed to load clinic options:', err);
      }
    }
    loadClinicsAndDoctors();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !age || !phone.trim() || !rawText.trim() || !selectedClinicId) {
      setErrorMsg('Please select a consulting doctor/clinic and fill in all fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Check if patient already exists by phone
      let patientId: string | null = null;
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('phone', phone.trim())
        .maybeSingle();

      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        // Create new patient with fallback for legacy schema without clinic_id
        let newPatientRes = await supabase
          .from('patients')
          .insert([
            {
              name: name.trim(),
              age: parseInt(age, 10),
              phone: phone.trim(),
              clinic_id: selectedClinicId,
            },
          ])
          .select('id')
          .single();

        if (newPatientRes.error && newPatientRes.error.message?.includes('clinic_id')) {
          newPatientRes = await supabase
            .from('patients')
            .insert([
              {
                name: name.trim(),
                age: parseInt(age, 10),
                phone: phone.trim(),
              },
            ])
            .select('id')
            .single();
        }

        if (newPatientRes.error) throw newPatientRes.error;
        patientId = newPatientRes.data.id;
      }

      // Find doctor name for confirmation message
      const targetDoc = doctorsList.find((d) => d.clinic_id === selectedClinicId);
      const targetClinic = clinicsList.find((c) => c.id === selectedClinicId);
      if (targetDoc) setSelectedDoctorName(targetDoc.name);
      if (targetClinic) setSelectedClinicName(targetClinic.name);

      // 2. Insert new intake row with selected clinic_id
      const { data: newIntake, error: intakeError } = await supabase
        .from('intakes')
        .insert([
          {
            clinic_id: selectedClinicId,
            department_id: selectedDepartmentId || null,
            patient_id: patientId,
            raw_text: rawText.trim(),
            status: 'pending_review',
            is_voice_intake: !!recordedAudioBlob,
          },
        ])
        .select('id')
        .single();

      if (intakeError) throw intakeError;

      // 3. Upload recorded audio blob to Supabase Storage if present
      if (newIntake?.id && recordedAudioBlob) {
        const storagePath = `web-voice-notes/${newIntake.id}.webm`;
        try {
          await supabase.storage
            .from('patient-voice-notes')
            .upload(storagePath, recordedAudioBlob, { contentType: 'audio/webm', upsert: true });

          await supabase
            .from('intakes')
            .update({ audio_storage_path: storagePath, is_voice_intake: true })
            .eq('id', newIntake.id);
        } catch (storageErr) {
          console.warn('Audio storage upload warning:', storageErr);
        }
      }

      // 4. Fire call to Groq structuring layer (Translates to English & extracts JSON)
      if (newIntake?.id) {
        fetch('/api/structure-intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intake_id: newIntake.id }),
        }).catch((err) => console.error('Background structuring call failed:', err));
      }

      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Intake submission error:', err);
      setErrorMsg(err.message || 'Failed to submit intake. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center space-y-6 my-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-slate-800">
          Information Received & Sent to Doctor!
        </h2>

        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-emerald-900 text-sm leading-relaxed text-left">
          <p className="font-bold text-emerald-950 text-base mb-1">
            ✅ Delivered to {selectedDoctorName || 'Consulting Physician'}'s Dashboard
          </p>
          <p className="text-emerald-800">
            Clinic Queue: <strong>{selectedClinicName || 'Selected Clinic'}</strong>
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 text-sm leading-relaxed text-left">
          <p className="font-semibold text-slate-900 mb-2">What happens next?</p>
          <p>
            Your symptom summary has been securely recorded and dispatched directly to your doctor's active triage portal for immediate review during your teleconsultation.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-amber-900 text-sm leading-relaxed text-left">
          <strong>Notice:</strong> This intake is for triage support and does not replace emergency medical care. If experiencing an emergency, visit the nearest hospital immediately.
        </div>

        <button
          onClick={() => {
            setName('');
            setAge('');
            setPhone('');
            setRawText('');
            setIsSubmitted(false);
          }}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 px-6 rounded-xl transition text-base"
        >
          Submit Another Intake
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 my-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-1">
          Patient Tele-Triage Intake Form
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Please select your consulting doctor/clinic and describe how you are feeling.
        </p>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3.5 rounded-xl mb-6">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Clinic & Doctor Selector Dropdown */}
          <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl space-y-2">
            <label className="block text-sm font-bold text-emerald-950">
              🏥 Select Consulting Hospital / Clinic & Doctor *
            </label>
            <select
              required
              value={selectedClinicId}
              onChange={(e) => {
                const cId = e.target.value;
                setSelectedClinicId(cId);
                const c = clinicsList.find((item) => item.id === cId);
                if (c) setSelectedClinicName(c.name);
              }}
              className="w-full px-4 py-3 rounded-xl border border-emerald-300 bg-white font-semibold text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {clinicsList.length === 0 ? (
                <option value="">Loading clinics...</option>
              ) : (
                clinicsList.map((clinic) => {
                  const matchingDoc = doctorsList.find((d) => d.clinic_id === clinic.id);
                  const docText = matchingDoc ? ` — ${matchingDoc.name}` : '';
                  return (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}{docText} ({clinic.code})
                    </option>
                  );
                })
              )}
            </select>
            <p className="text-xs text-emerald-800 font-medium">
              Your symptoms and voice recording will be sent directly to this doctor's dashboard.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-4 py-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Age *
              </label>
              <input
                type="number"
                required
                min="0"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 45"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Symptom Description *
            </label>

            <div className="mb-3">
              <WebVoiceRecorder
                onTranscriptionComplete={(text, blob) => {
                  setRawText((prev) => (prev ? `${prev}\n${text}` : text));
                  if (blob) setRecordedAudioBlob(blob);
                }}
              />
            </div>

            <textarea
              required
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Describe what you're feeling, when it started, and anything that makes it better or worse"
              className="w-full px-4 py-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl shadow-md transition text-lg active:scale-[0.99]"
          >
            {isSubmitting ? 'Submitting to Doctor Dashboard...' : 'Send Intake to Doctor Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
