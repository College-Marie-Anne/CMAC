import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";

/**
 * Skeleton de /opportunities — match : header avec search + sidebar (desktop)
 * + main avec liste de posts opportunités. Identique au feed dans la structure.
 */
export default function OpportunitiesLoading() {
  return (
    <div className="min-h-screen bg-cma-gris" aria-busy="true">
      {/* Header sticky avec search */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-3 w-32 hidden sm:block" />
        </div>
        <div className="flex-1 max-w-md mx-4">
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex flex-col w-60 min-h-[calc(100vh-3.5rem)] sticky top-14 border-r border-gray-100 bg-white p-4 shrink-0 space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </aside>

        {/* Main : liste posts */}
        <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4">
          {/* KPI count */}
          <Skeleton className="h-20 w-full rounded-2xl" />

          {/* Composer / CTA */}
          <Skeleton className="h-12 w-full rounded-2xl" />

          {/* Liste de posts */}
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} lines={3} />
          ))}
        </main>
      </div>
    </div>
  );
}
