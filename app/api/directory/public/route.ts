import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // 1. Fetch all verified & live clinics
    const { data: clinics, error: cErr } = await supabase
      .from('clinics')
      .select('*')
      .eq('is_verified', true)
      .eq('is_live', true);

    if (cErr) throw cErr;

    // Extract unique active cities
    const citySet = new Set<string>();
    (clinics || []).forEach((c) => {
      if (c.city) citySet.add(c.city);
    });

    if (citySet.size === 0) {
      citySet.add('Bhagalpur');
    }

    // 2. Fetch approved doctors
    const { data: doctors, error: dErr } = await supabase
      .from('doctors')
      .select('*, clinics(id, name, city, state, is_verified, is_live)')
      .eq('registration_status', 'approved');

    if (dErr) throw dErr;

    return NextResponse.json({
      success: true,
      cities: Array.from(citySet),
      clinics: clinics || [],
      doctors: doctors || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
