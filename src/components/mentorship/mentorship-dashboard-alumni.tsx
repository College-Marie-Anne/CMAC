"use client";

import type { MentorshipSession, MentorshipRequest } from "@/lib/types/mentorship";
import { ActiveSessionCard } from "./active-session-card";
import { PendingRequestCard } from "./pending-request-card";

interface MentorshipDashboardAlumniProps {
  currentUserId: string;
  activeSessions: MentorshipSession[];
  pastSessions: MentorshipSession[];
  pendingRequests: MentorshipRequest[];
}

export function MentorshipAlumniDashboard({
  currentUserId,
  activeSessions,
  pastSessions,
  pendingRequests,
}: MentorshipDashboardAlumniProps) {
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Espace Mentorat</h2>
        <p className="text-sm text-gray-500">
          Guidez les élèves du CMA dans leur parcours académique et professionnel.
        </p>
      </div>

      {/* Pending Requests */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 mb-4 px-1">
          Demandes en attente ({pendingRequests.length})
        </h3>
        
        {pendingRequests.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {pendingRequests.map((req) => (
              <PendingRequestCard key={req.id} request={req} view="mentor" />
            ))}
          </div>
        ) : (
           <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
             <p className="text-gray-900 font-semibold mb-1">Aucune demande de mentorat pour l'instant</p>
             <p className="text-sm text-gray-400">Les demandes ciblées ou ouvertes dans votre domaine apparaîtront ici.</p>
           </div>
        )}
      </section>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-4 px-1">
            Élèves accompagnées ({activeSessions.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((session) => (
              <ActiveSessionCard key={session.id} session={session} currentUserId={currentUserId} />
            ))}
          </div>
        </section>
      )}

      {pastSessions.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-4 px-1">
            Historique ({pastSessions.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastSessions.map((session) => (
              <ActiveSessionCard key={session.id} session={session} currentUserId={currentUserId} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
