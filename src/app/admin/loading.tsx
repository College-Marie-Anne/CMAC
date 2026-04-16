import { LoadingBar, Skeleton, KpiSkeleton, ChartSkeleton, ListSkeleton } from "@/components/ui/skeleton";

/**
 * Skeleton global pour toutes les routes /admin/* sans loading.tsx dédié.
 * Match la structure du AdminLayout : sidebar fixe + main content.
 *
 * Pour le dashboard (/admin) on affiche des KPI skeletons + charts. Pour les
 * sous-routes (users, approvals, etc.) c'est une liste plate qui fonctionne
 * aussi comme placeholder générique — l'utilisatrice voit toujours quelque
 * chose de structuré, pas un écran blanc.
 */
export default function AdminLoading() {
  return (
    <div className="flex min-h-screen" data-theme="light" style={{ colorScheme: "light" }} aria-busy="true">
      <LoadingBar />

      {/* Sidebar admin */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-gray-100 bg-white p-4 gap-2">
        <div className="mb-4 p-4 rounded-2xl bg-gray-50 space-y-2">
          <Skeleton className="w-12 h-12 rounded-full" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-16" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-xl" />
        ))}
      </aside>

      <main className="flex-1 bg-cma-gris min-h-screen lg:ml-0">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <Skeleton className="h-8 w-40" />

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KpiSkeleton key={i} />
            ))}
          </div>

          {/* Charts / listes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>

          <ListSkeleton count={5} />
        </div>
      </main>
    </div>
  );
}
