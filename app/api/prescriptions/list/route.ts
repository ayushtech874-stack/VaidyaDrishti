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

    const { searchParams } = new URL(request.url);
    const targetPatientId = searchParams.get('patient_id');

    if (doc) {
      if (targetPatientId) {
        // Verify relationship
        const { data: relationship } = await supabaseAdmin
          .from('intakes')
          .select('id')
          .eq('doctor_id', doc.id)
          .eq('patient_id', targetPatientId)
          .limit(1);

        if (!relationship || relationship.length === 0) {
          return NextResponse.json(
            { error: 'Access denied: No active doctor-patient relationship exists for this record.' },
            { status: 403 }
          );
        }
        query = query.eq('patient_id', targetPatientId);
      } else {
        query = query.eq('doctor_id', doc.id);
      }
    } else if (pat) {
      const { data: familyProfiles } = await supabaseAdmin
        .from('patients')
        .select('id')
        .or(`auth_user_id.eq.${user.id},managed_by_auth_user_id.eq.${user.id}`);

      const allowedIds = (familyProfiles || []).map(p => p.id);
      const patientIdToFetch = targetPatientId || pat.id;

      if (!allowedIds.includes(patientIdToFetch)) {
        return NextResponse.json(
          { error: 'Access denied: You do not have permission to view prescriptions for this patient.' },
          { status: 403 }
        );
      }
      query = query.eq('patient_id', patientIdToFetch);
    }

    const { data: prescriptions, error } = await query;
    if (error) throw error;

    return NextResponse.json({ prescriptions: prescriptions || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching prescriptions.' }, { status: 500 });
  }
}
