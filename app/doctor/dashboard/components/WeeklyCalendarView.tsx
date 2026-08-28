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
  // Generate current week dates (Monday through Sunday)
  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon
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

  // Group appointments by date string (YYYY-MM-DD)
  const apptsByDate: Record<string, Appointment[]> = {};
  (appointments || []).forEach((a) => {
    if (!a.scheduled_at) return;
    const dateKey = new Date(a.scheduled_at).toISOString().split('T')[0];
    if (!apptsByDate[dateKey]) apptsByDate[dateKey] = [];
    apptsByDate[dateKey].push(a);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-[var(--color-navy)]">
          🗓️ Weekly OPD Appointment Grid
        </h3>
        <span className="text-[10px] font-bold uppercase bg-blue-100 text-[var(--color-navy)] px-2.5 py-0.5 rounded">
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
              className={`p-3 rounded-2xl border transition space-y-2 min-h-[140px] flex flex-col justify-between ${
                isToday
                  ? 'bg-blue-50/50 border-blue-400 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-[11px] font-extrabold text-slate-700">
                    {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      isToday ? 'bg-[var(--color-navy)] text-white px-1.5 py-0.5 rounded-full' : 'text-slate-500'
                    }`}
                  >
                    {dateObj.getDate()}
                  </span>
                </div>

                <div className="mt-2 space-y-1.5">
                  {dailyAppts.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No bookings</p>
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
                          className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] space-y-0.5"
                        >
                          <span className="font-bold block font-mono">{timeStr}</span>
                          <span className="font-semibold block line-clamp-1">{pName}{rel}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {dailyAppts.length > 0 && (
                <span className="text-[9px] font-bold text-slate-500 block text-right">
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
