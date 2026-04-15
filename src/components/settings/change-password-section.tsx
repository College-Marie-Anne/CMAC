"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-resolver";
import { Lock, Eye, EyeOff, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePasswordSchema,
  type ChangePasswordData,
} from "@/lib/validations/password";
import { changePasswordAction } from "@/actions/password";

export function ChangePasswordSection() {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ChangePasswordData>({
    resolver: typedResolver<ChangePasswordData>(changePasswordSchema),
    defaultValues: { old_password: "", password: "", confirm_password: "" },
  });

  const onSubmit = (data: ChangePasswordData) => {
    setServerError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await changePasswordAction(data);
      if (!result.success) {
        setServerError(result.error ?? "Erreur");
        return;
      }
      setSuccess(true);
      reset();
      // Laisser le message de succès visible quelques secondes
      setTimeout(() => setSuccess(false), 5000);
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Lock size={16} /> Mot de passe
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Minimum 8 caractères avec au moins une majuscule, une minuscule et un chiffre.
        </p>
      </div>

      {serverError && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          {serverError}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2 text-xs text-green-700 dark:text-green-400">
          <Check size={14} className="shrink-0 mt-0.5" />
          Mot de passe mis à jour avec succès.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Ancien mot de passe */}
        <div>
          <Label htmlFor="old_password" className="text-xs text-gray-600 dark:text-gray-400">
            Ancien mot de passe
          </Label>
          <div className="relative mt-1">
            <Input
              id="old_password"
              type={showOld ? "text" : "password"}
              {...register("old_password")}
              placeholder="••••••••"
              disabled={isPending}
              className="rounded-xl h-10 pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowOld(!showOld)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showOld ? "Masquer" : "Afficher"}
              tabIndex={-1}
            >
              {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {errors.old_password && (
            <p className="mt-1 text-xs text-red-500">{errors.old_password.message}</p>
          )}
        </div>

        {/* Nouveau mot de passe */}
        <div>
          <Label htmlFor="new_password" className="text-xs text-gray-600 dark:text-gray-400">
            Nouveau mot de passe
          </Label>
          <div className="relative mt-1">
            <Input
              id="new_password"
              type={showNew ? "text" : "password"}
              {...register("password")}
              placeholder="Min. 8 caractères"
              disabled={isPending}
              className="rounded-xl h-10 pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showNew ? "Masquer" : "Afficher"}
              tabIndex={-1}
            >
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Confirmation */}
        <div>
          <Label htmlFor="confirm_password" className="text-xs text-gray-600 dark:text-gray-400">
            Confirmer le nouveau mot de passe
          </Label>
          <div className="relative mt-1">
            <Input
              id="confirm_password"
              type={showConfirm ? "text" : "password"}
              {...register("confirm_password")}
              placeholder="Re-tapez le nouveau mot de passe"
              disabled={isPending}
              className="rounded-xl h-10 pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showConfirm ? "Masquer" : "Afficher"}
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="mt-1 text-xs text-red-500">{errors.confirm_password.message}</p>
          )}
        </div>

        <div className="pt-1">
          <Button
            type="submit"
            size="sm"
            disabled={isPending || !isDirty}
            className="rounded-xl text-xs bg-cma-bordeaux text-white gap-1"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
            {isPending ? "Mise à jour..." : "Mettre à jour le mot de passe"}
          </Button>
        </div>
      </form>
    </div>
  );
}
