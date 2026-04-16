import Link from "next/link";
import { GraduationCap, Handshake, Award } from "lucide-react";

/**
 * Bandeau de raccourcis vers les sections principales, visible UNIQUEMENT
 * sur mobile (sur desktop, ces sections sont déjà accessibles via la sidebar).
 *
 * Avant : Coin Promo / Mentorat / Bourses & Opportunités étaient cachés
 * derrière le bouton "Plus" de la bottom bar mobile → 2 taps pour y accéder.
 * Maintenant : visibles direct sur le feed, 1 tap.
 */
type QuickLink = {
  href: string;
  label: string;
  icon: typeof GraduationCap;
  /** Couleur de la pastille d'icône (palette CMA) */
  color: string;
  bg: string;
};

const LINKS: QuickLink[] = [
  {
    href: "/promo",
    label: "Coin Promo",
    icon: GraduationCap,
    color: "#800020", // bordeaux
    bg: "rgba(128,0,32,0.08)",
  },
  {
    href: "/mentorship",
    label: "Mentorat",
    icon: Handshake,
    color: "#006B3F", // vert forêt
    bg: "rgba(0,107,63,0.08)",
  },
  {
    href: "/opportunities",
    label: "Bourses",
    icon: Award,
    color: "#D4A017", // or
    bg: "rgba(212,160,23,0.10)",
  },
];

export function MobileQuickLinks() {
  return (
    <nav
      aria-label="Raccourcis"
      className="lg:hidden mb-4 grid grid-cols-3 gap-2"
    >
      {LINKS.map(({ href, label, icon: Icon, color, bg }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: bg }}
            aria-hidden="true"
          >
            <Icon size={18} style={{ color }} />
          </span>
          <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">
            {label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
