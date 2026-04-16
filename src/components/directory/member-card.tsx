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
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-cma-bordeaux/10 text-cma-bordeaux">
          <GraduationCap size={11} aria-hidden="true" />
          Alumni
        </span>
      );
    case "s4":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-cma-or/10 text-cma-or">
          <GraduationCap size={11} aria-hidden="true" />
          S4
        </span>
      );
    case "student":
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-cma-vert/10 text-cma-vert">
          <Sprout size={11} aria-hidden="true" />
          {className ?? "Élève"}
        </span>
      );
    default:
      return null;
  }
}

function Chip({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 px-2 py-0.5 rounded-md">
      {Icon ? <Icon size={10} aria-hidden={true} /> : null}
      {children}
    </span>
  );
}

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000;
}

export function MemberCard({ member }: MemberCardProps) {
  const online = isOnline(member.last_seen_at);

  return (
    <Link
      href={`/profile/${member.username}`}
      className="group block rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-cma-bordeaux/30"
    >
      {/* Avatar centré avec halo doré subtil */}
      <div className="flex justify-center mb-3">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{
              boxShadow: "0 0 0 3px rgba(212,160,23,0.15)",
            }}
            aria-hidden="true"
          />
          <UserAvatar
            firstName={member.first_name}
            lastName={member.last_name}
            avatarUrl={member.avatar_url}
            size="lg"
          />
          {online && (
            <span
              className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-cma-vert border-2 border-white dark:border-gray-900 animate-pulse"
              aria-label="En ligne"
            />
          )}
        </div>
      </div>

      {/* Nom + username */}
      <h3 className="text-center text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-cma-bordeaux transition-colors">
        {member.first_name} {member.last_name}
      </h3>
      <p className="text-center text-xs text-gray-400 truncate">
        @{member.username}
      </p>

      {/* Badge rôle */}
      <div className="flex justify-center mt-3">
        {getRoleBadge(member.role, member.class)}
      </div>

      {/* Profession (si alumni) */}
      {member.current_profession && (
        <p className="mt-3 text-center text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1.5">
          <Briefcase size={12} className="shrink-0" aria-hidden="true" />
          <span className="truncate">
            {member.current_profession}
            {member.current_company && (
              <span className="text-gray-400"> · {member.current_company}</span>
            )}
          </span>
        </p>
      )}

      {/* Chips méta */}
      {(member.promo_name || member.filiere || member.country) && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {member.promo_name && (
            <Chip icon={GraduationCap}>Promo {member.promo_name}</Chip>
          )}
          {member.filiere && <Chip>{member.filiere}</Chip>}
          {member.country && <Chip icon={MapPin}>{member.country}</Chip>}
        </div>
      )}
    </Link>
  );
}
