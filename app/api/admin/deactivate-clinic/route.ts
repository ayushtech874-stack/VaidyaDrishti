// ==============================================================================
// 🛡️ HARD ADMIN-PATIENT-DATA ISOLATION GUARANTEE
// This route must never return patient-identifiable data — admin access is
// strictly limited to facility/doctor management and aggregate metrics only.
// ==============================================================================

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
      return NextResponse.json({ error: 'Unauthorized. Admin login required.' }, { status: 401 });
    }

    // Verify Super-Admin Role
    const userEmailNorm = user.email?.toLowerCase().trim();
    const isSuperAdmin =
      user.user_metadata?.role === 'super_admin' ||
      user.app_metadata?.role === 'super_admin' ||
      userEmailNorm === 'admin@vaidyadrishti.com';

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Super-admin access required.' }, { status: 403 });
    }

    const { clinic_id, is_active } = await req.json();

    if (!clinic_id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'clinic_id and is_active (boolean) are required.' }, { status: 400 });
    }

    // Update Clinic is_active state
    const { data: updatedClinic, error } = await supabaseAdmin
      .from('clinics')
      .update({ is_active })
      .eq('id', clinic_id)
      .select('id, name, is_active')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log to Audit Trail
    const action = is_active ? 'CLINIC_REACTIVATED' : 'CLINIC_DEACTIVATED';
    await supabaseAdmin.from('audit_logs').insert([
      {
        action,
        details: `Super-admin ${user.email} set clinic ${updatedClinic.name} (${clinic_id}) is_active = ${is_active}`,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: `Facility ${is_active ? 'reactivated' : 'deactivated'} successfully.`,
      clinic: updatedClinic,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
