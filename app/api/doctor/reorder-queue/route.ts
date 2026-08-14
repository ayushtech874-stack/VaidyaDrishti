import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { intake_id, action, target_urgency, swap_intake_id } = await request.json();
    if (!intake_id) {
      return NextResponse.json({ error: 'Missing intake_id' }, { status: 400 });
    }

    if (action === 'in_progress') {
      const { error } = await supabaseAdmin
        .from('intakes')
        .update({ status: 'in_progress' })
        .eq('id', intake_id);

      if (error) throw error;
    } else if (action === 'treated') {
      const { error } = await supabaseAdmin
        .from('intakes')
        .update({ status: 'doctor_reviewed', reviewed_at: new Date().toISOString() })
        .eq('id', intake_id);

      if (error) throw error;
    } else if (action === 'pending') {
      const { error } = await supabaseAdmin
        .from('intakes')
        .update({ status: 'pending_review' })
        .eq('id', intake_id);

      if (error) throw error;
    } else if (action === 'swap' && swap_intake_id && target_urgency) {
      const { error } = await supabaseAdmin
        .from('intakes')
        .update({ urgency_level: target_urgency })
        .eq('id', intake_id);

      if (error) throw error;
    } else if (target_urgency) {
      const { error } = await supabaseAdmin
        .from('intakes')
        .update({ urgency_level: target_urgency })
        .eq('id', intake_id);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Queue update error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update queue' }, { status: 500 });
  }
}
