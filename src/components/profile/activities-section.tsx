"use client";

import { useState, useTransition } from "react";
import { Activity as ActivityIcon, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateActivitiesAction } from "@/actions/profile";

type ActivityItem = { id: string; name: string };

interface ActivitiesSectionProps {
  allActivities: ActivityItem[];
  selectedIds: string[];
}

export function ActivitiesSection({ allActivities, selectedIds }: ActivitiesSectionProps) {
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [savedIds, setSavedIds] = useState<string[]>(selectedIds);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setSelected((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]
    );
    setError(null);
  };

  const isDirty = (() => {
    if (selected.length !== savedIds.length) return true;
    const a = [...selected].sort().join(",");
    const b = [...savedIds].sort().join(",");
    return a !== b;
  })();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateActivitiesAction({ activity_ids: selected });
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      setSavedIds([...selected]);
    });
  };

  const handleReset = () => {
    setSelected(savedIds);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <ActivityIcon size={16} /> Activités parascolaires
        </h3>
        <span className="text-xs text-gray-400">
          {selected.length} sélectionnée{selected.length > 1 ? "s" : ""}
        </span>
      </div>

      {allActivities.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          Aucune activité disponible pour le moment
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {allActivities.map((a) => {
            const isSelected = selected.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggle(a.id)}
                disabled={isPending}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-cma-bordeaux text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {isSelected && <Check size={12} />}
                {a.name}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {isDirty && allActivities.length > 0 && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-xl text-xs bg-cma-bordeaux text-white gap-1"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Enregistrer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            disabled={isPending}
            className="rounded-xl text-xs"
          >
            Annuler
          </Button>
        </div>
      )}
    </div>
  );
}
