'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function PatientRemindersPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [diets, setDiets] = useState<any[]>([]);
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(Notification.permission as any);
    }
  }, []);

  useEffect(() => {
    async function loadRemindersData() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: pat } = await supabase
          .from('patients')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (!pat) return;

        // Fetch Reminders
        const { data: remData } = await supabase
          .from('reminders')
          .select('*')
          .eq('patient_id', pat.id)
          .order('scheduled_for', { ascending: true });

        setReminders(remData || []);

        // Fetch Doctor Diet Recommendations
        const { data: dietData } = await supabase
          .from('diet_recommendations')
          .select('*, doctors(name)')
          .eq('patient_id', pat.id)
          .order('created_at', { ascending: false });

        setDiets(dietData || []);
      } catch (err) {
        console.error('Error loading reminders:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRemindersData();
  }, [supabase]);

  // Handle enabling Web Push Notifications
  async function handleEnablePush() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Browser notifications are not supported on this device.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission === 'granted') {
        alert('🔔 Browser notifications enabled! You will receive timely dosage & appointment reminders.');
      }
    } catch (e: any) {
      alert('Could not enable notifications: ' + e.message);
    }
  }

  // Handle dismissing a reminder
  async function handleDismiss(id: string) {
    try {
      await supabase.from('reminders').update({ status: 'dismissed' }).eq('id', id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.warn('Dismiss error:', e);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] pb-12">
      <header className="bg-[var(--color-navy)] text-white py-5 px-4 shadow-md border-b border-[var(--color-border-on-navy)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/patient/dashboard"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-white/20 transition"
            >
              ← Back to Patient Dashboard
            </Link>
            <h1 className="text-xl font-extrabold text-white">🔔 Medication & Care Reminders</h1>
          </div>
          <span className="text-xs bg-amber-500 text-slate-950 px-3 py-1 rounded-full font-bold">
            Free Web Push & In-App Feed
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        {/* Push Notification Permission Card */}
        <div className="card-surface p-6 shadow-sm border-2 border-amber-300 bg-amber-50/30 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <h2 className="text-base font-extrabold text-[var(--color-navy)] flex items-center gap-2">
              <span>🔔 Web Push Notifications</span>
              {pushStatus === 'granted' && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase">
                  Enabled
                </span>
              )}
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Enable browser push notifications to receive medication alarms and appointment alerts directly on your device. (Optional — in-app reminders are always displayed below).
            </p>
          </div>

          {pushStatus !== 'granted' ? (
            <button
              onClick={handleEnablePush}
              className="btn-primary text-xs py-2.5 px-5 shrink-0"
            >
              🔔 Enable Browser Push Notifications
            </button>
          ) : (
            <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
              ✓ Device Subscribed
            </span>
          )}
        </div>

        {/* Doctor-Authored Clinical Diet Notes */}
        {diets.length > 0 && (
          <div className="card-surface p-6 shadow-sm space-y-3 border-2 border-emerald-200">
            <h3 className="text-sm font-bold text-[var(--color-navy)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2 flex items-center gap-2">
              <span>🥗 Doctor Clinical Diet & Lifestyle Guidance</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold">
                Doctor-Authored
              </span>
            </h3>

            <div className="divide-y divide-[var(--color-border)]">
              {diets.map((d) => (
                <div key={d.id} className="py-2.5 space-y-1">
                  <span className="text-[11px] font-bold text-[var(--color-navy)] block">
                    👨‍⚕️ Dr. {d.doctors?.name || 'Practitioner'}:
                  </span>
                  <p className="text-xs text-[var(--color-ink)] italic bg-[var(--color-cream)] p-3 rounded-xl border border-[var(--color-border)]">
                    &quot;{d.content}&quot;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reminders Feed */}
        <div className="card-surface p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[var(--color-navy)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2">
            Scheduled Medication & Appointment Alarms ({reminders.length})
          </h3>

          {isLoading ? (
            <p className="text-xs text-[var(--color-ink-muted)] italic text-center py-8">Loading scheduled reminders...</p>
          ) : reminders.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-muted)] italic text-center py-8">
              No active scheduled reminders. Reminders are generated automatically when prescriptions are issued or appointments are booked.
            </p>
          ) : (
            <div className="space-y-3">
              {reminders.map((r) => {
                const isMed = r.type === 'medicine';
                const isAppt = r.type === 'appointment';

                return (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-[var(--color-border)] bg-white flex flex-wrap items-center justify-between gap-4 shadow-sm hover:border-[var(--color-blue)]"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">{isMed ? '💊' : isAppt ? '📅' : '🥗'}</span>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--color-blue-soft)] text-[var(--color-navy)]">
                            {r.type}
                          </span>
                          <span className="text-[11px] font-data text-[var(--color-ink-muted)]">
                            🕒 {new Date(r.scheduled_for).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[var(--color-navy)]">{r.message}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDismiss(r.id)}
                      className="text-xs text-[var(--color-ink-muted)] hover:text-black font-bold px-3 py-1.5 hover:bg-slate-100 rounded-lg transition"
                    >
                      Dismiss
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
