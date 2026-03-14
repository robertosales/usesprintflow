import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Developer, UserStory, Activity, Sprint, KanbanStatus, calculateEndDate, Impediment } from "@/types/sprint";

interface SprintContextType {
  developers: Developer[];
  userStories: UserStory[];
  activities: Activity[];
  sprints: Sprint[];
  activeSprint: Sprint | null;
  addDeveloper: (dev: Omit<Developer, "id">) => void;
  removeDeveloper: (id: string) => void;
  addUserStory: (hu: Omit<UserStory, "id" | "code" | "createdAt">) => void;
  removeUserStory: (id: string) => void;
  addActivity: (act: Omit<Activity, "id" | "endDate" | "createdAt" | "status" | "impediments">) => void;
  removeActivity: (id: string) => void;
  updateActivityStatus: (id: string, status: KanbanStatus) => void;
  addImpediment: (activityId: string, reason: string) => void;
  resolveImpediment: (activityId: string, impedimentId: string) => void;
  addSprint: (sprint: Omit<Sprint, "id" | "createdAt" | "isActive">) => void;
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

  const removeDeveloper = (id: string) => {
    setDevelopers((prev) => prev.filter((d) => d.id !== id));
  };

  const addUserStory = (hu: Omit<UserStory, "id" | "code" | "createdAt">) => {
    const count = userStories.length + 1;
    setUserStories((prev) => [
      ...prev,
      { ...hu, id: crypto.randomUUID(), code: `HU-${String(count).padStart(3, "0")}`, createdAt: new Date().toISOString() },
    ]);
  };

  const removeUserStory = (id: string) => {
    setUserStories((prev) => prev.filter((h) => h.id !== id));
    setActivities((prev) => prev.filter((a) => a.huId !== id));
  };

  const addActivity = (act: Omit<Activity, "id" | "endDate" | "createdAt" | "status" | "impediments">) => {
    const endDate = calculateEndDate(act.startDate, act.hours);
    setActivities((prev) => [
      ...prev,
      { ...act, id: crypto.randomUUID(), endDate, status: "aguardando_desenvolvimento", impediments: [], createdAt: new Date().toISOString() },
    ]);
  };

  const removeActivity = (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const updateActivityStatus = (id: string, status: KanbanStatus) => {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const addImpediment = (activityId: string, reason: string) => {
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activityId
          ? { ...a, impediments: [...(a.impediments || []), { id: crypto.randomUUID(), reason, reportedAt: new Date().toISOString() }] }
          : a
      )
    );
  };

  const resolveImpediment = (activityId: string, impedimentId: string) => {
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activityId
          ? { ...a, impediments: (a.impediments || []).map((imp) => imp.id === impedimentId ? { ...imp, resolvedAt: new Date().toISOString() } : imp) }
          : a
      )
    );
  };

  const addSprint = (sprint: Omit<Sprint, "id" | "createdAt" | "isActive">) => {
    setSprints((prev) => [
      ...prev.map((s) => ({ ...s, isActive: false })),
      { ...sprint, id: crypto.randomUUID(), createdAt: new Date().toISOString(), isActive: true },
    ]);
  };

  const setActiveSprintFn = (id: string) => {
    setSprints((prev) => prev.map((s) => ({ ...s, isActive: s.id === id })));
  };

  return (
    <SprintContext.Provider
      value={{
        developers, userStories, activities, sprints, activeSprint,
        addDeveloper, removeDeveloper, addUserStory, removeUserStory,
        addActivity, removeActivity, updateActivityStatus,
        addImpediment, resolveImpediment,
        addSprint, setActiveSprint: setActiveSprintFn,
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
