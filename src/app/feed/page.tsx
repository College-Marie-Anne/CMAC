import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Search,
  Users,
  GraduationCap,
  MessageSquare,
  Bell,
  Handshake,
  Award,
  HeadphonesIcon,
  LogOut,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("first_name, last_name, username, role, status, avatar_url, is_super_admin")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  const isAdmin = profile.role === "admin";
  const initials = `${(profile.first_name || "?")[0]}${(profile.last_name || "?")[0]}`;

  return (
    <div className="min-h-screen bg-cma-gris">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
            <Image
              src="/CMAC.jpeg"
              alt="CMA"
              width={32}
              height={32}
              className="object-cover scale-125"
              style={{ width: 32, height: 32 }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-900 hidden sm:block">CMA Connect</span>
        </div>

        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher..."
              aria-label="Rechercher sur la plateforme"
              className="w-full h-9 pl-9 pr-4 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-cma-bordeaux focus:ring-1 focus:ring-cma-bordeaux/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors" aria-label="Notifications">
            <Bell size={18} className="text-gray-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="w-8 h-8 rounded-full bg-cma-bordeaux flex items-center justify-center text-white text-xs font-semibold">
            {initials}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex flex-col w-60 min-h-[calc(100vh-3.5rem)] sticky top-14 border-r border-gray-100 bg-white p-4">
          {/* Carte profil */}
          <div className="mb-6 p-4 rounded-2xl bg-gray-50 text-center">
            <div className="w-14 h-14 rounded-full bg-cma-bordeaux flex items-center justify-center text-white text-lg font-semibold mx-auto mb-2">
              {initials}
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-xs text-gray-400">@{profile.username}</p>
            {isAdmin && (
              <span
                className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: profile.is_super_admin ? "rgba(212,160,23,0.15)" : "rgba(0,107,63,0.15)",
                  color: profile.is_super_admin ? "#D4A017" : "#006B3F",
                }}
              >
                {profile.is_super_admin ? "Super-Admin" : "Admin"}
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1" aria-label="Navigation principale">
            {[
              { href: "/feed", icon: Users, label: "Fil d'actualité", active: true },
              { href: "/directory", icon: Search, label: "Annuaire" },
              { href: "/promo", icon: GraduationCap, label: "Coin Promo" },
              { href: "/mentorship", icon: Handshake, label: "Mentorat" },
              { href: "/opportunities", icon: Award, label: "Bourses & Opportunités" },
              { href: "/messages", icon: MessageSquare, label: "Messages" },
              { href: "/support", icon: HeadphonesIcon, label: "Support" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  item.active
                    ? "bg-cma-bordeaux/5 text-cma-bordeaux font-medium"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Actions bas */}
          <div className="space-y-1 pt-4 border-t border-gray-100">
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ color: "#D4A017" }}
              >
                <LayoutDashboard size={18} />
                Dashboard Admin
              </Link>
            )}
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <Settings size={18} />
              Paramètres
            </Link>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-50 transition-colors w-full"
              >
                <LogOut size={18} />
                Déconnexion
              </button>
            </form>
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">
          {/* Compteur membres */}
          <div className="mb-6 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm text-center">
            <p className="text-3xl font-bold text-cma-bordeaux">1</p>
            <p className="text-sm text-gray-500 mt-1">membre de la famille CMA</p>
          </div>

          {/* Barre création post */}
          <div className="mb-6 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cma-bordeaux flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {initials}
              </div>
              <div className="flex-1 h-10 px-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center text-sm text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors">
                Quoi de neuf ?
              </div>
            </div>
          </div>

          {/* Empty state */}
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} className="text-gray-300" />
            </div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Soyez la première à partager quelque chose !
            </h2>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Le fil d&apos;actualité est encore vide. Commencez par créer un post pour lancer la conversation.
            </p>
          </div>
        </main>
      </div>

      {/* Bottom bar mobile */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 h-14 flex items-center justify-around px-2 z-20"
        aria-label="Navigation mobile"
      >
        <Link href="/feed" className="flex flex-col items-center gap-0.5 text-cma-bordeaux">
          <Users size={20} />
          <span className="text-[10px] font-medium">Feed</span>
        </Link>
        <Link href="/directory" className="flex flex-col items-center gap-0.5 text-gray-400">
          <Search size={20} />
          <span className="text-[10px]">Annuaire</span>
        </Link>
        <button
          className="w-11 h-11 rounded-full bg-cma-bordeaux flex items-center justify-center text-white -mt-4 shadow-lg"
          aria-label="Créer un post"
        >
          <span className="text-xl leading-none">+</span>
        </button>
        <Link href="/messages" className="flex flex-col items-center gap-0.5 text-gray-400">
          <MessageSquare size={20} />
          <span className="text-[10px]">Messages</span>
        </Link>
        <Link href="/profile/edit" className="flex flex-col items-center gap-0.5 text-gray-400" aria-label="Mon profil">
          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[8px] text-white font-semibold">
            {initials}
          </div>
          <span className="text-[10px]">Profil</span>
        </Link>
      </nav>

      {/* Spacer pour bottom bar mobile */}
      <div className="lg:hidden h-14" />
    </div>
  );
}
