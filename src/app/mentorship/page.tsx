import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { MobileProfileMenu } from "@/components/feed/mobile-profile-menu";
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
import { MentorshipStudentDashboard } from "@/components/mentorship/mentorship-dashboard-student";
import { MentorshipAlumniDashboard } from "@/components/mentorship/mentorship-dashboard-alumni";
import type { MentorshipSession, MentorshipRequest, SuggestedMentor } from "@/lib/types/mentorship";

export const metadata = {
  title: "Mentorat — CMA Connect",
};

export default async function MentorshipPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, username, role, status, avatar_url, is_super_admin, theme_preference")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  // Mettre à jour last_seen_at
  await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);

  const isAdmin = profile.role === "admin";
  const isAlumni = profile.role === "alumni";
  const isMentee = profile.role === "student" || profile.role === "s4";

  if (isAdmin) {
    // Les admins n'ont pas accès au mentorat classique, redirection vers feed (ou un tableau de bord admin dans le futur)
    redirect("/feed");
  }

  const initials = `${(profile.first_name || "?")[0]}${(profile.last_name || "?")[0]}`;
  const { count: unreadNotifCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  // Fetch unread DM count
  let unreadDmCount = 0;
  const { data: myConvs } = await supabase
    .from("conversations")
    .select("id")
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);
  const convIds = myConvs?.map((c) => c.id) ?? [];
  if (convIds.length > 0) {
    const { count } = await supabase
      .from("direct_messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .neq("sender_id", user.id)
      .eq("is_read", false);
    unreadDmCount = count ?? 0;
  }

  // --- Fetch Mentorship Data ---
  
  // 1. Active sessions
  const { data: rawSessions } = await supabase
    .from("mentorship_sessions")
    .select(`
      id, request_id, mentor_id, mentee_id, status, started_at, ended_at, created_at,
      mentor:mentor_id(id, first_name, last_name, username, avatar_url, role, class, country),
      mentee:mentee_id(id, first_name, last_name, username, avatar_url, role, class, country)
    `)
    .or(`mentor_id.eq.${user.id},mentee_id.eq.${user.id}`)
    .order("started_at", { ascending: false });

  const allSessions = (rawSessions || []) as unknown as MentorshipSession[];
  const activeSessions = allSessions.filter((s) => s.status === "active");
  const pastSessions = allSessions.filter((s) => s.status !== "active");

  let pendingRequests: MentorshipRequest[] = [];
  let suggestedMentors: SuggestedMentor[] = [];
  let studyFields: string[] = [];

  if (isAlumni) {
    // Alumni: Get their study fields
    const { data: education } = await supabase
      .from("user_education")
      .select("study_field")
      .eq("profile_id", user.id);
    const myFields = education?.map(e => e.study_field).filter(Boolean) || [];

    // Fetch incoming requests: targeted at mentor OR open requests in mentor's fields
    let reqQuery = supabase
      .from("mentorship_requests")
      .select(`
        id, mentee_id, mentor_id, message, study_field, status, created_at, updated_at,
        mentee:mentee_id(id, first_name, last_name, username, avatar_url, role, class, country)
      `)
      .eq("status", "pending");

    if (myFields.length > 0) {
      reqQuery = reqQuery.or(`mentor_id.eq.${user.id},and(mentor_id.is.null,study_field.in.(${myFields.map(f => `"${f}"`).join(",")}))`);
    } else {
      reqQuery = reqQuery.eq("mentor_id", user.id);
    }
    
    const { data: incoming } = await reqQuery.order("created_at", { ascending: false });
    pendingRequests = (incoming || []) as unknown as MentorshipRequest[];

  } else if (isMentee) {
    // Mentee: Get their desired study fields
    const { data: desired } = await supabase
      .from("desired_study_fields")
      .select("field_name")
      .eq("profile_id", user.id);
    studyFields = desired?.map((d) => d.field_name).filter(Boolean) || [];

    // Fetch outoing requests
    const { data: outgoing } = await supabase
      .from("mentorship_requests")
      .select(`
        id, mentee_id, mentor_id, message, study_field, status, created_at, updated_at,
        mentor:mentor_id(id, first_name, last_name, username, avatar_url, role, class, country)
      `)
      .eq("mentee_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    pendingRequests = (outgoing || []) as unknown as MentorshipRequest[];

    // Fetch suggestions if they have desired fields
    if (studyFields.length > 0) {
      const { data: matchingEdu } = await supabase
        .from("user_education")
        .select(`
          study_field,
          profile:profile_id(id, first_name, last_name, username, avatar_url, role, class, country)
        `)
        .in("study_field", studyFields);
      
      const potentialMentorsIds = (matchingEdu || [])
        .map(e => Array.isArray(e.profile) ? (e.profile as any)[0]?.id : (e.profile as any)?.id)
        .filter(Boolean) as string[];

      if (potentialMentorsIds.length > 0) {
        // Fetch their current professions and profile details
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, username, avatar_url, role, class, country")
          .eq("status", "active")
          .eq("role", "alumni")
          .in("id", potentialMentorsIds)
          .neq("id", user.id) // exclude self
          .limit(10);
        
        if (profs && profs.length > 0) {
          const { data: workDetails } = await supabase
            .from("user_professions")
            .select("profile_id, title, company")
            .in("profile_id", profs.map(p => p.id))
            .eq("is_current", true);
            
          const workMap = new Map();
          workDetails?.forEach(w => workMap.set(w.profile_id, w));

          const eduMap = new Map();
          matchingEdu?.forEach(e => {
            const pId = Array.isArray(e.profile) ? (e.profile as any)[0]?.id : (e.profile as any)?.id;
            if (pId && !eduMap.has(pId)) eduMap.set(pId, e.study_field);
          });

          suggestedMentors = profs.map((p) => ({
            ...p,
            study_field: eduMap.get(p.id) || "",
            company: workMap.get(p.id)?.company || null,
            profession_title: workMap.get(p.id)?.title || null,
          }));
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-cma-gris">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
            <Image src="/CMAC.jpeg" alt="CMA" width={32} height={32} className="object-cover scale-125" style={{ width: 32, height: 32 }} />
          </div>
          <span className="text-sm font-semibold text-gray-900 hidden sm:block">Mentorat</span>
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
        <aside className="hidden lg:flex flex-col w-60 min-h-[calc(100vh-3.5rem)] sticky top-14 border-r border-gray-100 bg-white p-4 shrink-0">
          <div className="mb-6 p-4 rounded-2xl bg-gray-50 text-center">
            <div className="w-14 h-14 rounded-full bg-cma-bordeaux flex items-center justify-center text-white text-lg font-semibold mx-auto mb-2">{initials}</div>
            <p className="text-sm font-semibold text-gray-900">{profile.first_name} {profile.last_name}</p>
            <p className="text-xs text-gray-400">@{profile.username}</p>
          </div>
          <nav className="space-y-1 flex-1" aria-label="Navigation principale">
            {[
              { href: "/feed", icon: Users, label: "Fil d'actualité", implemented: true },
              { href: "/directory", icon: Search, label: "Annuaire", implemented: true },
              { href: "/promo", icon: GraduationCap, label: "Coin Promo", implemented: true },
              { href: "/mentorship", icon: Handshake, label: "Mentorat", active: true, implemented: true },
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
            <Link href="/profile/edit" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              <Settings size={18} />
              Mon profil
            </Link>
            <LogoutButton variant="feed" />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">
          {isAlumni ? (
            <MentorshipAlumniDashboard 
              currentUserId={user.id} 
              activeSessions={activeSessions} 
              pendingRequests={pendingRequests} 
              pastSessions={pastSessions}
            />
          ) : (
            <MentorshipStudentDashboard 
              currentUserId={user.id} 
              activeSessions={activeSessions} 
              pendingRequests={pendingRequests} 
              suggestedMentors={suggestedMentors} 
              studyFields={studyFields}
              pastSessions={pastSessions}
            />
          )}
        </main>
      </div>

      {/* Bottom bar mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 h-14 flex items-center justify-around px-2 z-20" aria-label="Navigation mobile">
        <Link href="/feed" className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-cma-bordeaux transition-colors">
          <Users size={20} />
          <span className="text-[10px]">Feed</span>
        </Link>
        <Link href="/directory" className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-cma-bordeaux transition-colors">
          <Search size={20} />
          <span className="text-[10px]">Annuaire</span>
        </Link>
        <Link href="/mentorship" className="flex flex-col items-center gap-0.5 text-cma-bordeaux">
          <Handshake size={20} />
          <span className="text-[10px] font-medium">Mentorat</span>
        </Link>
        <Link href="/messages" className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-cma-bordeaux transition-colors relative">
          <MessageSquare size={20} />
          <span className="text-[10px]">Messages</span>
          {unreadDmCount > 0 && (
            <span className="absolute -top-1 right-0 w-4 h-4 rounded-full bg-cma-bordeaux text-white text-[9px] font-bold flex items-center justify-center">
              {unreadDmCount > 9 ? "9+" : unreadDmCount}
            </span>
          )}
        </Link>
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
