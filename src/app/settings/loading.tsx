import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton de /settings — match : header + sections empilées (notifications,
 * thème, mot de passe, comptes bloqués, désactivation).
 */
export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-cma-gris dark:bg-gray-950" aria-busy="true">
      {/* Header sticky */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center justify-between">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <Skeleton className="h-7 w-48" />

        {/* Section : Préférences notifications */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-2.5 w-2/3" />
          <div className="space-y-2 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Section : Apparence */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>

        {/* Section : Mot de passe */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-2.5 w-2/3" />
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>

        {/* Section : Comptes bloqués */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-2.5 w-1/2" />
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>

        {/* Section : Désactivation compte */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/30 shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-2.5 w-2/3" />
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </main>
    </div>
  );
}
