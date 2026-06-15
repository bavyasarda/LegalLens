// Refresh Supabase session on every request and gate /dashboard and /chat.
// Optimized for Vercel edge: skips getUser() network call when no session
// cookie is present, and only verifies identity for protected routes.
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PROTECTED = ["/dashboard", "/chat"];

// Supabase auth cookie names. If none of these are present, we can skip
// the network call entirely.
const AUTH_COOKIES = [
  "sb-access-token",
  "sb-refresh-token",
  // Supabase project ref: evvvqvyseulgkdztufhn
  "sb-evvvqvyseulgkdztufhn-auth-token",
];

type CookieToSet = { name: string; value: string; options?: CookieOptions };

function hasAuthCookie(request: NextRequest): boolean {
  const cookies = request.cookies.getAll();
  return cookies.some(
    (c) =>
      AUTH_COOKIES.includes(c.name) ||
      // Match any cookie starting with sb- and containing -auth-
      (c.name.startsWith("sb-") && c.name.includes("-auth-")),
  );
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some(
    (p) => path === p || path.startsWith(p + "/"),
  );

  // Fast path: not a protected route, or no auth cookies present.
  // Skip the Supabase network call entirely.
  if (!isProtected || !hasAuthCookie(request)) {
    return NextResponse.next({ request });
  }

  // Protected route with possible auth: verify the session.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }: CookieToSet) => {
            request.cookies.set({ name, value });
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(
            ({ name, value, options }: CookieToSet) => {
              response.cookies.set({ name, value, ...(options ?? {}) });
            },
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm)$).*)",
  ],
};
