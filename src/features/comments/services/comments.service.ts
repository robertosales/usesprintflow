import { supabase } from "@/integrations/supabase/client";

export interface CommentRow {
  id: string;
  activity_id: string;
  team_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CommentWithAuthor extends CommentRow {
  user_name: string;
}

export async function fetchActivityComments(
  activityId: string,
): Promise<CommentWithAuthor[]> {
  const { data } = await supabase
    .from("activity_comments")
    .select("*")
    .eq("activity_id", activityId)
    .order("created_at", { ascending: true });
  if (!data) return [];
  const userIds = [...new Set((data as any[]).map((c) => c.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", userIds);
  const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));
  return (data as any[]).map((c) => ({
    ...c,
    user_name: profileMap.get(c.user_id) || "Usuário",
  }));
}

export async function fetchTeamMembersForMentions(
  teamId: string,
): Promise<{ user_id: string; display_name: string }[]> {
  const { data: members } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId);
  if (!members || members.length === 0) return [];
  const userIds = (members as any[]).map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", userIds);
  return (profiles || []).map((p: any) => ({
    user_id: p.user_id,
    display_name: p.display_name,
  }));
}

export async function createComment(payload: {
  activity_id: string;
  team_id: string;
  user_id: string;
  content: string;
}): Promise<void> {
  const { error } = await supabase.from("activity_comments").insert(payload);
  if (error) throw error;
}

export async function updateComment(id: string, content: string): Promise<void> {
  const { error } = await supabase
    .from("activity_comments")
    .update({ content })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from("activity_comments").delete().eq("id", id);
  if (error) throw error;
}