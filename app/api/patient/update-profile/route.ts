import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { name, age, gender } = await request.json();

    const { data: updated, error } = await supabaseAdmin
      .from('patients')
      .update({
        name: name?.trim(),
        age: age ? parseInt(age, 10) : undefined,
      })
      .eq('auth_user_id', user.id)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully!',
      patient: updated,
    });
  } catch (err: any) {
    console.error('Update Profile Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update profile.' }, { status: 500 });
  }
}
