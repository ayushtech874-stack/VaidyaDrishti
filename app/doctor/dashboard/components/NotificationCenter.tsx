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

    // 1. Fetch unread patient messages for this doctor
    const { data: messages } = await supabase
      .from('messages')
      .select('id, content, created_at, sender_role, patient_id, patients(display_name, name)')
      .eq('doctor_id', doctorId)
      .eq('sender_role', 'patient')
      .order('created_at', { ascending: false })
      .limit(5);

    // 2. Fetch recent appointment bookings
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

    // Sort by timestamp reverse chronologically
    items.sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime());

    setNotifications(items.slice(0, 10));
    setUnreadCount(items.length);
  };

  useEffect(() => {
    fetchNotifications();

    // Set up Realtime subscription for instant notification badge updates
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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition flex items-center justify-center cursor-pointer"
        title="Notification Center"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full animate-pulse shadow-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 card-surface shadow-2xl border border-slate-200 rounded-2xl z-50 p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="text-xs font-extrabold text-[var(--color-navy)] uppercase tracking-wider">
              🔔 Notifications ({notifications.length})
            </h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-gray-400 hover:text-gray-600"
            >
              ✕ Close
            </button>
          </div>

          {notifications.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No new notifications right now.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 transition space-y-1"
                >
                  <p className="text-xs font-extrabold text-[var(--color-navy)]">{item.title}</p>
                  <p className="text-[11px] text-slate-600 line-clamp-1">{item.subtitle}</p>
                  <span className="text-[9px] font-mono text-slate-400 block">
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
