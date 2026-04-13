export default function PostDetailLoading() {
  return (
    <div className="min-h-screen bg-cma-gris">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 h-14 flex items-center">
        <div className="animate-pulse h-4 w-28 rounded bg-gray-200/60" />
      </header>
      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="rounded-2xl bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200/60 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-40 rounded bg-gray-200/60 animate-pulse" />
              <div className="h-3 w-24 rounded bg-gray-200/60 animate-pulse" />
            </div>
          </div>
          <div className="h-3 w-16 rounded-full bg-gray-200/60 animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-gray-200/60 animate-pulse" />
            <div className="h-3 w-4/5 rounded bg-gray-200/60 animate-pulse" />
            <div className="h-3 w-3/5 rounded bg-gray-200/60 animate-pulse" />
          </div>
        </div>
        <div className="rounded-2xl bg-white shadow-sm p-5 space-y-4">
          <div className="h-4 w-32 rounded bg-gray-200/60 animate-pulse" />
          <div className="h-20 w-full rounded-xl bg-gray-100 animate-pulse" />
        </div>
      </main>
    </div>
  );
}
