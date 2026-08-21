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

    const { appointment_id } = await request.json();
    if (!appointment_id) {
      return NextResponse.json({ error: 'appointment_id is required.' }, { status: 400 });
    }

    // Cancel appointment by setting status = 'cancelled' (Record retained)
    const { data: updated, error } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointment_id)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled.',
      appointment: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to cancel appointment.' }, { status: 500 });
  }
}
