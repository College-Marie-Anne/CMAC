import { Skeleton, CardSkeleton, LoadingBar } from "@/components/ui/skeleton";

/**
 * Skeleton de /mentorship — match : header + sidebar (desktop) + main avec
 * sections "Mentors suggérés" + "Mes demandes" + "Mes sessions".
 */
export default function MentorshipLoading() {
  return (
    <div className="min-h-screen bg-cma-gris" aria-busy="true">
      <LoadingBar />
      {/* Header sticky */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-3 w-20 hidden sm:block" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex flex-col w-60 h-[calc(100vh-3.5rem)] sticky top-14 border-r border-gray-100 bg-white p-4 shrink-0 space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-6">
          {/* Section "Mentors suggérés" */}
          <section className="space-y-3">
            <Skeleton className="h-4 w-44" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} lines={2} />
              ))}
            </div>
          </section>

          {/* Section "Mes demandes" */}
          <section className="space-y-3">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 2 }).map((_, i) => (
              <CardSkeleton key={i} lines={2} />
            ))}
          </section>

          {/* Section "Sessions actives" */}
          <section className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <CardSkeleton lines={3} />
          </section>
        </main>
      </div>
    </div>
  );
}
