"use client";

import { useRouter } from "next/navigation";
import { BlockButton } from "./block-button";

interface UnblockButtonProps {
  userId: string;
  userLabel: string;
}

/**
 * Wrapper "client-side router refresh" autour de BlockButton en mode débloquer.
 * Utilisé dans /settings/blocked pour rafraîchir la liste après débloque.
 */
export function UnblockButton({ userId, userLabel }: UnblockButtonProps) {
  const router = useRouter();
  return (
    <BlockButton
      userId={userId}
      userLabel={userLabel}
      isBlocked={true}
      variant="button"
      onSuccess={() => router.refresh()}
    />
  );
}
