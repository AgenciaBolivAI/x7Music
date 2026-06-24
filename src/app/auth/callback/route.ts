import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Exchanges the auth code from email links (password recovery + email confirmation)
// for a session, then redirects to `next`.
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';
  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${next}`);
}

export const dynamic = 'force-dynamic';
