import { useState } from "react";
import { SprintManager } from "@/components/SprintManager";
import { DeveloperManager } from "@/components/DeveloperManager";
import { UserStoryManager } from "@/components/UserStoryManager";
import { ActivityManager } from "@/components/ActivityManager";
import { KanbanBoard } from "@/components/KanbanBoard";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { ImpedimentList } from "@/components/ImpedimentManager";
import { useSprint } from "@/contexts/SprintContext";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Users, BookOpen, ListTodo, Columns3, BarChart3, Zap, ShieldAlert,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasActiveImpediment } from "@/types/sprint";

const NAV_ITEMS = [
  { key: "backlog", label: "Backlog", icon: LayoutDashboard },
  { key: "team", label: "Time", icon: Users },
  { key: "activities", label: "Atividades", icon: ListTodo },
  { key: "kanban", label: "Board", icon: Columns3 },
  { key: "impediments", label: "Impedimentos", icon: ShieldAlert },
  { key: "metrics", label: "Métricas", icon: BarChart3 },
] as const;

type NavKey = typeof NAV_ITEMS[number]["key"];

const Index = () => {
  const [active, setActive] = useState<NavKey>("backlog");
  const [collapsed, setCollapsed] = useState(false);
  const { activeSprint, userStories } = useSprint();

  const sprintStories = activeSprint ? userStories.filter((hu) => hu.sprintId === activeSprint.id) : [];
  const blockedCount = sprintStories.filter(hasActiveImpediment).length;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-all duration-200 ${collapsed ? "w-16" : "w-60"} shrink-0`}>
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary shrink-0">
            <Zap className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-sidebar-primary-foreground truncate">Sprint Manager</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">Gestão Ágil</p>
            </div>
          )}
        </div>

        {!collapsed && activeSprint && (
          <div className="px-3 py-3 border-b border-sidebar-border">
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold mb-1">Sprint Ativa</p>
            <p className="text-xs font-medium text-sidebar-primary-foreground truncate">{activeSprint.name}</p>
            <p className="text-[10px] text-sidebar-foreground/60">
              {new Date(activeSprint.startDate).toLocaleDateString("pt-BR")} — {new Date(activeSprint.endDate).toLocaleDateString("pt-BR")}
            </p>
          </div>
        )}

        <nav className="flex-1 py-2 px-2 space-y-0.5">
          {!collapsed && (
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold px-2 pt-2 pb-1">Planejamento</p>
          )}
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActive(item.key)}
                className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {!collapsed && item.key === "impediments" && blockedCount > 0 && (
                  <Badge className="bg-warning text-warning-foreground text-[10px] h-4 min-w-4 flex items-center justify-center px-1">
                    {blockedCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-2 py-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {active === "backlog" && (
            <div className="space-y-8">
              <SprintManager />
              <UserStoryManager />
            </div>
          )}
          {active === "team" && <DeveloperManager />}
          {active === "activities" && <ActivityManager />}
          {active === "kanban" && <KanbanBoard />}
          {active === "impediments" && <ImpedimentList />}
          {active === "metrics" && <MetricsDashboard />}
        </div>
      </main>
    </div>
  );
};

export default Index;
