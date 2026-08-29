import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // 1. Fetch all verified, live, and active clinics
    const { data: clinics, error: cErr } = await supabase
      .from('clinics')
      .select('*')
      .eq('is_verified', true)
      .eq('is_live', true)
      .neq('is_active', false);

    if (cErr) throw cErr;

    // Extract unique active cities
    const citySet = new Set<string>();
    (clinics || []).forEach((c) => {
      if (c.city) citySet.add(c.city);
    });

    if (citySet.size === 0) {
      citySet.add('Bhagalpur');
    }

    // 2. Fetch approved and active doctors whose parent clinic is also active
    const { data: doctors, error: dErr } = await supabase
      .from('doctors')
      .select('*, clinics(id, name, city, state, is_verified, is_live, is_active)')
      .eq('registration_status', 'approved')
      .neq('is_active', false);

    if (dErr) throw dErr;

    // CASCADE ISOLATION: Filter out doctors whose parent clinic is deactivated (is_active === false)
    const activeDoctors = (doctors || []).filter((doc: any) => {
      if (doc.clinics && doc.clinics.is_active === false) {
        return false; // Clinic deactivated -> doctor disappears from directory
      }
      return true;
    });

    return NextResponse.json({
      success: true,
      cities: Array.from(citySet),
      clinics: clinics || [],
      doctors: activeDoctors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
