"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Vote, ChevronRight, AlertCircle, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startElectionAction } from "@/actions/promo";
import { timeAgo } from "@/lib/time-ago";
import type { PromoElection } from "@/lib/types/promo";

interface ElectionWidgetProps {
  election: PromoElection | null;
  hasLeader: boolean;
}

export function ElectionWidget({ election, hasLeader }: ElectionWidgetProps) {
  const [isPending, startTransition] = useTransition();

  const handleStartElection = () => {
    startTransition(async () => {
      await startElectionAction();
    });
  };

  if (hasLeader && !election) return null;

  // Case: No election and no leader
  if (!election && !hasLeader) {
    return (
      <div className="bg-white rounded-2xl border border-cma-or/30 shadow-sm p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-xl bg-cma-or/10 flex items-center justify-center text-cma-or shrink-0">
            <Vote size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Pas encore de Chef de Promo</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Élisez votre représentante pour dynamiser votre Coin Promo et épingler les informations importantes.
            </p>
          </div>
        </div>
        <Button
          onClick={handleStartElection}
          disabled={isPending}
          className="bg-cma-or hover:bg-cma-or/90 text-white rounded-xl h-11 px-6 gap-2 shrink-0 w-full sm:w-auto"
        >
          {isPending ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
          Lancer l'élection
        </Button>
      </div>
    );
  }

  // Case: Active Election
  if (election && (election.status === "nomination" || election.status === "voting")) {
    const isNomination = election.status === "nomination";
    const endLabel = isNomination ? "Fin des candidatures" : "Fin des votes";
    const endDate = new Date(isNomination ? election.nomination_end : election.voting_end);
    
    return (
      <div className="bg-white rounded-2xl border border-cma-bordeaux/20 shadow-sm p-4 mb-6 hover:border-cma-bordeaux/40 transition-colors group">
        <Link href="/promo/election" className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isNomination ? 'bg-cma-bordeaux/10 text-cma-bordeaux' : 'bg-cma-vert/10 text-cma-vert'}`}>
              <Vote size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">
                  Élection de la Chef de Promo
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isNomination ? 'bg-cma-bordeaux/10 text-cma-bordeaux' : 'bg-cma-vert/10 text-cma-vert'}`}>
                  {isNomination ? "Candidatures" : "Votes ouverts"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {endLabel} {timeAgo(endDate.toISOString())}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-cma-bordeaux group-hover:translate-x-1 transition-transform">
            Participer <ChevronRight size={14} />
          </div>
        </Link>
      </div>
    );
  }

  // Case: Recently completed or cancelled (usually not hidden yet by sync)
  return null;
}
