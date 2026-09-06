'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface NotificationItem {
  id: string;
  type: 'message' | 'appointment' | 'intake';
  title: string;
  subtitle: string;
  timestamp: string;
  link: string;
}

export default function NotificationCenter({ doctorId }: { doctorId: string }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const supabase = createClient();

  const fetchNotifications = async () => {
    if (!doctorId) return;

    const { data: messages } = await supabase
      .from('messages')
      .select('id, content, created_at, sender_role, patient_id, patients(display_name, name)')
      .eq('doctor_id', doctorId)
      .eq('sender_role', 'patient')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: appts } = await supabase
      .from('appointments')
      .select('id, scheduled_at, created_at, patient_id, patients(display_name, name)')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })
      .limit(5);

    const items: NotificationItem[] = [];

    (messages || []).forEach((m: any) => {
      const patientName = m.patients?.display_name || m.patients?.name || 'Patient';
      items.push({
        id: `msg_${m.id}`,
        type: 'message',
        title: `💬 New Message from ${patientName}`,
        subtitle: m.content || 'Sent a message',
        timestamp: m.created_at,
        link: 'messages',
      });
    });

    (appts || []).forEach((a: any) => {
      const patientName = a.patients?.display_name || a.patients?.name || 'Patient';
      items.push({
        id: `appt_${a.id}`,
        type: 'appointment',
        title: `📅 New Appointment: ${patientName}`,
        subtitle: `Scheduled for ${new Date(a.scheduled_at).toLocaleDateString()}`,
        timestamp: a.created_at,
        link: 'appointments',
      });
    });

    items.sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime());

    setNotifications(items.slice(0, 10));
    setUnreadCount(items.length);
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel(`doctor_notifications_${doctorId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `doctor_id=eq.${doctorId}` }, () => {
        fetchNotifications();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments', filter: `doctor_id=eq.${doctorId}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId]);

  return (
    <div className="relative font-sans">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-[var(--color-cream)] hover:bg-[var(--color-teal-soft)] border border-[var(--color-border)] text-[var(--color-ink)] transition flex items-center justify-center cursor-pointer"
        title="Notification Center"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 card-surface shadow-2xl border border-[var(--color-border)] rounded-[var(--radius-md)] z-50 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
            <h4 className="text-xs font-heading font-extrabold text-[var(--color-ink)] uppercase tracking-wider">
              🔔 Notifications ({notifications.length})
            </h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          {notifications.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-muted)] py-4 text-center">No new notifications right now.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-cream)] hover:bg-[var(--color-teal-soft)] border border-[var(--color-border)] transition space-y-1"
                >
                  <p className="text-xs font-heading font-extrabold text-[var(--color-ink)]">{item.title}</p>
                  <p className="text-[11px] text-[var(--color-ink-muted)] line-clamp-1">{item.subtitle}</p>
                  <span className="text-[9px] font-data text-[var(--color-ink-muted)] block">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
