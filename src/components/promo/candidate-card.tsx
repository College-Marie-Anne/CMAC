"use client";

import { useTransition, useState } from "react";
import Image from "next/image";
import { Vote, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { voteCandidateAction } from "@/actions/promo";
import type { PromoCandidate } from "@/lib/types/promo";

interface CandidateCardProps {
  candidate: PromoCandidate;
  electionId: string;
  isVotingPhase: boolean;
  isCurrentUser: boolean;
  currentVoteId?: string | null;
}

export function CandidateCard({
  candidate,
  electionId,
  isVotingPhase,
  isCurrentUser,
  currentVoteId
}: CandidateCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleVote = () => {
    startTransition(async () => {
      setError(null);
      const res = await voteCandidateAction(electionId, candidate.id);
      if (!res.success) {
        setError(res.error || "Erreur lors du vote");
      }
    });
  };

  const isCurrentSelection = currentVoteId === candidate.id;

  return (
    <div className={`bg-white rounded-2xl border transition-all ${isCurrentSelection ? 'border-cma-bordeaux ring-1 ring-cma-bordeaux shadow-md' : 'border-gray-100 shadow-sm'}`}>
      <div className="p-5 flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full border-4 border-white shadow-sm overflow-hidden bg-gray-100 relative">
            {candidate.candidate?.avatar_url ? (
              <Image 
                src={candidate.candidate.avatar_url} 
                alt="" 
                fill 
                className="object-cover" 
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-400">
                {candidate.candidate?.first_name[0]}{candidate.candidate?.last_name[0]}
              </div>
            )}
          </div>
          {isCurrentUser && (
            <span className="absolute -bottom-1 -right-1 bg-cma-vert text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white">
              MOI
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-gray-900 leading-tight">
          {candidate.candidate?.first_name} {candidate.candidate?.last_name}
        </h3>
        <p className="text-xs text-gray-500 mb-4">@{candidate.candidate?.username}</p>

        {/* Pitch */}
        <div className="w-full bg-gray-50 rounded-xl p-3 mb-4 min-h-[80px]">
          <p className="text-xs text-gray-700 leading-relaxed italic">
            &quot;{candidate.pitch || "Aucune présentation fournie"}&quot;
          </p>
        </div>

        {/* Vote Stats (Always visible if voting phase started) */}
        {isVotingPhase && (
          <div className="mb-4 flex flex-col items-center">
            <span className="text-lg font-bold text-cma-bordeaux">{candidate.vote_count}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Vote{candidate.vote_count > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Vote Button */}
        {isVotingPhase && !isCurrentUser && (
          <Button
            onClick={handleVote}
            disabled={isPending || isCurrentSelection}
            className={`w-full rounded-xl gap-2 transition-all ${
              isCurrentSelection 
                ? 'bg-cma-vert hover:bg-cma-vert text-white shadow-lg' 
                : 'bg-cma-bordeaux hover:bg-cma-bordeaux/90 text-white'
            }`}
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isCurrentSelection ? (
              <CheckCircle2 size={16} />
            ) : (
              <Vote size={16} />
            )}
            {isCurrentSelection ? "Voté !" : "Voter pour elle"}
          </Button>
        )}

        {error && <p className="text-[10px] text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
}
