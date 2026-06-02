"use client";

import { createBrowserSupabase } from "@/lib/supabaseBrowser";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

export default function SignInButton() {
  const search = useSearchParams();
  const redirectedFrom = search.get("redirectedFrom");

  const signIn = async () => {
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${
          redirectedFrom ? `?next=${encodeURIComponent(redirectedFrom)}` : ""
        }`,
      },
    });
    if (error) toast.error(error.message);
  };

  return (
    <button
      onClick={signIn}
      className="inline-flex items-center gap-2 rounded-md bg-white text-zinc-900 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-200 transition shadow"
    >
      <GoogleIcon />
      Sign in with Google
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.4 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.5 29 4.5 24 4.5 16.5 4.5 9.9 8.7 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 43.5c5 0 9.5-1.9 12.9-5l-6-4.9c-1.9 1.4-4.4 2.4-6.9 2.4-5.3 0-9.7-3.1-11.3-8l-6.5 5C9.6 38.9 16.3 43.5 24 43.5z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6 4.9C40.6 35 43.5 30 43.5 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
