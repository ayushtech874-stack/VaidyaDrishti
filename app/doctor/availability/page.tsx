'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function DoctorAvailabilityPage() {
  const [schedule, setSchedule] = useState<any[]>(
    DAYS.map((day, idx) => ({
      day_of_week: idx,
      day_name: day,
      start_time: '09:00',
      end_time: '17:00',
      slot_duration_minutes: 15,
      is_active: idx >= 1 && idx <= 5, // Mon-Fri active by default
    }))
  );

  const [appointments, setAppointments] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/appointments/availability?doctor_id=me');
        const data = await res.json();
        if (res.ok && data.availability?.length > 0) {
          setSchedule((prev) =>
            prev.map((item) => {
              const match = data.availability.find((a: any) => a.day_of_week === item.day_of_week);
              return match ? { ...item, ...match } : item;
            })
          );
        }
      } catch (e) {
        console.warn('Load availability notice:', e);
      }
    }
    loadData();
  }, []);

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMsg('');

    try {
      const res = await fetch('/api/appointments/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability_schedule: schedule }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save schedule.');

      setMsg('Recurring weekly availability successfully saved!');
    } catch (err: any) {
      setMsg(err.message || 'Error saving availability.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleScheduleChange(dayIndex: number, field: string, value: any) {
    setSchedule((prev) => {
      const updated = [...prev];
      updated[dayIndex] = { ...updated[dayIndex], [field]: value };
      return updated;
    });
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] pb-12">
      <header className="bg-[var(--color-navy)] text-white py-4 px-6 shadow-md border-b border-[var(--color-border-on-navy)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/doctor/dashboard"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-white/20 transition"
            >
              ← Back to OPD Queue
            </Link>
            <h1 className="text-xl font-extrabold text-white">📅 Doctor Recurring Weekly Availability & Slots</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <div className="card-surface p-6 shadow-sm space-y-6">
          <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[var(--color-navy)]">
                Set Weekly OPD Consultation Schedule
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Configure your active days, operating hours, and consultation slot duration
              </p>
            </div>

            <button
              onClick={handleSaveSchedule}
              disabled={isSaving}
              className="btn-primary text-xs py-2.5 px-5 font-bold"
            >
              {isSaving ? 'Saving Schedule...' : 'Save Weekly Schedule'}
            </button>
          </div>

          {msg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs font-bold">
              {msg}
            </div>
          )}

          <div className="space-y-4">
            {schedule.map((day, idx) => (
              <div
                key={day.day_of_week}
                className={`p-4 rounded-xl border transition flex flex-wrap items-center justify-between gap-4 ${
                  day.is_active
                    ? 'bg-[var(--color-cream)] border-[var(--color-border)]'
                    : 'bg-slate-100/60 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-[140px]">
                  <input
                    type="checkbox"
                    checked={day.is_active}
                    onChange={(e) => handleScheduleChange(idx, 'is_active', e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--color-blue)] border-slate-300"
                  />
                  <span className="font-extrabold text-xs text-[var(--color-navy)] uppercase">
                    {day.day_name}
                  </span>
                </div>

                {day.is_active ? (
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase block mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={day.start_time}
                        onChange={(e) => handleScheduleChange(idx, 'start_time', e.target.value)}
                        className="bg-white border border-[var(--color-border)] rounded-lg p-2 font-data font-bold text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase block mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={day.end_time}
                        onChange={(e) => handleScheduleChange(idx, 'end_time', e.target.value)}
                        className="bg-white border border-[var(--color-border)] rounded-lg p-2 font-data font-bold text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[var(--color-ink-muted)] uppercase block mb-1">
                        Slot Duration
                      </label>
                      <select
                        value={day.slot_duration_minutes}
                        onChange={(e) => handleScheduleChange(idx, 'slot_duration_minutes', parseInt(e.target.value, 10))}
                        className="bg-white border border-[var(--color-border)] rounded-lg p-2 font-bold text-xs"
                      >
                        <option value={15}>15 Minutes</option>
                        <option value={20}>20 Minutes</option>
                        <option value={30}>30 Minutes</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-[var(--color-ink-muted)] italic">Inactive / Day Off</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
