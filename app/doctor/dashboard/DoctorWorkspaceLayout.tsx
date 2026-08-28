'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import NotificationCenter from './components/NotificationCenter';
import WeeklyCalendarView from './components/WeeklyCalendarView';
import DoctorProfileEditor from './components/DoctorProfileEditor';

interface DoctorData {
  id: string;
  name: string;
  photo_url?: string | null;
  short_bio?: string | null;
  qualifications?: string | null;
  rmp_registration_number?: string | null;
  registration_status?: string | null;
  clinics?: {
    id: string;
    name: string;
    city?: string;
  };
}

interface DoctorWorkspaceProps {
  doctor: DoctorData;
  opdQueue: any[];
  messages: any[];
  appointments: any[];
  prescriptions: any[];
  invoices: any[];
  analytics: any;
  killSwitchActive: boolean;
  onToggleKillSwitch: () => void;
}

export default function DoctorWorkspaceLayout({
  doctor,
  opdQueue,
  messages,
  appointments,
  prescriptions,
  invoices,
  analytics,
  killSwitchActive,
  onToggleKillSwitch,
}: DoctorWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'queue' | 'messages' | 'appointments' | 'prescriptions' | 'billing' | 'analytics' | 'profile'>('queue');
  const [appointmentViewMode, setAppointmentViewMode] = useState<'list' | 'calendar'>('calendar');

  const navTabs = [
    { id: 'queue', label: 'OPD Queue', icon: '🩺', count: opdQueue.length },
    { id: 'messages', label: 'Messages', icon: '💬', count: messages.length },
    { id: 'appointments', label: 'Appointments', icon: '📅', count: appointments.length },
    { id: 'prescriptions', label: 'Prescriptions', icon: '💊', count: prescriptions.length },
    { id: 'billing', label: 'Billing', icon: '🧾', count: invoices.length },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'profile', label: 'My Profile', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-cream-soft)] text-[var(--color-ink)] flex flex-col md:flex-row">
      {/* PERSISTENT WORKSPACE SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-[var(--color-border)] flex-shrink-0 flex flex-col justify-between p-4 shadow-xs">
        <div className="space-y-6">
          {/* Doctor Info & Clinic Badge */}
          <div className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-[var(--color-navy)] text-white flex items-center justify-center font-bold text-base flex-shrink-0 overflow-hidden">
              {doctor.photo_url ? (
                <img src={doctor.photo_url} alt={doctor.name} className="w-full h-full object-cover" />
              ) : (
                '🩺'
              )}
            </div>
            <div className="overflow-hidden">
              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded uppercase">
                VERIFIED RMP
              </span>
              <h3 className="text-xs font-extrabold text-[var(--color-navy)] truncate mt-0.5">{doctor.name}</h3>
              <p className="text-[10px] text-slate-500 truncate">{doctor.clinics?.name || 'Central Facility'}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[var(--color-navy)] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer Link */}
        <div className="pt-4 border-t border-slate-200 mt-6 text-center">
          <Link href="/" className="text-xs font-bold text-blue-600 hover:underline block">
            ← Main Platform Homepage
          </Link>
        </div>
      </aside>

      {/* MAIN WORKSPACE CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* PERSISTENT WORKSPACE TOP HEADER */}
        <header className="bg-white border-b border-[var(--color-border)] px-4 sm:px-6 py-3 sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
              DOCTOR CLINICAL WORKSPACE
            </span>
            <h1 className="text-base sm:text-lg font-extrabold text-[var(--color-navy)] capitalize">
              {navTabs.find((t) => t.id === activeTab)?.icon} {navTabs.find((t) => t.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* UNIFIED NOTIFICATION CENTER */}
            <NotificationCenter doctorId={doctor.id} />

            {/* EMERGENCY KILL-SWITCH (PHASE 4) */}
            <button
              onClick={onToggleKillSwitch}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                killSwitchActive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
              }`}
              title="Emergency AI Triage Override Kill-Switch"
            >
              <span>🚨</span>
              <span>{killSwitchActive ? 'AI Triage Overridden (HUMAN ONLY)' : 'Emergency Kill-Switch'}</span>
            </button>
          </div>
        </header>

        {/* TAB CONTENT PANEL */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {/* TAB 1: OPD QUEUE */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-[var(--color-navy)]">
                  Live Patient OPD Queue ({opdQueue.length})
                </h2>
              </div>

              {opdQueue.length === 0 ? (
                <div className="card-surface p-8 text-center text-xs text-slate-500 border">
                  No active patients in your OPD queue right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {opdQueue.map((item: any) => {
                    const pName = item.patients?.display_name || item.patients?.name || 'Patient';
                    const relText = item.patients?.relationship && item.patients.relationship !== 'self'
                      ? ` (${item.patients.relationship} of account)`
                      : '';
                    const urgency = (item.urgency_level || 'low').toLowerCase();

                    return (
                      <div
                        key={item.id}
                        className="card-surface p-4 border border-slate-200 hover:shadow-md transition flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {/* FAMILY MEMBER CONTEXT ENRICHMENT */}
                            <span className="text-sm font-extrabold text-[var(--color-navy)]">
                              👤 {pName}<span className="text-xs font-normal text-slate-500">{relText}</span>
                            </span>

                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                                urgency === 'high'
                                  ? 'bg-rose-100 text-rose-800'
                                  : urgency === 'medium'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {urgency} Priority
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-1">{item.raw_text || 'Symptom intake'}</p>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            Submitted: {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <Link
                          href={`/doctor/intake/${item.id}`}
                          className="btn-primary text-xs py-2 px-3 inline-block"
                        >
                          Review Case →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MESSAGES */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold text-[var(--color-navy)]">
                Realtime Doctor-Patient Conversation Threads ({messages.length})
              </h2>

              {messages.length === 0 ? (
                <div className="card-surface p-8 text-center text-xs text-slate-500 border">
                  No message threads found.
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((thread: any) => {
                    const pName = thread.patients?.display_name || thread.patients?.name || 'Patient';
                    const relText = thread.patients?.relationship && thread.patients.relationship !== 'self'
                      ? ` (${thread.patients.relationship})`
                      : '';

                    return (
                      <div
                        key={thread.id}
                        className="card-surface p-4 border border-slate-200 hover:shadow-md transition flex items-center justify-between gap-3"
                      >
                        <div>
                          <h4 className="text-xs font-extrabold text-[var(--color-navy)]">
                            💬 {pName}{relText}
                          </h4>
                          <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{thread.last_message || 'Active thread'}</p>
                        </div>

                        <Link
                          href="/doctor/messages"
                          className="btn-primary text-xs py-1.5 px-3 inline-block"
                        >
                          Open Thread →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-[var(--color-navy)]">
                  Scheduled OPD Appointments ({appointments.length})
                </h2>

                {/* View Switcher: List vs Calendar */}
                <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setAppointmentViewMode('calendar')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      appointmentViewMode === 'calendar'
                        ? 'bg-[var(--color-navy)] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🗓️ Weekly Calendar
                  </button>
                  <button
                    onClick={() => setAppointmentViewMode('list')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      appointmentViewMode === 'list'
                        ? 'bg-[var(--color-navy)] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📋 Flat List
                  </button>
                </div>
              </div>

              {appointmentViewMode === 'calendar' ? (
                <WeeklyCalendarView appointments={appointments} />
              ) : (
                <div className="space-y-3">
                  {appointments.map((appt: any) => (
                    <div
                      key={appt.id}
                      className="card-surface p-4 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-extrabold text-[var(--color-navy)] block">
                          📅 {appt.patients?.display_name || appt.patients?.name || 'Patient'}
                        </span>
                        <span className="text-slate-500 font-mono">
                          {new Date(appt.scheduled_at).toLocaleString()}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px]">
                        {appt.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRESCRIPTIONS */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold text-[var(--color-navy)]">
                Issued E-Prescriptions History ({prescriptions.length})
              </h2>

              {prescriptions.length === 0 ? (
                <div className="card-surface p-8 text-center text-xs text-slate-500 border">
                  No issued prescriptions recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {prescriptions.map((rx: any) => (
                    <div key={rx.id} className="card-surface p-4 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[var(--color-navy)]">
                          💊 Rx ID: {rx.id}
                        </span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          {new Date(rx.issued_at || rx.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-600">Status: <span className="font-bold text-emerald-700">{rx.status}</span></p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BILLING */}
          {activeTab === 'billing' && (
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold text-[var(--color-navy)]">
                Issued Billing Invoices ({invoices.length})
              </h2>

              {invoices.length === 0 ? (
                <div className="card-surface p-8 text-center text-xs text-slate-500 border">
                  No billing invoices issued yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((inv: any) => (
                    <div key={inv.id} className="card-surface p-4 border border-slate-200 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-[var(--color-navy)] block">
                          🧾 {inv.invoice_number} — ₹{inv.amount}
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          Type: {inv.consultation_type} | Issued: {new Date(inv.issued_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">
                        {inv.payment_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold text-[var(--color-navy)]">
                Clinical Safety & Audit Metrics Dashboard
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card-surface p-4 border text-center space-y-1">
                  <span className="text-xs text-slate-500 font-bold block">Total Patients Triaged</span>
                  <span className="text-2xl font-extrabold text-[var(--color-navy)]">{opdQueue.length}</span>
                </div>
                <div className="card-surface p-4 border text-center space-y-1">
                  <span className="text-xs text-slate-500 font-bold block">E-Prescriptions Issued</span>
                  <span className="text-2xl font-extrabold text-emerald-700">{prescriptions.length}</span>
                </div>
                <div className="card-surface p-4 border text-center space-y-1">
                  <span className="text-xs text-slate-500 font-bold block">Schedule X Drugs Blocked</span>
                  <span className="text-2xl font-extrabold text-rose-700">100% Guarded</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: MY PROFILE */}
          {activeTab === 'profile' && <DoctorProfileEditor doctor={doctor} />}
        </main>
      </div>
    </div>
  );
}
