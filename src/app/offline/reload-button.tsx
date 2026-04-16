"use client";

import { Button } from "@/components/ui/button";

export function ReloadButton() {
  return (
    <Button
      onClick={() => window.location.reload()}
      className="rounded-xl px-8 h-11 text-sm font-semibold"
      style={{
        background: "linear-gradient(135deg, #D4A017 0%, #b8860b 100%)",
        color: "#3a000f",
      }}
    >
      Réessayer
    </Button>
  );
}
