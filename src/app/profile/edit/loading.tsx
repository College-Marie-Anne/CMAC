import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton de /profile/edit — match : header (retour + paramètres) + cards
 * empilées (avatar, bio, éducation, professions, activités, invitations, etc.).
 */
export default function ProfileEditLoading() {
  return (
    <div className="min-h-screen bg-cma-gris dark:bg-gray-950" aria-busy="true">
      {/* Header sticky */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center justify-between">
        <Skeleton className="h-6 w-20 rounded-lg" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24 rounded-lg" />
          <Skeleton className="h-6 w-24 rounded-lg" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <Skeleton className="h-7 w-48" />

        {/* Card avatar + nom + badges */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-6 text-center space-y-3">
          <Skeleton className="w-24 h-24 rounded-full mx-auto" />
          <Skeleton className="h-4 w-40 mx-auto" />
          <Skeleton className="h-3 w-24 mx-auto" />
          <div className="flex justify-center gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>

        {/* Card bio */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="flex justify-end">
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>

        {/* Cards récurrentes : éducation / professions / activités / etc. */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        ))}

        {/* Lien vers paramètres */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-2.5 w-56" />
            </div>
            <Skeleton className="h-3 w-3" />
          </div>
        </div>
      </main>
    </div>
  );
}
