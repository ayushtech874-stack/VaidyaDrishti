'use client';

import React from 'react';

interface Appointment {
  id: string;
  scheduled_at: string;
  duration_minutes?: number;
  status: string;
  notes?: string;
  patients?: {
    name?: string;
    display_name?: string;
    relationship?: string;
  };
}

export default function WeeklyCalendarView({ appointments }: { appointments: Appointment[] }) {
  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    const currentDay = today.getDay();
    const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMon);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const apptsByDate: Record<string, Appointment[]> = {};
  (appointments || []).forEach((a) => {
    if (!a.scheduled_at) return;
    const dateKey = new Date(a.scheduled_at).toISOString().split('T')[0];
    if (!apptsByDate[dateKey]) apptsByDate[dateKey] = [];
    apptsByDate[dateKey].push(a);
  });

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-heading font-extrabold text-[var(--color-ink)]">
          🗓️ Weekly OPD Appointment Grid
        </h3>
        <span className="text-[10px] font-bold uppercase bg-[var(--color-violet-soft)] text-[var(--color-violet)] px-2.5 py-0.5 rounded-full border border-[var(--color-violet)]/20">
          7-Day View
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
        {weekDates.map((dateObj) => {
          const dateStr = dateObj.toISOString().split('T')[0];
          const isToday = new Date().toISOString().split('T')[0] === dateStr;
          const dailyAppts = apptsByDate[dateStr] || [];

          return (
            <div
              key={dateStr}
              className={`p-3 rounded-[var(--radius-md)] border transition space-y-2 min-h-[140px] flex flex-col justify-between ${
                isToday
                  ? 'bg-[var(--color-violet-soft)]/30 border-[var(--color-violet)] shadow-xs'
                  : 'bg-[var(--color-white)] border-[var(--color-border)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-1">
                  <span className="text-[11px] font-extrabold text-[var(--color-ink)]">
                    {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span
                    className={`text-xs font-data font-bold ${
                      isToday ? 'bg-[var(--color-violet)] text-white px-2 py-0.5 rounded-full' : 'text-[var(--color-ink-muted)]'
                    }`}
                  >
                    {dateObj.getDate()}
                  </span>
                </div>

                <div className="mt-2 space-y-1.5">
                  {dailyAppts.length === 0 ? (
                    <p className="text-[10px] text-[var(--color-ink-muted)] italic">No bookings</p>
                  ) : (
                    dailyAppts.map((a) => {
                      const timeStr = new Date(a.scheduled_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const pName = a.patients?.display_name || a.patients?.name || 'Patient';
                      const rel = a.patients?.relationship && a.patients.relationship !== 'self' ? ` (${a.patients.relationship})` : '';

                      return (
                        <div
                          key={a.id}
                          className="p-1.5 rounded-[var(--radius-md)] bg-[var(--color-teal-soft)] border border-[var(--color-teal-deep)]/20 text-[var(--color-teal-deep)] text-[10px] space-y-0.5"
                        >
                          <span className="font-bold block font-data">{timeStr}</span>
                          <span className="font-semibold block line-clamp-1">{pName}{rel}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {dailyAppts.length > 0 && (
                <span className="text-[9px] font-bold text-[var(--color-ink-muted)] block text-right">
                  {dailyAppts.length} appt{dailyAppts.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
