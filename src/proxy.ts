import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

// Routes qui nécessitent une session active
const protectedRoutes = [
  "/feed",
  "/promo",
  "/directory",
  "/profile",
  "/messages",
  "/notifications",
  "/mentorship",
  "/opportunities",
  "/support",
  "/settings",
  "/admin",
];

// Routes réservées aux non-connectées (redirigent vers /feed si déjà connectée)
const authRoutes = ["/", "/login", "/register", "/forgot-password", "/pending"];

// Routes accessibles par les authentifiées même avec must_change_password
const changePasswordRoute = "/auth/change-password";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Rafraîchir la session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Route protégée sans session → redirection vers login
  // Match exact ou avec sous-route (ex: /admin → /admin/users mais PAS /admin_api)
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Route auth avec session active → redirection vers feed
  const isAuthRoute = authRoutes.some((route) => pathname === route);
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  // Vérifier must_change_password pour les utilisatrices connectées
  if (user && isProtected && pathname !== changePasswordRoute) {
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileErr && profile?.must_change_password) {
      const url = request.nextUrl.clone();
      url.pathname = changePasswordRoute;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
