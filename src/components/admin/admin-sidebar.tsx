"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  UserCheck,
  GraduationCap,
  Shield,
  Tag,
  Activity,
  Users,
  Link2,
  FileText,
  Headphones,
  LogOut,
  Menu,
  X,
  Crown,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminProfile {
  firstName: string;
  lastName: string;
  username: string;
  isSuperAdmin: boolean;
  avatarUrl: string | null;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/approvals", label: "Approbations", icon: UserCheck },
  { href: "/admin/promotions", label: "Promotions", icon: GraduationCap },
  { href: "/admin/moderation", label: "Modération", icon: Shield },
  { href: "/admin/tags", label: "Tags", icon: Tag },
  { href: "/admin/activities", label: "Activités", icon: Activity },
  { href: "/admin/users", label: "Utilisatrices", icon: Users },
  { href: "/admin/invitations", label: "Invitations", icon: Link2 },
  { href: "/admin/audit", label: "Audit", icon: FileText },
  { href: "/admin/support", label: "Support", icon: Headphones },
];

export function AdminSidebar({ profile }: { profile: AdminProfile }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    const { createClient } = await import("@/utils/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
          <Image
            src="/CMAC.jpeg"
            alt="CMA"
            width={36}
            height={36}
            className="object-cover scale-125"
            style={{ width: 36, height: 36 }}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">CMA Connect</p>
          <p className="text-[10px] text-white/40">Administration</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto" role="navigation" aria-label="Navigation admin">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active ? "font-medium" : "hover:bg-white/5"
              }`}
              style={
                active
                  ? {
                      background: "rgba(212,160,23,0.15)",
                      color: "#F5DEB3",
                      borderLeft: "3px solid #D4A017",
                    }
                  : { color: "rgba(255,255,255,0.6)" }
              }
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Profil admin */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white shrink-0">
            {profile.firstName[0]}
            {profile.lastName[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile.firstName} {profile.lastName}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-white/40">
                @{profile.username}
              </span>
              {profile.isSuperAdmin ? (
                <span
                  className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(212,160,23,0.2)", color: "#D4A017" }}
                >
                  <Crown size={9} />
                  Super-Admin
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(0,107,63,0.2)", color: "#8fd6b4" }}
                >
                  <ShieldCheck size={9} />
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-xs h-9 rounded-lg"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <LogOut size={14} />
          Déconnexion
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col z-30"
        style={{
          background: "linear-gradient(180deg, #3a000f 0%, #2a0010 100%)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14"
        style={{ background: "#3a000f" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full overflow-hidden">
            <Image
              src="/CMAC.jpeg"
              alt="CMA"
              width={28}
              height={28}
              className="object-cover scale-125"
              style={{ width: 28, height: 28 }}
            />
          </div>
          <span className="text-sm font-semibold text-white">Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white p-1"
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 bg-black/50 z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 z-40 flex flex-col"
              style={{
                background: "linear-gradient(180deg, #3a000f 0%, #2a0010 100%)",
              }}
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Spacer mobile pour le header fixe */}
      <div className="lg:hidden h-14" />
    </>
  );
}
