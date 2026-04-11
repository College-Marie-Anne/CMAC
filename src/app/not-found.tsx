"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoldenParticles } from "@/components/ui/golden-particles-lazy";
import Image from "next/image";
import Link from "next/link";

const floatingLetters = [
  { char: "4", x: -60, y: -30, rotate: -15, delay: 0 },
  { char: "0", x: 0, y: -50, rotate: 5, delay: 0.15 },
  { char: "4", x: 60, y: -25, rotate: 12, delay: 0.3 },
];


export default function NotFound() {
  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-5"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #800020 0%, #5c0018 40%, #3a000f 80%, #1a0008 100%)",
      }}
    >
      <GoldenParticles />

      {/* Cercle de lumière pulsant derrière le 404 */}
      <motion.div
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          width: 350,
          height: 350,
          background:
            "radial-gradient(circle, rgba(212,160,23,0.08) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm mx-auto">
        {/* 404 géant animé */}
        <div className="relative mb-6">
          {/* Lettres 404 flottantes */}
          <div className="flex items-center justify-center gap-1" aria-hidden="true">
            {floatingLetters.map((letter, i) => (
              <motion.span
                key={i}
                className="text-8xl sm:text-9xl font-black select-none"
                style={{
                  background:
                    "linear-gradient(180deg, #D4A017 0%, #b8860b 50%, #8B6914 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "none",
                  filter: "drop-shadow(0 4px 30px rgba(212,160,23,0.3))",
                }}
                initial={{ y: 40, opacity: 0, rotate: letter.rotate }}
                animate={{
                  y: 0,
                  opacity: 1,
                  rotate: 0,
                }}
                transition={{
                  duration: 0.8,
                  delay: letter.delay,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {letter.char}
              </motion.span>
            ))}
          </div>

          {/* Animation de rebond subtile continue */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <span
              className="text-8xl sm:text-9xl font-black opacity-[0.04]"
              style={{ color: "#D4A017" }}
            >
              404
            </span>
          </motion.div>
        </div>

        {/* Logo avec rotation d'entrée */}
        <motion.div
          className="mb-6"
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center mx-auto"
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
            />
          </div>
        </motion.div>

        {/* Texte avec animation de machine à écrire */}
        <motion.h2
          className="text-xl sm:text-2xl font-semibold text-white mb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          Page introuvable
        </motion.h2>

        <motion.p
          className="text-sm leading-relaxed mb-10 max-w-[280px]"
          style={{ color: "rgba(245,222,179,0.6)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.85 }}
        >
          Cette page n&apos;existe pas ou a été déplacée.
          Pas d&apos;inquiétude, on vous ramène à bon port
        </motion.p>

        {/* Bouton retour avec animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link href="/">
              <Button
                size="lg"
                className="rounded-xl text-sm font-semibold tracking-wide gap-2 px-8 h-11"
                style={{
                  background:
                    "linear-gradient(135deg, #D4A017 0%, #b8860b 100%)",
                  color: "#3a000f",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(212,160,23,0.3)",
                }}
              >
                <motion.div
                  animate={{ x: [0, -4, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <ArrowLeft size={16} />
                </motion.div>
                Retour à l&apos;accueil
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Ligne décorative animée */}
        <motion.div
          aria-hidden="true"
          className="mt-12 w-20 h-[1px] mx-auto"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(212,160,23,0.4), transparent)",
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
        />

        {/* Footer */}
        <motion.p
          className="mt-4 text-[10px] tracking-widest uppercase"
          style={{ color: "rgba(245,222,179,0.2)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          CMA &middot; Connexion &middot; Mentorat
        </motion.p>
      </div>
    </div>
  );
}
