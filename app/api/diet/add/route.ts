import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: doc } = await supabaseAdmin
      .from('doctors')
      .select('id, name')
      .or(`id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    if (!doc) {
      return NextResponse.json({ error: 'Only empaneled RMP doctors may issue clinical diet guidance.' }, { status: 403 });
    }

    const { patient_id, content, is_recurring } = await request.json();

    if (!patient_id || !content?.trim()) {
      return NextResponse.json({ error: 'Patient ID and diet guidance content are required.' }, { status: 400 });
    }

    // 1. Insert DOCTOR-AUTHORED diet recommendation
    const { data: diet, error: dietErr } = await supabaseAdmin
      .from('diet_recommendations')
      .insert([
        {
          doctor_id: doc.id,
          patient_id,
          content: content.trim(),
          is_recurring: Boolean(is_recurring),
          created_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (dietErr) throw dietErr;

    // 2. Generate daily reminder row for diet guidance
    await supabaseAdmin.from('reminders').insert([
      {
        patient_id,
        type: 'diet',
        source_table: 'diet_recommendations',
        source_id: diet.id,
        message: `🥗 Doctor Clinical Diet Note: ${content.trim()}`,
        scheduled_for: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
      },
    ]);

    return NextResponse.json({
      success: true,
      message: 'Clinical diet guidance submitted and scheduled!',
      diet,
    });
  } catch (err: any) {
    console.error('Add Diet Guidance Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit diet guidance.' }, { status: 500 });
  }
}
