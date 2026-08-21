import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctor_id');
    const dateStr = searchParams.get('date'); // YYYY-MM-DD

    if (!doctorId || !dateStr) {
      return NextResponse.json({ error: 'doctor_id and date parameters are required.' }, { status: 400 });
    }

    const targetDate = new Date(dateStr);
    const dayOfWeek = targetDate.getDay(); // 0-6

    // 1. Fetch doctor's availability for this day of week
    const { data: avail } = await supabaseAdmin
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .maybeSingle();

    if (!avail) {
      return NextResponse.json({ slots: [], message: 'Doctor is not available on this day.' });
    }

    // 2. Fetch existing booked appointments for doctor on target date
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`).toISOString();
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`).toISOString();

    const { data: booked } = await supabaseAdmin
      .from('appointments')
      .select('scheduled_at')
      .eq('doctor_id', doctorId)
      .eq('status', 'booked')
      .gte('scheduled_at', startOfDay)
      .lte('scheduled_at', endOfDay);

    const bookedTimes = new Set(
      (booked || []).map((b) => new Date(b.scheduled_at).toISOString())
    );

    // 3. Compute slots
    const slots: string[] = [];
    const [startH, startM] = avail.start_time.split(':').map(Number);
    const [endH, endM] = avail.end_time.split(':').map(Number);

    let current = new Date(targetDate);
    current.setHours(startH, startM, 0, 0);

    const endTime = new Date(targetDate);
    endTime.setHours(endH, endM, 0, 0);

    const slotDurationMs = (avail.slot_duration_minutes || 15) * 60 * 1000;

    while (current.getTime() + slotDurationMs <= endTime.getTime()) {
      const isoStr = current.toISOString();
      if (!bookedTimes.has(isoStr)) {
        slots.push(isoStr);
      }
      current = new Date(current.getTime() + slotDurationMs);
    }

    return NextResponse.json({
      slots,
      day_of_week: dayOfWeek,
      slot_duration_minutes: avail.slot_duration_minutes,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error computing open appointment slots.' }, { status: 500 });
  }
}
