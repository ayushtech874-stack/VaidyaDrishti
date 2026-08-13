import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { intake_id, new_urgency, action } = await request.json();
    if (!intake_id) {
      return NextResponse.json({ error: 'Missing intake_id' }, { status: 400 });
    }

    const supabase = await createClient();

    if (new_urgency) {
      await supabase
        .from('intakes')
        .update({ urgency_level: new_urgency })
        .eq('id', intake_id);
    } else if (action === 'in_progress') {
      await supabase
        .from('intakes')
        .update({ status: 'in_progress' })
        .eq('id', intake_id);
    } else if (action === 'treated') {
      await supabase
        .from('intakes')
        .update({ status: 'doctor_reviewed', reviewed_at: new Date().toISOString() })
        .eq('id', intake_id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update queue order' }, { status: 500 });
  }
}
