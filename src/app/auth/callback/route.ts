import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

function redirectWithoutCaching(url: string) {
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = searchParams.get('next') ?? '/learn';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/learn';
  const authErrorCode = searchParams.get('error_code');

  if (authErrorCode) {
    const reason = authErrorCode === 'otp_expired' ? 'link_expired' : 'callback_failed';
    return redirectWithoutCaching(
      `${origin}/auth/login?error=${reason}&next=${encodeURIComponent(next)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirectWithoutCaching(`${origin}${next}`);
    }
  }

  return redirectWithoutCaching(
    `${origin}/auth/login?error=callback_failed&next=${encodeURIComponent(next)}`
  );
}
