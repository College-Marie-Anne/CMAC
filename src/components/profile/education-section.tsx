"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { YearSelect } from "@/components/ui/year-select";
import { addEducationAction, deleteEducationAction } from "@/actions/profile";
import type { ProfileEducation } from "@/lib/types/profile";

const TYPES = [
  { value: "university", label: "Université" },
  { value: "professional_school", label: "École professionnelle" },
  { value: "other", label: "Autre" },
];

export function EducationSection({ education }: { education: ProfileEducation[] }) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [instType, setInstType] = useState("university");
  const [instName, setInstName] = useState("");
  const [field, setField] = useState("");
  const [degree, setDegree] = useState("");
  const [startYear, setStartYear] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(null);

  const resetForm = () => {
    setInstType("university"); setInstName(""); setField(""); setDegree("");
    setStartYear(null); setEndYear(null); setShowForm(false); setError(null);
  };

  const handleAdd = () => {
    if (!instName.trim() || !field.trim()) { setError("Nom et domaine requis"); return; }
    setError(null);
    startTransition(async () => {
      const result = await addEducationAction({
        institution_type: instType as "university" | "professional_school" | "other",
        institution_name: instName.trim(),
        study_field: field.trim(),
        degree_level: degree.trim() || undefined,
        start_year: startYear ?? undefined,
        end_year: endYear ?? undefined,
      });
      if (!result.success) setError(result.error ?? "Erreur");
      else resetForm();
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => { await deleteEducationAction(id); });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <GraduationCap size={16} /> Parcours académique
        </h3>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="rounded-xl text-xs gap-1">
            <Plus size={12} /> Ajouter
          </Button>
        )}
      </div>

      {/* Existing entries */}
      {education.map((e) => (
        <div key={e.id} className="flex items-start justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{e.study_field}</p>
            <p className="text-xs text-gray-500">{e.institution_name}</p>
            <p className="text-xs text-gray-400">
              {e.degree_level && `${e.degree_level} · `}
              {e.start_year}{e.end_year ? ` — ${e.end_year}` : e.start_year ? " — en cours" : ""}
            </p>
          </div>
          <button onClick={() => handleDelete(e.id)} disabled={isPending} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {education.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center py-4">Aucun parcours ajouté</p>
      )}

      {/* Add form */}
      {showForm && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div>
            <Label className="text-xs">Type d&apos;institution</Label>
            <select value={instType} onChange={(e) => setInstType(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm mt-1">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Nom de l&apos;institution</Label>
            <Input value={instName} onChange={(e) => setInstName(e.target.value)} placeholder="Ex: Université de Montréal" className="rounded-xl h-9 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Domaine d&apos;études</Label>
            <Input value={field} onChange={(e) => setField(e.target.value)} placeholder="Ex: Informatique" className="rounded-xl h-9 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Niveau (optionnel)</Label>
            <Input value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="Ex: Licence, Master" className="rounded-xl h-9 mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Début</Label>
              <YearSelect value={startYear} onChange={setStartYear} placeholder="Année" variant="light" />
            </div>
            <div>
              <Label className="text-xs">Fin</Label>
              <YearSelect value={endYear} onChange={setEndYear} placeholder="Année" variant="light" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={isPending} className="rounded-xl text-xs bg-cma-bordeaux text-white gap-1">
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Ajouter
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm} className="rounded-xl text-xs">Annuler</Button>
          </div>
        </div>
      )}
    </div>
  );
}
