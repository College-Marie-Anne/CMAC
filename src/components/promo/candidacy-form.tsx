"use client";

import { useState, useTransition } from "react";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitCandidacyAction, removeCandidacyAction } from "@/actions/promo";

interface CandidacyFormProps {
  electionId: string;
  isCandidate: boolean;
  existingPitch: string | null;
}

export function CandidacyForm({ electionId, isCandidate, existingPitch }: CandidacyFormProps) {
  const [pitch, setPitch] = useState(existingPitch || "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError(null);
      const formData = new FormData();
      formData.append("pitch", pitch);
      const res = await submitCandidacyAction(electionId, formData);
      if (!res.success) {
        setError(res.error || "Erreur lors de la candidature");
      }
    });
  };

  const handleWithdraw = () => {
    if (!confirm("Voulez-vous vraiment retirer votre candidature ?")) return;
    startTransition(async () => {
      setError(null);
      const res = await removeCandidacyAction(electionId);
      if (!res.success) {
        setError(res.error || "Erreur lors du retrait");
      }
    });
  };

  if (isCandidate) {
    return (
      <div className="bg-cma-vert/5 border border-cma-vert/20 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-cma-vert/10 flex items-center justify-center text-cma-vert mx-auto mb-4">
          <PlusCircle size={24} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Vous êtes candidate !</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
          Votre profil et votre présentation sont visibles par les autres membres de la promotion.
        </p>
        
        <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 text-left italic text-sm text-gray-600">
          &quot;{existingPitch || "Aucune présentation"}&quot;
        </div>

        <Button
          variant="ghost"
          onClick={handleWithdraw}
          disabled={isPending}
          className="mt-6 text-red-500 hover:text-red-600 hover:bg-red-50 text-xs font-bold gap-2"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Retirer ma candidature
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900">Se porter candidate</h3>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        Décrivez en quelques mots votre motivation pour devenir Chef de Promo.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Présentation (max 300 cara.)
          </label>
          <Textarea 
            value={pitch}
            onChange={(e) => setPitch(e.target.value.slice(0, 300))}
            placeholder="Ex: Passionnée par l'entraide, je souhaite organiser plus d'événements pour notre promo..."
            className="rounded-xl border-gray-200 focus:border-cma-bordeaux min-h-[100px] text-sm"
          />
          <div className="flex justify-between items-center px-1">
             {error && <p className="text-[10px] text-red-500">{error}</p>}
             <p className="text-[10px] text-gray-400 ml-auto">{pitch.length}/300</p>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-cma-bordeaux hover:bg-cma-bordeaux/90 text-white rounded-xl h-11 gap-2"
        >
          {isPending ? <Loader2 size={18} className="animate-spin" /> : null}
          Valider ma candidature
        </Button>
      </form>
    </div>
  );
}
