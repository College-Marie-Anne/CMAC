"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  UserX,
  UserCheck,
  Ban,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  suspendUserAction,
  reactivateUserAction,
  deactivateUserAction,
} from "@/actions/admin";

type Props = {
  userId: string;
  status: string;
  role: string;
  isSuperAdmin: boolean;
  currentAdminIsSuperAdmin: boolean;
};

export function UserDetailActions({
  userId,
  status,
  role,
  isSuperAdmin,
  currentAdminIsSuperAdmin,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Super-admin cannot be actioned
  if (isSuperAdmin) return null;

  // Non-super admins can't action other admins
  if (role === "admin" && !currentAdminIsSuperAdmin) return null;

  const handleAction = (action: string) => {
    if (confirm !== action) {
      setConfirm(action);
      return;
    }
    setError(null);
    startTransition(async () => {
      let result;
      if (action === "suspend") result = await suspendUserAction(userId);
      else if (action === "reactivate") result = await reactivateUserAction(userId);
      else if (action === "deactivate") result = await deactivateUserAction(userId);
      if (result && !result.success) setError(result.error ?? "Erreur");
      setConfirm(null);
    });
  };

  return (
    <Card className="rounded-2xl border-0 shadow-sm border-t-2 border-red-100">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-amber-500" /> Actions
        </h3>

        {error && (
          <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {status === "active" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("suspend")}
              disabled={isPending}
              className="rounded-lg gap-1.5 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Ban size={14} />
              )}
              {confirm === "suspend" ? "Confirmer la suspension" : "Suspendre"}
            </Button>
          )}

          {status === "active" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("deactivate")}
              disabled={isPending}
              className="rounded-lg gap-1.5 text-xs text-red-500 border-red-200 hover:bg-red-50"
            >
              <UserX size={14} />
              {confirm === "deactivate" ? "Confirmer la désactivation" : "Désactiver"}
            </Button>
          )}

          {(status === "suspended" || status === "deactivated") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("reactivate")}
              disabled={isPending}
              className="rounded-lg gap-1.5 text-xs text-green-600 border-green-200 hover:bg-green-50"
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserCheck size={14} />
              )}
              {confirm === "reactivate" ? "Confirmer la réactivation" : "Réactiver"}
            </Button>
          )}
        </div>

        {confirm && (
          <p className="mt-2 text-[11px] text-gray-400">
            Cliquez à nouveau pour confirmer. Cliquez ailleurs pour annuler.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
