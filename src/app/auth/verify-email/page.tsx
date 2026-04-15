import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, AlertCircle, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Vérification email — CMA Connect",
};

type Props = {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    error?: string;
    error_description?: string;
    next?: string;
  }>;
};

/**
 * Callback de vérification d'email envoyé par Supabase Auth.
 *
 * Supabase peut rediriger ici selon deux chemins :
 *  - Flux PKCE (email OTP récent) : paramètre `token_hash` + `type=email` ou `signup`
 *    → on l'échange via `verifyOtp` pour marquer l'email comme vérifié.
 *  - Lien déjà échangé / utilisateur connecté : on lit l'état de la session.
 *
 * Affiche un écran de confirmation brandé CMA + lien de retour.
 */
export default async function VerifyEmailPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  let status: "success" | "already" | "error" = "error";
  let errorMessage: string | null = null;

  // Erreur remontée directement dans l'URL par Supabase
  if (params.error) {
    errorMessage =
      params.error_description ||
      params.error ||
      "Le lien de vérification est invalide ou expiré.";
  } else if (params.token_hash && params.type) {
    const otpType = params.type as
      | "email"
      | "signup"
      | "email_change"
      | "recovery"
      | "invite"
      | "magiclink";

    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.token_hash,
      type: otpType,
    });

    if (error) {
      errorMessage =
        error.message ||
        "Le lien de vérification est invalide ou a déjà été utilisé.";
    } else {
      status = "success";
    }
  } else {
    // Aucun token → on vérifie si l'utilisatrice est déjà connectée + email confirmé
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email_confirmed_at) {
      status = "already";
    } else {
      errorMessage =
        "Lien de vérification invalide. Ouvrez le lien reçu par email.";
    }
  }

  const headline =
    status === "success"
      ? "Email vérifié !"
      : status === "already"
      ? "Email déjà vérifié"
      : "Vérification impossible";

  const subheadline =
    status === "success"
      ? "Votre adresse email a bien été confirmée. Vous pouvez maintenant vous connecter à CMA Connect."
      : status === "already"
      ? "Votre adresse email est déjà confirmée. Connectez-vous pour continuer."
      : errorMessage;

  const isOk = status === "success" || status === "already";

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center px-5 py-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #800020 0%, #5c0018 40%, #3a000f 80%, #1a0008 100%)",
      }}
    >
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm mx-auto">
        {/* Logo */}
        <div
          className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center mb-8"
          style={{
            border: "2px solid rgba(212,160,23,0.3)",
            boxShadow: "0 0 30px rgba(212,160,23,0.15)",
          }}
        >
          <Image
            src="/CMAC.jpeg"
            alt="CMA Connect"
            width={100}
            height={100}
            className="object-cover scale-125"
            style={{ width: "auto", height: "auto" }}
          />
        </div>

        {/* Icône d'état */}
        <div
          className="mb-6 flex items-center justify-center w-16 h-16 rounded-full"
          style={{
            background: isOk
              ? "rgba(0,107,63,0.15)"
              : "rgba(220,38,38,0.15)",
            border: `1px solid ${
              isOk ? "rgba(0,107,63,0.35)" : "rgba(220,38,38,0.35)"
            }`,
          }}
        >
          {status === "success" ? (
            <CheckCircle2 size={28} style={{ color: "#8fd6b4" }} />
          ) : status === "already" ? (
            <MailCheck size={28} style={{ color: "#8fd6b4" }} />
          ) : (
            <AlertCircle size={28} style={{ color: "#fca5a5" }} />
          )}
        </div>

        <h1 className="text-xl font-semibold text-white mb-3">{headline}</h1>

        <p
          className="text-sm leading-relaxed mb-8 max-w-[320px]"
          style={{ color: "rgba(245,222,179,0.7)" }}
        >
          {subheadline}
        </p>

        <Link href="/login">
          <Button
            className="rounded-xl px-8 h-11 text-sm font-semibold"
            style={{
              background:
                "linear-gradient(135deg, #D4A017 0%, #b8860b 100%)",
              color: "#3a000f",
            }}
          >
            Aller à la connexion
          </Button>
        </Link>

        {!isOk && (
          <Link
            href="/support"
            className="mt-4 text-xs underline"
            style={{ color: "rgba(245,222,179,0.5)" }}
          >
            Contacter le support
          </Link>
        )}

        <p
          className="mt-10 text-[11px] tracking-widest uppercase"
          style={{ color: "rgba(245,222,179,0.25)" }}
        >
          CMA &middot; Connexion &middot; Mentorat
        </p>
      </div>
    </div>
  );
}
