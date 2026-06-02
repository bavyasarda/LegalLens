// Browser-safe Supabase client. Can be imported from client components.
import { createBrowserClient as _createBrowser } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function createBrowserSupabase() {
  return _createBrowser(SUPABASE_URL, SUPABASE_ANON_KEY);
}
