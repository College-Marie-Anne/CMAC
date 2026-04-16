"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UserCheck,
  UserX,
  Clock,
  Loader2,
  Users,
} from "lucide-react";
import {
  approveUserAction,
  rejectUserAction,
  bulkApproveAction,
} from "@/actions/admin";

type PendingUser = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  role: string;
  date_of_birth: string | null;
  nationality: string[] | null;
  country: string | null;
  created_at: string;
};

export function ApprovalActions({ users }: { users: PendingUser[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === users.length) setSelected(new Set());
    else setSelected(new Set(users.map((u) => u.id)));
  };

  const handleApprove = (userId: string) => {
    setLoadingId(userId);
    startTransition(async () => {
      await approveUserAction(userId);
      setLoadingId(null);
    });
  };

  const handleReject = (userId: string) => {
    setLoadingId(userId);
    startTransition(async () => {
      await rejectUserAction(userId);
      setLoadingId(null);
    });
  };

  const handleBulkApprove = () => {
    startTransition(async () => {
      await bulkApproveAction(Array.from(selected));
      setSelected(new Set());
    });
  };

  return (
    <div className="space-y-4">
      {/* Bulk bar */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
          <Checkbox
            checked={selected.size === users.length && users.length > 0}
            onCheckedChange={toggleAll}
          />
          Tout sélectionner
        </label>
        {selected.size > 0 && (
          <Button
            size="sm"
            onClick={handleBulkApprove}
            disabled={isPending}
            className="gap-1.5 rounded-xl text-xs bg-cma-vert hover:bg-cma-vert/80 text-white"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Users size={14} />
            )}
            Approuver la sélection ({selected.size})
          </Button>
        )}
      </div>

      {/* User list */}
      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id} className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selected.has(user.id)}
                    onCheckedChange={() => toggleSelect(user.id)}
                    className="mt-1"
                  />
                  <div className="w-10 h-10 rounded-full bg-cma-or/10 flex items-center justify-center text-sm font-semibold text-cma-or shrink-0">
                    {(user.first_name || "?")[0]}
                    {(user.last_name || "?")[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      @{user.username} &middot;{" "}
                      <span className="capitalize">{user.role}</span>
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-gray-400">
                      {user.country && <span>{user.country}</span>}
                      {user.nationality && user.nationality.length > 0 && (
                        <span>{user.nationality.join(", ")}</span>
                      )}
                      <span className="inline-flex items-center gap-0.5">
                        <Clock size={10} />
                        {new Date(user.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(user.id)}
                    disabled={isPending && loadingId === user.id}
                    className="rounded-lg gap-1 text-xs bg-cma-vert hover:bg-cma-vert/80 text-white"
                  >
                    {isPending && loadingId === user.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <UserCheck size={14} />
                    )}
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(user.id)}
                    disabled={isPending && loadingId === user.id}
                    className="rounded-lg gap-1 text-xs text-red-500 border-red-200 hover:bg-red-50"
                  >
                    <UserX size={14} />
                    Rejeter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
