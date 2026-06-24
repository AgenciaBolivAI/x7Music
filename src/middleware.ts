import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Refreshes the Supabase auth session (rotating cookies) on every request so
 * server components and route handlers always see a valid session. Required by
 * @supabase/ssr cookie auth.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Maintenance mode — flip MAINTENANCE_MODE=on (Vercel env) to serve the
  // maintenance page for the whole site. APIs and the maintenance page itself
  // stay reachable so the site can be toggled back without lockout.
  if (
    process.env.MAINTENANCE_MODE === 'on' &&
    !pathname.startsWith('/maintenance') &&
    !pathname.startsWith('/api')
  ) {
    return NextResponse.rewrite(new URL('/maintenance', request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Touch the session so expired access tokens get refreshed into the response cookies.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Run on everything except static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
