"use client";

import Image from "next/image";
import { Handshake } from "lucide-react";
import type { SuggestedMentor } from "@/lib/types/mentorship";

interface MentorCardProps {
  mentor: SuggestedMentor;
  onSelect: (mentor: SuggestedMentor) => void;
  disabled?: boolean;
}

export function MentorCard({ mentor, onSelect, disabled }: MentorCardProps) {
  const initials = `${(mentor.first_name || "?")[0]}${(mentor.last_name || "?")[0]}`;

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col items-center text-center transition-shadow hover:shadow-md h-full">
      <div className="w-16 h-16 rounded-full bg-cma-bordeaux flex items-center justify-center text-white text-xl font-bold mb-3 overflow-hidden relative shrink-0">
        {mentor.avatar_url ? (
          <Image src={mentor.avatar_url} alt="" fill className="object-cover" sizes="64px" />
        ) : (
          initials
        )}
      </div>

      <h3 className="text-sm font-bold text-gray-900 mb-0.5 line-clamp-1 w-full relative group">
        {mentor.first_name} {mentor.last_name}
      </h3>

      <div className="text-xs text-gray-500 mb-3 space-y-1 w-full">
        <p className="line-clamp-2 min-h-[2rem]">
          {mentor.profession_title || mentor.class || "Alumni"}
          {mentor.company ? ` chez ${mentor.company}` : ""}
        </p>
        <p className="font-semibold text-cma-bordeaux break-words">
          {mentor.study_field}
        </p>
        {mentor.country && (
          <p className="text-gray-400">🌍 {mentor.country}</p>
        )}
      </div>

      <div className="mt-auto w-full pt-3 border-t border-gray-50">
        <button
          type="button"
          onClick={() => !disabled && onSelect(mentor)}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cma-bordeaux/5 text-cma-bordeaux hover:bg-cma-bordeaux hover:text-white transition-colors text-xs font-semibold disabled:opacity-50 disabled:hover:bg-cma-bordeaux/5 disabled:hover:text-cma-bordeaux disabled:cursor-not-allowed"
        >
          <Handshake size={14} />
          Solliciter
        </button>
      </div>
    </div>
  );
}
