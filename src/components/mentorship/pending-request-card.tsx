"use client";

import Image from "next/image";
import { timeAgo } from "@/lib/time-ago";
import { Check, X, Loader2 } from "lucide-react";
import type { MentorshipRequest } from "@/lib/types/mentorship";
import { useTransition, useState } from "react";
import {
  acceptMentorshipRequestAction,
  declineMentorshipRequestAction,
} from "@/actions/mentorship";

interface PendingRequestCardProps {
  request: MentorshipRequest;
  view: "mentee" | "mentor"; // Depending on whose dashboard this is
}

export function PendingRequestCard({ request, view }: PendingRequestCardProps) {
  const isMenteeView = view === "mentee";
  const profile = isMenteeView ? request.mentor : request.mentee; // The other person

  const [isPendingAccept, startAccept] = useTransition();
  const [isPendingDecline, startDecline] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAccept = () => {
    startAccept(async () => {
      setError(null);
      const res = await acceptMentorshipRequestAction(request.id);
      if (!res.success) {
        setError(res.error || "Erreur lors de l'acceptation");
      }
    });
  };

  const handleDecline = () => {
    if (!confirm("Voulez-vous vraiment décliner cette demande ?")) return;
    startDecline(async () => {
      setError(null);
      const res = await declineMentorshipRequestAction(request.id);
      if (!res.success) {
        setError(res.error || "Erreur");
      }
    });
  };

  // S'il n'y a pas de mentor ciblé (demande ouverte) de la vue mentee
  const isOpenRequest = !request.mentor_id;

  const initials = profile
    ? `${(profile.first_name || "?")[0]}${(profile.last_name || "?")[0]}`
    : "?";

  const dateStr = timeAgo(request.created_at);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm transition-shadow hover:shadow-md h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        {profile ? (
          <div className="w-10 h-10 rounded-full bg-cma-bordeaux flex items-center justify-center text-white font-bold shrink-0 overflow-hidden relative">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt="" fill className="object-cover" sizes="40px" />
            ) : (
              initials
            )}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-cma-or/20 flex items-center justify-center text-cma-or font-bold shrink-0">
            ?
          </div>
        )}
        
        <div>
          <h3 className="text-sm font-bold text-gray-900 leading-tight">
            {profile ? `${profile.first_name} ${profile.last_name}` : "Demande ouverte"}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {isMenteeView 
              ? (isOpenRequest ? "À toutes les Alumni" : "À une Alumni ciblée")
              : (profile?.class || "Élève")} • {dateStr}
          </p>
        </div>
      </div>

      <div className="text-xs text-gray-700 bg-gray-50 rounded-xl p-3 mb-3 flex-1">
        <p className="font-semibold text-cma-bordeaux mb-1">{request.study_field}</p>
        <p className="line-clamp-4 leading-relaxed">{request.message}</p>
      </div>

      {error && <p className="text-[10px] text-red-500 mb-2">{error}</p>}

      {!isMenteeView ? (
        <div className="flex items-center gap-2 mt-auto">
          <button
            onClick={handleAccept}
            disabled={isPendingAccept || isPendingDecline}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-cma-bordeaux text-white text-xs font-semibold hover:bg-cma-bordeaux/90 transition-colors disabled:opacity-50"
          >
            {isPendingAccept ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Accepter
          </button>
          
          <button
            onClick={handleDecline}
            disabled={isPendingAccept || isPendingDecline}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0"
            title="Décliner"
          >
            {isPendingDecline ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
          </button>
        </div>
      ) : (
        <div className="flex items-center mt-auto">
           <span className="text-xs font-medium px-2 py-1 bg-cma-or/10 text-cma-or rounded-lg border border-cma-or/20">
             En attente
           </span>
        </div>
      )}
    </div>
  );
}
