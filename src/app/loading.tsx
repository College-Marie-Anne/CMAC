import { LoadingBar } from "@/components/ui/skeleton";

/**
 * Loading UI racine — fallback pour toute route sans `loading.tsx` spécifique.
 *
 * Historique : la version précédente affichait un overlay plein écran avec
 * dégradé bordeaux + logo pulsant. Effet "écran splash" à chaque navigation
 * interne → cassait l'immersion (l'utilisatrice perdait le contexte visuel
 * de la page précédente pendant 200–500 ms).
 *
 * Nouvelle approche : **loading totalement passif** — juste une barre de
 * progression de 2px en haut, sans overlay ni contenu au centre. Next.js
 * réserve l'espace de la page cible et la révèle dès qu'elle est prête. La
 * navigation devient perceptuellement instantanée.
 *
 * Les routes qui ont besoin d'un skeleton structurel (messages, notifications,
 * profile, support, mentorship, opportunities, promo, settings) gardent leur
 * `loading.tsx` dédié.
 */
export default function RootLoading() {
  return (
    <div
      className="min-h-screen"
      role="status"
      aria-live="polite"
      aria-label="Chargement"
    >
      <LoadingBar />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
