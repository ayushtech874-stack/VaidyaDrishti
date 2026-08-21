import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
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

    const { data: pat } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!doc && !pat) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    let query = supabaseAdmin
      .from('prescriptions')
      .select(`
        id,
        issued_at,
        pdf_url,
        status,
        doctors (
          name,
          rmp_registration_number,
          qualifications
        ),
        patients (
          name,
          phone,
          age
        ),
        prescription_items (
          id,
          drug_name,
          dosage,
          frequency,
          duration_days,
          instructions,
          timing
        )
      `)
      .order('issued_at', { ascending: false });

    if (doc) {
      query = query.eq('doctor_id', doc.id);
    } else if (pat) {
      query = query.eq('patient_id', pat.id);
    }

    const { data: prescriptions, error } = await query;
    if (error) throw error;

    return NextResponse.json({ prescriptions: prescriptions || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching prescriptions.' }, { status: 500 });
  }
}
