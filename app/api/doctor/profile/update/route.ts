import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Doctor login required.' }, { status: 401 });
    }

    const body = await req.json();
    const { photo_url, short_bio, qualifications, availability } = body;

    // 1. Update Doctor Record (photo_url, short_bio, qualifications ONLY)
    // Note: rmp_registration_number and registration_status are READ-ONLY and strictly excluded
    const { data: updatedDoctor, error: docErr } = await supabaseAdmin
      .from('doctors')
      .update({
        photo_url: photo_url !== undefined ? photo_url : undefined,
        short_bio: short_bio !== undefined ? short_bio : undefined,
        qualifications: qualifications !== undefined ? qualifications : undefined,
      })
      .eq('id', user.id)
      .select('*')
      .single();

    if (docErr) {
      return NextResponse.json({ error: `Failed to update doctor profile: ${docErr.message}` }, { status: 500 });
    }

    // 2. Update Weekly Availability Slots if provided
    if (availability && Array.isArray(availability)) {
      // Clear existing availability and re-insert
      await supabaseAdmin.from('doctor_availability').delete().eq('doctor_id', user.id);

      const slotsToInsert = availability.map((slot: any) => ({
        doctor_id: user.id,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_active: slot.is_active ?? true,
      }));

      if (slotsToInsert.length > 0) {
        await supabaseAdmin.from('doctor_availability').insert(slotsToInsert);
      }
    }

    // 3. Audit Log Entry
    await supabaseAdmin.from('audit_logs').insert([
      {
        doctor_id: user.id,
        action: 'DOCTOR_PROFILE_UPDATED',
        details: `Doctor ${updatedDoctor.name} (${user.id}) updated bio/photo/qualifications.`,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      doctor: updatedDoctor,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
