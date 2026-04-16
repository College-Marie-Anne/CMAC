"use server";

import { createClient } from "@/utils/supabase/server";
import { mentorshipRequestSchema } from "@/lib/validations/mentorship";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { dispatchPush } from "@/lib/push";

export async function sendMentorshipRequestAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Non autorisé" };

    const study_field = formData.get("study_field")?.toString() || "";
    const message = formData.get("message")?.toString() || "";
    const rawMentorId = formData.get("mentor_id")?.toString() || null;
    const mentor_id = rawMentorId === "null" || rawMentorId === "" ? null : rawMentorId;

    const validated = mentorshipRequestSchema.safeParse({
      study_field,
      message,
      mentor_id,
    });

    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    // Checking rate limits: 5 par jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: dailyCount } = await supabase
      .from("mentorship_requests")
      .select("id", { count: "exact", head: true })
      .eq("mentee_id", user.id)
      .gte("created_at", today.toISOString());

    if ((dailyCount || 0) >= 5) {
      return { success: false, error: "Limite de requêtes journalières atteinte (5/jour)" };
    }

    // Checking max active sessions limit before inserting
    const { count: activeSessions } = await supabase
      .from("mentorship_sessions")
      .select("id", { count: "exact", head: true })
      .eq("mentee_id", user.id)
      .eq("status", "active");

    if ((activeSessions || 0) >= 3) {
      return { success: false, error: "Vous avez déjà atteint le quota maximum de 3 mentorats actifs" };
    }

    const { data: request, error: rpErr } = await supabase
      .from("mentorship_requests")
      .insert({
        mentee_id: user.id,
        mentor_id: validated.data.mentor_id || null,
        message: validated.data.message,
        study_field: validated.data.study_field,
        status: "pending",
      })
      .select()
      .single();

    if (rpErr) {
      console.error("Mentorship send error:", rpErr);
      return { success: false, error: "Erreur serveur" };
    }

    // Create notification if target is specific mentor
    // Passe par RPC SECURITY DEFINER notify_user (migration 023) :
    // - Respecte la préférence opt-in (champ 'mentorship')
    // - Filtre les comptes non-actifs
    // - Bypass la RLS sur notifications (pas d'INSERT direct possible)
    if (validated.data.mentor_id && validated.data.mentor_id !== user.id) {
      const targetMentorId = validated.data.mentor_id;
      const content = "Une eleve souhaite etre mentoree par vous.";
      await supabase.rpc("notify_user", {
        p_recipient: targetMentorId,
        p_type: "mentorship",
        p_reference_id: request.id,
        p_content: content,
        p_preference_field: "mentorship",
      });
      after(() => dispatchPush(targetMentorId, "mentorship", request.id, content));
    }

    revalidatePath("/mentorship");
    return { success: true, data: request };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur interne" };
  }
}

export async function acceptMentorshipRequestAction(requestId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Non autorisé" };

    // Use RPC function
    const { data: sessionId, error: rpcErr } = await supabase.rpc("accept_mentorship_request", {
      p_request_id: requestId,
    });

    if (rpcErr) {
      console.error("Mentorship accept error:", rpcErr);
      if (rpcErr.message.includes("quota") || rpcErr.message.includes("3 active")) {
        return { success: false, error: "L'élève a atteint son quota de 3 mentorats" };
      }
      return { success: false, error: "Impossible d'accepter la requête" };
    }

    // Inform the mentee via RPC notify_user (préférence opt-in 'mentorship').
    const { data: reqData } = await supabase.from("mentorship_requests").select("mentee_id").eq("id", requestId).single();
    if (reqData?.mentee_id && reqData.mentee_id !== user.id) {
      const menteeId = reqData.mentee_id;
      const content =
        "Une alumni a accepte votre demande. Vous pouvez maintenant echanger via la messagerie.";
      await supabase.rpc("notify_user", {
        p_recipient: menteeId,
        p_type: "mentorship",
        p_reference_id: sessionId,
        p_content: content,
        p_preference_field: "mentorship",
      });
      after(() => dispatchPush(menteeId, "mentorship", sessionId as string, content));
    }

    revalidatePath("/mentorship");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur interne" };
  }
}

export async function declineMentorshipRequestAction(requestId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Non autorisé" };

    // Only mentor_id = user or open request if user is alumni
    const { data: reqData, error: reqErr } = await supabase
      .from("mentorship_requests")
      .select("mentor_id, mentee_id, status")
      .eq("id", requestId)
      .single();
    if (reqErr || !reqData) return { success: false, error: "Requête introuvable" };
    if (reqData.status !== "pending") return { success: false, error: "Requête déjà traitée" };

    if (reqData.mentor_id && reqData.mentor_id !== user.id) {
      return { success: false, error: "Operation non autorisee" };
    }

    const { error: updErr } = await supabase
      .from("mentorship_requests")
      .update({ status: "declined", mentor_id: user.id })
      .eq("id", requestId);

    if (updErr) {
      console.error("Mentorship decline error:", updErr);
      return { success: false, error: "Erreur lors du déclin" };
    }

    if (reqData.mentee_id && reqData.mentee_id !== user.id) {
      const menteeId = reqData.mentee_id;
      const content = "Votre demande de mentorat a ete declinee.";
      await supabase.rpc("notify_user", {
        p_recipient: menteeId,
        p_type: "mentorship",
        p_reference_id: requestId,
        p_content: content,
        p_preference_field: "mentorship",
      });
      after(() => dispatchPush(menteeId, "mentorship", requestId, content));
    }

    revalidatePath("/mentorship");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur interne" };
  }
}

export async function terminateMentorshipSessionAction(sessionId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Non autorisé" };

    // Check if user is part of the session
    const { data: session } = await supabase.from("mentorship_sessions").select("mentor_id, mentee_id").eq("id", sessionId).single();
    if (!session || (session.mentor_id !== user.id && session.mentee_id !== user.id)) {
      return { success: false, error: "Opération non autorisée" };
    }

    const { error: updErr } = await supabase
      .from("mentorship_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", sessionId);

    if (updErr) {
      console.error("Mentorship terminate session error:", updErr);
      return { success: false, error: "Impossible de terminer la session" };
    }

    // Determine target to notify (l'autre partie de la session)
    const notifyId = session.mentor_id === user.id ? session.mentee_id : session.mentor_id;
    if (notifyId && notifyId !== user.id) {
      const targetId = notifyId;
      const content = "Une de vos sessions de mentorat a ete marquee comme terminee.";
      await supabase.rpc("notify_user", {
        p_recipient: targetId,
        p_type: "mentorship_completed",
        p_reference_id: sessionId,
        p_content: content,
        p_preference_field: "mentorship_completed",
      });
      after(() => dispatchPush(targetId, "mentorship_completed", sessionId, content));
    }

    revalidatePath("/mentorship");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur interne" };
  }
}
