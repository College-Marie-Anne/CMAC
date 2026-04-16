"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Settings,
  X,
  Bell,
  GraduationCap,
  Handshake,
  Award,
  HeadphonesIcon,
  LayoutDashboard,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useUnreadNotificationsCount } from "@/lib/hooks/use-unread-notifications";

interface MobileProfileMenuProps {
  initials: string;
  username: string;
  themePreference: string;
  /** Valeur initiale (SSR) — le hook Realtime la maintient à jour après mount. */
  unreadNotifications?: number;
  /** Admin → affiche le lien dashboard admin + cache les entrées messages/mentorat. */
  isAdmin?: boolean;
}

export function MobileProfileMenu({
  initials,
  username,
  themePreference,
  unreadNotifications = 0,
  isAdmin = false,
}: MobileProfileMenuProps) {
  const [open, setOpen] = useState(false);
  // Compteur live via Realtime (mêmes canaux que NotificationsBellBadge —
  // Supabase multiplexe les channels sur une seule WebSocket, overhead OK)
  const liveUnread = useUnreadNotificationsCount(unreadNotifications);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex flex-col items-center gap-0.5 text-gray-400"
        aria-label="Menu profil et navigation"
      >
        <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[8px] text-white font-semibold">
          {initials}
        </div>
        <span className="text-[10px]">Plus</span>
        {liveUnread > 0 && (
          <span className="absolute -top-1 right-0 w-4 h-4 rounded-full bg-cma-bordeaux text-white text-[9px] font-bold flex items-center justify-center">
            {liveUnread > 9 ? "9+" : liveUnread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="p-5 space-y-4">
                {/* Handle bar */}
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto" />

                {/* Header */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    @{username}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Fermer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* ─── Navigation principale (manquante dans la bottom bar) ─── */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Explorer
                  </p>
                  <div className="space-y-1">
                    <Link
                      href="/promo"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <GraduationCap size={18} />
                      Coin Promo
                    </Link>
                    <Link
                      href="/mentorship"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Handshake size={18} />
                      Mentorat
                    </Link>
                    <Link
                      href="/opportunities"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Award size={18} />
                      Bourses & Opportunités
                    </Link>
                    <Link
                      href="/support"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <HeadphonesIcon size={18} />
                      Support
                    </Link>
                  </div>
                </div>

                {/* ─── Compte ─── */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Mon compte
                  </p>
                  <div className="space-y-1">
                    <Link
                      href={`/profile/${username}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <User size={18} />
                      Mon profil
                    </Link>
                    <Link
                      href="/profile/edit"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <User size={18} />
                      Modifier mon profil
                    </Link>
                    <Link
                      href="/notifications"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <span className="flex items-center gap-3">
                        <Bell size={18} />
                        Notifications
                      </span>
                      {liveUnread > 0 && (
                        <span className="w-5 h-5 rounded-full bg-cma-bordeaux text-white text-[10px] font-bold flex items-center justify-center">
                          {liveUnread > 9 ? "9+" : liveUnread}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Settings size={18} />
                      Paramètres
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
                        style={{ color: "#D4A017" }}
                      >
                        <LayoutDashboard size={18} />
                        Dashboard Admin
                      </Link>
                    )}
                  </div>
                </div>

                {/* Theme — raccourci. Gestion complète dans /settings */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Apparence
                  </p>
                  <ThemeToggle initialTheme={themePreference} />
                </div>

                {/* Logout */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <LogoutButton variant="feed" />
                </div>
              </div>

              {/* Safe area spacer */}
              <div className="h-6" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
