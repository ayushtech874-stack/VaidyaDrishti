import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    let user = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data } = await supabaseAdmin.auth.getUser(token);
      user = data.user;
    }

    if (!user) {
      try {
        const serverSupabase = await createServerClient();
        const { data } = await serverSupabase.auth.getUser();
        user = data.user;
      } catch {
        // outside cookie context
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetPatientId = searchParams.get('patient_id');

    // 1. Check if requesting user is a Doctor
    const { data: doc } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .or(`id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    if (doc) {
      if (!targetPatientId) {
        return NextResponse.json({ error: 'patient_id parameter is required for doctor view.' }, { status: 400 });
      }

      // Verify Doctor-Patient Relationship:
      // Does Doctor have an intake assigned or handled for targetPatientId?
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

      // Relationship verified — return patient history
      const { data: history, error } = await supabaseAdmin
        .from('patient_medical_history')
        .select('*')
        .eq('patient_id', targetPatientId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return NextResponse.json({ history: history || [] });
    }

    // 2. Check if requesting user is a Patient (or Family Manager)
    const { data: patientProfiles } = await supabaseAdmin
      .from('patients')
      .select('id')
      .or(`auth_user_id.eq.${user.id},managed_by_auth_user_id.eq.${user.id}`);

    if (!patientProfiles || patientProfiles.length === 0) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    const allowedPatientIds = patientProfiles.map(p => p.id);
    const patientIdToFetch = targetPatientId || allowedPatientIds[0];

    if (!allowedPatientIds.includes(patientIdToFetch)) {
      return NextResponse.json(
        { error: 'Access denied: You do not have permission to view medical records for this patient.' },
        { status: 403 }
      );
    }

    const { data: history, error } = await supabaseAdmin
      .from('patient_medical_history')
      .select('*')
      .eq('patient_id', patientIdToFetch)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ history: history || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching medical history.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found.' }, { status: 404 });
    }

    const { action, id, field_type, value } = await request.json();

    if (action === 'delete' && id) {
      await supabaseAdmin.from('patient_medical_history').delete().eq('id', id).eq('patient_id', patient.id);
      return NextResponse.json({ success: true, message: 'Medical history entry removed.' });
    }

    if (!field_type || !value) {
      return NextResponse.json({ error: 'Field type and value are required.' }, { status: 400 });
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('patient_medical_history')
      .insert([
        {
          patient_id: patient.id,
          field_type: field_type.trim(),
          value: value.trim(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Medical history entry added!',
      entry: inserted,
    });
  } catch (err: any) {
    console.error('Save Medical History Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save medical history.' }, { status: 500 });
  }
}
