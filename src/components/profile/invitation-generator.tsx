"use client";

import { useState, useTransition } from "react";
import { Link2, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateInvitationLinkAction } from "@/actions/profile";

export function InvitationGenerator() {
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const result = await generateInvitationLinkAction();
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      const data = result.data as { token: string; expires_at: string };
      setGeneratedToken(data.token);
      setExpiresAt(data.expires_at);
    });
  };

  const handleCopy = () => {
    if (!generatedToken) return;
    const url = `${siteUrl}/register/invite/${generatedToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
        <Link2 size={16} /> Liens d&apos;invitation
      </h3>
      <p className="text-xs text-gray-500">
        Générez un lien pour inviter une ancienne élève. Le lien expire après 7 jours et ne peut être utilisé qu&apos;une seule fois.
      </p>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {generatedToken ? (
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 space-y-2">
          <p className="text-xs text-green-700 dark:text-green-400 font-medium">Lien généré avec succès</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white dark:bg-gray-800 px-3 py-2 rounded-lg truncate border border-gray-200 dark:border-gray-700">
              {siteUrl}/register/invite/{generatedToken.slice(0, 8)}...
            </code>
            <Button size="sm" variant="outline" onClick={handleCopy} className="rounded-lg shrink-0 gap-1 text-xs">
              {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
          {expiresAt && (
            <p className="text-[10px] text-gray-400">
              Expire le {new Date(expiresAt).toLocaleDateString("fr-FR")}
            </p>
          )}
          <Button size="sm" variant="ghost" onClick={() => { setGeneratedToken(null); setExpiresAt(null); }} className="text-xs">
            Générer un autre lien
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={isPending}
          className="rounded-xl text-xs bg-cma-bordeaux text-white gap-1"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
          Générer un lien d&apos;invitation
        </Button>
      )}
    </div>
  );
}
