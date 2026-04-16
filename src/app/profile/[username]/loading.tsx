import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton de /profile/[username] — match : header retour + carte profil
 * (avatar, nom, badges, bio, country) + sections (éducation, professions,
 * activités, domaines d'études).
 */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-cma-gris dark:bg-gray-950" aria-busy="true">
      {/* Header sticky */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center justify-between">
        <Skeleton className="h-6 w-20 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-xl" />
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Card identité : avatar + nom + username + badges + bio */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-6 text-center space-y-3">
          <Skeleton className="w-24 h-24 rounded-full mx-auto" />
          <Skeleton className="h-5 w-44 mx-auto" />
          <Skeleton className="h-3 w-28 mx-auto" />
          <div className="flex justify-center gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-3/4 mx-auto" />
          <Skeleton className="h-3 w-2/3 mx-auto" />
          <div className="flex items-center justify-center gap-3 pt-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          {/* CTA messagerie */}
          <Skeleton className="h-10 w-40 rounded-xl mx-auto mt-2" />
        </div>

        {/* Sections : éducation / professions / activités / domaines */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-3"
          >
            <Skeleton className="h-4 w-32" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
            <div className="space-y-2 pt-1">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
