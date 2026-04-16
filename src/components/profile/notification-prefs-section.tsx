"use client";

import { useState, useTransition } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateNotificationPrefsAction } from "@/actions/profile";
import { usePushSubscription } from "@/lib/hooks/use-push-subscription";
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
  const [isPushPending, setIsPushPending] = useState(false);
  const { state: pushState, enable: enablePush, disable: disablePush } =
    usePushSubscription();

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

  // Toggle push = action imperative (nécessite user gesture pour
  // Notification.requestPermission()). On ne peut pas la différer au
  // bouton "Enregistrer" → on la traite immédiatement et on sync le state
  // local + savedPrefs (pas de "dirty" sur ce toggle).
  const handlePushToggle = async (val: boolean) => {
    setError(null);
    setIsPushPending(true);
    try {
      const result = val ? await enablePush() : await disablePush();
      if (!result.ok) {
        setError(result.error ?? "Erreur");
        return;
      }
      // L'action Server save/deletePushSubscription synchronise déjà
      // push_enabled en DB → on reflète localement.
      setPrefs((p) => ({ ...p, push_enabled: val }));
      setSavedPrefs((p) => ({ ...p, push_enabled: val }));
    } finally {
      setIsPushPending(false);
    }
  };

  const update = (key: PrefKey, val: boolean) => {
    if (key === "push_enabled") {
      void handlePushToggle(val);
      return;
    }
    setPrefs((p) => ({ ...p, [key]: val }));
    setError(null);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      // push_enabled est géré par handlePushToggle → on exclut de l'update
      // groupé pour ne pas écraser la synchro faite par save/deletePushSubscription
      const { push_enabled: _, ...rest } = prefs;
      void _;
      const result = await updateNotificationPrefsAction(
        rest as NotificationPrefs
      );
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

  // État du toggle push : disabled + message si environnement non supporté
  const pushDisabled =
    pushState === "loading" ||
    pushState === "unsupported" ||
    pushState === "no-vapid" ||
    pushState === "denied" ||
    isPushPending;

  const pushHint =
    pushState === "unsupported"
      ? "Votre navigateur ne supporte pas les notifications push"
      : pushState === "no-vapid"
        ? "Les notifications push ne sont pas configurées sur ce déploiement"
        : pushState === "denied"
          ? "Permission refusée — autorisez les notifications dans les paramètres du navigateur"
          : null;

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
        {visibleMeta.map((meta) => {
          const isPush = meta.key === "push_enabled";
          const hint = isPush ? pushHint : null;
          return (
            <div
              key={meta.key}
              className="flex items-start justify-between gap-3 py-3"
            >
              <label
                htmlFor={`pref-${meta.key}`}
                className="flex-1 cursor-pointer"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {meta.label}
                  {isPush && isPushPending && (
                    <Loader2
                      size={12}
                      className="inline-block ml-2 animate-spin text-gray-400"
                      aria-hidden="true"
                    />
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {hint ?? meta.description}
                </p>
              </label>
              <Toggle
                id={`pref-${meta.key}`}
                checked={prefs[meta.key]}
                onChange={(v) => update(meta.key, v)}
                disabled={isPending || (isPush && pushDisabled)}
              />
            </div>
          );
        })}
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
