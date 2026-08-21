'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PatientAppointmentsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingMsg, setBookingMsg] = useState('');
  const [bookingErr, setBookingErr] = useState('');

  // 1. Fetch patient's past doctors and my appointments
  useEffect(() => {
    async function loadInitialData() {
      try {
        const convRes = await fetch('/api/messaging/conversations');
        const convData = await convRes.json();
        if (convRes.ok && convData.conversations) {
          const docList = convData.conversations.map((c: any) => c.doctors).filter(Boolean);
          setDoctors(docList);
          if (docList.length > 0) setSelectedDoctorId(docList[0].id);
        }
      } catch (e) {
        console.warn('Load doctors notice:', e);
      }
    }
    loadInitialData();
  }, []);

  // 2. Fetch open slots when doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !selectedDate) return;

    async function fetchSlots() {
      setIsLoadingSlots(true);
      setSlots([]);
      setSelectedSlot('');
      try {
        const res = await fetch(`/api/appointments/slots?doctor_id=${selectedDoctorId}&date=${selectedDate}`);
        const data = await res.json();
        if (res.ok && data.slots) {
          setSlots(data.slots);
        }
      } catch (e) {
        console.error('Error fetching slots:', e);
      } finally {
        setIsLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [selectedDoctorId, selectedDate]);

  // Handle booking appointment
  async function handleBookAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoctorId || !selectedSlot) return;

    setIsBooking(true);
    setBookingMsg('');
    setBookingErr('');

    try {
      const res = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: selectedDoctorId,
          patient_id: 'me',
          scheduled_at: selectedSlot,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book appointment.');

      setBookingMsg('Appointment successfully booked!');
      setMyAppointments((prev) => [data.appointment, ...prev]);
      setSelectedSlot('');
      setNotes('');
    } catch (err: any) {
      setBookingErr(err.message || 'Error booking appointment.');
    } finally {
      setIsBooking(false);
    }
  }

  // Handle cancelling appointment
  async function handleCancelAppointment(id: string) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      const res = await fetch('/api/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: id }),
      });

      if (!res.ok) throw new Error('Failed to cancel appointment.');
      setMyAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a))
      );
    } catch (err: any) {
      alert(err.message || 'Error cancelling appointment.');
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
            <h1 className="text-xl font-extrabold text-white">📅 Book Tele-Consultation Appointment</h1>
          </div>
          <span className="text-xs bg-[var(--color-blue)] text-white px-3 py-1 rounded-full font-bold">
            Realtime Slot Scheduler
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        {/* Booking Form Card */}
        <div className="card-surface p-6 shadow-sm border-2 border-[var(--color-navy)] space-y-6">
          <div className="border-b border-[var(--color-border)] pb-3">
            <h2 className="text-lg font-extrabold text-[var(--color-navy)]">
              Schedule Appointment with Your Empaneled RMP Doctor
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Select an empaneled doctor and available time slot. Double-booking is strictly prevented by unique constraints.
            </p>
          </div>

          {bookingMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs font-bold">
              {bookingMsg}
            </div>
          )}

          {bookingErr && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs font-bold">
              {bookingErr}
            </div>
          )}

          <form onSubmit={handleBookAppointment} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                  Select Doctor *
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3 text-xs font-bold focus:outline-none focus:border-[var(--color-blue)]"
                >
                  {doctors.length === 0 ? (
                    <option value="">No empaneled doctors available</option>
                  ) : (
                    doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        👨‍⚕️ Dr. {d.name} ({d.qualifications || 'MBBS'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                  Select Date *
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3 text-xs font-data font-bold focus:outline-none focus:border-[var(--color-blue)]"
                />
              </div>
            </div>

            {/* Slots Picker */}
            <div>
              <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-2">
                Available Consultation Slots ({slots.length} Open) *
              </label>

              {isLoadingSlots ? (
                <p className="text-xs text-[var(--color-ink-muted)] italic py-3">Computing open slot availability...</p>
              ) : slots.length === 0 ? (
                <p className="text-xs text-[var(--color-ink-muted)] italic bg-[var(--color-cream)] p-4 rounded-xl border border-[var(--color-border)]">
                  No open slots available on this date for the selected doctor. Please select another date.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    const timeLabel = new Date(slot).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2.5 rounded-xl text-xs font-data font-bold transition flex items-center justify-center ${
                          isSelected
                            ? 'bg-[var(--color-navy)] text-white shadow-md scale-105'
                            : 'bg-white border border-[var(--color-border)] text-[var(--color-navy)] hover:bg-[var(--color-blue-soft)]'
                        }`}
                      >
                        🕒 {timeLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                Consultation Reason / Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Follow-up consultation for fever and throat check..."
                className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3 text-xs focus:outline-none focus:border-[var(--color-blue)]"
              />
            </div>

            <button
              type="submit"
              disabled={isBooking || !selectedSlot}
              className="btn-primary w-full py-3 text-xs font-bold disabled:opacity-50"
            >
              {isBooking ? 'Booking Slot...' : 'Confirm & Book Tele-Consultation Appointment →'}
            </button>
          </form>
        </div>

        {/* My Appointments Feed */}
        <div className="card-surface p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[var(--color-navy)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2">
            My Appointments Record ({myAppointments.length})
          </h3>

          {myAppointments.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-muted)] italic text-center py-4">
              No appointments booked yet. Select a doctor and time slot above to schedule your consultation.
            </p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {myAppointments.map((appt) => (
                <div key={appt.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--color-blue-soft)] text-[var(--color-navy)] mb-1 inline-block">
                      🕒 {new Date(appt.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <p className="text-xs font-bold text-[var(--color-navy)]">
                      Tele-Consultation ({appt.duration_minutes || 15} mins)
                    </p>
                  </div>
                  {appt.status === 'booked' && (
                    <button
                      onClick={() => handleCancelAppointment(appt.id)}
                      className="text-xs text-red-600 hover:text-red-800 font-bold px-2.5 py-1 hover:bg-red-50 rounded transition border border-red-200"
                    >
                      Cancel Appointment
                    </button>
                  )}
                  {appt.status === 'cancelled' && (
                    <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold uppercase">
                      Cancelled
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
