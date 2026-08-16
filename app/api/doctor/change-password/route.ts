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
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    const { new_password } = await request.json();

    if (!new_password || new_password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    // 1. Update Auth User Password in Supabase Auth
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: new_password,
      user_metadata: { must_change_password: false },
    });

    if (authErr) throw authErr;

    // 2. Clear must_change_password flag in doctors table
    await supabaseAdmin
      .from('doctors')
      .update({ must_change_password: false })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully! You can now access your doctor queue.',
    });
  } catch (err: any) {
    console.error('Password change error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update password.' }, { status: 500 });
  }
}
