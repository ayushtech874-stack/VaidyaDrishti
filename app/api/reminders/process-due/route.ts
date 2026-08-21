import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const nowIso = new Date().toISOString();

    // 1. Fetch pending reminders due up to current time
    const { data: dueReminders, error: fetchErr } = await supabaseAdmin
      .from('reminders')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', nowIso);

    if (fetchErr) throw fetchErr;

    if (!dueReminders || dueReminders.length === 0) {
      return NextResponse.json({ success: true, processed_count: 0, message: 'No pending reminders due.' });
    }

    // 2. Mark fetched reminders as sent
    const reminderIds = dueReminders.map((r) => r.id);
    const { error: updateErr } = await supabaseAdmin
      .from('reminders')
      .update({
        status: 'sent',
        sent_at: nowIso,
      })
      .in('id', reminderIds);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      processed_count: dueReminders.length,
      processed_reminders: dueReminders,
      message: `Successfully processed ${dueReminders.length} due reminders!`,
    });
  } catch (err: any) {
    console.error('Process Due Reminders Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to process reminders.' }, { status: 500 });
  }
}
