import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle error in middleware/server components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle error
          }
        },
      },
    }
  )
}

// Service role client for sensitive operations
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      `Missing Supabase env vars: URL=${url ? 'ok' : 'MISSING'}, SERVICE_ROLE_KEY=${key ? 'ok' : 'MISSING'}`
    );
  }

  return createSupabaseClient(url, key, {
    global: {
      fetch: (input, init) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000); // 10s timeout
        return fetch(input, { ...init, signal: controller.signal }).finally(() =>
          clearTimeout(timer)
        );
      },
    },
  });
}
