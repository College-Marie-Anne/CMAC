import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Proxy Next.js 16 (anciennement middleware).
 *
 * Responsabilités :
 *  1. Rafraîchir le token Supabase Auth sur chaque requête (SSR).
 *  2. Mode maintenance global via `NEXT_PUBLIC_MAINTENANCE_MODE=true` (spec §1512).
 *  3. Auth guard : les routes protégées redirigent vers `/login` si non authentifié.
 *  4. Routage par statut de profil : pending → /pending, suspended/deactivated → logout.
 *  5. Force change password : must_change_password → /auth/change-password.
 *
 * Contrainte : pas de requête DB lourde (exécuté sur chaque navigation).
 * On se limite à `auth.getUser()` + un SELECT léger sur `profiles`.
 */

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

// Routes publiques côté non-connectée : si user connectée, redirect serveur → /feed.
// "/" en fait partie : pour une user connectée, on va DIRECTEMENT sur /feed
// (pas de splash React qui prolonge le splash natif PWA). Le splash React
// reste visible uniquement pour les non-connectées sur /.
const publicOnlyRoutes = ["/", "/login", "/register", "/forgot-password"];

// Routes "neutres" pour utilisatrice connectée : ni check de statut, ni
// redirect obligatoire. On skip le SELECT profile (économie ~50ms/nav en 4G).
// - /legal/*          : CGU + privacy, accessibles à tous les statuts
// - /offline          : fallback Service Worker
// - /maintenance      : déjà géré en amont (early return)
// - /auth/*           : callback, reset-password, verify-email, change-password
//                       (le guard must_change_password n'a pas besoin du SELECT
//                        ici, on est déjà sur /auth/*)
// - /_next, /api, etc : déjà exclus par le matcher
function isNeutralRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/legal/") ||
    pathname === "/offline" ||
    pathname.startsWith("/auth/")
  );
}

// Throttle last_seen_at via cookie : sans ça, un UPDATE partait à chaque nav
// (même fire-and-forget) → bruit DB + Supabase logs. 5 min est cohérent avec
// la granularité d'affichage "en ligne" dans le directory/messages.
const LAST_SEEN_COOKIE = "cmac-seen-at";
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Mode maintenance — bloque tout sauf /maintenance
  const maintenanceMode =
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
  if (maintenanceMode && pathname !== "/maintenance") {
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.redirect(url);
  }

  // Si on accède à /maintenance mais que le mode est désactivé, renvoyer vers /login
  if (!maintenanceMode && pathname === "/maintenance") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

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

  // 2. Rafraîchir la session — OBLIGATOIRE pour @supabase/ssr
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isPublicOnly =
    publicOnlyRoutes.some((route) => pathname === route) ||
    pathname.startsWith("/register/");

  // 3. Route protégée sans session → /login
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") {
      url.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(url);
  }

  // 4. Non authentifié et pas sur route protégée → laisser passer
  if (!user) {
    return supabaseResponse;
  }

  // 4b. Routes neutres pour user connectée : on skip le SELECT profile.
  // Gain typique : ~50ms/nav sur /legal/*, /offline, /auth/*. Tradeoff accepté :
  // un compte pending peut atteindre /auth/change-password (OK, c'est prévu)
  // ou /legal/terms (OK, accessible à tous les statuts). Aucune route protégée
  // n'est neutre.
  if (isNeutralRoute(pathname)) {
    return supabaseResponse;
  }

  // 5. Authentifié — lire le profil (statut + flags)
  const { data: profile } = await supabase
    .from("profiles")
    .select("status, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  // Cas edge : auth.user sans ligne profiles → logout défensif
  if (!profile) {
    if (!isPublicOnly && pathname !== "/pending") {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // 6. must_change_password — force la page de changement avant toute autre
  const onPasswordChangePage = pathname === "/auth/change-password";
  const onAuthSubroute = pathname.startsWith("/auth/");
  if (
    profile.must_change_password &&
    !onPasswordChangePage &&
    !onAuthSubroute
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/change-password";
    return NextResponse.redirect(url);
  }

  // 7. Routage par statut
  if (profile.status === "pending") {
    // Les pending ne peuvent voir que /pending, /auth/*, /legal/*
    const allowedForPending =
      pathname === "/pending" ||
      onAuthSubroute ||
      pathname.startsWith("/legal/");
    if (!allowedForPending) {
      const url = request.nextUrl.clone();
      url.pathname = "/pending";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (profile.status === "suspended" || profile.status === "deactivated") {
    // Comptes bloqués → logout + login avec message
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set(
      "error",
      profile.status === "suspended" ? "suspended" : "deactivated"
    );
    return NextResponse.redirect(url);
  }

  if (profile.status === "active") {
    // Compte actif sur une route public-only → /feed
    if (isPublicOnly || pathname === "/pending") {
      const url = request.nextUrl.clone();
      url.pathname = "/feed";
      return NextResponse.redirect(url);
    }

    // 8. Centraliser last_seen_at ici (au lieu de chaque page)
    // Throttlé à 1x / 5min via cookie : évite N UPDATE DB inutiles par session
    // (avant, chaque nav partait à l'écriture, même fire-and-forget). Le cookie
    // est lu sans DB, l'UPDATE ne part qu'au-delà du seuil.
    const lastSeen = Number(request.cookies.get(LAST_SEEN_COOKIE)?.value ?? 0);
    if (Date.now() - lastSeen >= LAST_SEEN_THROTTLE_MS) {
      // Fire-and-forget — pas de await pour ne pas ralentir la navigation.
      supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id)
        .then();

      supabaseResponse.cookies.set(LAST_SEEN_COOKIE, String(Date.now()), {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24, // 1 jour — le cookie sert juste de throttle
      });
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|monitoring|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?|ttf|eot|txt|xml|json)$).*)",
  ],
};
