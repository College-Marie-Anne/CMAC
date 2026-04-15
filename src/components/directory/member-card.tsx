import Link from "next/link";
import { MapPin, Briefcase, GraduationCap, Sprout } from "lucide-react";
import { UserAvatar } from "@/components/feed/user-avatar";
import type { DirectoryMember } from "@/lib/types/directory";

interface MemberCardProps {
  member: DirectoryMember;
}

function getRoleBadge(role: string, className?: string | null) {
  switch (role) {
    case "alumni":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cma-bordeaux/10 text-cma-bordeaux">
          <GraduationCap size={10} />
          Alumni
        </span>
      );
    case "s4":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cma-or/10 text-cma-or">
          <GraduationCap size={10} />
          S4
        </span>
      );
    case "student":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cma-vert/10 text-cma-vert">
          <Sprout size={10} />
          {className ?? "Élève"}
        </span>
      );
    default:
      return null;
  }
}

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000;
}

export function MemberCard({ member }: MemberCardProps) {
  return (
    <Link
      href={`/profile/${member.username}`}
      className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-cma-bordeaux/20 transition-all group"
    >
      {/* Avatar + online indicator */}
      <div className="relative shrink-0">
        <UserAvatar
          firstName={member.first_name}
          lastName={member.last_name}
          avatarUrl={member.avatar_url}
        />
        {isOnline(member.last_seen_at) && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-cma-vert border-2 border-white" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-cma-bordeaux transition-colors">
            {member.first_name} {member.last_name}
          </p>
          {getRoleBadge(member.role, member.class)}
        </div>

        <p className="text-xs text-gray-400 truncate">@{member.username}</p>

        {/* Meta row */}
        <div className="flex items-center gap-2.5 mt-1 flex-wrap">
          {member.current_profession && (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
              <Briefcase size={10} />
              <span className="truncate max-w-[120px]">
                {member.current_profession}
                {member.current_company && ` · ${member.current_company}`}
              </span>
            </span>
          )}
          {member.promo_name && (
            <span className="text-[10px] text-gray-400">
              Promo {member.promo_name}
            </span>
          )}
          {member.filiere && (
            <span className="text-[10px] text-gray-400">
              {member.filiere}
            </span>
          )}
          {member.country && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
              <MapPin size={9} />
              {member.country}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
