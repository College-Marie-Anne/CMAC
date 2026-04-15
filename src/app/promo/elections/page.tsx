import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Trophy, Calendar, XCircle } from "lucide-react";

export const metadata = {
  title: "Historique des élections — CMA Connect",
};

type ElectionRow = {
  id: string;
  status: "nomination" | "voting" | "completed" | "cancelled";
  nomination_end: string;
  voting_end: string;
  created_at: string;
  updated_at: string;
  winner_id: string | null;
  winner: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
};

type CandidateRow = {
  election_id: string;
  vote_count: number;
  candidate_id: string;
};

const STATUS_LABELS: Record<ElectionRow["status"], string> = {
  nomination: "Candidatures en cours",
  voting: "Vote en cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

export default async function ElectionsHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("promo_id, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (!profile.promo_id) redirect("/promo");

  // Toutes les élections de la promo, historique complet
  const { data: electionsRaw } = await supabase
    .from("promo_elections")
    .select(
      `
      id, status, nomination_end, voting_end, created_at, updated_at, winner_id,
      winner:winner_id(id, first_name, last_name, username, avatar_url)
    `
    )
    .eq("promo_id", profile.promo_id)
    .order("created_at", { ascending: false });

  const elections = (electionsRaw ?? []) as unknown as ElectionRow[];

  // Nombre de candidates + total de votes par élection
  const electionIds = elections.map((e) => e.id);
  let candidatesByElection = new Map<
    string,
    { candidateCount: number; totalVotes: number }
  >();
  if (electionIds.length > 0) {
    const { data: candsRaw } = await supabase
      .from("promo_candidates")
      .select("election_id, vote_count, candidate_id")
      .in("election_id", electionIds);

    const cands = (candsRaw ?? []) as CandidateRow[];
    candidatesByElection = cands.reduce((acc, row) => {
      const prev = acc.get(row.election_id) ?? {
        candidateCount: 0,
        totalVotes: 0,
      };
      acc.set(row.election_id, {
        candidateCount: prev.candidateCount + 1,
        totalVotes: prev.totalVotes + (row.vote_count ?? 0),
      });
      return acc;
    }, new Map<string, { candidateCount: number; totalVotes: number }>());
  }

  const completed = elections.filter((e) => e.status === "completed").length;
  const cancelled = elections.filter((e) => e.status === "cancelled").length;

  return (
    <div className="min-h-screen bg-cma-gris pb-20">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center h-14 px-4 gap-4">
        <Link
          href="/promo"
          className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
          aria-label="Retour au Coin Promo"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-gray-900 leading-tight">
            Historique des élections
          </h1>
          <p className="text-[10px] font-bold text-cma-bordeaux uppercase tracking-wider">
            {elections.length} élection(s)
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
              Terminées
            </p>
            <p className="text-2xl font-bold text-cma-vert">{completed}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
              Annulées
            </p>
            <p className="text-2xl font-bold text-gray-700">{cancelled}</p>
          </div>
        </div>

        {/* Liste */}
        {elections.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
            <Trophy
              size={36}
              className="mx-auto text-gray-300 mb-3"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-gray-700">
              Aucune élection pour l&apos;instant
            </p>
            <p className="text-xs text-gray-500 mt-1">
              L&apos;historique s&apos;affichera ici après la première élection.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {elections.map((e) => {
              const stats = candidatesByElection.get(e.id) ?? {
                candidateCount: 0,
                totalVotes: 0,
              };
              const isCompleted = e.status === "completed";
              const isCancelled = e.status === "cancelled";
              return (
                <li
                  key={e.id}
                  className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar
                          size={14}
                          className="text-gray-400"
                          aria-hidden="true"
                        />
                        <span className="text-xs text-gray-500">
                          {new Date(e.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] uppercase tracking-wider font-bold ${
                          isCompleted
                            ? "text-cma-vert"
                            : isCancelled
                            ? "text-gray-500"
                            : "text-cma-bordeaux"
                        }`}
                      >
                        {STATUS_LABELS[e.status]}
                      </p>
                    </div>
                    {isCompleted && e.winner ? (
                      <div className="flex items-center gap-2 rounded-xl bg-cma-or/10 border border-cma-or/20 px-3 py-1.5">
                        <Trophy size={14} className="text-cma-or" />
                        <span className="text-xs font-semibold text-gray-800">
                          {e.winner.first_name} {e.winner.last_name}
                        </span>
                      </div>
                    ) : isCancelled ? (
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <XCircle size={14} aria-hidden="true" />
                        <span className="text-xs">Sans gagnante</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-gray-500 mb-0.5">Candidates</p>
                      <p className="font-semibold text-gray-900">
                        {stats.candidateCount}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-gray-500 mb-0.5">Votes exprimés</p>
                      <p className="font-semibold text-gray-900">
                        {stats.totalVotes}
                      </p>
                    </div>
                  </div>

                  {e.winner ? (
                    <Link
                      href={`/profile/${e.winner.username}`}
                      className="mt-3 inline-block text-xs font-medium text-cma-bordeaux hover:underline"
                    >
                      Voir le profil de la gagnante →
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
