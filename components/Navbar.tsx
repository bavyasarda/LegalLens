"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";

interface NavbarProps {
  user: { email: string | null } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const signOut = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/");
    router.refresh();
  };

  return (
    <header className="border-b border-zinc-900/80 bg-zinc-950/60 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-brand-500 to-accent-500 grid place-items-center text-xs font-bold text-white">
            LL
          </div>
          <span className="font-semibold tracking-tight">LegalLens</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800/60"
              >
                Documents
              </Link>
              <Link
                href="/chat"
                className="px-3 py-1.5 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800/60"
              >
                Ask
              </Link>
              <span className="hidden sm:inline-block text-xs text-zinc-500 ml-2">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="ml-1 px-3 py-1.5 rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 text-zinc-300"
              >
                Sign out
              </button>
            </>
          ) : (
            <span className="text-xs text-zinc-500">Not signed in</span>
          )}
        </nav>
      </div>
    </header>
  );
}
