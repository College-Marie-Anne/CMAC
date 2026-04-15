"use client";

import { useState, useTransition, useRef } from "react";
import { Compass, Plus, X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateDesiredFieldsAction } from "@/actions/profile";

interface DesiredFieldsSectionProps {
  initialFields: string[];
}

const MAX_FIELDS = 3;

export function DesiredFieldsSection({ initialFields }: DesiredFieldsSectionProps) {
  const [fields, setFields] = useState<string[]>(initialFields);
  const [savedFields, setSavedFields] = useState<string[]>(initialFields);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize pour éviter doublons "Médecine" vs "medecine" etc.
  const normalize = (s: string) =>
    s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const addField = () => {
    const val = input.trim();
    if (!val) return;
    if (val.length > 150) {
      setError("Maximum 150 caractères par domaine");
      return;
    }
    if (fields.length >= MAX_FIELDS) {
      setError(`Maximum ${MAX_FIELDS} domaines`);
      return;
    }
    if (fields.some((f) => normalize(f) === normalize(val))) {
      setError("Ce domaine est déjà dans la liste");
      return;
    }
    setFields([...fields, val]);
    setInput("");
    setError(null);
    inputRef.current?.focus();
  };

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx));
    setError(null);
  };

  const isDirty = (() => {
    if (fields.length !== savedFields.length) return true;
    return fields.some((f, i) => f !== savedFields[i]);
  })();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateDesiredFieldsAction({ fields });
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      setSavedFields([...fields]);
    });
  };

  const handleReset = () => {
    setFields(savedFields);
    setInput("");
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Compass size={16} /> Domaines d&apos;études désirés
        </h3>
        <span className="text-xs text-gray-400">
          {fields.length}/{MAX_FIELDS}
        </span>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Les domaines d&apos;études que tu souhaites poursuivre à l&apos;université.
        Utilisés pour te suggérer des mentors alumni du même domaine.
      </p>

      {/* Existing tags */}
      {fields.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fields.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-lg bg-cma-or/10 px-2.5 py-1 text-xs font-medium text-cma-or"
            >
              {f}
              <button
                type="button"
                onClick={() => removeField(i)}
                disabled={isPending}
                className="hover:text-red-500 transition-colors"
                aria-label={`Retirer ${f}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add input */}
      {fields.length < MAX_FIELDS && (
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addField();
              }
            }}
            placeholder="Ex: Médecine, Droit, Informatique"
            maxLength={150}
            disabled={isPending}
            className="rounded-xl h-9 text-sm"
          />
          <Button
            type="button"
            size="sm"
            onClick={addField}
            disabled={isPending || !input.trim()}
            className="rounded-xl gap-1 bg-cma-or/20 text-cma-or hover:bg-cma-or/30"
          >
            <Plus size={12} />
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {isDirty && (
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
