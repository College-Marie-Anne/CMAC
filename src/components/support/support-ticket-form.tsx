"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-resolver";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  supportTicketSchema,
  type SupportTicketData,
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
} from "@/lib/validations/support";
import { createSupportTicketAction } from "@/actions/support";

export function SupportTicketForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SupportTicketData>({
    resolver: typedResolver<SupportTicketData>(supportTicketSchema),
    defaultValues: { category: "other", subject: "", message: "" },
  });

  const messageValue = watch("message") ?? "";

  const onSubmit = (data: SupportTicketData) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createSupportTicketAction(data);
      if (!result.success) {
        setServerError(result.error ?? "Erreur inattendue");
        return;
      }
      reset();
      if (result.ticketId) {
        router.push(`/support/${result.ticketId}`);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600"
        >
          <AlertCircle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
          {serverError}
        </div>
      ) : null}

      <div>
        <Label htmlFor="support-category" className="text-xs text-gray-600">
          Catégorie
        </Label>
        <select
          id="support-category"
          {...register("category")}
          disabled={isPending}
          className="mt-1 w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cma-bordeaux/30 disabled:opacity-50"
        >
          {SUPPORT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {SUPPORT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        {errors.category ? (
          <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="support-subject" className="text-xs text-gray-600">
          Sujet
        </Label>
        <Input
          id="support-subject"
          type="text"
          maxLength={150}
          placeholder="Objet de votre demande"
          {...register("subject")}
          disabled={isPending}
          className="mt-1"
        />
        {errors.subject ? (
          <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="support-message" className="text-xs text-gray-600">
          Message
        </Label>
        <Textarea
          id="support-message"
          rows={6}
          maxLength={2000}
          placeholder="Décrivez votre demande en détail (minimum 20 caractères)"
          {...register("message")}
          disabled={isPending}
          className="mt-1"
        />
        <div className="flex items-center justify-between mt-1">
          {errors.message ? (
            <p className="text-xs text-red-600">{errors.message.message}</p>
          ) : (
            <span />
          )}
          <p className="text-[11px] text-gray-400">
            {messageValue.length} / 2000
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-cma-bordeaux px-5 h-10 text-sm font-semibold text-white hover:bg-cma-bordeaux/90 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              Envoi...
            </>
          ) : (
            <>
              <Send size={14} aria-hidden="true" />
              Envoyer
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
