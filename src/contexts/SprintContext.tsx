import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Developer, UserStory, Activity, Sprint, KanbanStatus, calculateEndDate, Impediment, ImpedimentType, ImpedimentCriticality, ActivityType } from "@/types/sprint";

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

  useEffect(() => localStorage.setItem("sprint_devs", JSON.stringify(developers)), [developers]);
  useEffect(() => localStorage.setItem("sprint_hus", JSON.stringify(userStories)), [userStories]);
  useEffect(() => localStorage.setItem("sprint_activities", JSON.stringify(activities)), [activities]);
  useEffect(() => localStorage.setItem("sprint_sprints", JSON.stringify(sprints)), [sprints]);

  const activeSprint = sprints.find((s) => s.isActive) || null;

  const addDeveloper = (dev: Omit<Developer, "id">) => {
    setDevelopers((prev) => [...prev, { ...dev, id: crypto.randomUUID() }]);
  };
  const updateDeveloper = (id: string, dev: Partial<Omit<Developer, "id">>) => {
    setDevelopers((prev) => prev.map((d) => (d.id === id ? { ...d, ...dev } : d)));
  };
  const removeDeveloper = (id: string) => {
    setDevelopers((prev) => prev.filter((d) => d.id !== id));
  };

  const addUserStory = (hu: Omit<UserStory, "id" | "code" | "createdAt" | "status" | "impediments">) => {
    const count = userStories.length + 1;
    setUserStories((prev) => [
      ...prev,
      { ...hu, id: crypto.randomUUID(), code: `HU-${String(count).padStart(3, "0")}`, status: "aguardando_desenvolvimento", impediments: [], createdAt: new Date().toISOString() },
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
    setUserStories((prev) => prev.map((h) => (h.id === id ? { ...h, status } : h)));
  };

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
        h.id === huId
          ? { ...h, impediments: [...(h.impediments || []), impediment] }
          : h
      )
    );
  };

  const resolveImpediment = (huId: string, impedimentId: string, resolution?: string) => {
    setUserStories((prev) =>
      prev.map((h) =>
        h.id === huId
          ? {
              ...h,
              impediments: (h.impediments || []).map((imp) =>
                imp.id === impedimentId
                  ? { ...imp, resolvedAt: new Date().toISOString(), resolution }
                  : imp
              ),
            }
          : h
      )
    );
  };

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

  return (
    <SprintContext.Provider
      value={{
        developers, userStories, activities, sprints, activeSprint,
        addDeveloper, updateDeveloper, removeDeveloper,
        addUserStory, updateUserStory, removeUserStory, updateUserStoryStatus,
        addActivity, updateActivity, removeActivity,
        addImpediment, resolveImpediment,
        addSprint, updateSprint, removeSprint, setActiveSprint: setActiveSprintFn,
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
