"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-resolver";
import { z } from "zod";
import { motion } from "framer-motion";
import { UserPlus, Loader2, AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { createAdminAction } from "@/actions/admin";

const createAdminSchema = z.object({
  first_name: z.string().min(1, "Requis").max(100),
  last_name: z.string().min(1, "Requis").max(100),
  email: z.string().email("Email invalide"),
  username: z
    .string()
    .min(3, "Min. 3 caractères")
    .max(20, "Max. 20 caractères")
    .regex(/^[a-zA-Z0-9_]+$/, "Alphanumérique + underscore"),
  temp_password: z
    .string()
    .min(8, "Min. 8 caractères")
    .regex(/[A-Z]/, "1 majuscule")
    .regex(/[a-z]/, "1 minuscule")
    .regex(/[0-9]/, "1 chiffre"),
});

type CreateAdminData = z.infer<typeof createAdminSchema>;

export default function CreateAdminPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ username: string; password: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAdminData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: typedResolver<CreateAdminData>(createAdminSchema),
    defaultValues: { first_name: "", last_name: "", email: "", username: "", temp_password: "" },
  });

  const onSubmit = (data: CreateAdminData) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createAdminAction(data);
      if (!result.success) {
        setServerError(result.error ?? "Erreur lors de la création");
      } else {
        setSuccess({ username: data.username, password: data.temp_password });
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} className="text-green-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Admin créé avec succès</h2>
            <p className="text-sm text-gray-500 mb-6">
              Transmettez ces identifiants à l&apos;admin. Le mot de passe devra être changé à la première connexion.
            </p>

            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Username</p>
                  <p className="text-sm font-mono font-medium">{success.username}</p>
                </div>
                <button onClick={() => copyToClipboard(success.username)} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                  <Copy size={14} className="text-gray-400" />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Mot de passe temporaire</p>
                  <p className="text-sm font-mono font-medium">{success.password}</p>
                </div>
                <button onClick={() => copyToClipboard(success.password)} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                  <Copy size={14} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="mt-6 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700">
                Ce mot de passe ne sera plus jamais affiché. Notez-le maintenant.
              </p>
            </div>

            <Link href="/admin/users" className="block mt-6">
              <Button variant="outline" className="rounded-xl w-full">
                Retour à la liste
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Créer un admin</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ce compte sera immédiatement actif avec le rôle admin
        </p>
      </div>

      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-6">
          {serverError && (
            <motion.div
              className="mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Prénoms</Label>
                <Input {...register("first_name")} placeholder="Prénoms" className="rounded-xl h-10" disabled={isPending} />
                {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Nom</Label>
                <Input {...register("last_name")} placeholder="Nom" className="rounded-xl h-10" disabled={isPending} />
                {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>}
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Email</Label>
              <Input {...register("email")} type="email" placeholder="admin@email.com" className="rounded-xl h-10" disabled={isPending} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Username</Label>
              <Input {...register("username")} placeholder="admin_username" className="rounded-xl h-10" disabled={isPending} />
              {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Mot de passe temporaire</Label>
              <Input {...register("temp_password")} type="text" placeholder="Min. 8 chars, 1 maj, 1 min, 1 chiffre" className="rounded-xl h-10 font-mono" disabled={isPending} />
              <p className="text-[10px] text-gray-400 mt-1">L&apos;admin devra le changer à la première connexion</p>
              {errors.temp_password && <p className="text-xs text-red-500 mt-1">{errors.temp_password.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-10 rounded-xl gap-2 bg-cma-or hover:bg-cma-or/80 text-black font-semibold"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Création...
                </span>
              ) : (
                <>
                  <UserPlus size={16} />
                  Créer le compte admin
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
