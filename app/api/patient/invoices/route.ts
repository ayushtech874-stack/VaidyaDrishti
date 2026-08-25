import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Patient login required.' }, { status: 401 });
    }

    // 1. Fetch all patient profile IDs owned or managed by this user
    const { data: profiles } = await supabaseAdmin
      .from('patients')
      .select('id')
      .or(`auth_user_id.eq.${user.id},managed_by_auth_user_id.eq.${user.id}`);

    const patientIds = (profiles || []).map((p) => p.id);

    if (patientIds.length === 0) {
      return NextResponse.json({ success: true, invoices: [] });
    }

    // 2. Fetch invoices for these patient IDs
    const { data: invoices, error } = await supabaseAdmin
      .from('invoices')
      .select('*, doctors(name, qualifications), clinics(name, city)')
      .in('patient_id', patientIds)
      .order('issued_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invoices: invoices || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
