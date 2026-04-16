import { Skeleton, CardSkeleton } from "@/components/ui/skeleton";

/**
 * Skeleton de /promo — match : header + sidebar (desktop) + main avec
 * profil promo (titre, emblème, KPIs membres) + widget élection + feed posts.
 */
export default function PromoLoading() {
  return (
    <div className="min-h-screen bg-cma-gris" aria-busy="true">
      {/* Header sticky */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-3 w-24 hidden sm:block" />
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

        {/* Main */}
        <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4">
          {/* Profil promo : emblème + nom + dates + count membres */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 text-center space-y-3">
            <Skeleton className="w-20 h-20 rounded-2xl mx-auto" />
            <Skeleton className="h-5 w-40 mx-auto" />
            <Skeleton className="h-3 w-28 mx-auto" />
            <div className="grid grid-cols-3 gap-3 pt-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-5 w-10 mx-auto" />
                  <Skeleton className="h-2.5 w-16 mx-auto" />
                </div>
              ))}
            </div>
          </div>

          {/* Widget élection */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-2.5 w-2/3" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>

          {/* Composer post promo */}
          <Skeleton className="h-12 w-full rounded-2xl" />

          {/* Liste de posts du coin promo */}
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} lines={3} />
          ))}
        </main>
      </div>
    </div>
  );
}
