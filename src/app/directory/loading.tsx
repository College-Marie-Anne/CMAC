export default function DirectoryLoading() {
  return (
    <div className="min-h-screen bg-cma-gris dark:bg-gray-950">
      {/* Header skeleton */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center gap-3">
        <div className="w-6 h-6 rounded bg-gray-200/60 animate-pulse" />
        <div className="h-4 w-20 rounded bg-gray-200/60 animate-pulse" />
        <div className="h-3 w-16 rounded bg-gray-100 animate-pulse" />
      </div>

      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Search bar skeleton */}
        <div className="h-12 rounded-xl bg-white border border-gray-100 animate-pulse" />

        {/* Results count skeleton */}
        <div className="h-3 w-32 rounded bg-gray-200/60 animate-pulse" />

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-gray-100 animate-pulse"
            >
              <div className="w-10 h-10 rounded-full bg-gray-200/60 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-28 rounded bg-gray-200/60" />
                <div className="h-2.5 w-20 rounded bg-gray-100" />
                <div className="h-2 w-36 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
