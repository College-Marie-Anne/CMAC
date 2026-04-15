"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type ActionResult = { success: boolean; error?: string };

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie");
  return { supabase, user };
}

export async function markNotificationReadAction(
  notificationId: string
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAuth();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("recipient_id", user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/notifications");
    revalidatePath("/feed");
    revalidatePath("/mentorship");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteNotificationAction(
  notificationId: string
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAuth();
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("recipient_id", user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/notifications");
    revalidatePath("/feed");
    revalidatePath("/mentorship");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAuth();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);

    if (error) return { success: false, error: error.message };
    revalidatePath("/notifications");
    revalidatePath("/feed");
    revalidatePath("/mentorship");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function openNotificationAction(
  notificationId: string,
  destination: string
): Promise<void> {
  const { supabase, user } = await requireAuth();

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("recipient_id", user.id);

  revalidatePath("/notifications");
  revalidatePath("/feed");
  revalidatePath("/mentorship");

  const safeDestination =
    destination.startsWith("/") && !destination.startsWith("//")
      ? destination
      : "/feed";
  redirect(safeDestination);
}
