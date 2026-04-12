import { ListSkeleton } from "@/components/ui/skeleton";

export default function ApprovalsLoading() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse h-8 w-40 rounded-xl bg-gray-200/60" />
      <ListSkeleton count={4} />
    </div>
  );
}
