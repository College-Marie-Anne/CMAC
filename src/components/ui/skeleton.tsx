function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-200/60 ${className}`}
      aria-hidden="true"
    />
  );
}

export function KpiSkeleton() {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-2.5 w-32" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-5 space-y-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-[250px] w-full" />
    </div>
  );
}

export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className={`h-3 ${i === 0 ? "w-3/4" : "w-1/2"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Chargement du dashboard" role="status">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <ChartSkeleton />
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4" aria-label="Chargement du fil" role="status">
      <Skeleton className="h-12 w-full rounded-xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <CardSkeleton key={i} lines={3} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-label="Chargement" role="status">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
