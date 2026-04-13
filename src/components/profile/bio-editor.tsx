"use client";

import { useState, useTransition } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateBioAction } from "@/actions/profile";

export function BioEditor({ initialBio }: { initialBio: string | null }) {
  const [bio, setBio] = useState(initialBio ?? "");
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateBioAction(bio.trim() || null);
      if (!result.success) setError(result.error ?? "Erreur");
      else setSaved(true);
    });
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
      <div className="relative">
        <Textarea
          value={bio}
          onChange={(e) => { setBio(e.target.value.slice(0, 500)); setSaved(false); }}
          placeholder="Parlez de vous..."
          rows={3}
          className="resize-none rounded-xl"
        />
        <span className="absolute bottom-2 right-3 text-[9px] text-gray-300">{bio.length}/500</span>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {!saved && (
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-xl text-xs bg-cma-vert text-white gap-1"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Enregistrer
        </Button>
      )}
    </div>
  );
}
