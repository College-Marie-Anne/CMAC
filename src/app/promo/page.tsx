import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Users,
  Search,
  GraduationCap,
  Handshake,
  Award,
  MessageSquare,
  HeadphonesIcon,
  Settings,
  Bell,
  AlertCircle,
  LifeBuoy,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { MobileProfileMenu } from "@/components/feed/mobile-profile-menu";
import { NotificationsBellBadge } from "@/components/notifications/notifications-bell-badge";
import { PromoProfileHeader } from "@/components/promo/promo-profile-header";
import { ElectionWidget } from "@/components/promo/election-widget";
import { SeedBadge } from "@/components/promo/seed-badge";
import { PostFeed } from "@/components/feed/post-feed";
import { syncElectionStateAction } from "@/actions/promo";
import type { ForumPost, ForumTag, ReactionEmoji } from "@/lib/types/forum";
import type { PromotionData, PromoElection } from "@/lib/types/promo";

export const metadata = {
  title: "Coin Promo — CMA Connect",
};

export default async function PromoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*, promotions(id, start_date, end_date, leader_id)")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  // Pas de promo : on distingue 2 cas (spec §1062-1063)
  //   - S1-S3 (role 'student') → SeedBadge "Graine de CMA"
  //   - Alumni / S4 sans promo (promo rejetée ou jamais attribuée) → message
  //     "Contactez un admin" (le lien /promo doit déjà être masqué dans la nav)
  if (!profile.promo_id) {
    const isStudent = profile.role === "student";
    const enrollmentYear = profile.enrollment_date
      ? new Date(profile.enrollment_date).getFullYear()
      : new Date().getFullYear();

    return (
      <div className="min-h-screen bg-cma-gris">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/feed" className="flex items-center gap-3">
            <Image
              src="/CMAC.jpeg"
              alt="CMA"
              width={32}
              height={32}
              className="object-cover scale-125"
            />
            <span className="text-sm font-semibold text-gray-900">
              Coin Promo
            </span>
          </Link>
        </header>
        <main className="flex flex-col items-center justify-center p-6 mt-12">
          {isStudent ? (
            <SeedBadge enrollmentYear={enrollmentYear} />
          ) : (
            <div className="max-w-md w-full text-center space-y-5">
              <div className="mx-auto w-16 h-16 rounded-full bg-cma-or/10 border border-cma-or/30 flex items-center justify-center">
                <AlertCircle size={28} className="text-cma-or" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">
                Vous n&apos;êtes pas encore liée à une promotion
              </h1>
              <p className="text-sm text-gray-600 leading-relaxed">
                Votre Coin Promo n&apos;est pas accessible tant qu&apos;une
                promotion n&apos;a pas été attribuée à votre compte. Contactez
                un administrateur pour régler cette situation.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  href="/support"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cma-bordeaux text-white px-4 h-10 text-sm font-semibold hover:bg-cma-bordeaux/90"
                >
                  <LifeBuoy size={16} aria-hidden="true" />
                  Contacter le support
                </Link>
                <Link
                  href="/feed"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 px-4 h-10 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Retour au feed
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Phase Sync — fire-and-forget (ne bloque pas le rendu)
  syncElectionStateAction(profile.promo_id).catch(() => {});

  // ─── Batch 1 : 6 requêtes indépendantes en parallèle ───
  const [
    memberResult,
    promoResult,
    electionResult,
    tagsResult,
    convsResult,
    notifResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("promo_id", profile.promo_id),
    supabase
      .from("promotions")
      .select(
        `id, start_date, end_date, leader_id, created_at,
         leader:leader_id(id, first_name, last_name, username, avatar_url)`
      )
      .eq("id", profile.promo_id)
      .single(),
    supabase
      .from("promo_elections")
      .select("*")
      .eq("promo_id", profile.promo_id)
      .in("status", ["nomination", "voting"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("forum_tags").select("*").order("name"),
    supabase
      .from("conversations")
      .select("id")
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false),
  ]);

  const memberCount = memberResult.count;
  const promoData = promoResult.data;
  const activeElection = electionResult.data;
  const tags = (tagsResult.data || []) as ForumTag[];
  const systemTagIds = tags.filter((t) => t.is_system).map((t) => t.id);
  const unreadNotifCount = notifResult.count;

  // ─── Batch 2 : posts + DM count (dépendent de batch 1) ───
  const convIds = (convsResult.data ?? []).map((c) => c.id);

  const [postsResult, , , dmResult] =
    await Promise.all([
      supabase
        .from("forum_posts")
        .select(
          `id, content, image_url, promo_id, reaction_count, is_pinned, is_edited, created_at, updated_at,
           author:author_id(id, first_name, last_name, username, avatar_url),
           tag:tag_id(id, name, color)`
        )
        .eq("is_deleted", false)
        .eq("promo_id", profile.promo_id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20),
      // Les comments + reactions seront faites après récupération des postIds
      // On passe un placeholder pour garder la structure Promise.all
      Promise.resolve(null),
      Promise.resolve(null),
      convIds.length > 0
        ? supabase
            .from("direct_messages")
            .select("id", { count: "exact", head: true })
            .in("conversation_id", convIds)
            .neq("sender_id", user.id)
            .eq("is_read", false)
        : Promise.resolve({ count: 0 }),
    ]);

  const postsRaw = postsResult.data;
  const unreadDmCount = dmResult?.count ?? 0;

  // ─── Batch 3 : comments + reactions (dépendent des postIds) ───
  const postIds = postsRaw?.map((p) => p.id) ?? [];
  const [{ data: commentCounts }, { data: userReactions }] = await Promise.all(
    [
      postIds.length > 0
        ? supabase
            .from("forum_comments")
            .select("post_id")
            .in("post_id", postIds)
            .eq("is_deleted", false)
        : Promise.resolve({ data: [] }),
      postIds.length > 0
        ? supabase
            .from("forum_reactions")
            .select("post_id, emoji")
            .eq("user_id", user.id)
            .in("post_id", postIds)
        : Promise.resolve({ data: [] }),
    ]
  );

  const countMap: Record<string, number> = {};
  for (const c of commentCounts ?? []) {
    countMap[c.post_id] = (countMap[c.post_id] || 0) + 1;
  }

  const reactionMap: Record<string, ReactionEmoji[]> = {};
  for (const r of userReactions ?? []) {
    if (!reactionMap[r.post_id]) reactionMap[r.post_id] = [];
    reactionMap[r.post_id].push(r.emoji as ReactionEmoji);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts: ForumPost[] = (postsRaw || []).map((p: any) => ({
    ...p,
    author: Array.isArray(p.author) ? p.author[0] : p.author,
    tag: Array.isArray(p.tag) ? p.tag[0] : p.tag,
    comment_count: countMap[p.id] ?? 0,
    user_reactions: reactionMap[p.id] ?? [],
  }));

  const initials = `${profile.first_name[0]}${profile.last_name[0]}`;
  const isAdmin = profile.role === "admin";
  const isPromoLeader = promoData?.leader_id === user.id;

  return (
    <div className="min-h-screen bg-cma-gris">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
            <Image src="/CMAC.jpeg" alt="CMA" width={32} height={32} className="object-cover scale-125" style={{ width: 32, height: 32 }} />
          </div>
          <span className="text-sm font-semibold text-gray-900 hidden sm:block">Coin Promo</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBellBadge initialCount={unreadNotifCount ?? 0} />
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
          </div>
          <nav className="space-y-1 flex-1">
            {[
              { href: "/feed", icon: Users, label: "Fil d'actualité", implemented: true },
              { href: "/directory", icon: Search, label: "Annuaire", implemented: true },
              { href: "/promo", icon: GraduationCap, label: "Coin Promo", active: true, implemented: true },
              { href: "/mentorship", icon: Handshake, label: "Mentorat", implemented: true },
              { href: "/opportunities", icon: Award, label: "Bourses & Opportunités", implemented: true },
              { href: "/messages", icon: MessageSquare, label: "Messages", implemented: !isAdmin, badge: unreadDmCount > 0 ? unreadDmCount : undefined },
              { href: "/support", icon: HeadphonesIcon, label: "Support", implemented: true },
            ].map((item) => (
              <Link key={item.href} href={item.href} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${item.active ? "bg-cma-bordeaux/5 text-cma-bordeaux font-medium" : "text-gray-500 hover:bg-gray-50"}`}>
                <span className="flex items-center gap-3">
                  <item.icon size={18} />
                  {item.label}
                </span>
                {item.badge && item.badge > 0 && <span className="w-5 h-5 rounded-full bg-cma-bordeaux text-white text-[10px] font-bold flex items-center justify-center">{item.badge}</span>}
              </Link>
            ))}
          </nav>
          <div className="space-y-1 pt-4 border-t border-gray-100">
            <Link href="/profile/edit" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              <Settings size={18} />
              Mon profil
            </Link>
            <LogoutButton variant="feed" />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">
          {promoData && (
            <PromoProfileHeader 
              promo={{
                ...promoData,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              leader: Array.isArray(promoData.leader) ? promoData.leader[0] : (promoData.leader as any)
              } as PromotionData} 
              memberCount={memberCount || 0} 
            />
          )}
          
          <ElectionWidget
            election={activeElection as PromoElection}
            hasLeader={!!promoData?.leader_id}
          />

          <div className="-mt-2 mb-4 flex justify-end">
            <Link
              href="/promo/elections"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-cma-bordeaux hover:underline"
            >
              Voir l&apos;historique des élections →
            </Link>
          </div>

          <PostFeed
            initialPosts={posts}
            initialHasMore={posts.length === 20}
            tags={tags}
            excludeTagIds={systemTagIds}
            currentUserId={user.id}
            isAdmin={isAdmin}
            memberCount={memberCount || 0}
            promoId={profile.promo_id}
            canPinAll={isPromoLeader}
            emptyStateMessage="Votre Coin Promo est prêt ! Lancez la discussion avec vos collègues de promotion."
            createLabel="Échangez avec votre promotion..."
          />
        </main>
      </div>

      {/* Bottom bar mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 h-14 flex items-center justify-around px-2 z-20">
        <Link href="/feed" className="flex flex-col items-center gap-0.5 text-gray-500">
          <Users size={20} />
          <span className="text-[10px]">Feed</span>
        </Link>
        <Link href="/directory" className="flex flex-col items-center gap-0.5 text-gray-500">
          <Search size={20} />
          <span className="text-[10px]">Annuaire</span>
        </Link>
        <Link href="/promo" className="flex flex-col items-center gap-0.5 text-cma-bordeaux">
          <GraduationCap size={20} />
          <span className="text-[10px] font-medium">Promo</span>
        </Link>
        <Link href="/messages" className="flex flex-col items-center gap-0.5 text-gray-500 relative">
          <MessageSquare size={20} />
          <span className="text-[10px]">Messages</span>
          {unreadDmCount > 0 && <span className="absolute -top-1 right-0 w-4 h-4 rounded-full bg-cma-bordeaux text-white text-[9px] font-bold flex items-center justify-center">{unreadDmCount}</span>}
        </Link>
        <MobileProfileMenu
          initials={initials}
          username={profile.username}
          themePreference={profile.theme_preference ?? "system"}
          unreadNotifications={unreadNotifCount ?? 0}
          isAdmin={isAdmin}
        />
      </nav>
      <div className="lg:hidden h-14" />
    </div>
  );
}
