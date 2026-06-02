// Refresh Supabase session on every request and gate /dashboard and /chat.
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PROTECTED = ["/dashboard", "/chat"];

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) => {
            response.cookies.set({ name, value, ...(options ?? {}) });
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));

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
