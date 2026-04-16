import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Vote,
  Calendar,
  AlertCircle,
  Info
} from "lucide-react";
import { CandidateCard } from "@/components/promo/candidate-card";
import { CandidacyForm } from "@/components/promo/candidacy-form";
import { syncElectionStateAction } from "@/actions/promo";
import { timeAgo } from "@/lib/time-ago";
import type { PromoCandidate } from "@/lib/types/promo";

export const metadata = {
  title: "Élection Chef de Promo — CMA Connect",
};

export default async function ElectionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("promo_id")
    .eq("id", user.id)
    .single();

  if (!profile?.promo_id) redirect("/feed");

  // Sync state first
  await syncElectionStateAction(profile.promo_id);

  // Fetch active election
  const { data: election } = await supabase
    .from("promo_elections")
    .select("*")
    .eq("promo_id", profile.promo_id)
    .in("status", ["nomination", "voting"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!election) redirect("/promo");

  // Fetch candidates
  const { data: candidatesRaw } = await supabase
    .from("promo_candidates")
    .select(`
      id, election_id, candidate_id, pitch, vote_count, created_at,
      candidate:candidate_id(id, first_name, last_name, username, avatar_url)
    `)
    .eq("election_id", election.id)
    .order("created_at");

  const candidates = (candidatesRaw || []) as unknown as PromoCandidate[];
  const isCandidate = candidates.some(c => c.candidate_id === user.id);
  const myCandidate = candidates.find(c => c.candidate_id === user.id);

  // Check if voted
  const { data: userVote } = await supabase
    .from("promo_votes")
    .select("promo_candidate_id")
    .eq("election_id", election.id)
    .eq("voter_id", user.id)
    .maybeSingle();

  const isNomination = election.status === "nomination";
  const isVoting = election.status === "voting";
  const endDate = isNomination ? election.nomination_end : election.voting_end;
  const statusLabel = isNomination ? "Candidatures" : "Votes en cours";

  return (
    <div className="min-h-screen bg-cma-gris pb-20">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center h-14 px-4 gap-4">
        <Link
          href="/promo"
          className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
          aria-label="Retour au Coin Promo"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex flex-col flex-1 min-w-0">
          <h1 className="text-sm font-bold text-gray-900 leading-tight">Élections de Promotion</h1>
          <p className="text-[10px] font-bold text-cma-bordeaux uppercase tracking-wider">{statusLabel}</p>
        </div>
        <Link
          href="/promo/elections"
          className="text-xs font-medium text-cma-bordeaux hover:underline shrink-0"
        >
          Historique
        </Link>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Status Header */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Vote size={120} />
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-cma-bordeaux" />
            <span className="text-xs font-semibold text-gray-500">
              {isNomination ? "Clôture des candidatures" : "Clôture du scrutin"} 
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {timeAgo(endDate)}
          </h2>
          <p className="text-sm text-gray-500">
            {isNomination 
              ? "Présentez-vous pour porter la voix de votre promotion et gérer les échanges."
              : "Exprimez votre choix. Votre vote est strictement anonyme."}
          </p>
        </div>

        {/* Requirements Banner if nomination */}
        {isNomination && candidates.length < 2 && (
          <div className="bg-cma-or/10 border border-cma-or/20 rounded-2xl p-4 flex gap-4 items-start">
            <AlertCircle size={20} className="text-cma-or shrink-0" />
            <div className="text-xs text-gray-700 leading-relaxed">
              <p className="font-bold text-cma-or mb-0.5">Scrutin menacé</p>
              Un minimum de **2 candidates** est requis pour valider l&apos;élection. Actuellement : **{candidates.length}/2**.
              En l&apos;absence de candidate supplémentaire, l&apos;élection sera automatiquement annulée à la clôture.
            </div>
          </div>
        )}

        {/* Candidacy Form (Client) */}
        {isNomination && (
          <CandidacyForm 
            electionId={election.id} 
            isCandidate={isCandidate} 
            existingPitch={myCandidate?.pitch ?? null} 
          />
        )}

        {/* Rules Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-4 items-center">
            <Info size={18} className="text-blue-500 shrink-0" />
            <p className="text-[11px] text-blue-700 leading-tight">
              {isNomination 
                ? "Toute membre de la promotion peut se présenter. La phase de vote débutera dès la fin des candidatures."
                : "Vous pouvez changer votre vote à tout moment jusqu'à la fin de la période."}
            </p>
        </div>

        {/* Candidates Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
              Sitting Candidates ({candidates.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {candidates.map((cand) => (
              <CandidateCard 
                key={cand.id}
                candidate={cand}
                electionId={election.id}
                isVotingPhase={isVoting}
                isCurrentUser={cand.candidate_id === user.id}
                currentVoteId={userVote?.promo_candidate_id}
              />
            ))}
          </div>

          {candidates.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-400 italic">Aucune candidate pour le moment...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
