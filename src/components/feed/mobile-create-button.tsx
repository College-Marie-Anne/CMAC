"use client";

import { useState } from "react";
import { CreatePostDialog } from "./create-post-dialog";
import type { ForumTag } from "@/lib/types/forum";

interface MobileCreateButtonProps {
  tags: ForumTag[];
  userId: string;
}

export function MobileCreateButton({ tags, userId }: MobileCreateButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-11 h-11 rounded-full bg-cma-bordeaux flex items-center justify-center text-white -mt-4 shadow-lg"
        aria-label="Créer un post"
      >
        <span className="text-xl leading-none">+</span>
      </button>

      <CreatePostDialog
        tags={tags}
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
      />
    </>
  );
}
