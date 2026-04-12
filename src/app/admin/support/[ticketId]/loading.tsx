import { CardSkeleton } from "@/components/ui/skeleton";

export default function TicketDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6" role="status" aria-label="Chargement du ticket">
      <div className="animate-pulse h-4 w-32 rounded bg-gray-200/60" />
      <div className="rounded-2xl bg-white shadow-sm p-6 space-y-4">
        <div className="animate-pulse h-5 w-64 rounded bg-gray-200/60" />
        <div className="flex gap-2">
          <div className="animate-pulse h-5 w-16 rounded-full bg-gray-200/60" />
          <div className="animate-pulse h-5 w-24 rounded-full bg-gray-200/60" />
        </div>
        <div className="animate-pulse h-3 w-48 rounded bg-gray-200/60" />
        <div className="animate-pulse h-32 w-full rounded-xl bg-gray-200/60" />
      </div>
      <CardSkeleton lines={2} />
    </div>
  );
}
