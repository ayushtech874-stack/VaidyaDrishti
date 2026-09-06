'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface PatientDashboardClientViewProps {
  patient: any;
  initialIntakes: any[];
  initialMedicalHistory: any[];
  initialDocuments: any[];
}

export default function PatientDashboardClientView({
  patient: initialPatient,
  initialIntakes,
  initialMedicalHistory,
  initialDocuments,
}: PatientDashboardClientViewProps) {
  const [patient, setPatient] = useState<any>(initialPatient);
  const [activeTab, setActiveTab] = useState<'visits' | 'profile' | 'history' | 'documents'>('visits');
  const [intakes] = useState<any[]>(initialIntakes);
  const [historyList, setHistoryList] = useState<any[]>(initialMedicalHistory);
  const [documentsList, setDocumentsList] = useState<any[]>(initialDocuments);

  // Profile Edit State
  const [editName, setEditName] = useState(patient.name || '');
  const [editAge, setEditAge] = useState(patient.age ? String(patient.age) : '');
  const [editGender, setEditGender] = useState(patient.gender || 'Male');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Medical History Form State
  const [historyFieldType, setHistoryFieldType] = useState('chronic_condition');
  const [historyValue, setHistoryValue] = useState('');
  const [isAddingHistory, setIsAddingHistory] = useState(false);

  // Document Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadErr, setUploadErr] = useState('');

  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/patient/login');
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMsg('');

    try {
      const res = await fetch('/api/patient/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          age: editAge,
          gender: editGender,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile.');

      setPatient(data.patient);
      setProfileMsg('Profile updated successfully!');
    } catch (err: any) {
      setProfileMsg(err.message || 'Error updating profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  }

  async function handleAddHistory(e: React.FormEvent) {
    e.preventDefault();
    if (!historyValue.trim()) return;

    setIsAddingHistory(true);

    try {
      const res = await fetch('/api/patient/medical-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          field_type: historyFieldType,
          value: historyValue,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add entry.');

      setHistoryList((prev) => [data.entry, ...prev]);
      setHistoryValue('');
    } catch (err: any) {
      alert(err.message || 'Error adding medical history.');
    } finally {
      setIsAddingHistory(false);
    }
  }

  async function handleDeleteHistory(id: string) {
    try {
      const res = await fetch('/api/patient/medical-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });

      if (!res.ok) throw new Error('Failed to delete entry.');
      setHistoryList((prev) => prev.filter((h) => h.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error deleting entry.');
    }
  }

  async function handleUploadDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploadingDoc(true);
    setUploadMsg('');
    setUploadErr('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await fetch('/api/patient/upload-document', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');

      setDocumentsList((prev) => [data.document, ...prev]);
      setUploadMsg('Document uploaded securely!');
      setUploadFile(null);
    } catch (err: any) {
      setUploadErr(err.message || 'Error uploading document.');
    } finally {
      setIsUploadingDoc(false);
    }
  }

  async function handleDeleteDocument(docId: string) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const res = await fetch('/api/patient/upload-document', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: docId }),
      });

      if (!res.ok) throw new Error('Failed to delete document.');
      setDocumentsList((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      alert(err.message || 'Error deleting document.');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] pb-12 font-sans">
      {/* Top Navigation Header */}
      <header className="bg-[var(--color-teal-deep)] text-white py-5 px-4 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📱</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-white">
                My Patient Medical Dashboard
              </h1>
              <p className="text-xs text-[var(--color-teal-soft)]">
                Welcome back, <strong className="text-white">{patient.name || 'Patient'}</strong> ({patient.phone})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <Link
              href="/patient/dashboard/new-consultation"
              className="btn-primary text-xs py-2 px-3.5 shadow-md flex items-center gap-1.5"
            >
              ➕ Start Consultation
            </Link>
            <Link
              href="/patient/dashboard/timeline"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-full transition flex items-center gap-1.5"
            >
              📜 Timeline
            </Link>
            <Link
              href="/patient/dashboard/reminders"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-full transition flex items-center gap-1.5"
            >
              🔔 Reminders
            </Link>
            <Link
              href="/patient/dashboard/appointments"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-full transition flex items-center gap-1.5"
            >
              📅 Appointments
            </Link>
            <Link
              href="/patient/dashboard/prescriptions"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-full transition flex items-center gap-1.5"
            >
              💊 E-Prescriptions
            </Link>
            <Link
              href="/patient/dashboard/messages"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-full transition flex items-center gap-1.5"
            >
              💬 Doctor Messages
            </Link>
            <button
              onClick={handleSignOut}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-full border border-white/20 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        {/* Navigation Tabs */}
        <div className="card-surface p-2 shadow-sm flex flex-wrap items-center gap-2 rounded-[var(--radius-full)]">
          <button
            onClick={() => setActiveTab('visits')}
            className={`flex-1 min-w-[140px] py-3 rounded-full text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'visits'
                ? 'bg-[var(--color-violet)] text-white shadow'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-teal-soft)]'
            }`}
          >
            <span>📋 My Visits ({intakes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-w-[140px] py-3 rounded-full text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-[var(--color-violet)] text-white shadow'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-teal-soft)]'
            }`}
          >
            <span>👤 My Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 min-w-[140px] py-3 rounded-full text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-[var(--color-violet)] text-white shadow'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-teal-soft)]'
            }`}
          >
            <span>🩺 Medical History ({historyList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 min-w-[140px] py-3 rounded-full text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'documents'
                ? 'bg-[var(--color-violet)] text-white shadow'
                : 'text-[var(--color-ink)] hover:bg-[var(--color-teal-soft)]'
            }`}
          >
            <span>📁 My Documents ({documentsList.length})</span>
          </button>
        </div>

        {/* TAB 1: MY VISITS */}
        {activeTab === 'visits' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-extrabold text-[var(--color-ink)]">
                Past Consultation & OPD Intakes ({intakes.length})
              </h2>
              <span className="text-xs text-[var(--color-ink-muted)]">Read-only patient record view</span>
            </div>

            {intakes.length === 0 ? (
              <div className="card-surface p-12 text-center space-y-3">
                <span className="text-4xl">📋</span>
                <h3 className="text-base font-heading font-extrabold text-[var(--color-ink)]">No Past Visits Found</h3>
                <p className="text-xs text-[var(--color-ink-muted)] max-w-md mx-auto">
                  You have not submitted any symptoms or OPD intakes yet.
                </p>
                <Link href="/patient/intake" className="btn-primary inline-block text-xs py-2.5 px-5">
                  Submit Symptom Intake Now
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {intakes.map((item) => {
                  const symptoms = item.structured_data?.primary_symptoms || [];
                  const urgency = (item.urgency_level || 'low').toLowerCase();

                  return (
                    <div key={item.id} className="card-surface p-5 shadow-sm space-y-3 hover:border-[var(--color-violet)]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-data text-[var(--color-ink-muted)] block">
                            📅 {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <h3 className="text-base font-heading font-extrabold text-[var(--color-ink)] mt-0.5">
                            {item.clinics?.name || 'OPD Medical Center'}
                          </h3>
                          <p className="text-xs text-[var(--color-ink-muted)] font-medium">
                            👨‍⚕️ {item.doctors?.name ? `Dr. ${item.doctors.name}` : 'Empaneled RMP Doctor'}
                          </p>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0 ${
                            urgency === 'high'
                              ? 'badge-high'
                              : urgency === 'medium'
                              ? 'badge-medium'
                              : 'badge-low'
                          }`}
                        >
                          {urgency} Urgency
                        </span>
                      </div>

                      <div className="bg-[var(--color-cream)] p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] space-y-1">
                        <span className="text-[11px] font-bold text-[var(--color-ink)] uppercase tracking-wider block">
                          Reported Symptoms Summary:
                        </span>
                        <p className="text-xs text-[var(--color-ink)] italic line-clamp-3">
                          &quot;{item.raw_text || 'Voice intake submitted'}&quot;
                        </p>
                        {symptoms.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {symptoms.map((s: string, i: number) => (
                              <span key={i} className="bg-white border border-[var(--color-border)] text-[var(--color-ink)] text-[10px] font-bold px-2 py-0.5 rounded">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--color-border)]">
                        <span className="text-[var(--color-ink-muted)]">Status:</span>
                        <span className="font-bold text-[var(--color-violet)] uppercase text-[11px] bg-[var(--color-violet-soft)] px-2.5 py-0.5 rounded-full">
                          {item.status?.replace('_', ' ') || 'Pending Review'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY PROFILE */}
        {activeTab === 'profile' && (
          <div className="card-surface p-6 max-w-xl mx-auto shadow-sm space-y-6">
            <div className="border-b border-[var(--color-border)] pb-3">
              <h2 className="text-lg font-heading font-extrabold text-[var(--color-ink)]">My Patient Profile</h2>
              <p className="text-xs text-[var(--color-ink-muted)]">Update your verified personal demographics</p>
            </div>

            {profileMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-[var(--radius-md)] text-xs font-bold">
                {profileMsg}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-sm focus:outline-none focus:border-[var(--color-violet)] text-[var(--color-ink)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
                    Age (Years) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-sm focus:outline-none focus:border-[var(--color-violet)] text-[var(--color-ink)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
                    Sex / Gender *
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-sm focus:outline-none focus:border-[var(--color-violet)] text-[var(--color-ink)]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
                  Verified Mobile Phone (Read-Only)
                </label>
                <input
                  type="text"
                  disabled
                  value={patient.phone}
                  className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-sm font-data text-[var(--color-ink-muted)] cursor-not-allowed opacity-75"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="btn-primary w-full py-3 text-xs font-bold"
              >
                {isUpdatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: MEDICAL HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="card-surface p-6 shadow-sm space-y-4 border-2 border-[var(--color-violet)]/30 bg-[var(--color-violet-soft)]/20">
              <div className="flex items-center gap-3 text-[var(--color-ink)]">
                <span className="text-3xl">🩺</span>
                <div>
                  <h2 className="text-lg font-heading font-extrabold">Self-Reported Medical History</h2>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    Add known allergies, chronic conditions, current medications, or past surgeries.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddHistory} className="flex flex-wrap items-end gap-3 pt-2">
                <div className="min-w-[180px]">
                  <label className="block text-[11px] font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
                    Category Type *
                  </label>
                  <select
                    value={historyFieldType}
                    onChange={(e) => setHistoryFieldType(e.target.value)}
                    className="w-full bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-2.5 text-xs font-bold focus:outline-none focus:border-[var(--color-violet)]"
                  >
                    <option value="chronic_condition">🩸 Chronic Condition (Diabetes, BP, Asthma)</option>
                    <option value="allergy">⚠️ Known Allergy (Penicillin, Food, Dust)</option>
                    <option value="current_medication">💊 Current Prescription Medication</option>
                    <option value="past_surgery">🏥 Past Surgery / Major Diagnosis</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[240px]">
                  <label className="block text-[11px] font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
                    Details / Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={historyValue}
                    onChange={(e) => setHistoryValue(e.target.value)}
                    placeholder="e.g. Type 2 Diabetes for 5 years..."
                    className="w-full bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-2.5 text-xs focus:outline-none focus:border-[var(--color-violet)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAddingHistory}
                  className="btn-primary text-xs py-2.5 px-4 shrink-0"
                >
                  {isAddingHistory ? 'Adding...' : '➕ Add Entry'}
                </button>
              </form>
            </div>

            <div className="card-surface p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-heading font-extrabold text-[var(--color-ink)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2">
                My Medical History Records ({historyList.length})
              </h3>

              {historyList.length === 0 ? (
                <p className="text-xs text-[var(--color-ink-muted)] italic text-center py-4">
                  No medical history records added yet.
                </p>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {historyList.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[var(--color-violet-soft)] text-[var(--color-violet)] mb-1 inline-block">
                          {item.field_type?.replace('_', ' ')}
                        </span>
                        <p className="text-sm font-bold text-[var(--color-ink)]">{item.value}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteHistory(item.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1 hover:bg-red-50 rounded transition cursor-pointer"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MY DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="card-surface p-6 shadow-sm space-y-4 border-2 border-[var(--color-teal-deep)]/30 bg-[var(--color-teal-soft)]/20">
              <div className="flex items-center gap-3 text-[var(--color-ink)]">
                <span className="text-3xl">📁</span>
                <div>
                  <h2 className="text-lg font-heading font-extrabold">Upload Past Medical Reports & Prescriptions</h2>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    Upload past lab reports, scan results, or prescriptions (PDF, JPG, PNG — max 10MB per file). Stored securely.
                  </p>
                </div>
              </div>

              {uploadMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-[var(--radius-md)] text-xs font-bold">
                  {uploadMsg}
                </div>
              )}

              {uploadErr && (
                <div className="bg-[var(--color-urgent-high-bg)] border border-[var(--color-urgent-high)] text-[var(--color-urgent-high)] p-3 rounded-[var(--radius-md)] text-xs font-bold">
                  {uploadErr}
                </div>
              )}

              <form onSubmit={handleUploadDocument} className="flex flex-wrap items-center gap-3 pt-2">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="block text-xs text-[var(--color-ink-muted)] file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[var(--color-violet)] file:text-white hover:file:opacity-90"
                />

                <button
                  type="submit"
                  disabled={isUploadingDoc || !uploadFile}
                  className="btn-primary text-xs py-2.5 px-5 disabled:opacity-50"
                >
                  {isUploadingDoc ? 'Uploading File...' : '📤 Upload Selected Document'}
                </button>
              </form>
            </div>

            <div className="card-surface p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-heading font-extrabold text-[var(--color-ink)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2">
                Uploaded Records & Prescriptions ({documentsList.length})
              </h3>

              {documentsList.length === 0 ? (
                <p className="text-xs text-[var(--color-ink-muted)] italic text-center py-4">
                  No documents uploaded yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {documentsList.map((doc) => (
                    <div key={doc.id} className="card-surface p-4 space-y-2 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-[var(--color-violet)] uppercase font-data block">
                          📄 {doc.file_type?.includes('pdf') ? 'PDF Document' : 'Image File'}
                        </span>
                        <h4 className="text-xs font-bold text-[var(--color-ink)] truncate mt-1">
                          {doc.file_name}
                        </h4>
                        <span className="text-[10px] text-[var(--color-ink-muted)] block">
                          Uploaded: {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
                        <span className="text-[10px] bg-[var(--color-violet-soft)] text-[var(--color-violet)] px-2 py-0.5 rounded-full font-bold">
                          🔒 Private Storage
                        </span>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-xs text-red-600 hover:text-red-800 font-bold"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
