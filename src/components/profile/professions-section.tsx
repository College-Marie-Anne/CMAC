"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { addProfessionAction, deleteProfessionAction } from "@/actions/profile";
import type { ProfileProfession } from "@/lib/types/profile";

export function ProfessionsSection({ professions }: { professions: ProfileProfession[] }) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [isCurrent, setIsCurrent] = useState(true);

  const resetForm = () => { setTitle(""); setCompany(""); setIsCurrent(true); setShowForm(false); setError(null); };

  const handleAdd = () => {
    if (!title.trim()) { setError("Titre requis"); return; }
    setError(null);
    startTransition(async () => {
      const result = await addProfessionAction({ title: title.trim(), company: company.trim() || undefined, is_current: isCurrent });
      if (!result.success) setError(result.error ?? "Erreur");
      else resetForm();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => { await deleteProfessionAction(id); });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Briefcase size={16} /> Métiers
        </h3>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="rounded-xl text-xs gap-1">
            <Plus size={12} /> Ajouter
          </Button>
        )}
      </div>

      {professions.map((p) => (
        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.title}</p>
            {p.company && <p className="text-xs text-gray-500">{p.company}</p>}
          </div>
          <div className="flex items-center gap-2">
            {p.is_current && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600">Actuel</span>}
            <button onClick={() => handleDelete(p.id)} disabled={isPending} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {professions.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center py-4">Aucun métier ajouté</p>
      )}

      {showForm && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div>
            <Label className="text-xs">Titre du poste</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Développeuse web" className="rounded-xl h-9 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Entreprise (optionnel)</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Ex: LakouSystems" className="rounded-xl h-9 mt-1" />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <Checkbox checked={isCurrent} onCheckedChange={(c) => setIsCurrent(c === true)} />
            Poste actuel
          </label>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={isPending} className="rounded-xl text-xs bg-cma-bordeaux text-white gap-1">
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Ajouter
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm} className="rounded-xl text-xs">Annuler</Button>
          </div>
        </div>
      )}
    </div>
  );
}
