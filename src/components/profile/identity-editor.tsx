"use client";

import { useEffect, useState, useTransition } from "react";
import { Save, Loader2, UserCircle2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateIdentityAction } from "@/actions/profile";

interface IdentityEditorProps {
  initial: {
    username: string;
    first_name: string;
    last_name: string;
  };
}

/**
 * Section "Identité" de /profile/edit — laisse l'utilisatrice modifier son
 * username, son prénom et son nom elle-même (avant, il fallait passer par
 * un admin). Validation alignée sur celle de l'inscription (username 3-20
 * alphanumérique + underscore, prénom/nom 1-100 sans XSS).
 *
 * Rate limit côté server action : 3 changements / 24h.
 */
export function IdentityEditor({ initial }: IdentityEditorProps) {
  const [username, setUsername] = useState(initial.username);
  const [firstName, setFirstName] = useState(initial.first_name);
  const [lastName, setLastName] = useState(initial.last_name);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Resync si les props changent (router.refresh après save, ou édition
  // concurrente admin). React Compiler warn setState-in-effect mais c'est
  // le pattern canonique pour "controlled-by-server + localement éditable".
  // Alternative = key prop sur le parent = casserait le focus/scroll UX.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsername(initial.username);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFirstName(initial.first_name);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastName(initial.last_name);
  }, [initial.username, initial.first_name, initial.last_name]);

  const isDirty =
    username.trim() !== initial.username ||
    firstName.trim() !== initial.first_name ||
    lastName.trim() !== initial.last_name;

  const handleSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateIdentityAction({
        username: username.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      setSaved(true);
      // Efface l'indicateur "Enregistré" après 2s (non-critique, UX pure).
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleReset = () => {
    setUsername(initial.username);
    setFirstName(initial.first_name);
    setLastName(initial.last_name);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
        <UserCircle2 size={16} /> Identité
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="id-first-name" className="text-xs text-gray-600 dark:text-gray-400">
            Prénom(s)
          </Label>
          <Input
            id="id-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value.slice(0, 100))}
            maxLength={100}
            className="rounded-xl text-sm"
            disabled={isPending}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="id-last-name" className="text-xs text-gray-600 dark:text-gray-400">
            Nom
          </Label>
          <Input
            id="id-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value.slice(0, 100))}
            maxLength={100}
            className="rounded-xl text-sm"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="id-username" className="text-xs text-gray-600 dark:text-gray-400">
          Username
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            @
          </span>
          <Input
            id="id-username"
            value={username}
            onChange={(e) =>
              // Filtre à la volée : on accepte uniquement les chars autorisés
              // pour éviter de laisser l'utilisatrice taper des caractères
              // qui seraient rejetés côté serveur (UX moins frustrante).
              setUsername(
                e.target.value
                  .slice(0, 20)
                  .replace(/[^a-zA-Z0-9_]/g, "")
              )
            }
            maxLength={20}
            className="rounded-xl text-sm pl-7"
            disabled={isPending}
          />
        </div>
        <p className="text-[10px] text-gray-400">
          3 à 20 caractères — lettres, chiffres, underscore. Identifie ton profil publiquement.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-600 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 px-3 py-2">
          {error}
        </p>
      )}

      {isDirty && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-xl text-xs bg-cma-vert text-white gap-1"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
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

      {saved && !isDirty && (
        <p className="text-[11px] text-cma-vert flex items-center gap-1">
          <Check size={12} /> Enregistré
        </p>
      )}
    </div>
  );
}
