// Server-only Supabase clients. NEVER import from a client component.
// Provides:
//   createServerSupabase() — server component / route handler, uses cookies
//   createAdminSupabase()  — service-role, bypasses RLS

import "server-only";
import { createServerClient as _createServer, type CookieOptions } from "@supabase/ssr";
import { createClient as _createAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return _createServer(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component without a Server Action context.
        }
      },
    },
  });
}

export function createAdminSupabase() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return _createAdmin(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
