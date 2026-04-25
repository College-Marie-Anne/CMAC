import { LoadingBar, CardSkeleton, Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton /feed — match la structure : header sticky + sidebar desktop +
 * feed central (posts cards). Affiché pendant le SSR fetch des posts.
 */
export default function FeedLoading() {
  return (
    <div className="min-h-screen bg-cma-gris" aria-busy="true">
      <LoadingBar />

      {/* Header sticky */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-3 w-20 hidden sm:block" />
        </div>
        <Skeleton className="flex-1 max-w-md mx-4 h-9 rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex flex-col w-60 h-[calc(100vh-3.5rem)] sticky top-14 border-r border-gray-100 bg-white p-4 gap-2">
          <div className="mb-4 p-4 rounded-2xl bg-gray-50 text-center space-y-2">
            <Skeleton className="w-14 h-14 rounded-full mx-auto" />
            <Skeleton className="h-3 w-24 mx-auto" />
            <Skeleton className="h-2 w-16 mx-auto" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-xl" />
          ))}
        </aside>

        {/* Feed central */}
        <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} lines={3} />
          ))}
        </main>
      </div>
    </div>
  );
}
