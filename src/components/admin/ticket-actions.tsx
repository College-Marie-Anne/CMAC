"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Send,
  UserCheck,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  assignTicketAction,
  respondTicketAction,
  closeTicketAction,
} from "@/actions/admin";

type Props = {
  ticketId: string;
  status: string;
  currentAdminId: string;
  isAssigned: boolean;
};

export function TicketActions({
  ticketId,
  status,
  currentAdminId,
  isAssigned,
}: Props) {
  const [response, setResponse] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleAssign = () => {
    setError(null);
    startTransition(async () => {
      const result = await assignTicketAction(ticketId, currentAdminId);
      if (!result.success) setError(result.error ?? "Erreur");
    });
  };

  const handleRespond = () => {
    if (!response.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await respondTicketAction(ticketId, response.trim());
      if (!result.success) setError(result.error ?? "Erreur");
      else setResponse("");
    });
  };

  const handleClose = () => {
    setError(null);
    startTransition(async () => {
      const result = await closeTicketAction(ticketId);
      if (!result.success) setError(result.error ?? "Erreur");
    });
  };

  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Actions</h3>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        {!isAssigned && status === "open" && (
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={isPending}
            className="rounded-xl text-xs gap-1.5 bg-cma-bordeaux text-white"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <UserCheck size={14} />
            )}
            M&apos;assigner ce ticket
          </Button>
        )}

        {status !== "resolved" && status !== "closed" && (
          <div className="space-y-2">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Réponse au ticket..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-cma-bordeaux resize-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleRespond}
                disabled={isPending || !response.trim()}
                className="rounded-xl text-xs gap-1.5 bg-cma-vert text-white"
              >
                {isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Répondre et résoudre
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
                className="rounded-xl text-xs gap-1.5"
              >
                <XCircle size={14} /> Fermer sans répondre
              </Button>
            </div>
          </div>
        )}

        {status === "resolved" && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-xl text-xs gap-1.5"
          >
            <XCircle size={14} /> Fermer définitivement
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
