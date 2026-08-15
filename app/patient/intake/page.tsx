'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import WebVoiceRecorder from './WebVoiceRecorder';
import { normalizePhone } from '@/lib/utils';

export default function PatientIntakePage() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('Male');
  const [phone, setPhone] = useState('');
  const [rawText, setRawText] = useState('');
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [clinicsList, setClinicsList] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [recordedAudioBlobs, setRecordedAudioBlobs] = useState<Blob[]>([]);
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

  function handleAddAudioBlob(newBlob: Blob) {
    setRecordedAudioBlobs((prev) => [...prev, newBlob]);
  }

  function handleRemoveAudioBlob(index: number) {
    setRecordedAudioBlobs((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !age || !phone.trim() || (!rawText.trim() && recordedAudioBlobs.length === 0) || !selectedClinicId) {
      setErrorMsg('Please select your consulting doctor/clinic and provide a voice note or text description.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. STRICT SINGLE E.164 PHONE NORMALIZATION (+91XXXXXXXXXX)
      const normalizedPhone = normalizePhone(phone.trim());

      // 2. Check if patient already exists by normalized phone
      let patientId: string | null = null;
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (existingPatient) {
        patientId = existingPatient.id;
        await supabase
          .from('patients')
          .update({
            name: name.trim(),
            age: parseInt(age, 10),
            sex: sex,
            clinic_id: selectedClinicId,
          })
          .eq('id', patientId);
      } else {
        // Create new patient with normalized E.164 phone
        let newPatientRes = await supabase
          .from('patients')
          .insert([
            {
              clinic_id: selectedClinicId,
              name: name.trim(),
              age: parseInt(age, 10),
              sex: sex,
              phone: normalizedPhone,
            },
          ])
          .select('id')
          .single();

        if (newPatientRes.error) {
          newPatientRes = await supabase
            .from('patients')
            .insert([
              {
                name: name.trim(),
                age: parseInt(age, 10),
                phone: normalizedPhone,
              },
            ])
            .select('id')
            .single();
        }

        if (newPatientRes.error) throw newPatientRes.error;
        patientId = newPatientRes.data.id;
      }

      // Find doctor assigned to this clinic
      const targetDoc = doctorsList.find((d) => d.clinic_id === selectedClinicId);
      const targetClinic = clinicsList.find((c) => c.id === selectedClinicId);
      if (targetDoc) setSelectedDoctorName(targetDoc.name);
      if (targetClinic) setSelectedClinicName(targetClinic.name);

      const combinedText = rawText.trim() || `[Voice Intake Record - ${recordedAudioBlobs.length} Audio Clips Attached]`;

      // 3. Insert new intake row with BOTH clinic_id and doctor_id
      let newIntakeRes = await supabase
        .from('intakes')
        .insert([
          {
            clinic_id: selectedClinicId,
            doctor_id: targetDoc?.id || null,
            department_id: targetDoc?.department_id || selectedDepartmentId || null,
            patient_id: patientId,
            raw_text: combinedText,
            status: 'pending_review',
            is_voice_intake: recordedAudioBlobs.length > 0,
          },
        ])
        .select('id')
        .single();

      if (newIntakeRes.error) {
        newIntakeRes = await supabase
          .from('intakes')
          .insert([
            {
              patient_id: patientId,
              raw_text: combinedText,
              status: 'pending_review',
            },
          ])
          .select('id')
          .single();
      }

      if (newIntakeRes.error) throw newIntakeRes.error;
      const newIntake = newIntakeRes.data;

      // 4. Upload recorded audio blobs to Supabase Storage if present
      if (newIntake?.id && recordedAudioBlobs.length > 0) {
        for (let idx = 0; idx < recordedAudioBlobs.length; idx++) {
          const blob = recordedAudioBlobs[idx];
          const storagePath = `web-voice-notes/${newIntake.id}_clip_${idx + 1}.webm`;
          try {
            await supabase.storage
              .from('patient-voice-notes')
              .upload(storagePath, blob, { contentType: 'audio/webm', upsert: true });

            if (idx === 0) {
              await supabase
                .from('intakes')
                .update({ audio_storage_path: storagePath, is_voice_intake: true })
                .eq('id', newIntake.id);
            }
          } catch (storageErr) {
            console.warn('Audio storage upload warning:', storageErr);
          }
        }
      }

      // 5. Fire call to Groq structuring layer
      if (newIntake?.id) {
        fetch('/api/structure-intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intake_id: newIntake.id }),
        }).catch((err) => console.error('Structuring trigger failed:', err));
      }

      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Submission Error:', err);
      setErrorMsg(err.message || 'Failed to submit intake. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-3xl mx-auto font-bold shadow-sm">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          Intake Successfully Submitted!
        </h2>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-left text-sm text-emerald-950 space-y-2">
          <p className="font-bold text-emerald-900">
            🏥 Consulting Clinic: {selectedClinicName || 'Your Selected Clinic'}
          </p>
          {selectedDoctorName && (
            <p className="font-medium text-emerald-800">
              👨‍⚕️ Assigned RMP Doctor: {selectedDoctorName}
            </p>
          )}
          <p className="text-xs text-emerald-700 pt-1 border-t border-emerald-200/60">
            Your clinical grievance has been routed directly into the doctor's private queue. Your doctor will review your case shortly.
          </p>
        </div>
        <button
          onClick={() => {
            setIsSubmitted(false);
            setName('');
            setAge('');
            setSex('Male');
            setPhone('');
            setRawText('');
            setRecordedAudioBlobs([]);
          }}
          className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl shadow transition text-sm"
        >
          Submit Another Consultation Request
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          VaidyaDrishti — Patient Tele-Intake Portal
        </h1>
        <p className="text-sm text-slate-600">
          Select your consulting doctor & clinic, record voice notes or type your symptoms.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        {/* Doctor & Clinic Selector */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
          <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider">
            🏥 Select Consulting Hospital / Doctor Clinic *
          </label>
          <select
            value={selectedClinicId}
            onChange={(e) => {
              setSelectedClinicId(e.target.value);
              const found = clinicsList.find((c) => c.id === e.target.value);
              if (found) setSelectedClinicName(found.name);
            }}
            className="w-full bg-white border border-emerald-300 rounded-xl p-3 text-sm font-semibold text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm"
            required
          >
            {clinicsList.map((clinic) => {
              const doc = doctorsList.find((d) => d.clinic_id === clinic.id);
              return (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name} — {doc?.name ? `Dr. ${doc.name}` : 'General OPD'}
                </option>
              );
            })}
          </select>
        </div>

        {/* Patient Demographic Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ayush Kumar"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Age (Years) *
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 25"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
              min="1"
              max="120"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Sex / Gender *
            </label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Mobile Number / WhatsApp *
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9876543210"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            required
          />
        </div>

        {/* Multi-Voice Note Recording Section */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            🎙️ Record Voice Notes / Audio Grievance (Optional)
          </label>
          <WebVoiceRecorder onAudioRecorded={handleAddAudioBlob} />

          {recordedAudioBlobs.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-600 block">
                Attached Voice Clips ({recordedAudioBlobs.length}):
              </span>
              <div className="space-y-2">
                {recordedAudioBlobs.map((blob, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-purple-50 border border-purple-200 p-2.5 rounded-xl text-xs">
                    <span className="font-bold text-purple-900">
                      🎙️ Audio Clip #{idx + 1} ({(blob.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAudioBlob(idx)}
                      className="text-red-600 hover:text-red-800 font-bold px-2 py-1 rounded bg-white border border-red-200"
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Text Description Box */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            📝 Describe Symptoms & Medical Issues *
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={4}
            placeholder="Describe your health problem, symptom duration, severity, and any questions you have for the doctor..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-base py-3.5 rounded-xl shadow transition active:scale-[0.99]"
        >
          {isSubmitting ? 'Submitting to Doctor...' : 'Submit Consultation Request →'}
        </button>
      </form>
    </div>
  );
}
