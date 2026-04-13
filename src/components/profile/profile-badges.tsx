import { Crown, ShieldCheck, GraduationCap, Sprout } from "lucide-react";

interface ProfileBadgesProps {
  role: string;
  isSuperAdmin: boolean;
  enrollmentDate?: number | null;
  promoName?: string | null;
}

export function ProfileBadges({ role, isSuperAdmin, enrollmentDate, promoName }: ProfileBadgesProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-wrap gap-2">
      {/* Admin badges */}
      {isSuperAdmin && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-cma-or/15 text-cma-or">
          <Crown size={12} /> Super-Admin
        </span>
      )}
      {role === "admin" && !isSuperAdmin && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-cma-vert/15 text-cma-vert">
          <ShieldCheck size={12} /> Admin
        </span>
      )}

      {/* Role badge */}
      {role === "alumni" && (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-cma-bordeaux/10 text-cma-bordeaux">
          <GraduationCap size={12} /> Alumni
        </span>
      )}
      {role === "s4" && (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-cma-vert/10 text-cma-vert">
          <GraduationCap size={12} /> Finissante (S4)
        </span>
      )}
      {role === "student" && enrollmentDate && (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-cma-or/10 text-cma-or">
          <Sprout size={12} /> Graine de CMA {enrollmentDate}-{currentYear}
        </span>
      )}

      {/* Promo badge */}
      {promoName && (role === "alumni" || role === "s4") && (
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
          {promoName}
        </span>
      )}
    </div>
  );
}
