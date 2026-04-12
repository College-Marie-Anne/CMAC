"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Crown, ShieldCheck } from "lucide-react";
import Link from "next/link";

type UserItem = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  role: string;
  status: string;
  is_super_admin: boolean;
  created_at: string;
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: "rgba(0,107,63,0.1)", text: "#006B3F" },
  pending: { bg: "rgba(212,160,23,0.1)", text: "#D4A017" },
  suspended: { bg: "rgba(220,38,38,0.1)", text: "#dc2626" },
  deactivated: { bg: "rgba(156,163,175,0.1)", text: "#6b7280" },
};

export function UsersSearch({ users }: { users: UserItem[] }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom, username..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:border-cma-bordeaux"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:border-cma-bordeaux"
        >
          <option value="all">Tous les rôles</option>
          <option value="admin">Admin</option>
          <option value="alumni">Alumni</option>
          <option value="s4">S4</option>
          <option value="student">Élève</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:border-cma-bordeaux"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspendu</option>
          <option value="deactivated">Désactivé</option>
        </select>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} résultat(s)</p>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((u) => {
          const sc = STATUS_STYLES[u.status] ?? STATUS_STYLES.pending;
          return (
            <Link key={u.id} href={`/admin/users/${u.id}`}>
              <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer mb-2">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                      style={{
                        background:
                          u.role === "admin" ? "#800020" : "#006B3F",
                      }}
                    >
                      {(u.first_name || "?")[0]}
                      {(u.last_name || "?")[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {u.first_name} {u.last_name}
                        </p>
                        {u.is_super_admin && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-cma-or/15 text-cma-or">
                            <Crown size={9} /> Super-Admin
                          </span>
                        )}
                        {u.role === "admin" && !u.is_super_admin && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-cma-vert/15 text-cma-vert">
                            <ShieldCheck size={9} /> Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        @{u.username} &middot; {u.role}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-medium px-2 py-1 rounded-full"
                    style={{ background: sc.bg, color: sc.text }}
                  >
                    {u.status}
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            Aucun résultat
          </p>
        )}
      </div>
    </div>
  );
}
