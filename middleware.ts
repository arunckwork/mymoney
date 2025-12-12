import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/auth-helpers-nextjs';

const PUBLIC_PATHS = ['/'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;
  const isPublicRoute = PUBLIC_PATHS.includes(pathname);
  const isHome = pathname === '/';
  const isProtectedUserRoute = !isPublicRoute;

  // Redirect unauthenticated users away from protected end-user routes
  if (isProtectedUserRoute && !session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect signed-in users hitting home to their dashboard
  if (isHome && session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  // Apply to all routes except Next.js internals and static assets
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)'],
};
