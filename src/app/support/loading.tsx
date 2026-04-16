import { Skeleton, LoadingBar } from "@/components/ui/skeleton";

/**
 * Skeleton de /support — match : header + section "Nouveau ticket" + liste
 * de tickets existants.
 */
export default function SupportLoading() {
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

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Bandeau "Créer un ticket" */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-2.5 w-3/4" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="flex justify-end">
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>

        {/* Liste des tickets */}
        <section className="space-y-2">
          <Skeleton className="h-3 w-32 mb-3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-2.5 w-1/2" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
