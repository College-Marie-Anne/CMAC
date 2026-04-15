"use client";

import Image from "next/image";
import { timeAgo } from "@/lib/time-ago";
import { MessageSquare, FlagOff, Loader2 } from "lucide-react";
import type { MentorshipSession, MentorshipProfile } from "@/lib/types/mentorship";
import { useTransition, useState } from "react";
import { terminateMentorshipSessionAction } from "@/actions/mentorship";
import Link from "next/link";

interface ActiveSessionCardProps {
  session: MentorshipSession;
  currentUserId: string;
}

export function ActiveSessionCard({ session, currentUserId }: ActiveSessionCardProps) {
  const isMentee = currentUserId === session.mentee_id;
  const partner = isMentee ? session.mentor : session.mentee;
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleTerminate = () => {
    if (!confirm("Voulez-vous vraiment terminer ce mentorat ?")) return;
    
    startTransition(async () => {
      setError(null);
      const res = await terminateMentorshipSessionAction(session.id);
      if (!res.success) {
        setError(res.error || "Erreur");
      }
    });
  };

  if (!partner) return null;

  const initials = `${(partner.first_name || "?")[0]}${(partner.last_name || "?")[0]}`;
  const startDateStr = timeAgo(session.started_at);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-cma-bordeaux flex items-center justify-center text-white font-bold shrink-0 overflow-hidden relative">
            {partner.avatar_url ? (
              <Image src={partner.avatar_url} alt="" fill className="object-cover" sizes="48px" />
            ) : (
              initials
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 leading-tight">
              {partner.first_name} {partner.last_name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isMentee ? "Votre mentor" : "Votre élève"} • Actif {startDateStr}
            </p>
            {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
          </div>
        </div>

        {/* Note: the messaging link requires the conversation_id, which we don't fetch directly here. 
            Mais le plan mentionne : "Ouvre automatiquement une conversation DM".
            L'utilisatrice peut utiliser l'onglet régulier 'Messages' pour chercher la conversation, 
            ou on peut juste la renvoyer vers `/messages`. */}
        <Link
          href={`/messages`}
          title="Ouvrir la messagerie"
          className="p-2 rounded-full text-gray-400 hover:bg-gray-50 hover:text-cma-bordeaux transition-colors"
        >
          <MessageSquare size={18} />
        </Link>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
        <div className="text-xs font-semibold text-cma-vert px-2.5 py-1 rounded-full bg-cma-vert/10 border border-cma-vert/20">
          En cours
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleTerminate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <FlagOff size={12} />}
          Terminer la session
        </button>
      </div>
    </div>
  );
}
