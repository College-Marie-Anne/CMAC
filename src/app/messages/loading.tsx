import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton de /messages — match la structure du MessagesShell :
 * sidebar conversation list (desktop) ou liste pleine largeur (mobile).
 */
export default function MessagesLoading() {
  return (
    <div className="h-screen flex flex-col bg-white" aria-busy="true">
      <div className="flex flex-1 min-h-0">
        {/* Sidebar conversation list (desktop) / pleine largeur (mobile) */}
        <aside className="w-full lg:w-80 xl:w-96 lg:shrink-0 lg:border-r lg:border-gray-100 flex flex-col">
          {/* Header sticky : titre + bouton nouvelle conv */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
          </div>

          {/* Liste de conversations */}
          <div className="flex-1 overflow-y-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-3 border-b border-gray-50"
              >
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-10" />
                  </div>
                  <Skeleton className="h-2.5 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main panel — empty state desktop only */}
        <main className="hidden lg:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center space-y-3">
            <Skeleton className="w-16 h-16 rounded-full mx-auto" />
            <Skeleton className="h-3 w-48 mx-auto" />
            <Skeleton className="h-2.5 w-32 mx-auto" />
          </div>
        </main>
      </div>
    </div>
  );
}
