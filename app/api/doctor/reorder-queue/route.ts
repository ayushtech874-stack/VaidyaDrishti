import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { intake_id, action, target_urgency, swap_intake_id, current_pos, target_pos } = await request.json();
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
      // Robust update with fallback for legacy schema missing reviewed_at column
      let { error } = await supabaseAdmin
        .from('intakes')
        .update({ status: 'doctor_reviewed', reviewed_at: new Date().toISOString() })
        .eq('id', intake_id);

      if (error && error.message?.includes('reviewed_at')) {
        const fallbackRes = await supabaseAdmin
          .from('intakes')
          .update({ status: 'doctor_reviewed' })
          .eq('id', intake_id);
        error = fallbackRes.error;
      }

      if (error) throw error;
    } else if (action === 'pending') {
      const { error } = await supabaseAdmin
        .from('intakes')
        .update({ status: 'pending_review' })
        .eq('id', intake_id);

      if (error) throw error;
    } else if (action === 'swap' && swap_intake_id) {
      const { data: itemA } = await supabaseAdmin
        .from('intakes')
        .select('created_at, queue_position')
        .eq('id', intake_id)
        .single();

      const { data: itemB } = await supabaseAdmin
        .from('intakes')
        .select('created_at, queue_position')
        .eq('id', swap_intake_id)
        .single();

      if (itemA && itemB) {
        await supabaseAdmin
          .from('intakes')
          .update({ created_at: itemB.created_at, queue_position: target_pos ?? 2 })
          .eq('id', intake_id);

        await supabaseAdmin
          .from('intakes')
          .update({ created_at: itemA.created_at, queue_position: current_pos ?? 1 })
          .eq('id', swap_intake_id);
      }
    } else if (target_urgency) {
      const { error } = await supabaseAdmin
        .from('intakes')
        .update({ urgency_level: target_urgency })
        .eq('id', intake_id);

      if (error) throw error;
    }

    try {
      revalidatePath('/doctor/dashboard');
      revalidatePath(`/doctor/intake/${intake_id}`);
    } catch {
      // revalidate optional
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Queue update error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update queue' }, { status: 500 });
  }
}
