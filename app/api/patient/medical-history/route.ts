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

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found.' }, { status: 404 });
    }

    const { data: history, error } = await supabaseAdmin
      .from('patient_medical_history')
      .select('*')
      .eq('patient_id', patient.id)
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
