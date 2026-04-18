"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format-date";
import {
  Link2,
  Copy,
  Check,
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generateInvitationLinkAction,
  revokeInvitationLinkAction,
} from "@/actions/profile";

const MAX_ACTIVE_LINKS = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type InvitationLinkItem = {
  id: string;
  token: string;
  expires_at: string;
  is_revoked: boolean;
  created_at: string;
  /** Plafond d'usages — 10 par défaut (migration 032). */
  max_uses: number;
  /** Nombre d'inscriptions ayant utilisé ce lien. */
  used_count: number;
  /** Liste des invitées triée par ordre d'inscription (la plus ancienne d'abord). */
  uses: { name: string; used_at: string }[];
};

interface InvitationGeneratorProps {
  /** Liste actuelle des invitations de l'utilisatrice (passée en SSR). */
  invitations: InvitationLinkItem[];
}

type LinkStatus = "active" | "full" | "expired" | "revoked";

function getStatus(link: InvitationLinkItem): LinkStatus {
  if (link.is_revoked) return "revoked";
  if (link.used_count >= link.max_uses) return "full";
  if (new Date(link.expires_at).getTime() < Date.now()) return "expired";
  return "active";
}

const STATUS_META: Record<
  LinkStatus,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2 }
> = {
  active: {
    label: "Actif",
    color: "#006B3F",
    bg: "rgba(0,107,63,0.10)",
    icon: CheckCircle2,
  },
  full: {
    label: "Épuisé",
    color: "#1f7ad8",
    bg: "rgba(31,122,216,0.10)",
    icon: Check,
  },
  expired: {
    label: "Expiré",
    color: "#9ca3af",
    bg: "rgba(156,163,175,0.15)",
    icon: Clock,
  },
  revoked: {
    label: "Révoqué",
    color: "#dc2626",
    bg: "rgba(220,38,38,0.10)",
    icon: XCircle,
  },
};

export function InvitationGenerator({ invitations }: InvitationGeneratorProps) {
  // `nowMs` capturé une seule fois au mount — React Compiler marque
  // Date.now() dans le render comme "impure function". On capture au state
  // pour avoir une valeur stable à travers les re-renders.
  const [nowMs] = useState(() => Date.now());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerate] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevoking, startRevoke] = useTransition();
  // Masque immédiatement les liens qu'on vient de révoquer sans attendre le
  // re-fetch serveur : sans ça, revokeInvitationLinkAction mettait bien
  // is_revoked=true en DB mais le lien restait affiché comme "Actif" jusqu'à
  // navigation/reload → l'utilisatrice pensait que la révocation ne marchait pas.
  const [locallyRevoked, setLocallyRevoked] = useState<Set<string>>(new Set());
  // Liens créés localement mais pas encore reflétés dans la prop SSR (router
  // refresh en route). On les affiche tels quels pour que l'utilisatrice
  // voit IMMÉDIATEMENT le nouveau lien après un generate, sans clignotement
  // "apparaît puis disparaît le temps que le SSR se rafraîchisse".
  const [locallyCreated, setLocallyCreated] = useState<InvitationLinkItem[]>([]);
  const router = useRouter();

  // Cleanup du Set "locallyRevoked" : purge quand la prop SSR confirme
  // is_revoked=true. Évite que le Set grossisse indéfiniment et élimine
  // le risque de flicker.
  // Cleanup aussi de "locallyCreated" : quand la prop contient déjà un lien
  // avec le même id, on retire notre placeholder local (la prop est
  // la source de vérité).
  // React Compiler warn setState-in-effect mais c'est une synchro prop→state
  // intentionnelle (sync after SSR refresh).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocallyRevoked((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      let changed = false;
      for (const id of prev) {
        const link = invitations.find((l) => l.id === id);
        if (link?.is_revoked || !link) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setLocallyCreated((prev) => {
      if (prev.length === 0) return prev;
      const serverIds = new Set(invitations.map((l) => l.id));
      const filtered = prev.filter((l) => !serverIds.has(l.id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [invitations]);

  // Liste effective affichée = props SSR ∪ liens créés localement non encore
  // dans la prop. Dédup par id au cas où.
  const allInvitations = (() => {
    if (locallyCreated.length === 0) return invitations;
    const seen = new Set(invitations.map((l) => l.id));
    return [...invitations, ...locallyCreated.filter((l) => !seen.has(l.id))];
  })();

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Applique l'optimistic revoke : un lien dans `locallyRevoked` est affiché
  // comme révoqué même si le prop encore reçu du SSR dit is_revoked=false
  // (avant que le router.refresh ne se propage).
  const effectiveStatus = (link: InvitationLinkItem): LinkStatus =>
    locallyRevoked.has(link.id) ? "revoked" : getStatus(link);

  // Tri : actifs d'abord, puis utilisés / expirés / révoqués (les plus récents en haut).
  const sorted = [...allInvitations].sort((a, b) => {
    const aActive = effectiveStatus(a) === "active" ? 0 : 1;
    const bActive = effectiveStatus(b) === "active" ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const activeCount = allInvitations.filter((l) => effectiveStatus(l) === "active").length;
  const atLimit = activeCount >= MAX_ACTIVE_LINKS;

  const handleGenerate = () => {
    setError(null);
    startGenerate(async () => {
      const result = await generateInvitationLinkAction();
      if (!result.success) {
        setError(result.error ?? "Erreur lors de la génération");
        return;
      }
      // Optimistic insert : l'action retourne le row complet, on l'ajoute
      // immédiatement à locallyCreated pour que l'UI affiche le nouveau lien
      // SANS attendre le router.refresh (qui peut prendre 300–500 ms). Le
      // useEffect retirera ce placeholder quand la prop SSR arrive avec le
      // même id.
      const raw = result.data as
        | {
            id: string;
            token: string;
            expires_at: string;
            is_revoked: boolean;
            created_at: string;
            max_uses: number;
            used_count: number;
          }
        | null
        | undefined;
      if (raw) {
        const newLink: InvitationLinkItem = {
          id: raw.id,
          token: raw.token,
          expires_at: raw.expires_at,
          is_revoked: raw.is_revoked,
          created_at: raw.created_at,
          max_uses: raw.max_uses,
          used_count: raw.used_count,
          uses: [],
        };
        setLocallyCreated((prev) => [newLink, ...prev]);
      }
      router.refresh();
    });
  };

  const handleCopy = (link: InvitationLinkItem) => {
    const url = `${siteUrl}/register/invite/${link.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId((prev) => (prev === link.id ? null : prev)), 2000);
  };

  const handleRevoke = (link: InvitationLinkItem) => {
    if (!confirm(`Révoquer ce lien ? Il deviendra immédiatement invalide.`))
      return;
    setError(null);
    setRevokingId(link.id);
    startRevoke(async () => {
      const result = await revokeInvitationLinkAction(link.id);
      if (!result.success) {
        setError(result.error ?? "Erreur lors de la révocation");
        setRevokingId(null);
        return;
      }
      // Update local state so le badge passe de "Actif" à "Révoqué"
      // immédiatement, puis router.refresh pour réaligner les autres onglets
      // et re-fetch les données serveur.
      setLocallyRevoked((prev) => new Set(prev).add(link.id));
      setRevokingId(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Link2 size={16} /> Liens d&apos;invitation
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Générez un lien pour inviter des anciennes élèves. Le lien expire
            après 7 jours et peut être utilisé par jusqu&apos;à 10 personnes.
          </p>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 mt-0.5"
          style={{
            background: atLimit
              ? "rgba(220,38,38,0.10)"
              : "rgba(0,107,63,0.10)",
            color: atLimit ? "#dc2626" : "#006B3F",
          }}
        >
          {activeCount}/{MAX_ACTIVE_LINKS} actifs
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-500 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2">
          {error}
        </p>
      )}

      {/* Bouton générer */}
      <Button
        size="sm"
        onClick={handleGenerate}
        disabled={isGenerating || atLimit}
        className="rounded-xl text-xs bg-cma-bordeaux hover:bg-cma-bordeaux/90 text-white gap-1 disabled:opacity-50"
      >
        {isGenerating ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Link2 size={12} />
        )}
        {atLimit
          ? "Limite atteinte — révoquez ou attendez expiration"
          : "Générer un lien d'invitation"}
      </Button>

      {/* Liste des invitations */}
      {sorted.length > 0 && (
        <ul className="space-y-2 pt-2">
          {sorted.map((link) => {
            const status = effectiveStatus(link);
            const meta = STATUS_META[status];
            const StatusIcon = meta.icon;
            const isCopied = copiedId === link.id;
            const isCurrentlyRevoking = isRevoking && revokingId === link.id;
            const expiresDate = new Date(link.expires_at);
            // `nowMs` capturé au mount du composant (state) plutôt que
            // Date.now() dans le render : React Compiler marque Date.now()
            // comme "impure function during render" (effet incompatible avec
            // le memoization). En pratique, quelques secondes de différence
            // sur "days left" n'a aucun impact UX visible.
            const daysLeft = Math.max(
              Math.ceil((expiresDate.getTime() - nowMs) / MS_PER_DAY),
              0
            );

            return (
              <li
                key={link.id}
                className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-3"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    <StatusIcon size={10} />
                    {meta.label}
                    {status === "active" && ` · ${daysLeft}j restant${daysLeft > 1 ? "s" : ""}`}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Créé le{" "}
                    {formatDate(link.created_at)}
                  </span>
                </div>

                <code className="block text-[11px] bg-white dark:bg-gray-800 px-2 py-1.5 rounded-lg truncate border border-gray-200 dark:border-gray-700 mb-2">
                  {siteUrl}/register/invite/{link.token.slice(0, 8)}…
                </code>

                <p className="text-[11px] text-gray-500 mb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {link.used_count}/{link.max_uses}
                  </span>{" "}
                  inscriptions via ce lien
                </p>

                {link.uses.length > 0 && (
                  <ul className="text-[11px] text-gray-500 mb-2 space-y-0.5 pl-1 border-l-2 border-gray-200 dark:border-gray-700 ml-1">
                    {link.uses.map((u, i) => (
                      <li key={i} className="pl-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {u.name}
                        </span>
                        <span className="text-gray-400 ml-1">
                          · {formatDate(u.used_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {status === "active" && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(link)}
                      className="rounded-lg text-xs gap-1 h-8"
                    >
                      {isCopied ? (
                        <Check size={12} className="text-green-500" />
                      ) : (
                        <Copy size={12} />
                      )}
                      {isCopied ? "Copié" : "Copier"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevoke(link)}
                      disabled={isCurrentlyRevoking}
                      className="rounded-lg text-xs gap-1 h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      {isCurrentlyRevoking ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      Révoquer
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {sorted.length === 0 && (
        <p className="text-[11px] text-gray-400 italic pt-1">
          Aucun lien généré pour l&apos;instant.
        </p>
      )}
    </div>
  );
}
