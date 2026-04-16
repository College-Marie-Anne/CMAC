import { LoadingBar, Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton /directory — match : header retour + 3 KPI cards + search bar +
 * grille de member cards.
 */
export default function DirectoryLoading() {
  return (
    <div className="min-h-screen bg-cma-gris dark:bg-gray-950" aria-busy="true">
      <LoadingBar />

      <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center gap-3">
        <Skeleton className="h-7 w-24 rounded-lg" />
        <Skeleton className="h-4 w-20" />
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 space-y-2"
            >
              <Skeleton className="w-9 h-9 rounded-xl" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-2 w-16" />
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>

        {/* Member cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-2 w-2/3" />
              <Skeleton className="h-2 w-1/3" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
