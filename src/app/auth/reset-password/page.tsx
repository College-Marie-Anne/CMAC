"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-resolver";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { GoldenParticles } from "@/components/ui/golden-particles-lazy";
import {
  resetPasswordSchema,
  type ResetPasswordData,
} from "@/lib/validations/password";
import { resetPasswordAction } from "@/actions/password";

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordData>({
    resolver: typedResolver<ResetPasswordData>(resetPasswordSchema),
    defaultValues: { password: "", confirm_password: "" },
  });

  const onSubmit = (data: ResetPasswordData) => {
    setServerError(null);
    startTransition(async () => {
      const result = await resetPasswordAction(data);
      if (!result.success && result.error) {
        setServerError(result.error);
      }
    });
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
      // Gradient bordeaux inline — le body global est gris clair depuis le
      // fix du flash rouge, chaque page publique porte désormais son fond.
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #800020 0%, #5c0018 40%, #3a000f 80%, #1a0008 100%)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
    >
      <GoldenParticles />

      <div className="relative w-full max-w-[380px] mx-auto flex flex-col items-center">
        {/* Logo */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div
            className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              border: "2px solid rgba(212,160,23,0.3)",
              boxShadow: "0 0 25px rgba(212,160,23,0.12)",
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
        </motion.div>

        {/* Carte */}
        <motion.div
          className="w-full rounded-2xl px-6 py-10 sm:px-8"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(212,160,23,0.15)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
          }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <h1 className="text-xl font-semibold text-white text-center mb-2">
            Nouveau mot de passe
          </h1>
          <p
            className="text-sm text-center mb-8"
            style={{ color: "rgba(245,222,179,0.6)" }}
          >
            Choisissez un mot de passe sécurisé
          </p>

          {/* Erreur serveur */}
          {serverError && (
            <motion.div
              className="mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
              style={{
                background: "rgba(220,38,38,0.12)",
                border: "1px solid rgba(220,38,38,0.25)",
                color: "#fca5a5",
              }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Nouveau mot de passe */}
            <div>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  size={16}
                  style={{ color: "#F5DEB3" }}
                />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nouveau mot de passe"
                  aria-label="Nouveau mot de passe"
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
              <p
                className="mt-1.5 text-xs"
                style={{ color: "rgba(245,222,179,0.5)" }}
              >
                Min. 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
              </p>
              {errors.password && (
                <p className="mt-1 text-xs" style={{ color: "#fca5a5" }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirmation */}
            <div>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  size={16}
                  style={{ color: "#F5DEB3" }}
                />
                <Input
                  type="password"
                  placeholder="Confirmer le mot de passe"
                  aria-label="Confirmer le mot de passe"
                  {...register("confirm_password")}
                  disabled={isPending}
                  className="w-full pl-10 h-11 rounded-xl text-sm text-white placeholder:text-white/30 disabled:opacity-50"
                  style={
                    errors.confirm_password ? inputErrorStyle : inputStyle
                  }
                />
              </div>
              {errors.confirm_password && (
                <p className="mt-1.5 text-xs" style={{ color: "#fca5a5" }}>
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            {/* Bouton */}
            <motion.div
              whileHover={isPending ? undefined : { scale: 1.02 }}
              whileTap={isPending ? undefined : { scale: 0.98 }}
              className="pt-2"
            >
              <Button
                type="submit"
                size="lg"
                disabled={isPending}
                className="w-full h-11 rounded-xl text-sm font-semibold tracking-wide disabled:opacity-70"
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
                    <Loader2 size={16} className="animate-spin" />
                    Mise à jour...
                  </span>
                ) : (
                  "Changer le mot de passe"
                )}
              </Button>
            </motion.div>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="mt-10 text-[11px] tracking-widest uppercase"
          style={{ color: "rgba(245,222,179,0.25)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          CMA &middot; Connexion &middot; Mentorat
        </motion.p>
      </div>
    </motion.div>
  );
}
