export default function FeedLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header skeleton */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 h-14 flex items-center px-4 gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200/60 animate-pulse" />
        <div className="flex-1 h-9 rounded-xl bg-gray-100 animate-pulse" />
        <div className="w-8 h-8 rounded-full bg-gray-200/60 animate-pulse" />
        <div className="w-8 h-8 rounded-full bg-gray-200/60 animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="rounded-2xl bg-gray-50 p-6 text-center animate-pulse">
          <div className="h-8 w-8 rounded bg-gray-200/60 mx-auto mb-2" />
          <div className="h-3 w-40 rounded bg-gray-200/60 mx-auto" />
        </div>
        <div className="rounded-2xl bg-gray-50 p-4 flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-gray-200/60" />
          <div className="flex-1 h-10 rounded-xl bg-gray-200/60" />
        </div>
      </div>
    </div>
  );
}
