import { createClient } from "@/utils/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Route API de callback pour le flux PKCE de Supabase Auth.
 * Intercepte le `code` envoyé par email (reset password, verify email),
 * l'échange contre une session, puis redirige vers la destination `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/feed";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // En cas d'erreur ou de code manquant, rediriger vers login avec message
  return NextResponse.redirect(
    new URL("/login?error=invalid_link", origin)
  );
}
