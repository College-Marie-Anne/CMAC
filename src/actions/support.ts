"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supportTicketLimiter, checkRateLimit } from "@/lib/rate-limit";
import {
  supportTicketSchema,
  type SupportTicketData,
} from "@/lib/validations/support";

export type SupportActionResult = {
  success: boolean;
  error?: string;
  ticketId?: string;
};

async function requireActiveUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("id", user.id)
    .single();
  if (error || !profile || profile.status !== "active")
    throw new Error("Compte inactif");
  return { supabase, user };
}

/**
 * Crée un ticket de support côté utilisatrice.
 * RLS (spec §680) : INSERT autorisé pour tout user authentifié et actif.
 * Rate limit : 5 / jour / user (spec §731).
 */
export async function createSupportTicketAction(
  data: SupportTicketData
): Promise<SupportActionResult> {
  try {
    const { supabase, user } = await requireActiveUser();

    const { allowed, resetAt } = await checkRateLimit(
      supportTicketLimiter,
      user.id
    );
    if (!allowed) {
      const hours = Math.ceil((resetAt - Date.now()) / 3600000);
      return {
        success: false,
        error: `Trop de tickets envoyés. Réessayez dans ${hours}h.`,
      };
    }

    const parsed = supportTicketSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { data: inserted, error } = await supabase
      .from("support_tickets")
      .insert({
        author_id: user.id,
        category: parsed.data.category,
        subject: parsed.data.subject,
        message: parsed.data.message,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return {
        success: false,
        error: error?.message ?? "Erreur lors de la création du ticket",
      };
    }

    revalidatePath("/support");
    return { success: true, ticketId: inserted.id };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Redirige vers le ticket nouvellement créé après soumission du formulaire.
 * Utilisée comme action du formulaire côté client pour chaîner création + navigation.
 */
export async function submitSupportTicketAndRedirect(
  data: SupportTicketData
): Promise<SupportActionResult> {
  const result = await createSupportTicketAction(data);
  if (result.success && result.ticketId) {
    redirect(`/support/${result.ticketId}`);
  }
  return result;
}
