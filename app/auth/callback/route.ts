import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/patient/verify-phone';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check doctor table linkage
        const { data: doctor } = await supabase
          .from('doctors')
          .select('id, role, is_approved')
          .eq('id', user.id)
          .maybeSingle();

        if (doctor) {
          if (doctor.role === 'super_admin' || user.email === 'admin@vaidyadrishti.com') {
            return NextResponse.redirect(`${origin}/admin`);
          }
          if (doctor.is_approved) {
            return NextResponse.redirect(`${origin}/doctor/dashboard`);
          }
          return NextResponse.redirect(`${origin}/doctor/register?status=pending`);
        }

        // If target was doctor flow but user is not in doctors table yet, route to doctor register
        if (next.includes('/doctor')) {
          return NextResponse.redirect(`${origin}/doctor/register`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/patient/login?error=oauth_failed`);
}
