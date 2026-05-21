import React, { createContext, useContext, ReactNode, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Developer,
  UserStory,
  Activity,
  Sprint,
  KanbanStatus,
  Impediment,
  ImpedimentType,
  ImpedimentCriticality,
  Epic,
  CustomFieldDefinition,
  AutomationRule,
  WorkflowColumn,
  DEFAULT_KANBAN_COLUMNS,
  normalizeWorkflowColumns,
} from "@/types/sprint";
import { toast } from "sonner";
import { calcDelayDays } from "@/utils/sprintStatus";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KEYS } from "@/lib/queryKeys";
import { STALE } from "@/lib/queryClient";

function toDecimalHours(value: unknown): number {
  if (typeof value === "number" && !isNaN(value)) return value;
  const str = String(value ?? "").trim();
  if (str.includes(":")) {
    const [h = "0", m = "0"] = str.split(":");
    const hours = parseInt(h, 10) || 0;
    const minutes = parseInt(m, 10) || 0;
    return hours + minutes / 60;
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

export interface AddImpedimentData {
  reason: string;
  type: ImpedimentType;
  criticality: ImpedimentCriticality;
  hasTicket: boolean;
  ticketUrl?: string;
  ticketId?: string;
  startedAt?: string;
}

export interface ImpedimentTarget {
  huId?: string;
  sprintId?: string;
}

interface SprintContextType {
  developers: Developer[];
  userStories: UserStory[];
  activities: Activity[];
  sprints: Sprint[];
  epics: Epic[];
  customFields: CustomFieldDefinition[];
  automationRules: AutomationRule[];
  workflowColumns: WorkflowColumn[];
  activeSprint: Sprint | null;
  loading: boolean;
  addDeveloper: (dev: Omit<Developer, "id">) => Promise<void>;
  updateDeveloper: (id: string, dev: Partial<Omit<Developer, "id">>) => Promise<void>;
  removeDeveloper: (id: string) => Promise<void>;
  addUserStory: (hu: Omit<UserStory, "id" | "code" | "createdAt" | "impediments"> & { status?: string }) => Promise<void>;
  updateUserStory: (id: string, hu: Partial<Omit<UserStory, "id" | "code" | "createdAt">>) => Promise<void>;
  removeUserStory: (id: string) => Promise<void>;
  updateUserStoryStatus: (id: string, status: KanbanStatus) => Promise<void>;
  reorderUserStories: (updates: { id: string; position: number }[]) => Promise<void>;
  addActivity: (act: Omit<Activity, "id" | "endDate" | "createdAt">) => Promise<void>;
  updateActivity: (id: string, act: Partial<Omit<Activity, "id" | "createdAt">>) => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
  closeActivity: (id: string) => Promise<void>;
  reopenActivity: (id: string) => Promise<void>;
  addImpediment: (target: ImpedimentTarget | string, data: AddImpedimentData) => Promise<void>;
  addSprintImpediment: (sprintId: string, data: AddImpedimentData) => Promise<void>;
  resolveImpediment: (huIdOrNull: string | null, impedimentId: string, resolution?: string) => Promise<void>;
  addSprint: (sprint: Omit<Sprint, "id" | "createdAt" | "isActive">) => Promise<void>;
  updateSprint: (id: string, sprint: Partial<Omit<Sprint, "id" | "createdAt">>) => Promise<void>;
  removeSprint: (id: string) => Promise<void>;
  closeSprint: (id: string) => Promise<void>;
  setActiveSprint: (id: string) => Promise<void>;
  addEpic: (epic: Omit<Epic, "id" | "createdAt">) => Promise<void>;
  updateEpic: (id: string, epic: Partial<Omit<Epic, "id" | "createdAt">>) => Promise<void>;
  removeEpic: (id: string) => Promise<void>;
  addCustomField: (field: Omit<CustomFieldDefinition, "id">) => Promise<void>;
  updateCustomField: (id: string, field: Partial<Omit<CustomFieldDefinition, "id">>) => Promise<void>;
  removeCustomField: (id: string) => Promise<void>;
  addAutomationRule: (rule: Omit<AutomationRule, "id" | "createdAt">) => Promise<void>;
  updateAutomationRule: (id: string, rule: Partial<Omit<AutomationRule, "id" | "createdAt">>) => Promise<void>;
  removeAutomationRule: (id: string) => Promise<void>;
  setWorkflowColumns: (columns: WorkflowColumn[]) => void;
  addWorkflowColumn: (col: WorkflowColumn) => Promise<void>;
  removeWorkflowColumn: (key: string) => Promise<void>;
  updateWorkflowColumn: (key: string, col: Partial<WorkflowColumn>) => Promise<void>;
  reorderWorkflowColumns: (columns: WorkflowColumn[]) => Promise<void>;
  impediments: Impediment[];
  refreshAll: () => Promise<void>;
}

const SprintContext = createContext<SprintContextType | undefined>(undefined);

export function SprintProvider({ children }: { children: ReactNode }) {
  const { currentTeamId } = useAuth();
  const qc = useQueryClient();
  const teamId = currentTeamId;

  // ── QUERIES ─────────────────────────────────────────────────────────────────────────────

  const { data: developers = [], isLoading: devsLoading } = useQuery<Developer[]>({
    queryKey: KEYS.developers(teamId ?? ""),
    queryFn: async () => {
      const { data } = await supabase.from("developers").select("*").eq("team_id", teamId).limit(200);
      return (data || []).map((d) => ({ id: d.id, name: d.name, email: d.email, role: d.role, avatar: d.avatar }));
    },
    enabled: !!teamId,
    staleTime: STALE.REFERENCE,
  });

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery<Sprint[]>({
    queryKey: KEYS.sprints.all(teamId ?? ""),
    queryFn: async () => {
      const { data } = await supabase.from("sprints").select("*").eq("team_id", teamId).limit(100);
      return (data || []).map((s) => ({
        id: s.id, name: s.name, startDate: s.start_date, endDate: s.end_date,
        goal: s.goal || "", isActive: s.is_active, createdAt: s.created_at,
        closedAt: s.closed_at ?? null,
        delayDays: s.delay_days ?? null,
      }));
    },
    enabled: !!teamId,
    staleTime: STALE.REALTIME,
  });

  const { data: epics = [], isLoading: epicsLoading } = useQuery<Epic[]>({
    queryKey: KEYS.epics(teamId ?? ""),
    queryFn: async () => {
      const { data } = await supabase.from("epics").select("*").eq("team_id", teamId).limit(100);
      return (data || []).map((e) => ({
        id: e.id, name: e.name, description: e.description || "", color: e.color, createdAt: e.created_at,
      }));
    },
    enabled: !!teamId,
    staleTime: STALE.REFERENCE,
  });

  const { data: impediments = [], isLoading: impsLoading } = useQuery<Impediment[]>({
    queryKey: KEYS.impediments(teamId ?? ""),
    queryFn: async () => {
      const { data } = await supabase.from("impediments").select("*").eq("team_id", teamId).limit(200);
      return (data || []).map((imp) => ({
        id: imp.id,
        huId: imp.hu_id ?? undefined,
        sprintId: imp.sprint_id ?? undefined,
        reason: imp.reason,
        type: imp.type as ImpedimentType,
        criticality: imp.criticality as ImpedimentCriticality,
        hasTicket: imp.has_ticket,
        ticketUrl: imp.ticket_url,
        ticketId: imp.ticket_id,
        reportedAt: imp.reported_at,
        resolvedAt: imp.resolved_at,
        resolution: imp.resolution,
        startedAt: imp.started_at ?? undefined,
      }));
    },
    enabled: !!teamId,
    staleTime: STALE.REALTIME,
  });

  const { data: activities = [], isLoading: actsLoading } = useQuery<Activity[]>({
    queryKey: KEYS.activities(teamId ?? ""),
    queryFn: async () => {
      const { data } = await supabase.from("activities").select("*").eq("team_id", teamId).limit(500);
      return (data || []).map((a) => ({
        id: a.id, huId: a.hu_id, title: a.title, description: a.description || "",
        activityType: a.activity_type, assigneeId: a.assignee_id || "",
        hours: Number(a.hours), startDate: a.start_date, endDate: a.end_date,
        createdAt: a.created_at, isClosed: a.is_closed, closedAt: a.closed_at,
      }));
    },
    enabled: !!teamId,
    staleTime: STALE.REALTIME,
  });

  const { data: userStories = [], isLoading: storiesLoading } = useQuery<UserStory[]>({
    queryKey: KEYS.kanban.stories(teamId ?? ""),
    queryFn: async () => {
      const { data } = await supabase.from("user_stories").select("*").eq("team_id", teamId).order("position", { ascending: true }).limit(500);
      return (data || []).map((h) => ({
        id: h.id, code: h.code, title: h.title, description: h.description || "",
        storyPoints: h.story_points, priority: h.priority, status: h.status,
        sprintId: h.sprint_id, epicId: h.epic_id,
        startDate: h.start_date || undefined, endDate: h.end_date || undefined,
        sizeReference: h.size_reference || null,
        estimatedHours: h.estimated_hours != null ? Number(h.estimated_hours) : null,
        planningStatus: h.planning_status || "pending",
        votedAt: h.voted_at || null, votedBy: h.voted_by || null,
        functionPoints: h.function_points != null ? Number(h.function_points) : null,
        assigneeId: h.assignee_id || null, position: h.position ?? 0,
        impediments: (impediments || []).filter((imp) => imp.huId === h.id),
        customFields: h.custom_fields || {}, createdAt: h.created_at,
        statusChangedAt: h.status_changed_at ?? null,
      }));
    },
    enabled: !!teamId && !impsLoading,
    staleTime: STALE.REALTIME,
  });

  const { data: customFields = [], isLoading: cfLoading } = useQuery<CustomFieldDefinition[]>({
    queryKey: KEYS.customFields(teamId ?? ""),
    queryFn: async () => {
      const { data } = await supabase.from("custom_field_definitions").select("*").eq("team_id", teamId).limit(50);
      return (data || []).map((f) => ({
        id: f.id, key: f.key || f.id, name: f.name || f.label || "",
        label: f.label || f.name || "", type: f.field_type as any,
        options: f.options ?? null, required: f.required ?? false,
      }));
    },
    enabled: !!teamId,
    staleTime: STALE.REFERENCE,
  });

  const { data: automationRules = [], isLoading: arLoading } = useQuery<AutomationRule[]>({
    queryKey: KEYS.automations(teamId ?? ""),
    queryFn: async () => {
      const { data } = await supabase.from("automation_rules").select("*").eq("team_id", teamId).limit(50);
      return (data || []).map((r) => ({
        id: r.id, name: r.name, enabled: r.enabled ?? r.is_active ?? false,
        isActive: r.is_active ?? r.enabled ?? false,
        trigger: { type: r.trigger_type, fromStatus: r.trigger_from_status ?? null, toStatus: r.trigger_to_status },
        action: { type: r.action_type, targetStatus: r.action_target_status ?? null, message: r.action_message ?? null },
        createdAt: r.created_at,
      }));
    },
    enabled: !!teamId,
    staleTime: STALE.REFERENCE,
  });

  const { data: workflowColumns = DEFAULT_KANBAN_COLUMNS, isLoading: wcLoading } = useQuery<WorkflowColumn[]>({
    queryKey: KEYS.workflow(teamId ?? ""),
    queryFn: async () => {
      const { data } = await supabase.from("workflow_columns").select("*").eq("team_id", teamId).order("sort_order").limit(50);
      if (data && data.length > 0) {
        return normalizeWorkflowColumns(data.map((c) => ({
          key: c.key, label: c.label, colorClass: c.color_class || "",
          dotColor: c.dot_color || "", hex: c.hex || undefined,
          wipLimit: c.wip_limit ?? null, orderIndex: c.sort_order ?? 0,
        })));
      }
      return DEFAULT_KANBAN_COLUMNS;
    },
    enabled: !!teamId,
    staleTime: STALE.REFERENCE,
  });

  const loading = devsLoading || sprintsLoading || epicsLoading || storiesLoading || actsLoading || impsLoading || cfLoading || arLoading || wcLoading;

  const refreshAll = useCallback(async () => {
    if (!teamId) return;
    await Promise.all([
      qc.invalidateQueries({ queryKey: KEYS.developers(teamId) }),
      qc.invalidateQueries({ queryKey: KEYS.sprints.all(teamId) }),
      qc.invalidateQueries({ queryKey: KEYS.epics(teamId) }),
      qc.invalidateQueries({ queryKey: KEYS.kanban.stories(teamId) }),
      qc.invalidateQueries({ queryKey: KEYS.activities(teamId) }),
      qc.invalidateQueries({ queryKey: KEYS.impediments(teamId) }),
      qc.invalidateQueries({ queryKey: KEYS.customFields(teamId) }),
      qc.invalidateQueries({ queryKey: KEYS.automations(teamId) }),
      qc.invalidateQueries({ queryKey: KEYS.workflow(teamId) }),
    ]);
  }, [qc, teamId]);

  // Realtime
  useEffect(() => {
    if (!teamId) return;
    const channel = supabase.channel(`sprint-rt-${teamId}`)
      .on("postgres_changes", { event: "*", schema: "public", filter: `team_id=eq.${teamId}` }, () => {
        refreshAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [teamId, refreshAll]);

  const activeSprint = sprints.find((s) => s.isActive) || null;

  const runAutomations = useCallback(async (huId: string, fromStatus: string, toStatus: string) => {
    const rules = automationRules.filter((r) => {
      const en = r.enabled ?? (r as any).isActive ?? false;
      const trig = r.trigger;
      return en && trig?.type === "status_change";
    });
    for (const rule of rules) {
      const trig = rule.trigger;
      const act  = rule.action;
      if ((!trig.fromStatus || trig.fromStatus === fromStatus) && trig.toStatus === toStatus) {
        if (act.type === "notify" && act.message) toast.info(`🤖 Automação "${rule.name}": ${act.message}`);
        if (act.type === "change_status" && act.targetStatus) {
          await supabase.from("user_stories").update({ status: act.targetStatus }).eq("id", huId);
          toast.info(`🤖 Automação "${rule.name}": Status alterado automaticamente`);
        }
      }
    }
  }, [automationRules]);

  // ── MUTATIONS (Helpers) ───────────────────────────────────────────────────────────────────
  const invalidate = useCallback((key: unknown[]) => qc.invalidateQueries({ queryKey: key }), [qc]);

  const addDeveloper = useCallback(async (dev: Omit<Developer, "id">) => {
    if (!teamId) return;
    const { error } = await supabase.from("developers").insert({ team_id: teamId, name: dev.name, email: dev.email, role: dev.role, avatar: dev.avatar });
    if (error) { toast.error("Erro ao adicionar desenvolvedor"); return; }
    invalidate(KEYS.developers(teamId));
  }, [teamId, invalidate]);

  const updateDeveloper = useCallback(async (id: string, dev: Partial<Omit<Developer, "id">>) => {
    const { error } = await supabase.from("developers").update(dev).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    if (teamId) invalidate(KEYS.developers(teamId));
  }, [teamId, invalidate]);

  const removeDeveloper = useCallback(async (id: string) => {
    await supabase.from("developers").delete().eq("id", id);
    if (teamId) invalidate(KEYS.developers(teamId));
  }, [teamId, invalidate]);

  const addUserStory = useCallback(async (hu: Omit<UserStory, "id" | "code" | "createdAt" | "impediments"> & { status?: string }) => {
    if (!teamId) return;
    const currentStories = qc.getQueryData<UserStory[]>(KEYS.kanban.stories(teamId)) || [];
    const currentColumns = qc.getQueryData<WorkflowColumn[]>(KEYS.workflow(teamId)) || DEFAULT_KANBAN_COLUMNS;

    const count = currentStories.length + 1;
    const firstCol = currentColumns[0]?.key || "aguardando_desenvolvimento";
    const targetStatus = hu.status || firstCol;
    const lastPosition = currentStories.filter((h) => h.status === targetStatus).reduce((max, h) => Math.max(max, h.position ?? 0), -1) + 1;

    const { error } = await supabase.from("user_stories").insert({
      team_id: teamId, sprint_id: hu.sprintId, epic_id: hu.epicId || null,
      code: `HU-${String(count).padStart(3, "0")}`, title: hu.title,
      description: hu.description, story_points: hu.storyPoints, priority: hu.priority,
      status: targetStatus, position: lastPosition, custom_fields: hu.customFields || {},
      start_date: hu.startDate || null, end_date: hu.endDate || null,
      size_reference: (hu as any).sizeReference || null,
      estimated_hours: (hu as any).estimatedHours || null,
      function_points: (hu as any).functionPoints || null,
      assignee_id: (hu as any).assigneeId || null,
    });
    if (error) { toast.error("Erro ao criar HU"); return; }
    invalidate(KEYS.kanban.stories(teamId));
  }, [teamId, qc, invalidate]);

  const updateUserStory = useCallback(async (id: string, hu: Partial<Omit<UserStory, "id" | "code" | "createdAt">>) => {
    const updateData: any = {};
    if (hu.title !== undefined) updateData.title = hu.title;
    if (hu.description !== undefined) updateData.description = hu.description;
    if (hu.storyPoints !== undefined) updateData.story_points = hu.storyPoints;
    if (hu.priority !== undefined) updateData.priority = hu.priority;
    if (hu.status !== undefined) updateData.status = hu.status;
    if ("sprintId" in hu) updateData.sprint_id = hu.sprintId ?? null;
    if ("epicId" in hu) updateData.epic_id = hu.epicId ?? null;
    if (hu.customFields !== undefined) updateData.custom_fields = hu.customFields;
    if ("startDate" in hu) updateData.start_date = hu.startDate || null;
    if ("endDate" in hu) updateData.end_date = hu.endDate || null;
    if ((hu as any).sizeReference !== undefined) updateData.size_reference = (hu as any).sizeReference ?? null;
    if ((hu as any).estimatedHours !== undefined) updateData.estimated_hours = (hu as any).estimatedHours ?? null;
    if ((hu as any).planningStatus !== undefined) updateData.planning_status = (hu as any).planningStatus;
    if ((hu as any).votedAt !== undefined) updateData.voted_at = (hu as any).votedAt;
    if ((hu as any).votedBy !== undefined) updateData.voted_by = (hu as any).votedBy;
    if ((hu as any).functionPoints !== undefined) updateData.function_points = (hu as any).functionPoints ?? null;
    if ("assigneeId" in hu) updateData.assignee_id = (hu as any).assigneeId ?? null;
    const { error } = await supabase.from("user_stories").update(updateData).eq("id", id);
    if (error) { toast.error("Erro ao atualizar HU: " + error.message); return; }
    if (teamId) invalidate(KEYS.kanban.stories(teamId));
  }, [teamId, invalidate]);

  const removeUserStory = useCallback(async (id: string) => {
    await supabase.from("user_stories").delete().eq("id", id);
    if (teamId) invalidate(KEYS.kanban.stories(teamId));
  }, [teamId, invalidate]);

  const updateUserStoryStatus = useCallback(async (id: string, status: KanbanStatus) => {
    if (!teamId) return;
    const currentStories = qc.getQueryData<UserStory[]>(KEYS.kanban.stories(teamId)) || [];
    const hu = currentStories.find((h) => h.id === id);
    if (!hu) return;
    const oldStatus = hu.status;
    if (oldStatus === status) return;
    const now = new Date().toISOString();
    const lastPosition = currentStories.filter((h) => h.status === status).reduce((max, h) => Math.max(max, h.position ?? 0), -1) + 1;

    // Optimistic update
    qc.setQueryData(KEYS.kanban.stories(teamId), (old: UserStory[] | undefined) =>
      old?.map((h) => h.id === id ? { ...h, status, position: lastPosition, statusChangedAt: now } : h)
    );

    try {
      const { error } = await supabase.from("user_stories").update({ status, position: lastPosition, status_changed_at: now }).eq("id", id);
      if (error) throw error;
      if (oldStatus !== status) await runAutomations(id, oldStatus, status);
      invalidate(KEYS.kanban.stories(teamId));
    } catch (err: any) {
      invalidate(KEYS.kanban.stories(teamId));
      toast.error("Erro ao mover card: " + (err?.message ?? "tente novamente"));
    }
  }, [teamId, runAutomations, qc, invalidate]);

  const reorderUserStories = useCallback(async (updates: { id: string; position: number }[]) => {
    if (!teamId) return;
    // Optimistic update
    qc.setQueryData(KEYS.kanban.stories(teamId), (old: UserStory[] | undefined) =>
      old?.map((h) => {
        const upd = updates.find((u) => u.id === h.id);
        return upd ? { ...h, position: upd.position } : h;
      })
    );
    await Promise.all(updates.map(({ id, position }) => supabase.from("user_stories").update({ position }).eq("id", id)));
    invalidate(KEYS.kanban.stories(teamId));
  }, [teamId, qc, invalidate]);

  const addActivity = useCallback(async (act: Omit<Activity, "id" | "endDate" | "createdAt">) => {
    if (!teamId) return;
    const safeHours = toDecimalHours(act.hours);
    const { error } = await supabase.from("activities").insert({
      team_id: teamId, hu_id: act.huId, title: act.title, description: act.description,
      activity_type: act.activityType, assignee_id: act.assigneeId || null,
      hours: safeHours, start_date: act.startDate, end_date: act.startDate,
    });
    if (error) { toast.error("Erro ao criar atividade"); return; }

    const currentStories = qc.getQueryData<UserStory[]>(KEYS.kanban.stories(teamId)) || [];
    if (act.activityType === "bug") {
      const hu = currentStories.find((h) => h.id === act.huId);
      if (hu && hu.status !== "bug") {
        await supabase.from("user_stories").update({ status: "bug" }).eq("id", act.huId);
        invalidate(KEYS.kanban.stories(teamId));
      }
    }
    invalidate(KEYS.activities(teamId));
  }, [teamId, qc, invalidate]);

  const updateActivity = useCallback(async (id: string, act: Partial<Omit<Activity, "id" | "createdAt">>) => {
    if (!teamId) return;
    const currentActivities = qc.getQueryData<Activity[]>(KEYS.activities(teamId)) || [];
    const existing = currentActivities.find((a) => a.id === id);
    if (!existing) return;
    const updateData: any = {};
    if (act.title !== undefined) updateData.title = act.title;
    if (act.description !== undefined) updateData.description = act.description;
    if (act.activityType !== undefined) updateData.activity_type = act.activityType;
    if (act.assigneeId !== undefined) updateData.assignee_id = act.assigneeId || null;
    if (act.hours !== undefined) updateData.hours = toDecimalHours(act.hours);
    if (act.startDate !== undefined) {
      updateData.start_date = act.startDate;
      if (!existing.isClosed) { updateData.end_date = act.startDate; }
    }
    const { error } = await supabase.from("activities").update(updateData).eq("id", id);
    if (error) { toast.error("Erro ao atualizar atividade"); return; }
    invalidate(KEYS.activities(teamId));
  }, [teamId, qc, invalidate]);

  const removeActivity = useCallback(async (id: string) => {
    await supabase.from("activities").delete().eq("id", id);
    if (teamId) invalidate(KEYS.activities(teamId));
  }, [teamId, invalidate]);

  const closeActivity = useCallback(async (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("activities").update({
      is_closed: true, closed_at: new Date().toISOString(), end_date: today,
    }).eq("id", id);
    if (teamId) invalidate(KEYS.activities(teamId));

    if (teamId) {
      const currentActivities = qc.getQueryData<Activity[]>(KEYS.activities(teamId)) || [];
      const act = currentActivities.find((a) => a.id === id);
      if (act && act.activityType === "bug") {
        const currentStories = qc.getQueryData<UserStory[]>(KEYS.kanban.stories(teamId)) || [];
        const hu = currentStories.find((h) => h.id === act.huId);
        const remainingOpenBugs = currentActivities.filter((a) => a.huId === act.huId && a.id !== id && a.activityType === "bug" && !a.isClosed);
        if (hu && hu.status === "bug" && remainingOpenBugs.length === 0) {
          await supabase.from("user_stories").update({ status: "em_teste" }).eq("id", act.huId);
          invalidate(KEYS.kanban.stories(teamId));
        }
      }
    }
  }, [teamId, qc, invalidate]);

  const reopenActivity = useCallback(async (id: string) => {
    await supabase.from("activities").update({ is_closed: false, closed_at: null, end_date: null }).eq("id", id);
    if (teamId) invalidate(KEYS.activities(teamId));
  }, [teamId, invalidate]);

  const addImpediment = useCallback(async (target: ImpedimentTarget | string, data: AddImpedimentData) => {
    if (!teamId) return;
    const huId = typeof target === "string" ? target : (target.huId ?? null);
    const sprintId = typeof target === "string" ? null : (target.sprintId ?? null);
    const { error } = await supabase.from("impediments").insert({
      team_id: teamId, hu_id: huId, sprint_id: sprintId,
      reason: data.reason, type: data.type, criticality: data.criticality,
      has_ticket: data.hasTicket, ticket_url: data.ticketUrl ?? null,
      ticket_id: data.ticketId ?? null, started_at: data.startedAt ?? null,
    });
    if (error) { toast.error("Erro ao adicionar impedimento"); return; }
    invalidate(KEYS.impediments(teamId));
  }, [teamId, invalidate]);

  const addSprintImpediment = useCallback(async (sprintId: string, data: AddImpedimentData) => addImpediment({ sprintId }, data), [addImpediment]);

  const resolveImpediment = useCallback(async (_: string | null, impedimentId: string, resolution?: string) => {
    await supabase.from("impediments").update({ resolved_at: new Date().toISOString(), resolution: resolution || null }).eq("id", impedimentId);
    if (teamId) invalidate(KEYS.impediments(teamId));
  }, [teamId, invalidate]);

  const addSprint = useCallback(async (sprint: Omit<Sprint, "id" | "createdAt" | "isActive">) => {
    if (!teamId) return;
    const { error } = await supabase.from("sprints").insert({
      team_id: teamId, name: sprint.name, start_date: sprint.startDate,
      end_date: sprint.endDate, goal: sprint.goal, is_active: false,
    });
    if (error) { toast.error("Erro ao criar sprint"); return; }
    invalidate(KEYS.sprints.all(teamId));
  }, [teamId, invalidate]);

  const updateSprint = useCallback(async (id: string, sprint: Partial<Omit<Sprint, "id" | "createdAt">>) => {
    const updateData: any = {};
    if (sprint.name !== undefined) updateData.name = sprint.name;
    if (sprint.isActive !== undefined) updateData.is_active = sprint.isActive;
    const { error } = await supabase.from("sprints").update(updateData).eq("id", id);
    if (error) { toast.error("Erro ao atualizar sprint"); return; }
    if (teamId) invalidate(KEYS.sprints.all(teamId));
  }, [teamId, invalidate]);

  const removeSprint = useCallback(async (id: string) => {
    await supabase.from("sprints").delete().eq("id", id);
    if (teamId) invalidate(KEYS.sprints.all(teamId));
  }, [teamId, invalidate]);

  const closeSprint = useCallback(async (id: string) => {
    const sprint = sprints.find((s) => s.id === id);
    if (!sprint) return;
    const closedAt = new Date().toISOString();
    const delayDays = calcDelayDays(sprint.endDate ?? null, closedAt);
    const { error } = await supabase.from("sprints").update({ is_active: false, closed_at: closedAt, delay_days: delayDays }).eq("id", id);
    if (error) { toast.error("Erro ao encerrar sprint"); return; }
    if (teamId) invalidate(KEYS.sprints.all(teamId));
  }, [teamId, sprints, invalidate]);

  const setActiveSprintFn = useCallback(async (id: string) => {
    if (!teamId) return;
    const currentActive = sprints.find((s) => s.isActive);
    if (currentActive && currentActive.id !== id) {
      await supabase.from("sprints").update({ is_active: false }).eq("id", currentActive.id);
    }
    await supabase.from("sprints").update({ is_active: true }).eq("id", id);
    invalidate(KEYS.sprints.all(teamId));
  }, [teamId, sprints, invalidate]);

  const addEpic = useCallback(async (epic: Omit<Epic, "id" | "createdAt">) => {
    if (!teamId) return;
    const { error } = await supabase.from("epics").insert({ team_id: teamId, name: epic.name, description: epic.description, color: epic.color });
    if (error) { toast.error("Erro ao criar épico"); return; }
    invalidate(KEYS.epics(teamId));
  }, [teamId, invalidate]);

  const updateEpic = useCallback(async (id: string, epic: Partial<Omit<Epic, "id" | "createdAt">>) => {
    const { error } = await supabase.from("epics").update(epic).eq("id", id);
    if (error) { toast.error("Erro ao atualizar épico"); return; }
    if (teamId) invalidate(KEYS.epics(teamId));
  }, [teamId, invalidate]);

  const removeEpic = useCallback(async (id: string) => {
    await supabase.from("epics").delete().eq("id", id);
    if (teamId) invalidate(KEYS.epics(teamId));
  }, [teamId, invalidate]);

  const addCustomField = useCallback(async (field: Omit<CustomFieldDefinition, "id">) => {
    if (!teamId) return;
    const { error } = await supabase.from("custom_field_definitions").insert({ team_id: teamId, name: field.name, field_type: field.type, options: field.options || null, required: field.required });
    if (error) { toast.error("Erro ao criar campo"); return; }
    invalidate(KEYS.customFields(teamId));
  }, [teamId, invalidate]);

  const updateCustomField = useCallback(async (id: string, field: Partial<Omit<CustomFieldDefinition, "id">>) => {
    const { error } = await supabase.from("custom_field_definitions").update(field).eq("id", id);
    if (error) { toast.error("Erro ao atualizar campo"); return; }
    if (teamId) invalidate(KEYS.customFields(teamId));
  }, [teamId, invalidate]);

  const removeCustomField = useCallback(async (id: string) => {
    await supabase.from("custom_field_definitions").delete().eq("id", id);
    if (teamId) invalidate(KEYS.customFields(teamId));
  }, [teamId, invalidate]);

  const addAutomationRule = useCallback(async (rule: Omit<AutomationRule, "id" | "createdAt">) => {
    if (!teamId) return;
    const { error } = await supabase.from("automation_rules").insert({
      team_id: teamId, name: rule.name, enabled: rule.enabled ?? true,
      trigger_type: rule.trigger.type, trigger_from_status: rule.trigger.fromStatus,
      trigger_to_status: rule.trigger.toStatus, action_type: rule.action.type,
      action_target_status: rule.action.targetStatus, action_message: rule.action.message,
    });
    if (error) { toast.error("Erro ao criar automação"); return; }
    invalidate(KEYS.automations(teamId));
  }, [teamId, invalidate]);

  const updateAutomationRule = useCallback(async (id: string, rule: Partial<Omit<AutomationRule, "id" | "createdAt">>) => {
    const { error = null } = await supabase.from("automation_rules").update(rule).eq("id", id);
    if (error) { toast.error("Erro ao atualizar automação"); return; }
    if (teamId) invalidate(KEYS.automations(teamId));
  }, [teamId, invalidate]);

  const removeAutomationRule = useCallback(async (id: string) => {
    await supabase.from("automation_rules").delete().eq("id", id);
    if (teamId) invalidate(KEYS.automations(teamId));
  }, [teamId, invalidate]);

  const setWorkflowColumns = useCallback((_columns: WorkflowColumn[]) => {
    // No-op for direct set as we use Query, but kept for compatibility
  }, []);

  const addWorkflowColumn = useCallback(async (col: WorkflowColumn) => {
    if (!teamId) return;
    await supabase.from("workflow_columns").insert({
      team_id: teamId, key: col.key, label: col.label, hex: col.hex, sort_order: workflowColumns.length
    });
    invalidate(KEYS.workflow(teamId));
  }, [teamId, workflowColumns.length, invalidate]);

  const removeWorkflowColumn = useCallback(async (key: string) => {
    if (!teamId) return;
    await supabase.from("workflow_columns").delete().eq("team_id", teamId).eq("key", key);
    invalidate(KEYS.workflow(teamId));
  }, [teamId, invalidate]);

  const updateWorkflowColumn = useCallback(async (key: string, col: Partial<WorkflowColumn>) => {
    if (!teamId) return;
    await supabase.from("workflow_columns").update(col).eq("team_id", teamId).eq("key", key);
    invalidate(KEYS.workflow(teamId));
  }, [teamId, invalidate]);

  const reorderWorkflowColumns = useCallback(async (columns: WorkflowColumn[]) => {
    if (!teamId) return;
    const updates = columns.map((c, idx) => supabase.from("workflow_columns").update({ sort_order: idx }).eq("team_id", teamId).eq("key", c.key));
    await Promise.all(updates);
    invalidate(KEYS.workflow(teamId));
  }, [teamId, invalidate]);

  return (
    <SprintContext.Provider value={{
      developers, userStories, activities, sprints, epics, customFields, automationRules,
      workflowColumns, activeSprint, loading, impediments,
      addDeveloper, updateDeveloper, removeDeveloper,
      addUserStory, updateUserStory, removeUserStory, updateUserStoryStatus, reorderUserStories,
      addActivity, updateActivity, removeActivity, closeActivity, reopenActivity,
      addImpediment, addSprintImpediment, resolveImpediment,
      addSprint, updateSprint, removeSprint, closeSprint, setActiveSprint: setActiveSprintFn,
      addEpic, updateEpic, removeEpic,
      addCustomField, updateCustomField, removeCustomField,
      addAutomationRule, updateAutomationRule, removeAutomationRule,
      setWorkflowColumns, addWorkflowColumn, removeWorkflowColumn, updateWorkflowColumn, reorderWorkflowColumns,
      refreshAll,
    }}>
      {children}
    </SprintContext.Provider>
  );
}

export function useSprint() {
  const ctx = useContext(SprintContext);
  if (!ctx) throw new Error("useSprint must be used within SprintProvider");
  return ctx;
}
