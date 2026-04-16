import { Skeleton, LoadingBar } from "@/components/ui/skeleton";

/**
 * Skeleton de /notifications — match la structure : header avec retour +
 * "tout marquer lu", filtres chips, groupes par date, liste de notifs.
 */
export default function NotificationsLoading() {
  return (
    <main
      className="min-h-screen bg-cma-gris px-4 py-6 sm:px-6"
      aria-busy="true"
    >
      <LoadingBar />
      <div className="mx-auto max-w-3xl">
        {/* Header : retour + tout marquer lu */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Title + filter chips */}
          <div className="border-b border-gray-100 px-4 py-3 space-y-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-2.5 w-20" />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Groupe Aujourd'hui */}
          <div>
            <div className="px-4 py-2 bg-gray-50 border-y border-gray-100">
              <Skeleton className="h-2.5 w-20" />
            </div>
            <ul className="divide-y divide-gray-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-2.5 w-24" />
                      <Skeleton className="h-3 w-5/6" />
                      <Skeleton className="h-2.5 w-32" />
                      <Skeleton className="h-3 w-14 mt-2" />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Skeleton className="h-7 w-10 rounded-lg" />
                      <Skeleton className="h-7 w-7 rounded-lg" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Groupe Hier */}
          <div>
            <div className="px-4 py-2 bg-gray-50 border-y border-gray-100">
              <Skeleton className="h-2.5 w-12" />
            </div>
            <ul className="divide-y divide-gray-100">
              {Array.from({ length: 2 }).map((_, i) => (
                <li key={i} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-2.5 w-20" />
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2.5 w-28" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
