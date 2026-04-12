"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { User, Clock } from "lucide-react";

type AdminRef = { id: string; first_name: string; last_name: string; username: string } | null;

type AuditEntry = {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
  admin: AdminRef | AdminRef[];
};

function unwrap<T>(val: T | T[] | null): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

const ACTION_COLORS: Record<string, string> = {
  approve_user: "bg-green-100 text-green-700",
  reject_user: "bg-red-100 text-red-700",
  suspend_user: "bg-amber-100 text-amber-700",
  deactivate_user: "bg-red-100 text-red-700",
  reactivate_user: "bg-green-100 text-green-700",
  create_admin: "bg-blue-100 text-blue-700",
  delete_post: "bg-red-100 text-red-700",
  delete_comment: "bg-red-100 text-red-700",
  bulk_approve: "bg-green-100 text-green-700",
};

export function AuditList({
  logs,
  actionTypes,
}: {
  logs: AuditEntry[];
  actionTypes: string[];
}) {
  const [filterAction, setFilterAction] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = logs.filter((log) => {
    if (filterAction !== "all" && log.action !== filterAction) return false;
    if (search) {
      const admin = unwrap(log.admin);
      const q = search.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.target_type.toLowerCase().includes(q) ||
        (admin?.username ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="h-9 px-3 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:border-cma-bordeaux flex-1"
        />
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="h-9 px-3 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:border-cma-bordeaux"
        >
          <option value="all">Toutes les actions</option>
          {actionTypes.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {filtered.map((log) => {
          const admin = unwrap(log.admin);
          const colorClass =
            ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600";

          return (
            <Card key={log.id} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-mono text-[11px] px-2 py-0.5 rounded-lg ${colorClass}`}
                      >
                        {log.action}
                      </span>
                      <span className="text-xs text-gray-400">sur</span>
                      <span className="text-xs text-gray-600">
                        {log.target_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      {admin && (
                        <span className="inline-flex items-center gap-1">
                          <User size={10} /> @{admin.username}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(log.created_at).toLocaleString("fr-FR")}
                      </span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            Aucune entrée correspondante
          </p>
        )}
      </div>
    </div>
  );
}
