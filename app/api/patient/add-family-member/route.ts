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
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await req.json();
    const { name, age, gender, relationship, phone } = body;

    if (!name || !age || !relationship) {
      return NextResponse.json({ error: 'Name, age, and relationship are required.' }, { status: 400 });
    }

    // 1. Fetch Primary Account Holder's default clinic_id
    const { data: primaryPatient } = await supabaseAdmin
      .from('patients')
      .select('clinic_id, phone')
      .eq('auth_user_id', user.id)
      .limit(1)
      .maybeSingle();

    const clinicId = primaryPatient?.clinic_id || '00000000-0000-0000-0000-000000000001';
    const profilePhone = phone || primaryPatient?.phone || `+9199${Date.now().toString().slice(-8)}`;

    // 2. Insert managed family profile row
    const { data: newProfile, error } = await supabaseAdmin
      .from('patients')
      .insert([
        {
          name,
          age: parseInt(age, 10),
          gender: gender || 'Other',
          phone: profilePhone,
          clinic_id: clinicId,
          managed_by_auth_user_id: user.id, // Primary Account Holder manages this profile
          auth_user_id: null,               // No separate Auth login
          relationship: relationship || 'other',
          display_name: name,
        },
      ])
      .select('*')
      .single();

    if (error || !newProfile) {
      return NextResponse.json({ error: `Failed to add family member: ${error?.message}` }, { status: 500 });
    }

    // 3. Audit Log Entry
    await supabaseAdmin.from('audit_logs').insert([
      {
        patient_id: newProfile.id,
        action: 'FAMILY_PROFILE_CREATED',
        details: `Primary account ${user.email} (${user.id}) added managed profile ${name} (${relationship}).`,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: `Family profile for ${name} (${relationship}) added successfully.`,
      profile: newProfile,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
