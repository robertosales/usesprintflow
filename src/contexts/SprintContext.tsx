import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import {
  Developer, UserStory, Activity, Sprint, KanbanStatus, calculateEndDate,
  Impediment, ImpedimentType, ImpedimentCriticality, ActivityType,
  Epic, CustomFieldDefinition, AutomationRule, WorkflowColumn, DEFAULT_KANBAN_COLUMNS,
} from "@/types/sprint";
import { toast } from "sonner";

interface AddImpedimentData {
  reason: string;
  type: ImpedimentType;
  criticality: ImpedimentCriticality;
  hasTicket: boolean;
  ticketUrl?: string;
  ticketId?: string;
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
  addDeveloper: (dev: Omit<Developer, "id">) => void;
  updateDeveloper: (id: string, dev: Partial<Omit<Developer, "id">>) => void;
  removeDeveloper: (id: string) => void;
  addUserStory: (hu: Omit<UserStory, "id" | "code" | "createdAt" | "status" | "impediments">) => void;
  updateUserStory: (id: string, hu: Partial<Omit<UserStory, "id" | "code" | "createdAt">>) => void;
  removeUserStory: (id: string) => void;
  updateUserStoryStatus: (id: string, status: KanbanStatus) => void;
  addActivity: (act: Omit<Activity, "id" | "endDate" | "createdAt">) => void;
  updateActivity: (id: string, act: Partial<Omit<Activity, "id" | "createdAt">>) => void;
  removeActivity: (id: string) => void;
  addImpediment: (huId: string, data: AddImpedimentData) => void;
  resolveImpediment: (huId: string, impedimentId: string, resolution?: string) => void;
  addSprint: (sprint: Omit<Sprint, "id" | "createdAt" | "isActive">) => void;
  updateSprint: (id: string, sprint: Partial<Omit<Sprint, "id" | "createdAt">>) => void;
  removeSprint: (id: string) => void;
  setActiveSprint: (id: string) => void;
  addEpic: (epic: Omit<Epic, "id" | "createdAt">) => void;
  updateEpic: (id: string, epic: Partial<Omit<Epic, "id" | "createdAt">>) => void;
  removeEpic: (id: string) => void;
  addCustomField: (field: Omit<CustomFieldDefinition, "id">) => void;
  updateCustomField: (id: string, field: Partial<Omit<CustomFieldDefinition, "id">>) => void;
  removeCustomField: (id: string) => void;
  addAutomationRule: (rule: Omit<AutomationRule, "id" | "createdAt">) => void;
  updateAutomationRule: (id: string, rule: Partial<Omit<AutomationRule, "id" | "createdAt">>) => void;
  removeAutomationRule: (id: string) => void;
  setWorkflowColumns: (columns: WorkflowColumn[]) => void;
  addWorkflowColumn: (col: WorkflowColumn) => void;
  removeWorkflowColumn: (key: string) => void;
  updateWorkflowColumn: (key: string, col: Partial<WorkflowColumn>) => void;
  reorderWorkflowColumns: (columns: WorkflowColumn[]) => void;
}

const SprintContext = createContext<SprintContextType | undefined>(undefined);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

export function SprintProvider({ children }: { children: ReactNode }) {
  const [developers, setDevelopers] = useState<Developer[]>(() => loadFromStorage("sprint_devs", []));
  const [userStories, setUserStories] = useState<UserStory[]>(() => loadFromStorage("sprint_hus", []));
  const [activities, setActivities] = useState<Activity[]>(() => loadFromStorage("sprint_activities", []));
  const [sprints, setSprints] = useState<Sprint[]>(() => loadFromStorage("sprint_sprints", []));
  const [epics, setEpics] = useState<Epic[]>(() => loadFromStorage("sprint_epics", []));
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(() => loadFromStorage("sprint_custom_fields", []));
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(() => loadFromStorage("sprint_automation_rules", []));
  const [workflowColumns, setWorkflowColumnsState] = useState<WorkflowColumn[]>(() => loadFromStorage("sprint_workflow_columns", DEFAULT_KANBAN_COLUMNS));

  useEffect(() => localStorage.setItem("sprint_devs", JSON.stringify(developers)), [developers]);
  useEffect(() => localStorage.setItem("sprint_hus", JSON.stringify(userStories)), [userStories]);
  useEffect(() => localStorage.setItem("sprint_activities", JSON.stringify(activities)), [activities]);
  useEffect(() => localStorage.setItem("sprint_sprints", JSON.stringify(sprints)), [sprints]);
  useEffect(() => localStorage.setItem("sprint_epics", JSON.stringify(epics)), [epics]);
  useEffect(() => localStorage.setItem("sprint_custom_fields", JSON.stringify(customFields)), [customFields]);
  useEffect(() => localStorage.setItem("sprint_automation_rules", JSON.stringify(automationRules)), [automationRules]);
  useEffect(() => localStorage.setItem("sprint_workflow_columns", JSON.stringify(workflowColumns)), [workflowColumns]);

  const activeSprint = sprints.find((s) => s.isActive) || null;

  // --- Automation engine ---
  const runAutomations = useCallback((huId: string, fromStatus: string, toStatus: string) => {
    const rules = automationRules.filter((r) => r.enabled && r.trigger.type === "status_change");
    rules.forEach((rule) => {
      const matchFrom = !rule.trigger.fromStatus || rule.trigger.fromStatus === fromStatus;
      const matchTo = rule.trigger.toStatus === toStatus;
      if (matchFrom && matchTo) {
        if (rule.action.type === "notify" && rule.action.message) {
          toast.info(`🤖 Automação "${rule.name}": ${rule.action.message}`);
        }
        if (rule.action.type === "change_status" && rule.action.targetStatus) {
          setUserStories((prev) =>
            prev.map((h) => (h.id === huId ? { ...h, status: rule.action.targetStatus! } : h))
          );
          toast.info(`🤖 Automação "${rule.name}": Status alterado automaticamente`);
        }
      }
    });
  }, [automationRules]);

  // Developers
  const addDeveloper = (dev: Omit<Developer, "id">) => {
    setDevelopers((prev) => [...prev, { ...dev, id: crypto.randomUUID() }]);
  };
  const updateDeveloper = (id: string, dev: Partial<Omit<Developer, "id">>) => {
    setDevelopers((prev) => prev.map((d) => (d.id === id ? { ...d, ...dev } : d)));
  };
  const removeDeveloper = (id: string) => {
    setDevelopers((prev) => prev.filter((d) => d.id !== id));
  };

  // User Stories
  const addUserStory = (hu: Omit<UserStory, "id" | "code" | "createdAt" | "status" | "impediments">) => {
    const count = userStories.length + 1;
    const firstCol = workflowColumns[0]?.key || "aguardando_desenvolvimento";
    setUserStories((prev) => [
      ...prev,
      { ...hu, id: crypto.randomUUID(), code: `HU-${String(count).padStart(3, "0")}`, status: firstCol, impediments: [], createdAt: new Date().toISOString() },
    ]);
  };
  const updateUserStory = (id: string, hu: Partial<Omit<UserStory, "id" | "code" | "createdAt">>) => {
    setUserStories((prev) => prev.map((h) => (h.id === id ? { ...h, ...hu } : h)));
  };
  const removeUserStory = (id: string) => {
    setUserStories((prev) => prev.filter((h) => h.id !== id));
    setActivities((prev) => prev.filter((a) => a.huId !== id));
  };
  const updateUserStoryStatus = (id: string, status: KanbanStatus) => {
    const hu = userStories.find((h) => h.id === id);
    if (hu) {
      const oldStatus = hu.status;
      setUserStories((prev) => prev.map((h) => (h.id === id ? { ...h, status } : h)));
      if (oldStatus !== status) {
        runAutomations(id, oldStatus, status);
      }
    }
  };

  // Activities
  const addActivity = (act: Omit<Activity, "id" | "endDate" | "createdAt">) => {
    const endDate = calculateEndDate(act.startDate, act.hours);
    setActivities((prev) => [
      ...prev,
      { ...act, id: crypto.randomUUID(), endDate, createdAt: new Date().toISOString() },
    ]);
  };
  const updateActivity = (id: string, act: Partial<Omit<Activity, "id" | "createdAt">>) => {
    setActivities((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      const updated = { ...a, ...act };
      if (act.startDate || act.hours) {
        updated.endDate = calculateEndDate(updated.startDate, updated.hours);
      }
      return updated;
    }));
  };
  const removeActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  // Impediments
  const addImpediment = (huId: string, data: AddImpedimentData) => {
    const impediment: Impediment = {
      id: crypto.randomUUID(),
      reason: data.reason,
      type: data.type,
      criticality: data.criticality,
      hasTicket: data.hasTicket,
      ticketUrl: data.ticketUrl,
      ticketId: data.ticketId,
      reportedAt: new Date().toISOString(),
    };
    setUserStories((prev) =>
      prev.map((h) =>
        h.id === huId ? { ...h, impediments: [...(h.impediments || []), impediment] } : h
      )
    );
  };
  const resolveImpediment = (huId: string, impedimentId: string, resolution?: string) => {
    setUserStories((prev) =>
      prev.map((h) =>
        h.id === huId
          ? { ...h, impediments: (h.impediments || []).map((imp) => imp.id === impedimentId ? { ...imp, resolvedAt: new Date().toISOString(), resolution } : imp) }
          : h
      )
    );
  };

  // Sprints
  const addSprint = (sprint: Omit<Sprint, "id" | "createdAt" | "isActive">) => {
    setSprints((prev) => [
      ...prev.map((s) => ({ ...s, isActive: false })),
      { ...sprint, id: crypto.randomUUID(), createdAt: new Date().toISOString(), isActive: true },
    ]);
  };
  const updateSprint = (id: string, sprint: Partial<Omit<Sprint, "id" | "createdAt">>) => {
    setSprints((prev) => prev.map((s) => (s.id === id ? { ...s, ...sprint } : s)));
  };
  const removeSprint = (id: string) => {
    setSprints((prev) => prev.filter((s) => s.id !== id));
    const storyIds = userStories.filter((hu) => hu.sprintId === id).map((hu) => hu.id);
    setUserStories((prev) => prev.filter((hu) => hu.sprintId !== id));
    setActivities((prev) => prev.filter((a) => !storyIds.includes(a.huId)));
  };
  const setActiveSprintFn = (id: string) => {
    setSprints((prev) => prev.map((s) => ({ ...s, isActive: s.id === id })));
  };

  // Epics
  const addEpic = (epic: Omit<Epic, "id" | "createdAt">) => {
    setEpics((prev) => [...prev, { ...epic, id: crypto.randomUUID(), createdAt: new Date().toISOString() }]);
  };
  const updateEpic = (id: string, epic: Partial<Omit<Epic, "id" | "createdAt">>) => {
    setEpics((prev) => prev.map((e) => (e.id === id ? { ...e, ...epic } : e)));
  };
  const removeEpic = (id: string) => {
    setEpics((prev) => prev.filter((e) => e.id !== id));
    setUserStories((prev) => prev.map((hu) => (hu.epicId === id ? { ...hu, epicId: undefined } : hu)));
  };

  // Custom Fields
  const addCustomField = (field: Omit<CustomFieldDefinition, "id">) => {
    setCustomFields((prev) => [...prev, { ...field, id: crypto.randomUUID() }]);
  };
  const updateCustomField = (id: string, field: Partial<Omit<CustomFieldDefinition, "id">>) => {
    setCustomFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...field } : f)));
  };
  const removeCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  // Automation Rules
  const addAutomationRule = (rule: Omit<AutomationRule, "id" | "createdAt">) => {
    setAutomationRules((prev) => [...prev, { ...rule, id: crypto.randomUUID(), createdAt: new Date().toISOString() }]);
  };
  const updateAutomationRule = (id: string, rule: Partial<Omit<AutomationRule, "id" | "createdAt">>) => {
    setAutomationRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...rule } : r)));
  };
  const removeAutomationRule = (id: string) => {
    setAutomationRules((prev) => prev.filter((r) => r.id !== id));
  };

  // Workflow Columns
  const setWorkflowColumns = (columns: WorkflowColumn[]) => setWorkflowColumnsState(columns);
  const addWorkflowColumn = (col: WorkflowColumn) => {
    setWorkflowColumnsState((prev) => [...prev, col]);
  };
  const removeWorkflowColumn = (key: string) => {
    setWorkflowColumnsState((prev) => prev.filter((c) => c.key !== key));
  };
  const updateWorkflowColumn = (key: string, col: Partial<WorkflowColumn>) => {
    setWorkflowColumnsState((prev) => prev.map((c) => (c.key === key ? { ...c, ...col } : c)));
  };
  const reorderWorkflowColumns = (columns: WorkflowColumn[]) => setWorkflowColumnsState(columns);

  return (
    <SprintContext.Provider
      value={{
        developers, userStories, activities, sprints, epics, customFields, automationRules, workflowColumns, activeSprint,
        addDeveloper, updateDeveloper, removeDeveloper,
        addUserStory, updateUserStory, removeUserStory, updateUserStoryStatus,
        addActivity, updateActivity, removeActivity,
        addImpediment, resolveImpediment,
        addSprint, updateSprint, removeSprint, setActiveSprint: setActiveSprintFn,
        addEpic, updateEpic, removeEpic,
        addCustomField, updateCustomField, removeCustomField,
        addAutomationRule, updateAutomationRule, removeAutomationRule,
        setWorkflowColumns, addWorkflowColumn, removeWorkflowColumn, updateWorkflowColumn, reorderWorkflowColumns,
      }}
    >
      {children}
    </SprintContext.Provider>
  );
}

export function useSprint() {
  const ctx = useContext(SprintContext);
  if (!ctx) throw new Error("useSprint must be used within SprintProvider");
  return ctx;
}
