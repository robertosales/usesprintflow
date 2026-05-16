import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth }  from "@/contexts/AuthContext";
import { toast }    from "sonner";

export type NotifType =
  | "hu_moved" | "hu_assigned" | "hu_blocked"
  | "impediment_created" | "impediment_resolved"
  | "sprint_started" | "sprint_ending"
  | "planning_started" | "retro_started" | "mention";

export interface Notification {
  id: string; type: NotifType; title: string; body: string;
  link?: string; read: boolean; created_at: string;
  actor_name?: string; entity_id?: string;
}

export interface AutoRule {
  id: string; name: string; trigger: string;
  condition: Record<string, any>; action: string;
  action_data: Record<string, any>; enabled: boolean; created_at: string;
}

export function useNotifications() {
  const { profile, currentTeam } = useAuth();
  const userId = profile?.user_id ?? "";
  const teamId = currentTeam?.id ?? "";
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rules,         setRules]         = useState<AutoRule[]>([]);
  const [loading,       setLoading]       = useState(true);
  const unreadCount = notifications.filter(n => !n.read).length;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [notifRes, rulesRes] = await Promise.all([
        supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("automation_rules").select("*").eq("team_id", teamId).order("created_at", { ascending: false }),
      ]);
      setNotifications((notifRes.data ?? []).map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.message ?? n.body ?? "",
        link: n.link_id ?? undefined,
        read: Boolean(n.is_read),
        created_at: n.created_at,
        entity_id: n.link_id ?? undefined,
      })) as Notification[]);
      setRules((rulesRes.data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        trigger: r.trigger_type ?? r.trigger ?? "status_change",
        condition: {
          from: r.trigger_from_status,
          to: r.trigger_to_status,
        },
        action: r.action_type ?? "notify",
        action_data: {
          message: r.action_message,
          targetStatus: r.action_target_status,
        },
        enabled: Boolean(r.enabled),
        created_at: r.created_at,
      })) as AutoRule[]);
    } finally { setLoading(false); }
  }, [userId, teamId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const raw = payload.new as any;
          const n: Notification = {
            id: raw.id,
            type: raw.type,
            title: raw.title,
            body: raw.message ?? "",
            link: raw.link_id ?? undefined,
            read: Boolean(raw.is_read),
            created_at: raw.created_at,
            entity_id: raw.link_id ?? undefined,
          };
          setNotifications(prev => [n, ...prev]);
          toast(n.title, { description: n.body, duration: 5000 });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  const markRead    = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [userId]);

  const deleteNotif = useCallback(async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const toggleRule = useCallback(async (ruleId: string, enabled: boolean) => {
    await supabase.from("automation_rules").update({ enabled }).eq("id", ruleId);
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled } : r));
    toast.success(enabled ? "Regra ativada" : "Regra desativada");
  }, []);

  const createRule = useCallback(async (rule: Omit<AutoRule, "id" | "created_at">) => {
    const { error } = await supabase.from("automation_rules").insert({
      team_id: teamId,
      name: rule.name,
      trigger_type: rule.trigger,
      trigger_to_status: String(rule.condition?.to ?? ""),
      trigger_from_status: rule.condition?.from ? String(rule.condition.from) : null,
      action_type: rule.action,
      action_message: rule.action_data?.message ? String(rule.action_data.message) : null,
      action_target_status: rule.action_data?.targetStatus ? String(rule.action_data.targetStatus) : null,
      enabled: rule.enabled,
    } as any);
    if (error) { toast.error("Erro ao criar regra"); return; }
    toast.success("Regra de automação criada!");
    await load();
  }, [teamId, load]);

  const deleteRule = useCallback(async (ruleId: string) => {
    await supabase.from("automation_rules").delete().eq("id", ruleId);
    setRules(prev => prev.filter(r => r.id !== ruleId));
    toast.success("Regra removida");
  }, []);

  return { notifications, rules, loading, unreadCount, markRead, markAllRead, deleteNotif, toggleRule, createRule, deleteRule, reload: load };
}
