"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  Inbox,
} from "lucide-react";

type ProfileRef = { id: string; first_name: string; last_name: string; username: string } | null;

type Ticket = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  admin_response: string | null;
  author: ProfileRef | ProfileRef[];
  assigned: ProfileRef | ProfileRef[];
};

function unwrap<T>(val: T | T[] | null): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

const STATUS_STYLES: Record<string, { icon: typeof Clock; bg: string; text: string }> = {
  open: { icon: AlertCircle, bg: "bg-amber-50", text: "text-amber-600" },
  in_progress: { icon: Clock, bg: "bg-blue-50", text: "text-blue-600" },
  resolved: { icon: CheckCircle2, bg: "bg-green-50", text: "text-green-600" },
  closed: { icon: Inbox, bg: "bg-gray-100", text: "text-gray-500" },
};

const CATEGORY_LABELS: Record<string, string> = {
  profile_modification: "Modification profil",
  promo_issue: "Problème promo",
  account_reactivation: "Réactivation compte",
  bug_report: "Bug",
  other: "Autre",
};

export function SupportList({ tickets }: { tickets: Ticket[] }) {
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["all", "open", "in_progress", "resolved", "closed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === f
                ? "bg-cma-bordeaux text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f === "all"
              ? "Tous"
              : f === "open"
                ? "Ouverts"
                : f === "in_progress"
                  ? "En cours"
                  : f === "resolved"
                    ? "Résolus"
                    : "Fermés"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((ticket) => {
          const author = unwrap(ticket.author);
          const assigned = unwrap(ticket.assigned);
          const style = STATUS_STYLES[ticket.status] ?? STATUS_STYLES.open;
          const StatusIcon = style.icon;

          return (
            <Link key={ticket.id} href={`/admin/support/${ticket.id}`}>
              <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer mb-3">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}
                        >
                          <StatusIcon size={10} /> {ticket.status}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {ticket.subject}
                      </p>
                      <p className="text-xs text-gray-400 line-clamp-1">
                        {ticket.message}
                      </p>
                      <div className="flex gap-3 text-[10px] text-gray-400">
                        {author && (
                          <span className="inline-flex items-center gap-1">
                            <User size={9} /> @{author.username}
                          </span>
                        )}
                        {assigned && (
                          <span>Assigné : @{assigned.username}</span>
                        )}
                        <span>
                          {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-gray-300 shrink-0 mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            Aucun ticket dans cette catégorie
          </p>
        )}
      </div>
    </div>
  );
}
