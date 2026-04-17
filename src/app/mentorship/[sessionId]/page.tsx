import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Handshake } from "lucide-react";
import { formatDateTime } from "@/lib/format-date";

type SessionRow = {
  id: string;
  mentor_id: string | null;
  mentee_id: string | null;
  status: "active" | "completed" | "cancelled";
  started_at: string;
  ended_at: string | null;
  request: {
    study_field: string;
    message: string;
  } | null;
  mentor: {
    first_name: string;
    last_name: string;
    username: string;
  } | null;
  mentee: {
    first_name: string;
    last_name: string;
    username: string;
  } | null;
};

export const metadata = {
  title: "Detail mentorat — CMA Connect",
};

export default async function MentorshipSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const { data: session, error } = await supabase
    .from("mentorship_sessions")
    .select(
      `
      id, mentor_id, mentee_id, status, started_at, ended_at,
      request:request_id(study_field, message),
      mentor:mentor_id(first_name, last_name, username),
      mentee:mentee_id(first_name, last_name, username)
    `
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) notFound();

  const typedSession = session as unknown as SessionRow;
  const isParticipant =
    typedSession.mentor_id === user.id || typedSession.mentee_id === user.id;
  const isAdmin = profile.role === "admin";
  if (!isParticipant && !isAdmin) notFound();

  let conversationId: string | null = null;
  if (typedSession.mentor_id && typedSession.mentee_id) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(participant_1.eq.${typedSession.mentor_id},participant_2.eq.${typedSession.mentee_id}),and(participant_1.eq.${typedSession.mentee_id},participant_2.eq.${typedSession.mentor_id})`
      )
      .maybeSingle();
    conversationId = conv?.id ?? null;
  }

  return (
    <main className="min-h-screen bg-cma-gris px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/mentorship"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-gray-700 border border-gray-100 hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Retour mentorat
          </Link>
          {conversationId ? (
            <Link
              href={`/messages/${conversationId}`}
              className="inline-flex items-center gap-2 rounded-xl bg-cma-bordeaux px-3 py-2 text-sm text-white hover:bg-cma-bordeaux/90"
            >
              <MessageSquare size={16} />
              Ouvrir la conversation
            </Link>
          ) : (
            <Link
              href="/messages"
              className="inline-flex items-center gap-2 rounded-xl bg-cma-bordeaux px-3 py-2 text-sm text-white hover:bg-cma-bordeaux/90"
            >
              <MessageSquare size={16} />
              Aller aux messages
            </Link>
          )}
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-cma-bordeaux">
            <Handshake size={18} />
            <h1 className="text-base font-bold">Session de mentorat</h1>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Mentor</p>
              <p className="text-sm font-semibold text-gray-900">
                {typedSession.mentor
                  ? `${typedSession.mentor.first_name} ${typedSession.mentor.last_name}`
                  : "Inconnue"}
              </p>
              <p className="text-xs text-gray-500">
                @{typedSession.mentor?.username ?? "unknown"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Mentee</p>
              <p className="text-sm font-semibold text-gray-900">
                {typedSession.mentee
                  ? `${typedSession.mentee.first_name} ${typedSession.mentee.last_name}`
                  : "Inconnue"}
              </p>
              <p className="text-xs text-gray-500">
                @{typedSession.mentee?.username ?? "unknown"}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Statut</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">
                {typedSession.status}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Demarree le</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatDateTime(typedSession.started_at)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-cma-bordeaux/5 p-4">
            <p className="text-xs font-semibold text-cma-bordeaux mb-1">
              Domaine
            </p>
            <p className="text-sm text-gray-900 mb-3">
              {typedSession.request?.study_field ?? "Non renseigne"}
            </p>
            <p className="text-xs font-semibold text-cma-bordeaux mb-1">
              Message initial
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {typedSession.request?.message ?? "Aucun message"}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
