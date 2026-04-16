import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { PostFeed } from "@/components/feed/post-feed";
import { MobileCreateButton } from "@/components/feed/mobile-create-button";
import { MobileProfileMenu } from "@/components/feed/mobile-profile-menu";
import { FeedSearch } from "@/components/feed/feed-search";
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
  Settings,
} from "lucide-react";
import type { ForumPost, ReactionEmoji } from "@/lib/types/forum";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const searchQuery = sp.q?.trim() ?? "";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("first_name, last_name, username, role, status, avatar_url, is_super_admin, theme_preference")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const isAdmin = profile.role === "admin";
  const initials = `${(profile.first_name || "?")[0]}${(profile.last_name || "?")[0]}`;

  // ─── Batch 1 : requêtes indépendantes en parallèle ───
  const [convResult, notifResult, tagsResult] = await Promise.all([
    !isAdmin
      ? supabase
          .from("conversations")
          .select("id")
          .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      : Promise.resolve({ data: [] as { id: string }[] }),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false),
    supabase
      .from("forum_tags")
      .select("id, name, color, is_system")
      .order("name"),
  ]);

  const convIds = (convResult.data ?? []).map((c) => c.id);
  const unreadNotifCount = notifResult.count;
  const allTags = tagsResult.data;

  // DM unread (dépend des convIds, donc après batch 1)
  let unreadDmCount = 0;
  if (convIds.length > 0) {
    const { count } = await supabase
      .from("direct_messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .neq("sender_id", user.id)
      .eq("is_read", false);
    unreadDmCount = count ?? 0;
  }
  const systemTagIds = (allTags ?? []).filter((t) => t.is_system).map((t) => t.id);

  // Build post queries — exclude system-tagged posts (Bourses & Opportunités → /opportunities only)
  let postsQuery = supabase
    .from("forum_posts")
    .select(`
      id, content, image_url, promo_id, reaction_count, is_pinned, is_edited, created_at, updated_at,
      author:author_id(id, first_name, last_name, username, avatar_url),
      tag:tag_id(id, name, color)
    `)
    .eq("is_deleted", false)
    .is("promo_id", null)
    .eq("is_pinned", false)
    .order("created_at", { ascending: false })
    .limit(20);
  if (systemTagIds.length > 0) postsQuery = postsQuery.not("tag_id", "in", `(${systemTagIds.join(",")})`);
  if (searchQuery) postsQuery = postsQuery.textSearch("search_vector", searchQuery, { type: "websearch" });

  let pinnedQuery = supabase
    .from("forum_posts")
    .select(`
      id, content, image_url, promo_id, reaction_count, is_pinned, is_edited, created_at, updated_at,
      author:author_id(id, first_name, last_name, username, avatar_url),
      tag:tag_id(id, name, color)
    `)
    .eq("is_deleted", false)
    .is("promo_id", null)
    .eq("is_pinned", true)
    .order("created_at", { ascending: false });
  if (systemTagIds.length > 0) pinnedQuery = pinnedQuery.not("tag_id", "in", `(${systemTagIds.join(",")})`);
  if (searchQuery) pinnedQuery = pinnedQuery.textSearch("search_vector", searchQuery, { type: "websearch" });

  const [
    { data: rawPosts },
    { data: pinnedRaw },
    { count: memberCount },
  ] = await Promise.all([
    postsQuery,
    pinnedQuery,
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active").in("role", ["alumni", "s4", "student"]),
  ]);

  // Filter tags for the feed selector: exclude system tags
  const tags = (allTags ?? []).filter((t) => !t.is_system);

  const allRaw = [...(pinnedRaw ?? []), ...(rawPosts ?? [])];
  const postIds = allRaw.map((p) => p.id);

  // Comment counts + user reactions in parallel
  const [{ data: commentRows }, { data: reactionRows }] = await Promise.all([
    postIds.length > 0
      ? supabase.from("forum_comments").select("post_id").in("post_id", postIds).eq("is_deleted", false)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabase.from("forum_reactions").select("post_id, emoji").eq("user_id", user.id).in("post_id", postIds)
      : Promise.resolve({ data: [] }),
  ]);

  const commentCountMap: Record<string, number> = {};
  for (const c of commentRows ?? []) commentCountMap[c.post_id] = (commentCountMap[c.post_id] ?? 0) + 1;

  const reactionMap: Record<string, ReactionEmoji[]> = {};
  for (const r of reactionRows ?? []) {
    if (!reactionMap[r.post_id]) reactionMap[r.post_id] = [];
    reactionMap[r.post_id].push(r.emoji as ReactionEmoji);
  }

  const posts: ForumPost[] = allRaw.map((p) => ({
    id: p.id,
    content: p.content,
    image_url: p.image_url,
    promo_id: p.promo_id,
    reaction_count: p.reaction_count,
    comment_count: commentCountMap[p.id] ?? 0,
    is_pinned: p.is_pinned,
    is_edited: p.is_edited,
    created_at: p.created_at,
    updated_at: p.updated_at,
    author: Array.isArray(p.author) ? p.author[0] : p.author,
    tag: Array.isArray(p.tag) ? p.tag[0] : p.tag,
    user_reactions: reactionMap[p.id] ?? [],
  }));

  return (
    <div className="min-h-screen bg-cma-gris">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
            <Image src="/CMAC.jpeg" alt="CMA" width={32} height={32} className="object-cover scale-125" style={{ width: 32, height: 32 }} />
          </div>
          <span className="text-sm font-semibold text-gray-900 hidden sm:block">CMA Connect</span>
        </div>
        <div className="flex-1 max-w-md mx-4">
          <FeedSearch />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-cma-bordeaux"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {(unreadNotifCount ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-cma-bordeaux text-white text-[9px] font-bold flex items-center justify-center">
                {(unreadNotifCount ?? 0) > 9 ? "9+" : unreadNotifCount}
              </span>
            )}
          </Link>
          <div className="w-8 h-8 rounded-full bg-cma-bordeaux flex items-center justify-center text-white text-xs font-semibold">{initials}</div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex flex-col w-60 min-h-[calc(100vh-3.5rem)] sticky top-14 border-r border-gray-100 bg-white p-4">
          <div className="mb-6 p-4 rounded-2xl bg-gray-50 text-center">
            <div className="w-14 h-14 rounded-full bg-cma-bordeaux flex items-center justify-center text-white text-lg font-semibold mx-auto mb-2">{initials}</div>
            <p className="text-sm font-semibold text-gray-900">{profile.first_name} {profile.last_name}</p>
            <p className="text-xs text-gray-400">@{profile.username}</p>
            {isAdmin && (
              <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: profile.is_super_admin ? "rgba(212,160,23,0.15)" : "rgba(0,107,63,0.15)", color: profile.is_super_admin ? "#D4A017" : "#006B3F" }}>
                {profile.is_super_admin ? "Super-Admin" : "Admin"}
              </span>
            )}
          </div>
          <nav className="space-y-1 flex-1" aria-label="Navigation principale">
            {[
              { href: "/feed", icon: Users, label: "Fil d'actualité", active: true, implemented: true },
              { href: "/directory", icon: Search, label: "Annuaire", implemented: true },
              { href: "/promo", icon: GraduationCap, label: "Coin Promo", implemented: true },
              { href: "/mentorship", icon: Handshake, label: "Mentorat", implemented: true },
              { href: "/opportunities", icon: Award, label: "Bourses & Opportunités", implemented: true },
              { href: "/messages", icon: MessageSquare, label: "Messages", implemented: !isAdmin, badge: unreadDmCount > 0 ? unreadDmCount : undefined },
              { href: "/support", icon: HeadphonesIcon, label: "Support", implemented: true },
            ].map((item) => {
              if (!item.implemented) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 cursor-not-allowed select-none"
                    title="Bientôt disponible"
                    aria-disabled="true"
                  >
                    <span className="flex items-center gap-3">
                      <item.icon size={18} />
                      {item.label}
                    </span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-cma-or/10 text-cma-or">
                      Bientôt
                    </span>
                  </div>
                );
              }
              return (
                <Link key={item.href} href={item.href} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${item.active ? "bg-cma-bordeaux/5 text-cma-bordeaux font-medium" : "text-gray-500 hover:bg-gray-50"}`}>
                  <span className="flex items-center gap-3">
                    <item.icon size={18} />
                    {item.label}
                  </span>
                  {item.badge && item.badge > 0 && (
                    <span className="w-5 h-5 rounded-full bg-cma-bordeaux text-white text-[10px] font-bold flex items-center justify-center">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="space-y-1 pt-4 border-t border-gray-100">
            {isAdmin && (
              <a href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ color: "#D4A017" }}>
                <LayoutDashboard size={18} />
                Dashboard Admin
              </a>
            )}
            <Link href="/profile/edit" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              <Users size={18} />
              Mon profil
            </Link>
            <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              <Settings size={18} />
              Paramètres
            </Link>
            <LogoutButton variant="feed" />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">
          <PostFeed
            initialPosts={posts}
            initialHasMore={(rawPosts?.length ?? 0) === 20}
            tags={tags.map((t) => ({ ...t, is_system: t.is_system ?? false }))}
            excludeTagIds={systemTagIds}
            currentUserId={user.id}
            isAdmin={isAdmin}
            memberCount={memberCount ?? 0}
          />
        </main>
      </div>

      {/* Bottom bar mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 h-14 flex items-center justify-around px-2 z-20" aria-label="Navigation mobile">
        <Link href="/feed" className="flex flex-col items-center gap-0.5 text-cma-bordeaux">
          <Users size={20} />
          <span className="text-[10px] font-medium">Feed</span>
        </Link>
        <Link href="/directory" className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-cma-bordeaux transition-colors">
          <Search size={20} />
          <span className="text-[10px]">Annuaire</span>
        </Link>
        <MobileCreateButton
          tags={(tags ?? []).map((t) => ({ ...t, is_system: t.is_system ?? false }))}
          userId={user.id}
        />
        {isAdmin ? (
          <div className="flex flex-col items-center gap-0.5 text-gray-300 cursor-not-allowed select-none" title="Non disponible pour les admins" aria-disabled="true">
            <MessageSquare size={20} />
            <span className="text-[10px]">Messages</span>
          </div>
        ) : (
          <Link href="/messages" className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-cma-bordeaux transition-colors relative">
            <MessageSquare size={20} />
            <span className="text-[10px]">Messages</span>
            {unreadDmCount > 0 && (
              <span className="absolute -top-1 right-0 w-4 h-4 rounded-full bg-cma-bordeaux text-white text-[9px] font-bold flex items-center justify-center">
                {unreadDmCount > 9 ? "9+" : unreadDmCount}
              </span>
            )}
          </Link>
        )}
        <MobileProfileMenu
          initials={initials}
          username={profile.username}
          themePreference={profile.theme_preference ?? "system"}
          unreadNotifications={unreadNotifCount ?? 0}
        />
      </nav>
      <div className="lg:hidden h-14" />
    </div>
  );
}
