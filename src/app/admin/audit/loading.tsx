import { ListSkeleton } from "@/components/ui/skeleton";

export default function AuditLoading() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse h-8 w-44 rounded-xl bg-gray-200/60" />
      <ListSkeleton count={6} />
    </div>
  );
}
