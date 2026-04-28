import { supabase } from "@/integrations/supabase/client";

export interface NotificationRow {
  id: string;
  user_id: string;
  team_id: string;
  type: string;
  title: string;
  message: string;
  link_id: string | null;
  link_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationInsert {
  user_id: string;
  team_id: string;
  type: string;
  title: string;
  message: string;
  link_id?: string | null;
  link_type?: string | null;
}

export async function fetchUserNotifications(
  userId: string,
  limit = 30,
): Promise<NotificationRow[]> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as any[]) || [];
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .in("id", ids);
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from("notifications").update({ is_read: true }).eq("id", id);
}

export async function createNotifications(rows: NotificationInsert[]): Promise<void> {
  if (rows.length === 0) return;
  await supabase.from("notifications").insert(rows);
}