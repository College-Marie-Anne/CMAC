"use client";

import { motion } from "framer-motion";
import { Clock, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GoldenParticles } from "@/components/ui/golden-particles-lazy";

export default function PendingPage() {
  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center px-5 py-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #800020 0%, #5c0018 40%, #3a000f 80%, #1a0008 100%)",
      }}
    >
      <GoldenParticles />

      <motion.div
        className="relative z-10 flex flex-col items-center text-center max-w-sm mx-auto"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
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

        {/* Icône horloge animée */}
        <motion.div
          className="mb-6 flex items-center justify-center w-16 h-16 rounded-full"
          style={{ background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.2)" }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Clock size={28} style={{ color: "#D4A017" }} />
        </motion.div>

        {/* Titre */}
        <h1 className="text-xl font-semibold text-white mb-3">
          Inscription enregistrée
        </h1>

        <p
          className="text-sm leading-relaxed mb-4 max-w-[300px]"
          style={{ color: "rgba(245,222,179,0.6)" }}
        >
          Votre compte est en attente de validation par un administrateur.
          Vous recevrez un email dès que votre compte sera activé.
        </p>

        {/* Indicateur email */}
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 mb-8"
          style={{
            background: "rgba(0,107,63,0.1)",
            border: "1px solid rgba(0,107,63,0.2)",
          }}
        >
          <Mail size={16} style={{ color: "#8fd6b4" }} />
          <p className="text-xs" style={{ color: "#8fd6b4" }}>
            Vérifiez aussi votre email pour confirmer votre adresse
          </p>
        </div>

        {/* Bouton retour */}
        <Link href="/">
          <Button
            className="rounded-xl px-8 h-11 text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, #D4A017 0%, #b8860b 100%)",
              color: "#3a000f",
            }}
          >
            Retour à la connexion
          </Button>
        </Link>

        {/* Footer */}
        <p
          className="mt-10 text-[11px] tracking-widest uppercase"
          style={{ color: "rgba(245,222,179,0.25)" }}
        >
          CMA &middot; Connexion &middot; Mentorat
        </p>
      </motion.div>
    </div>
  );
}
