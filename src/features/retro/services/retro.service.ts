// src/features/retro/services/retro.service.ts
import { supabase } from "@/integrations/supabase/client";
import type { RetroCard, RetroParticipant, RetroPhase, RetroSession, RetroVote, RetroModelKey } from "../types/retro";

// ─── Mappers ──────────────────────────────────────────────────────────────────
const mapSession = (r: any): RetroSession => ({
  id: r.id,
  teamId: r.team_id,
  sprintId: r.sprint_id,
  model: r.model as RetroModelKey,
  status: r.status,
  currentPhase: (r.current_phase || "writing") as RetroPhase,
  createdBy: r.created_by,
  createdAt: r.created_at,
  finishedAt: r.finished_at,
});

const mapCard = (r: any): RetroCard => ({
  id: r.id,
  sessionId: r.session_id,
  columnKey: r.column_key,
  text: r.text,
  authorId: r.author_id,
  votes: r.votes ?? 0,
  hidden: r.hidden ?? false,
  isAction: r.is_action ?? false,
  actionOwnerId: r.action_owner_id,
  actionTargetSprintId: r.action_target_sprint_id,
  createdAt: r.created_at,
});

const mapVote = (r: any): RetroVote => ({
  id: r.id,
  sessionId: r.session_id,
  cardId: r.card_id,
  userId: r.user_id,
  createdAt: r.created_at,
});

const mapParticipant = (r: any): RetroParticipant => ({
  id: r.id,
  sessionId: r.session_id,
  userId: r.user_id,
  isFacilitator: r.is_facilitator,
  isOnline: r.is_online,
  joinedAt: r.joined_at,
  lastSeenAt: r.last_seen_at,
});

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const retroService = {
  async getActiveSession(teamId: string, sprintId: string) {
    const { data, error } = await supabase
      .from("retro_sessions")
      .select("*")
      .eq("team_id", teamId)
      .eq("sprint_id", sprintId)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    return data ? mapSession(data) : null;
  },

  async createSession(teamId: string, sprintId: string, model: RetroModelKey, userId: string) {
    const { data, error } = await supabase
      .from("retro_sessions")
      .insert({
        team_id: teamId,
        sprint_id: sprintId,
        model,
        created_by: userId,
        status: "active",
        current_phase: "writing",
      } as any)
      .select()
      .single();
    if (error) throw error;

    // Cria o facilitador
    await supabase.from("retro_participants").insert({
      session_id: data.id,
      user_id: userId,
      is_facilitator: true,
      is_online: true,
    });

    return mapSession(data);
  },

  async setPhase(sessionId: string, phase: RetroPhase) {
    const { error } = await supabase
      .from("retro_sessions")
      .update({ current_phase: phase } as any)
      .eq("id", sessionId);
    if (error) throw error;
  },

  async closeSession(sessionId: string) {
    const { error } = await supabase
      .from("retro_sessions")
      .update({ status: "finished", current_phase: "closed", finished_at: new Date().toISOString() } as any)
      .eq("id", sessionId);
    if (error) throw error;
  },

  async cancelSession(sessionId: string) {
    const { error } = await supabase
      .from("retro_sessions")
      .update({ status: "cancelled", finished_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) throw error;
  },

  async transferFacilitator(sessionId: string, fromUserId: string, toUserId: string) {
    await supabase.from("retro_participants").update({ is_facilitator: false }).eq("session_id", sessionId).eq("user_id", fromUserId);
    await supabase.from("retro_participants").update({ is_facilitator: true }).eq("session_id", sessionId).eq("user_id", toUserId);
  },

  // ─── Cards ──────────────────────────────────────────────────────────────────
  async listCards(sessionId: string) {
    const { data, error } = await supabase
      .from("retro_cards")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map(mapCard);
  },

  async addCard(sessionId: string, columnKey: string, text: string, authorId: string) {
    const { data, error } = await supabase
      .from("retro_cards")
      .insert({ session_id: sessionId, column_key: columnKey, text, author_id: authorId })
      .select()
      .single();
    if (error) throw error;
    return mapCard(data);
  },

  async updateCardText(cardId: string, text: string) {
    const { error } = await supabase.from("retro_cards").update({ text }).eq("id", cardId);
    if (error) throw error;
  },

  async toggleHideCard(cardId: string, hidden: boolean) {
    const { error } = await supabase.from("retro_cards").update({ hidden } as any).eq("id", cardId);
    if (error) throw error;
  },

  async deleteCard(cardId: string) {
    const { error } = await supabase.from("retro_cards").delete().eq("id", cardId);
    if (error) throw error;
  },

  // ─── Votes ──────────────────────────────────────────────────────────────────
  async listVotes(sessionId: string) {
    const { data, error } = await supabase.from("retro_votes").select("*").eq("session_id", sessionId);
    if (error) throw error;
    return (data || []).map(mapVote);
  },

  async toggleVote(sessionId: string, cardId: string, userId: string) {
    const { data: existing } = await supabase
      .from("retro_votes")
      .select("id")
      .eq("session_id", sessionId)
      .eq("card_id", cardId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase.from("retro_votes").delete().eq("id", existing.id);
      // decrementa contador
      const { data: card } = await supabase.from("retro_cards").select("votes").eq("id", cardId).single();
      const newVotes = Math.max(0, (card?.votes ?? 0) - 1);
      await supabase.from("retro_cards").update({ votes: newVotes }).eq("id", cardId);
      return false;
    } else {
      await supabase.from("retro_votes").insert({ session_id: sessionId, card_id: cardId, user_id: userId });
      const { data: card } = await supabase.from("retro_cards").select("votes").eq("id", cardId).single();
      const newVotes = (card?.votes ?? 0) + 1;
      await supabase.from("retro_cards").update({ votes: newVotes }).eq("id", cardId);
      return true;
    }
  },

  // ─── Participants ───────────────────────────────────────────────────────────
  async listParticipants(sessionId: string) {
    const { data, error } = await supabase.from("retro_participants").select("*").eq("session_id", sessionId);
    if (error) throw error;
    return (data || []).map(mapParticipant);
  },

  async joinSession(sessionId: string, userId: string) {
    const { data: existing } = await supabase
      .from("retro_participants")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("retro_participants")
        .update({ is_online: true, last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("retro_participants").insert({
        session_id: sessionId,
        user_id: userId,
        is_facilitator: false,
        is_online: true,
      });
    }
  },

  async heartbeat(sessionId: string, userId: string) {
    await supabase
      .from("retro_participants")
      .update({ last_seen_at: new Date().toISOString(), is_online: true })
      .eq("session_id", sessionId)
      .eq("user_id", userId);
  },

  async markOffline(sessionId: string, userId: string) {
    await supabase.from("retro_participants").update({ is_online: false }).eq("session_id", sessionId).eq("user_id", userId);
  },
};
