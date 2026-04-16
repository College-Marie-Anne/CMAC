"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Link2,
  CheckCircle2,
  Ban,
  Loader2,
  User,
} from "lucide-react";
import { revokeInvitationAction } from "@/actions/admin";

type ProfileRef = { id: string; first_name: string; last_name: string; username: string } | null;

type InvLink = {
  id: string;
  token: string;
  is_used: boolean;
  is_revoked: boolean;
  expires_at: string;
  created_at: string;
  inviter: ProfileRef | ProfileRef[];
  used_by_profile: ProfileRef | ProfileRef[];
};

function unwrap<T>(val: T | T[] | null): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

function getStatus(link: InvLink): { label: string; color: string } {
  if (link.is_revoked) return { label: "Révoqué", color: "text-red-500 bg-red-50" };
  if (link.is_used) return { label: "Utilisé", color: "text-green-600 bg-green-50" };
  if (new Date(link.expires_at) < new Date()) return { label: "Expiré", color: "text-gray-500 bg-gray-100" };
  return { label: "Actif", color: "text-blue-600 bg-blue-50" };
}

export function InvitationsList({ links }: { links: InvLink[] }) {
  const [filter, setFilter] = useState<"all" | "active" | "used" | "expired" | "revoked">("all");
  const [isPending, startTransition] = useTransition();

  const filtered = links.filter((l) => {
    if (filter === "all") return true;
    const s = getStatus(l);
    if (filter === "active") return s.label === "Actif";
    if (filter === "used") return s.label === "Utilisé";
    if (filter === "expired") return s.label === "Expiré";
    if (filter === "revoked") return s.label === "Révoqué";
    return true;
  });

  const handleRevoke = (linkId: string) => {
    startTransition(async () => {
      await revokeInvitationAction(linkId);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["all", "active", "used", "expired", "revoked"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === f
                ? "bg-cma-bordeaux text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "Tous" : f === "active" ? "Actifs" : f === "used" ? "Utilisés" : f === "expired" ? "Expirés" : "Révoqués"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((link) => {
          const inviter = unwrap(link.inviter);
          const usedBy = unwrap(link.used_by_profile);
          const status = getStatus(link);

          return (
            <Card key={link.id} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link2 size={14} className="text-gray-400 shrink-0" />
                      <span className="text-xs font-mono text-gray-500 truncate">
                        {link.token.slice(0, 8)}...
                      </span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <User size={10} />
                      Invitée par {inviter ? `@${inviter.username}` : "Inconnu"}
                    </div>
                    {usedBy && (
                      <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <CheckCircle2 size={10} />
                        Utilisé par @{usedBy.username}
                      </div>
                    )}
                    <div className="flex gap-3 text-[10px] text-gray-400">
                      <span>Créé : {new Date(link.created_at).toLocaleDateString("fr-FR")}</span>
                      <span>Expire : {new Date(link.expires_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                  {status.label === "Actif" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevoke(link.id)}
                      disabled={isPending}
                      className="rounded-lg text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50 shrink-0"
                    >
                      {isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Ban size={12} />
                      )}
                      Révoquer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            Aucun lien dans cette catégorie
          </p>
        )}
      </div>
    </div>
  );
}
