import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

// Auth-aware client for user-facing routes (needs cookies)
export async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cookieStore.set(name, value, options as any)
            );
          } catch {
            // Ignore in Server Components
          }
        },
      },
    }
  );
}

// Alias for backwards compatibility
export { createAuthClient as createClient };

// Service client — bypasses RLS, no cookies needed
export function createServiceClient() {
  // On Cloudflare Pages edge, NEXT_PUBLIC_* are build-time only.
  // Fall through several var names; hardcode URL as final fallback (it's public).
  const url =
    process.env.MISHNA_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    'https://trakxowvjsosbzbbfoxq.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      `Supabase env vars missing. URL: ${url ? 'ok' : 'MISSING'}, KEY: ${key ? 'ok' : 'MISSING'}`
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
