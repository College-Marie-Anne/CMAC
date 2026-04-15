"use client";

import { useState, useTransition } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateNotificationPrefsAction } from "@/actions/profile";
import type { NotificationPrefs } from "@/lib/types/profile";

interface NotificationPrefsSectionProps {
  initial: NotificationPrefs;
  userRole: string;
}

// Labels et descriptions par type de notification (spec §470-488).
// "system" = toujours actif, non-désactivable → pas exposé dans l'UI.
type PrefKey = keyof NotificationPrefs;

type PrefMeta = {
  key: PrefKey;
  label: string;
  description: string;
  showFor?: "all" | "students" | "alumni"; // défaut all
};

const PREF_META: PrefMeta[] = [
  {
    key: "dm",
    label: "Messages privés",
    description: "Quand quelqu'un t'envoie un message",
  },
  {
    key: "forum_reply",
    label: "Réponses à mes posts",
    description: "Quand quelqu'un commente un post que j'ai publié",
  },
  {
    key: "forum_comment_reply",
    label: "Réponses dans des discussions",
    description: "Quand quelqu'un répond à un post que j'ai commenté",
  },
  {
    key: "reaction",
    label: "Réactions",
    description: "Quand quelqu'un réagit à mes posts ou commentaires",
  },
  {
    key: "mention",
    label: "Mentions @",
    description: "Quand quelqu'un me mentionne avec @mon_pseudo",
  },
  {
    key: "mentorship",
    label: "Demandes de mentorat",
    description: "Nouvelles demandes ou réponses à tes demandes de mentorat",
  },
  {
    key: "mentorship_completed",
    label: "Mentorat terminé",
    description: "Quand un mentorat est marqué comme terminé",
  },
  {
    key: "election",
    label: "Élections de promo",
    description: "Candidatures, votes et résultats dans ta promo",
  },
  {
    key: "new_opportunity",
    label: "Nouvelles bourses & opportunités",
    description: "Quand une alumni partage une bourse ou opportunité",
    showFor: "students",
  },
  {
    key: "push_enabled",
    label: "Notifications push",
    description: "Recevoir les notifications même quand l'app est fermée (navigateur)",
  },
];

function Toggle({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  id: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-cma-bordeaux" : "bg-gray-200 dark:bg-gray-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

export function NotificationPrefsSection({ initial, userRole }: NotificationPrefsSectionProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initial);
  const [savedPrefs, setSavedPrefs] = useState<NotificationPrefs>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDirty = (Object.keys(prefs) as PrefKey[]).some(
    (k) => prefs[k] !== savedPrefs[k]
  );

  const isStudent = userRole === "student" || userRole === "s4";
  const visibleMeta = PREF_META.filter((m) => {
    if (!m.showFor || m.showFor === "all") return true;
    if (m.showFor === "students") return isStudent;
    if (m.showFor === "alumni") return userRole === "alumni";
    return true;
  });

  const update = (key: PrefKey, val: boolean) => {
    setPrefs((p) => ({ ...p, [key]: val }));
    setError(null);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateNotificationPrefsAction(prefs);
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      setSavedPrefs({ ...prefs });
    });
  };

  const handleReset = () => {
    setPrefs(savedPrefs);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Bell size={16} /> Préférences de notification
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Les notifications système (compte, modération, support) restent
          toujours actives.
        </p>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {visibleMeta.map((meta) => (
          <div
            key={meta.key}
            className="flex items-start justify-between gap-3 py-3"
          >
            <label htmlFor={`pref-${meta.key}`} className="flex-1 cursor-pointer">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {meta.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {meta.description}
              </p>
            </label>
            <Toggle
              id={`pref-${meta.key}`}
              checked={prefs[meta.key]}
              onChange={(v) => update(meta.key, v)}
              disabled={isPending}
            />
          </div>
        ))}
      </div>

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
