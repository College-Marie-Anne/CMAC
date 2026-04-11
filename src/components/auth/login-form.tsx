"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { GoldenParticles } from "@/components/ui/golden-particles-lazy";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <motion.div
      className="relative flex min-h-screen w-full items-center justify-center px-5 py-10 overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #3a000f 0%, #5c0018 30%, #800020 60%, #5c0018 100%)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <GoldenParticles />

      {/* Ligne dorée décorative horizontale */}
      <motion.div
        className="absolute top-0 left-0 w-full h-[1px]"
        style={{ background: "linear-gradient(90deg, transparent, rgba(212,160,23,0.3), transparent)" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-full h-[1px]"
        style={{ background: "linear-gradient(90deg, transparent, rgba(212,160,23,0.3), transparent)" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, delay: 0.5 }}
      />

      {/* Carte de login */}
      <motion.div
        className="relative w-full max-w-[380px] mx-auto flex flex-col items-center rounded-2xl px-6 py-10 sm:px-8 sm:py-12"
        style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(212,160,23,0.15)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}
        initial={{ y: 30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo avec pulsation subtile */}
        <motion.div
          className="mb-6"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              border: "2px solid rgba(212,160,23,0.3)",
              boxShadow: "0 0 30px rgba(212,160,23,0.15)",
            }}
            animate={{
              boxShadow: [
                "0 0 20px rgba(212,160,23,0.1)",
                "0 0 40px rgba(212,160,23,0.25)",
                "0 0 20px rgba(212,160,23,0.1)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Image
              src="/CMAC.jpeg"
              alt="CMA Connect"
              width={100}
              height={100}
              className="object-cover scale-125"
              style={{ width: "auto", height: "auto" }}
              priority
            />
          </motion.div>
        </motion.div>

        {/* Titre avec apparition séquentielle */}
        <motion.h1
          className="text-xl font-semibold text-white text-center"
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Heureuse de vous revoir
        </motion.h1>
        <motion.p
          className="mt-1.5 mb-8 text-sm text-center"
          style={{ color: "#F5DEB3" }}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          Connectez-vous pour accéder à CMAC
        </motion.p>

        {/* Formulaire avec entrée échelonnée */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* Champ identifiant */}
          <motion.div
            className="relative"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
          >
            <User
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              size={16}
              style={{ color: "#F5DEB3" }}
            />
            <Input
              type="text"
              placeholder="Email, username ou nom complet"
              aria-label="Email, username ou nom complet"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full pl-10 h-11 rounded-xl text-sm text-white placeholder:text-white/30"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          </motion.div>

          {/* Champ mot de passe */}
          <motion.div
            className="relative"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.65 }}
          >
            <Lock
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              size={16}
              style={{ color: "#F5DEB3" }}
            />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              aria-label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 h-11 rounded-xl text-sm text-white placeholder:text-white/30 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "#F5DEB3" }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </motion.div>

          {/* Mot de passe oublié */}
          <motion.div
            className="text-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.75 }}
          >
            <Link
              href="/forgot-password"
              className="text-xs transition-colors"
              style={{ color: "#F5DEB3" }}
            >
              Mot de passe oublié ?
            </Link>
          </motion.div>

          {/* Bouton connexion avec animation hover */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                size="lg"
                className="w-full h-11 rounded-xl text-base font-semibold tracking-wide transition-all"
                style={{
                  background: "linear-gradient(135deg, #D4A017 0%, #b8860b 100%)",
                  color: "#3a000f",
                  border: "none",
                  boxShadow: "0 4px 15px rgba(212,160,23,0.3)",
                }}
              >
                Se connecter
              </Button>
            </motion.div>
          </motion.div>
        </form>

        {/* Séparateur */}
        <motion.div
          className="relative w-full my-7"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <motion.div
            className="absolute inset-0 flex items-center"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.95 }}
          >
            <div className="w-full" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />
          </motion.div>
          <div className="relative flex justify-center text-xs">
            <span className="px-4" style={{ backgroundColor: "transparent", color: "rgba(255,255,255,0.3)" }}>ou</span>
          </div>
        </motion.div>

        {/* Lien inscription */}
        <motion.p
          className="text-center text-sm"
          style={{ color: "rgba(255,255,255,0.5)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="font-medium transition-colors"
            style={{ color: "#F5DEB3" }}
          >
            S&apos;inscrire
          </Link>
        </motion.p>
      </motion.div>

      {/* Footer */}
      <motion.p
        className="absolute bottom-5 w-full text-center text-[11px] tracking-widest uppercase"
        style={{ color: "rgba(245,222,179,0.35)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        CMA &middot; Connexion &middot; Mentorat
      </motion.p>
    </motion.div>
  );
}
