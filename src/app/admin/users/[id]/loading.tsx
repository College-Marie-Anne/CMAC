import { CardSkeleton, KpiSkeleton } from "@/components/ui/skeleton";

export default function UserDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6" role="status" aria-label="Chargement du profil">
      <div className="animate-pulse h-4 w-32 rounded bg-gray-200/60" />
      <div className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200/60 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="animate-pulse h-5 w-48 rounded bg-gray-200/60" />
            <div className="animate-pulse h-3 w-32 rounded bg-gray-200/60" />
            <div className="animate-pulse h-3 w-56 rounded bg-gray-200/60" />
          </div>
        </div>
      </div>
      <CardSkeleton lines={3} />
      <CardSkeleton lines={2} />
    </div>
  );
}
