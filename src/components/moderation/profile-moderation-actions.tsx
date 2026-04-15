"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "./report-dialog";
import { BlockButton } from "./block-button";

interface ProfileModerationActionsProps {
  targetUserId: string;
  targetUsername: string;
  targetFullName: string;
  isBlocked: boolean;
}

export function ProfileModerationActions({
  targetUserId,
  targetUsername,
  targetFullName,
  isBlocked,
}: ProfileModerationActionsProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={() => setReportOpen(true)}
          variant="outline"
          size="sm"
          className="rounded-xl text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50"
        >
          <Flag size={12} /> Signaler
        </Button>
        <BlockButton
          userId={targetUserId}
          userLabel={targetFullName}
          isBlocked={isBlocked}
          variant="button"
          onSuccess={() => router.refresh()}
        />
      </div>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="user"
        targetId={targetUserId}
        targetLabel={`Profil de @${targetUsername}`}
      />
    </>
  );
}
