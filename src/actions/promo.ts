"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { promoCandidacySchema } from "@/lib/validations/promo";

/**
 * Moteur Lazy : vérifie les dates de l'élection en cours et passe aux étapes suivantes si nécessaire.
 */
export async function syncElectionStateAction(promoId: string) {
  try {
    const supabase = await createClient();
    
    // On check la base de données avec les droits admin pour faire transiter les états
    const { data: election } = await supabase
      .from("promo_elections")
      .select("*")
      .eq("promo_id", promoId)
      .in("status", ["nomination", "voting"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!election) return { success: true, message: "Aucune élection à synchroniser" };

    const now = new Date();
    const isNominationEnded = new Date(election.nomination_end) <= now;
    const isVotingEnded = new Date(election.voting_end) <= now;

    let updated = false;

    if (election.status === "nomination" && isNominationEnded) {
      // 1. Compter les candidates
      const { count } = await supabase
        .from("promo_candidates")
        .select("id", { count: "exact", head: true })
        .eq("election_id", election.id);
        
      if ((count || 0) < 2) {
        // Annuler l'élection
        await supabase
          .from("promo_elections")
          .update({ status: "cancelled", updated_at: now.toISOString() })
          .eq("id", election.id);
      } else {
        // Passer au vote
        // Note: S'il reste -3 jours à partir de maintenant pour voting_end, c'est bon,
        // s'il y a eu un gros décalage (personne n'a visité pdt 6 jours), on pourrait ajuster voting_end, 
        // mais gardons les dates définies initialement (sinon ça repousse la clôture sans cesse).
        await supabase
          .from("promo_elections")
          .update({ status: "voting", updated_at: now.toISOString() })
          .eq("id", election.id);
      }
      updated = true;
    } 
    else if (election.status === "voting" && isVotingEnded) {
      // Clôturer et élire
      // Sélectionne les candidates, triées par votes DESC
      const { data: candidates } = await supabase
        .from("promo_candidates")
        .select(`
          candidate_id,
          vote_count,
          profiles!inner(created_at)
        `)
        .eq("election_id", election.id)
        .order("vote_count", { ascending: false });

      if (candidates && candidates.length > 0) {
        // En cas d'égalité, celui dont le compte profile.created_at est le plus ancien
        const maxVotes = candidates[0].vote_count;
        const tied = candidates.filter((c) => c.vote_count === maxVotes);
        
        tied.sort((a: { profiles: { created_at: string }[] }, b: { profiles: { created_at: string }[] }) => new Date(a.profiles[0].created_at).getTime() - new Date(b.profiles[0].created_at).getTime());
        
        const winnerId = tied[0].candidate_id;

        // Mettre à jour l'élection
        await supabase
          .from("promo_elections")
          .update({ 
            status: "completed", 
            winner_id: winnerId,
            updated_at: now.toISOString() 
          })
          .eq("id", election.id);

        // Mettre à jour la chef de promo
        await supabase
          .from("promotions")
          .update({ leader_id: winnerId })
          .eq("id", promoId);
      } else {
        // Annuler s'il n'y a plus de candidates pour qq raison
        await supabase
          .from("promo_elections")
          .update({ status: "cancelled", updated_at: now.toISOString() })
          .eq("id", election.id);
      }
      updated = true;
    }

    if (updated) revalidatePath("/promo");
    return { success: true };
  } catch (err: unknown) {
    console.error("Sync election state error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Erreur interne" };
  }
}

export async function startElectionAction() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Non autorisé" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("promo_id")
      .eq("id", user.id)
      .single();

    if (!profile?.promo_id) return { success: false, error: "Vous n'avez pas de promotion assignée" };

    // Vérifier s'il n'y a pas déjà une élection en cours
    const { data: existing } = await supabase
      .from("promo_elections")
      .select("id")
      .eq("promo_id", profile.promo_id)
      .in("status", ["nomination", "voting"])
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: "Une élection est déjà en cours" };
    }

    const now = new Date();
    const nominationEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 jours
    const votingEnd = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000); // +6 jours

    const { error } = await supabase
      .from("promo_elections")
      .insert({
        promo_id: profile.promo_id,
        initiated_by: user.id,
        status: "nomination",
        nomination_end: nominationEnd.toISOString(),
        voting_end: votingEnd.toISOString(),
      });

    if (error) throw error;

    revalidatePath("/promo");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur interne" };
  }
}

export async function submitCandidacyAction(electionId: string, formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Non autorisé" };

    const pitchStr = formData.get("pitch")?.toString() || "";
    
    // Valider ou rendre le pitch vide si non fourni (il est optionnel)
    const pitch = pitchStr.trim() !== "" ? pitchStr.trim() : null;

    if (pitch) {
       const v = promoCandidacySchema.safeParse({ pitch });
       if (!v.success) return { success: false, error: v.error.issues[0].message };
    }

    const { error } = await supabase
      .from("promo_candidates")
      .insert({
        election_id: electionId,
        candidate_id: user.id,
        pitch: pitch,
      });

    if (error) {
       if (error.code === '23505') return { success: false, error: "Vous êtes déjà candidate" };
       throw error;
    }

    revalidatePath("/promo/election");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur interne" };
  }
}

export async function removeCandidacyAction(electionId: string) {
  try {
     const supabase = await createClient();
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return { success: false, error: "Non autorisé" };

     const { error } = await supabase
        .from("promo_candidates")
        .delete()
        .eq("election_id", electionId)
        .eq("candidate_id", user.id);

     if (error) throw error;
     revalidatePath("/promo/election");
     return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur interne" };
  }
}

export async function voteCandidateAction(electionId: string, candidateId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Non autorisé" };

    // Vérifier l'état de l'élection
    const { data: election } = await supabase
      .from("promo_elections")
      .select("status, voting_end")
      .eq("id", electionId)
      .single();

    if (!election || election.status !== "voting" || new Date(election.voting_end) <= new Date()) {
      return { success: false, error: "La phase de vote n'est pas/plus active" };
    }

    // Le vote est un upsert technique (on efface le précédent et ajoute le nouveau ou gère via Trigger ou Constraint)
    // D'abord on vérifie s'il y a déjà un vote
    const { data: existingVote } = await supabase
      .from("promo_votes")
      .select("id, promo_candidate_id")
      .eq("election_id", electionId)
      .eq("voter_id", user.id)
      .single();

    if (existingVote) {
       if (existingVote.promo_candidate_id === candidateId) {
          return { success: true }; // Déjà voté pour elle
       }
       // Delete old vote
       await supabase.from("promo_votes").delete().eq("id", existingVote.id);
       
       // Insert new vote
       await supabase.from("promo_votes").insert({
         election_id: electionId,
         voter_id: user.id,
         promo_candidate_id: candidateId
       });
    } else {
       // Insert vote
       await supabase.from("promo_votes").insert({
         election_id: electionId,
         voter_id: user.id,
         promo_candidate_id: candidateId
       });
    }

    revalidatePath("/promo/election");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur interne" };
  }
}
