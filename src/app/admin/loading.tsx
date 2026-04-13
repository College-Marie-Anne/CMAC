export default function AdminLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Chargement du dashboard">
      <div className="h-8 w-40 rounded-xl bg-gray-300/40 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white shadow-sm p-5 space-y-3">
            <div className="h-3 w-24 rounded bg-gray-200/60 animate-pulse" />
            <div className="h-7 w-16 rounded bg-gray-200/60 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white shadow-sm p-5 space-y-4">
          <div className="h-4 w-40 rounded bg-gray-200/60 animate-pulse" />
          <div className="h-[250px] w-full rounded-xl bg-gray-100 animate-pulse" />
        </div>
        <div className="rounded-2xl bg-white shadow-sm p-5 space-y-4">
          <div className="h-4 w-40 rounded bg-gray-200/60 animate-pulse" />
          <div className="h-[250px] w-full rounded-xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
