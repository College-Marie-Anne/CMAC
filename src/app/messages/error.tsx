"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { AlertCircle, MessageSquare, RotateCw } from "lucide-react";

/**
 * Error boundary pour /messages et ses sous-routes.
 *
 * Remplace l'UI Next.js par défaut ("Application error: a client-side
 * exception has occurred") par un écran brandé CMA qui :
 *  - Remonte l'erreur à Sentry avec le contexte
 *  - Affiche un message clair en français
 *  - Propose Reset + retour au feed
 */
export default function MessagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Remonte à Sentry avec le tag de segment pour faciliter le debug
    Sentry.captureException(error, {
      tags: { segment: "messages" },
      extra: { digest: error.digest },
    });
    // Log console pour debug local
    console.error("[messages/error.tsx]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-white">
      <div className="max-w-sm w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          Impossible d&apos;afficher les messages
        </h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Une erreur inattendue est survenue. On a notifié l&apos;équipe
          technique. Tu peux réessayer ou revenir au feed.
        </p>

        {error.digest && (
          <p className="text-[10px] text-gray-300 mb-4 font-mono">
            ref : {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cma-bordeaux text-white text-sm font-medium hover:bg-cma-bordeaux-dark transition-colors"
          >
            <RotateCw size={14} />
            Réessayer
          </button>
          <Link
            href="/feed"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <MessageSquare size={14} />
            Retour au feed
          </Link>
        </div>
      </div>
    </div>
  );
}
