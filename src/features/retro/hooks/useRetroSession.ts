// src/features/retro/hooks/useRetroSession.ts
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { retroService } from "../services/retro.service";
import type {
  RetroCard,
  RetroParticipant,
  RetroPhase,
  RetroSession,
  RetroVote,
  RetroModelKey,
  RetroActionItem,
  ActionItemStatus,
} from "../types/retro";

const HEARTBEAT_MS = 20_000;
const OFFLINE_THRESHOLD_MS = 60_000;

interface Options {
  teamId: string | null;
  sprintId: string | null;
  userId: string | null;
}

export function useRetroSession({ teamId, sprintId, userId }: Options) {
  const [session, setSession] = useState<RetroSession | null>(null);
  const [cards, setCards] = useState<RetroCard[]>([]);
  const [votes, setVotes] = useState<RetroVote[]>([]);
  const [participants, setParticipants] = useState<RetroParticipant[]>([]);
  const [actionItems, setActionItems] = useState<RetroActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ─── Loaders ─────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async (sId: string) => {
    const [c, v, p, a] = await Promise.all([
      retroService.listCards(sId),
      retroService.listVotes(sId),
      retroService.listParticipants(sId),
      retroService.listActionItems(sId),
    ]);
    setCards(c);
    setVotes(v);
    setParticipants(p);
    setActionItems(a);
  }, []);

  const loadSession = useCallback(async () => {
    if (!teamId || !sprintId) {
      setSession(null);
      setCards([]);
      setVotes([]);
      setParticipants([]);
      setActionItems([]);
      return;
    }
    setLoading(true);
    try {
      const s = await retroService.getActiveSession(teamId, sprintId);
      setSession(s);
      if (s) {
        await loadAll(s.id);
      } else {
        setCards([]);
        setVotes([]);
        setParticipants([]);
        setActionItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [teamId, sprintId, loadAll]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // ─── Profiles cache ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name").limit(500);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => (map[p.user_id] = p.display_name));
      setProfiles(map);
    })();
  }, []);

  // ─── Realtime subscription ────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.id) return;
    const sId = session.id;

    const channel = supabase
      .channel(`retro-session-${sId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "retro_sessions", filter: `id=eq.${sId}` }, () => {
        loadSession();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "retro_cards", filter: `session_id=eq.${sId}` }, async () => {
        const c = await retroService.listCards(sId);
        setCards(c);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "retro_votes", filter: `session_id=eq.${sId}` }, async () => {
        const v = await retroService.listVotes(sId);
        setVotes(v);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "retro_participants", filter: `session_id=eq.${sId}` }, async () => {
        const p = await retroService.listParticipants(sId);
        setParticipants(p);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "retro_action_items", filter: `session_id=eq.${sId}` }, async () => {
        const a = await retroService.listActionItems(sId);
        setActionItems(a);
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [session?.id, loadSession]);

  // ─── Join + heartbeat ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.id || !userId) return;
    const sId = session.id;
    retroService.joinSession(sId, userId);
    const interval = setInterval(() => retroService.heartbeat(sId, userId), HEARTBEAT_MS);
    const handleUnload = () => retroService.markOffline(sId, userId);
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
      retroService.markOffline(sId, userId);
    };
  }, [session?.id, userId]);

  // ─── Derived ──────────────────────────────────────────────────────────────────
  const me = participants.find((p) => p.userId === userId) || null;
  const isFacilitator = me?.isFacilitator ?? false;
  const facilitator = participants.find((p) => p.isFacilitator) || null;
  const facilitatorOffline =
    facilitator !== null &&
    !facilitator.isOnline &&
    Date.now() - new Date(facilitator.lastSeenAt).getTime() > OFFLINE_THRESHOLD_MS;

  // ─── Actions ──────────────────────────────────────────────────────────────────
  const createSession = useCallback(
    async (model: RetroModelKey) => {
      if (!teamId || !sprintId || !userId) return;
      const s = await retroService.createSession(teamId, sprintId, model, userId);
      setSession(s);
      await loadAll(s.id);
    },
    [teamId, sprintId, userId, loadAll],
  );

  const setPhase = useCallback(
    async (phase: RetroPhase) => {
      if (!session) return;
      await retroService.setPhase(session.id, phase);
    },
    [session],
  );

  const close = useCallback(async () => {
    if (!session) return;
    await retroService.closeSession(session.id);
  }, [session]);

  const cancel = useCallback(async () => {
    if (!session) return;
    await retroService.cancelSession(session.id);
  }, [session]);

  const addCard = useCallback(
    async (columnKey: string, text: string) => {
      if (!session || !userId) return;
      await retroService.addCard(session.id, columnKey, text, userId);
    },
    [session, userId],
  );

  const updateCardText = useCallback(async (cardId: string, text: string) => {
    await retroService.updateCardText(cardId, text);
  }, []);

  const toggleHide = useCallback(async (cardId: string, hidden: boolean) => {
    await retroService.toggleHideCard(cardId, hidden);
  }, []);

  const deleteCard = useCallback(async (cardId: string) => {
    await retroService.deleteCard(cardId);
  }, []);

  const toggleVote = useCallback(
    async (cardId: string) => {
      if (!session || !userId) return;
      await retroService.toggleVote(session.id, cardId, userId);
    },
    [session, userId],
  );

  const assumeFacilitator = useCallback(async () => {
    if (!session || !userId || !facilitator) return;
    await retroService.transferFacilitator(session.id, facilitator.userId, userId);
  }, [session, userId, facilitator]);

  const transferFacilitatorTo = useCallback(
    async (toUserId: string) => {
      if (!session || !userId) return;
      await retroService.transferFacilitator(session.id, userId, toUserId);
    },
    [session, userId],
  );

  const createActionItem = useCallback(
    async (payload: { title: string; description?: string; ownerId?: string; dueDate?: string; cardId?: string }) => {
      if (!session) return;
      await retroService.createActionItem(session.id, payload);
    },
    [session],
  );

  const updateActionItem = useCallback(
    async (actionId: string, updates: Partial<{ title: string; description: string; ownerId: string; dueDate: string; status: ActionItemStatus }>) => {
      await retroService.updateActionItem(actionId, updates);
    },
    [],
  );

  const deleteActionItem = useCallback(async (actionId: string) => {
    await retroService.deleteActionItem(actionId);
  }, []);

  return {
    session,
    cards,
    votes,
    participants,
    actionItems,
    profiles,
    loading,
    me,
    isFacilitator,
    facilitator,
    facilitatorOffline,
    createSession,
    setPhase,
    close,
    cancel,
    addCard,
    updateCardText,
    toggleHide,
    deleteCard,
    toggleVote,
    assumeFacilitator,
    transferFacilitatorTo,
    createActionItem,
    updateActionItem,
    deleteActionItem,
    refresh: loadSession,
  };
}
