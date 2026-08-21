import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctor_id');

    if (!doctorId) {
      return NextResponse.json({ error: 'doctor_id is required.' }, { status: 400 });
    }

    const { data: availability, error } = await supabaseAdmin
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('day_of_week', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ availability: availability || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching doctor availability.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: doc } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .or(`id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    if (!doc) {
      return NextResponse.json({ error: 'Only empaneled RMP doctors may update availability.' }, { status: 403 });
    }

    const { availability_schedule } = await request.json(); // Array of { day_of_week, start_time, end_time, slot_duration_minutes, is_active }

    if (!Array.isArray(availability_schedule)) {
      return NextResponse.json({ error: 'Invalid availability schedule array.' }, { status: 400 });
    }

    for (const item of availability_schedule) {
      await supabaseAdmin
        .from('doctor_availability')
        .upsert(
          {
            doctor_id: doc.id,
            day_of_week: item.day_of_week,
            start_time: item.start_time || '09:00:00',
            end_time: item.end_time || '17:00:00',
            slot_duration_minutes: item.slot_duration_minutes || 15,
            is_active: item.is_active ?? true,
          },
          { onConflict: 'doctor_id,day_of_week' }
        );
    }

    return NextResponse.json({ success: true, message: 'Recurring weekly availability saved!' });
  } catch (err: any) {
    console.error('Update Availability Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update availability.' }, { status: 500 });
  }
}
