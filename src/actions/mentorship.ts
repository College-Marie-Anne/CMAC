"use server";

import { createClient } from "@/utils/supabase/server";
import { mentorshipRequestSchema } from "@/lib/validations/mentorship";
import { revalidatePath } from "next/cache";

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
    if (validated.data.mentor_id) {
      await supabase.from("notifications").insert({
        user_id: validated.data.mentor_id,
        type: "mentorship",
        title: "Nouvelle demande de mentorat",
        content: "Une élève souhaite être mentorée par vous.",
        target_type: "mentorship_request",
        target_id: request.id,
      });
    }

    revalidatePath("/mentorship");
    return { success: true, data: request };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur interne" };
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

    // Inform the mentee
    const { data: reqData } = await supabase.from("mentorship_requests").select("mentee_id").eq("id", requestId).single();
    if (reqData?.mentee_id) {
      await supabase.from("notifications").insert({
        user_id: reqData.mentee_id,
        type: "mentorship",
        title: "Demande de mentorat acceptée !",
        content: "Une alumni a accepté votre demande. Vous pouvez maintenant échanger avec elle via la messagerie.",
        target_type: "mentorship_session",
        target_id: sessionId,
      });
    }

    revalidatePath("/mentorship");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur interne" };
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
    const { data: reqData, error: reqErr } = await supabase.from("mentorship_requests").select("mentor_id, status").eq("id", requestId).single();
    if (reqErr || !reqData) return { success: false, error: "Requête introuvable" };
    if (reqData.status !== "pending") return { success: false, error: "Requête déjà traitée" };

    const { error: updErr } = await supabase
      .from("mentorship_requests")
      .update({ status: "declined", mentor_id: user.id })
      .eq("id", requestId);

    if (updErr) {
      console.error("Mentorship decline error:", updErr);
      return { success: false, error: "Erreur lors du déclin" };
    }

    revalidatePath("/mentorship");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur interne" };
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

    // Determine target to notify
    const notifyId = session.mentor_id === user.id ? session.mentee_id : session.mentor_id;
    await supabase.from("notifications").insert({
      user_id: notifyId,
      type: "mentorship_completed",
      title: "Mentorat terminé",
      content: "Une de vos sessions de mentorat a été marquée comme terminée.",
      target_type: "mentorship_session",
      target_id: sessionId,
    });

    revalidatePath("/mentorship");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erreur interne" };
  }
}
