"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MentorshipSession, MentorshipRequest, SuggestedMentor } from "@/lib/types/mentorship";
import { ActiveSessionCard } from "./active-session-card";
import { PendingRequestCard } from "./pending-request-card";
import { MentorCard } from "./mentor-card";
import { RequestDialog } from "./request-dialog";

interface MentorshipDashboardStudentProps {
  currentUserId: string;
  activeSessions: MentorshipSession[];
  pastSessions: MentorshipSession[];
  pendingRequests: MentorshipRequest[];
  suggestedMentors: SuggestedMentor[];
  studyFields: string[];
}

export function MentorshipStudentDashboard({
  currentUserId,
  activeSessions,
  pastSessions,
  pendingRequests,
  suggestedMentors,
  studyFields
}: MentorshipDashboardStudentProps) {
  const [selectedMentor, setSelectedMentor] = useState<SuggestedMentor | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenRequest = () => {
    setSelectedMentor(null);
    setIsDialogOpen(true);
  };

  const handleTargetRequest = (mentor: SuggestedMentor) => {
    setSelectedMentor(mentor);
    setIsDialogOpen(true);
  };

  const maxSessions = 3;
  const isQuotaReached = activeSessions.length >= maxSessions;

  return (
    <div className="space-y-8">
      {/* Header and Quota */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Votre parcours de mentorat</h2>
          <p className="text-sm text-gray-500">Bénéficiez de l&apos;expérience de nos Alumni.</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">{activeSessions.length}</span>
            <span className="text-xs text-gray-400">/ {maxSessions} sessions actives</span>
          </div>
          <div className="w-full md:w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${isQuotaReached ? 'bg-red-500' : 'bg-cma-vert'}`} 
              style={{ width: `${(activeSessions.length / maxSessions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {isQuotaReached && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
          Vous avez atteint le maximum de 3 mentorats actifs. Terminez une session pour pouvoir faire de nouvelles demandes.
        </div>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-4 px-1">En cours ({activeSessions.length})</h3>
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

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-900 mb-4 px-1">Demandes envoyées ({pendingRequests.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {pendingRequests.map((req) => (
              <PendingRequestCard key={req.id} request={req} view="mentee" />
            ))}
          </div>
        </section>
      )}

      {/* Suggested Mentors & Open Request */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-sm font-bold text-gray-900">Alumni suggérées dans vos domaines</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleOpenRequest}
            disabled={isQuotaReached}
            className="rounded-xl h-8 text-xs font-semibold"
          >
            <Plus size={14} className="mr-1.5" />
            Demande ouverte
          </Button>
        </div>

        {suggestedMentors.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {suggestedMentors.map((mentor) => (
              <MentorCard 
                key={mentor.id} 
                mentor={mentor} 
                onSelect={handleTargetRequest} 
                disabled={isQuotaReached}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
             <p className="text-gray-900 font-semibold mb-2">Trouvez une mentor dans votre domaine</p>
             <p className="text-sm text-gray-500 max-w-md mb-4 px-4">
               Créez une demande ouverte pour que toutes les Alumni de vos domaines d&apos;intérêt puissent vous épauler.
             </p>
             <Button
                onClick={handleOpenRequest}
                disabled={isQuotaReached}
                className="bg-cma-bordeaux hover:bg-cma-bordeaux/90 rounded-xl px-6"
             >
                <Plus size={16} className="mr-2" /> Demande ouverte
             </Button>
          </div>
        )}
      </section>

      <RequestDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        mentor={selectedMentor}
        studyFields={studyFields}
      />
    </div>
  );
}
