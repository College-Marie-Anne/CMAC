"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-resolver";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { GoldenParticles } from "@/components/ui/golden-particles-lazy";
import {
  forgotPasswordSchema,
  type ForgotPasswordData,
} from "@/lib/validations/password";
import { forgotPasswordAction } from "@/actions/password";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordData>({
    resolver: typedResolver<ForgotPasswordData>(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: ForgotPasswordData) => {
    startTransition(async () => {
      const result = await forgotPasswordAction(data);
      if (result.success) {
        setSent(true);
      }
    });
  };

  return (
    <motion.div
      className="relative flex min-h-screen w-full items-center justify-center px-5 py-10 overflow-hidden"
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
          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-xl font-semibold text-white text-center mb-2">
                  Mot de passe oublié
                </h1>
                <p
                  className="text-sm text-center mb-8"
                  style={{ color: "rgba(245,222,179,0.6)" }}
                >
                  Entrez votre email pour recevoir un lien de réinitialisation
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="relative">
                    <Mail
                      className="absolute left-3.5 top-1/2 -translate-y-1/2"
                      size={16}
                      style={{ color: "#F5DEB3" }}
                    />
                    <Input
                      type="email"
                      placeholder="votre@email.com"
                      aria-label="Adresse email"
                      {...register("email")}
                      disabled={isPending}
                      className="w-full pl-10 h-11 rounded-xl text-sm text-white placeholder:text-white/30 disabled:opacity-50"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: errors.email
                          ? "1px solid rgba(220,38,38,0.5)"
                          : "1px solid rgba(255,255,255,0.1)",
                      }}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs" style={{ color: "#fca5a5" }}>
                      {errors.email.message}
                    </p>
                  )}

                  <motion.div
                    whileHover={isPending ? undefined : { scale: 1.02 }}
                    whileTap={isPending ? undefined : { scale: 0.98 }}
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
                          Envoi...
                        </span>
                      ) : (
                        "Envoyer le lien"
                      )}
                    </Button>
                  </motion.div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                  style={{
                    background: "rgba(0,107,63,0.15)",
                    border: "1px solid rgba(0,107,63,0.3)",
                  }}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <CheckCircle2 size={24} style={{ color: "#8fd6b4" }} />
                </motion.div>

                <h2 className="text-lg font-semibold text-white mb-2">
                  Email envoyé
                </h2>
                <p
                  className="text-sm leading-relaxed mb-6"
                  style={{ color: "rgba(245,222,179,0.6)" }}
                >
                  Si un compte existe avec cette adresse, vous recevrez un lien
                  de réinitialisation dans quelques instants.
                  Vérifiez aussi vos spams.
                </p>

                <Link href="/login">
                  <Button
                    variant="outline"
                    className="rounded-xl gap-2 h-10 px-6"
                    style={{
                      borderColor: "rgba(255,255,255,0.15)",
                      color: "#F5DEB3",
                    }}
                  >
                    <ArrowLeft size={14} />
                    Retour à la connexion
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Lien retour */}
        {!sent && (
          <motion.div
            className="mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: "rgba(245,222,179,0.5)" }}
            >
              <ArrowLeft size={14} />
              Retour à la connexion
            </Link>
          </motion.div>
        )}

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
