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

  // Protect all /doctor/* routes except /doctor/login
  if (path.startsWith('/doctor') && !path.startsWith('/doctor/login')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/doctor/login';
      return NextResponse.redirect(url);
    }
  }

  // Protect /admin routes — Require super_admin role in app_metadata
  if (path.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/doctor/login';
      return NextResponse.redirect(url);
    }

    // Strict role check: app_metadata is set exclusively via Supabase Service Role (client cannot edit)
    const isSuperAdmin = user.app_metadata?.role === 'super_admin';
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
