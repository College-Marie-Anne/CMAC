"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Clock, Ban, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoldenParticles } from "@/components/ui/golden-particles-lazy";

type Reason = "not_found" | "revoked" | "used" | "expired" | "server_error" | string;

const MESSAGES: Record<string, { title: string; body: string; icon: typeof AlertCircle }> = {
  not_found: {
    title: "Lien d'invitation introuvable",
    body:
      "Ce lien n'existe pas ou a été mal copié. Vérifie l'URL, ou demande à l'alumni de te renvoyer le lien.",
    icon: AlertCircle,
  },
  revoked: {
    title: "Lien d'invitation révoqué",
    body:
      "Ce lien a été désactivé par l'alumni qui l'a créé ou par un administrateur. Contacte la personne qui te l'a partagé pour en obtenir un nouveau.",
    icon: Ban,
  },
  used: {
    // Depuis la migration 032, un lien accepte jusqu'à max_uses inscriptions
    // (default 10). reason='used' arrive quand used_count >= max_uses, donc
    // "tous les slots pris" et plus "utilisé une seule fois".
    title: "Lien d'invitation épuisé",
    body:
      "Ce lien a déjà été utilisé par le nombre maximum de personnes autorisées. Demande à l'alumni qui te l'a partagé de t'en générer un nouveau.",
    icon: CheckCircle2,
  },
  expired: {
    title: "Lien d'invitation expiré",
    body:
      "Ce lien a expiré — il n'était valide que 7 jours après sa création. Contacte l'alumni qui te l'a envoyé pour en obtenir un nouveau.",
    icon: Clock,
  },
  server_error: {
    title: "Erreur de validation",
    body:
      "Impossible de vérifier ton lien d'invitation pour l'instant. Réessaie dans quelques minutes, ou contacte le support.",
    icon: AlertCircle,
  },
};

export function InviteError({ reason }: { reason: Reason }) {
  const meta = MESSAGES[reason] ?? MESSAGES.not_found;
  const Icon = meta.icon;

  return (
    <motion.div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-5"
      // Gradient bordeaux inline : cette page publique doit porter son propre
      // fond — depuis qu'on a retiré le fond bordeaux global du RootLayout
      // (pour fixer le flash rouge lors des transitions vers les pages
      // protégées), le composant héritait du bg-cma-gris du body et ses
      // textes blanc/beige devenaient illisibles (glitch visuel).
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #800020 0%, #5c0018 40%, #3a000f 80%, #1a0008 100%)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <GoldenParticles />

      <motion.div
        className="relative w-full max-w-[380px] mx-auto flex flex-col items-center rounded-2xl px-6 py-10 sm:px-8 sm:py-12 text-center"
        style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(212,160,23,0.15)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}
        initial={{ y: 20, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* Logo */}
        <div className="mb-5">
          <div
            className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              border: "2px solid rgba(212,160,23,0.25)",
              boxShadow: "0 0 20px rgba(212,160,23,0.1)",
            }}
          >
            <Image
              src="/CMAC.jpeg"
              alt="CMA Connect"
              width={80}
              height={80}
              className="object-cover scale-125"
              style={{ width: "auto", height: "auto" }}
              priority
            />
          </div>
        </div>

        {/* Icon d'état */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(220,38,38,0.12)" }}
        >
          <Icon size={22} style={{ color: "#fca5a5" }} />
        </div>

        {/* Titre + message */}
        <h1 className="text-lg font-semibold text-white mb-2">{meta.title}</h1>
        <p
          className="text-sm leading-relaxed mb-8"
          style={{ color: "rgba(245,222,179,0.6)" }}
        >
          {meta.body}
        </p>

        {/* Actions */}
        <div className="w-full space-y-3">
          <Link href="/register" className="block">
            <Button
              className="w-full h-11 rounded-xl text-sm font-semibold gap-2"
              style={{
                background: "linear-gradient(135deg, #D4A017 0%, #b8860b 100%)",
                color: "#3a000f",
                boxShadow: "0 4px 15px rgba(212,160,23,0.25)",
              }}
            >
              M&apos;inscrire sans invitation
            </Button>
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: "rgba(245,222,179,0.5)" }}
          >
            <ArrowLeft size={12} /> Retour à la connexion
          </Link>
        </div>
      </motion.div>

      {/* Footer */}
      <p
        className="absolute bottom-5 w-full text-center text-[11px] tracking-widest uppercase"
        style={{ color: "rgba(245,222,179,0.35)" }}
      >
        CMA &middot; Connexion &middot; Mentorat
      </p>
    </motion.div>
  );
}
