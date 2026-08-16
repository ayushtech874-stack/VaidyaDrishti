import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // 1. Protect /doctor/* routes (except /doctor/login)
  if (path.startsWith('/doctor') && !path.startsWith('/doctor/login')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/doctor/login';
      return NextResponse.redirect(url);
    }

    // If logged in as super_admin and NOT viewing as doctor, redirect to /admin
    const isSuperAdmin =
      user.user_metadata?.role === 'super_admin' ||
      user.app_metadata?.role === 'super_admin' ||
      user.email === 'admin@vaidyadrishti.com';

    const isInspecting = request.nextUrl.searchParams.has('as_doctor_id');

    if (isSuperAdmin && !isInspecting) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  // 2. Protect /admin routes — Check user_metadata, app_metadata & email
  if (path.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/doctor/login';
      return NextResponse.redirect(url);
    }

    const isSuperAdmin =
      user.user_metadata?.role === 'super_admin' ||
      user.app_metadata?.role === 'super_admin' ||
      user.email === 'admin@vaidyadrishti.com';

    if (!isSuperAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/doctor/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/doctor/:path*', '/admin/:path*'],
};
