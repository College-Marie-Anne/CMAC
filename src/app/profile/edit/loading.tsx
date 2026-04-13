export default function ProfileEditLoading() {
  return (
    <div className="min-h-screen bg-cma-gris dark:bg-gray-950">
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center">
        <div className="animate-pulse h-4 w-20 rounded bg-gray-200/60" />
      </header>
      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="animate-pulse h-7 w-48 rounded bg-gray-200/60" />
        <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-sm p-6">
          <div className="w-24 h-24 rounded-full bg-gray-200/60 animate-pulse mx-auto mb-4" />
          <div className="h-4 w-36 rounded bg-gray-200/60 animate-pulse mx-auto mb-2" />
          <div className="h-3 w-24 rounded bg-gray-200/60 animate-pulse mx-auto" />
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-sm p-5 space-y-3">
          <div className="h-3 w-12 rounded bg-gray-200/60 animate-pulse" />
          <div className="h-20 w-full rounded-xl bg-gray-100 animate-pulse" />
        </div>
      </main>
    </div>
  );
}
