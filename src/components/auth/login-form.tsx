"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-resolver";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CalendarDays,
  KeyRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { GoldenParticles } from "@/components/ui/golden-particles-lazy";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { loginAction } from "@/actions/auth";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [needsDob, setNeedsDob] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: typedResolver<LoginFormData>(loginSchema),
    defaultValues: { identifier: "", password: "", dob: undefined, otp_code: undefined },
  });

  const onSubmit = (data: LoginFormData) => {
    setServerError(null);
    startTransition(async () => {
      const result = await loginAction(data);
      if (!result.success) {
        if (result.needsDob && !needsDob) {
          setNeedsDob(true);
          setServerError(result.error ?? null);
        } else if (result.needsOtp && !needsOtp) {
          setNeedsOtp(true);
          setServerError(result.error ?? null);
        } else {
          setServerError(result.error ?? null);
        }
      }
    });
  };

  const handleDobClear = () => {
    setNeedsDob(false);
    setNeedsOtp(false);
    setValue("dob", undefined);
    setValue("otp_code", undefined);
    setServerError(null);
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  const inputErrorStyle = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(220,38,38,0.5)",
  };

  return (
    <motion.div
      className="relative flex min-h-screen w-full items-center justify-center px-5 py-10 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <GoldenParticles />

      {/* Lignes dorées décoratives */}
      <motion.div
        className="absolute top-0 left-0 w-full h-[1px]"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(212,160,23,0.3), transparent)",
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-full h-[1px]"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(212,160,23,0.3), transparent)",
        }}
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
        {/* Logo */}
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
              loading="eager"
            />
          </motion.div>
        </motion.div>

        {/* Titre */}
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

        {/* Message d'erreur serveur */}
        <AnimatePresence>
          {serverError && (
            <motion.div
              className="w-full mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
              style={{
                background: "rgba(220,38,38,0.12)",
                border: "1px solid rgba(220,38,38,0.25)",
                color: "#fca5a5",
              }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulaire */}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
          {/* Champ identifiant */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
          >
            <div className="relative">
              <User
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                size={16}
                style={{ color: "#F5DEB3" }}
              />
              <Input
                type="text"
                placeholder="Email, username ou nom complet"
                aria-label="Email, username ou nom complet"
                {...register("identifier", {
                  onChange: () => {
                    if (needsDob) handleDobClear();
                  },
                })}
                disabled={isPending}
                className="w-full pl-10 h-11 rounded-xl text-sm text-white placeholder:text-white/30 disabled:opacity-50"
                style={errors.identifier ? inputErrorStyle : inputStyle}
              />
            </div>
            {errors.identifier && (
              <p className="mt-1.5 text-xs" style={{ color: "#fca5a5" }}>
                {errors.identifier.message}
              </p>
            )}
          </motion.div>

          {/* Champ mot de passe */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.65 }}
          >
            <div className="relative">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                size={16}
                style={{ color: "#F5DEB3" }}
              />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                aria-label="Mot de passe"
                {...register("password")}
                disabled={isPending}
                className="w-full pl-10 pr-10 h-11 rounded-xl text-sm text-white placeholder:text-white/30 disabled:opacity-50 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                style={errors.password ? inputErrorStyle : inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "#F5DEB3" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs" style={{ color: "#fca5a5" }}>
                {errors.password.message}
              </p>
            )}
          </motion.div>

          {/* Champ date de naissance — apparaît dynamiquement si homonymes */}
          <AnimatePresence>
            {needsDob && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="relative">
                  <CalendarDays
                    className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    size={16}
                    style={{ color: "#F5DEB3" }}
                  />
                  <Input
                    type="date"
                    placeholder="Date de naissance"
                    aria-label="Date de naissance"
                    {...register("dob")}
                    disabled={isPending}
                    className="w-full pl-10 h-11 rounded-xl text-sm text-white placeholder:text-white/30 disabled:opacity-50 [color-scheme:dark]"
                    style={inputStyle}
                  />
                </div>
                <p
                  className="mt-1.5 text-xs"
                  style={{ color: "rgba(245,222,179,0.5)" }}
                >
                  Précisez votre date de naissance pour identifier votre compte
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Champ code OTP — apparaît si même nom + même DOB */}
          <AnimatePresence>
            {needsOtp && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="relative">
                  <KeyRound
                    className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    size={16}
                    style={{ color: "#F5DEB3" }}
                  />
                  <Input
                    type="text"
                    placeholder="Code reçu par email"
                    aria-label="Code de vérification"
                    {...register("otp_code")}
                    disabled={isPending}
                    className="w-full pl-10 h-11 rounded-xl text-sm text-white placeholder:text-white/30 disabled:opacity-50 tracking-widest text-center"
                    style={inputStyle}
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                </div>
                <p
                  className="mt-1.5 text-xs"
                  style={{ color: "rgba(245,222,179,0.5)" }}
                >
                  Entrez le code à 6 chiffres reçu sur votre boîte mail
                </p>
              </motion.div>
            )}
          </AnimatePresence>

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

          {/* Bouton connexion */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <motion.div
              whileHover={isPending ? undefined : { scale: 1.02 }}
              whileTap={isPending ? undefined : { scale: 0.98 }}
            >
              <Button
                type="submit"
                size="lg"
                disabled={isPending}
                className="w-full h-11 rounded-xl text-base font-semibold tracking-wide transition-all disabled:opacity-70"
                style={{
                  background:
                    "linear-gradient(135deg, #D4A017 0%, #b8860b 100%)",
                  color: "#3a000f",
                  border: "none",
                  boxShadow: "0 4px 15px rgba(212,160,23,0.3)",
                }}
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Connexion...
                  </span>
                ) : (
                  "Se connecter"
                )}
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
            <div
              className="w-full"
              style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
            />
          </motion.div>
          <div className="relative flex justify-center text-xs">
            <span
              className="px-4"
              style={{
                backgroundColor: "transparent",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              ou
            </span>
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
            scroll={false}
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
      >
        CMA &middot; Connexion &middot; Mentorat
      </motion.p>
    </motion.div>
  );
}
