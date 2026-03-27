import { useState } from "react";
import { SprintManager } from "@/components/SprintManager";
import { DeveloperManager } from "@/components/DeveloperManager";
import { UserStoryManager } from "@/components/UserStoryManager";
import { ActivityManager } from "@/components/ActivityManager";
import { KanbanBoard } from "@/components/KanbanBoard";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { ImpedimentList } from "@/components/ImpedimentManager";
import { EpicManager } from "@/components/EpicManager";
import { WorkflowManager } from "@/components/WorkflowManager";
import { CustomFieldManager } from "@/components/CustomFieldManager";
import { AutomationManager } from "@/components/AutomationManager";
import { TeamManager } from "@/components/TeamManager";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { getRoleLabel } from "@/hooks/usePermissions";
import type { Permission } from "@/hooks/usePermissions";
import {
  LayoutDashboard, Users, ListTodo, Columns3, BarChart3, Zap, ShieldAlert,
  ChevronLeft, ChevronRight, Layers, GitBranch, SlidersHorizontal, Wand2,
  LogOut, Building2, UserCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasActiveImpediment } from "@/types/sprint";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type NavKey = "teams" | "backlog" | "epics" | "team" | "activities" | "kanban" | "impediments" | "metrics" | "workflow" | "custom-fields" | "automations";

// Map nav keys to required permissions (undefined = always visible)
const NAV_PERMISSIONS: Partial<Record<NavKey, Permission>> = {
  teams: 'manage_teams',
  backlog: 'view_backlog',
  epics: 'create_epic',
  team: 'manage_developers',
  activities: 'view_backlog',
  kanban: 'view_kanban',
  impediments: 'report_impediments',
  metrics: 'view_dashboard',
  workflow: 'manage_workflow',
  "custom-fields": 'manage_custom_fields',
  automations: 'manage_automations',
};

const NAV_SECTIONS = [
  {
    title: "Organização",
    items: [
      { key: "teams" as NavKey, label: "Times", icon: Building2 },
    ],
  },
  {
    title: "Planejamento",
    items: [
      { key: "backlog" as NavKey, label: "Backlog", icon: LayoutDashboard },
      { key: "epics" as NavKey, label: "Épicos", icon: Layers },
      { key: "team" as NavKey, label: "Equipe", icon: Users },
      { key: "activities" as NavKey, label: "Atividades", icon: ListTodo },
    ],
  },
  {
    title: "Execução",
    items: [
      { key: "kanban" as NavKey, label: "Board", icon: Columns3 },
      { key: "impediments" as NavKey, label: "Impedimentos", icon: ShieldAlert },
      { key: "metrics" as NavKey, label: "Métricas", icon: BarChart3 },
    ],
  },
  {
    title: "Configurações",
    items: [
      { key: "workflow" as NavKey, label: "Fluxo de Trabalho", icon: GitBranch },
      { key: "custom-fields" as NavKey, label: "Campos Custom", icon: SlidersHorizontal },
      { key: "automations" as NavKey, label: "Automações", icon: Wand2 },
    ],
  },
];

const Index = () => {
  const [active, setActive] = useState<NavKey>("backlog");
  const [collapsed, setCollapsed] = useState(false);
  const { activeSprint, userStories, loading } = useSprint();
  const { profile, signOut, isAdmin, teams, currentTeamId, setCurrentTeamId, roles, hasPermission } = useAuth();

  const sprintStories = activeSprint ? userStories.filter((hu) => hu.sprintId === activeSprint.id) : [];
  const blockedCount = sprintStories.filter(hasActiveImpediment).length;

  const needsTeam = !currentTeamId && active !== "teams";

  // Filter nav items by permission
  const canSeeNav = (key: NavKey): boolean => {
    const perm = NAV_PERMISSIONS[key];
    if (!perm) return true;
    return hasPermission(perm);
  };

  const roleLabel = roles.length > 0 ? roles.map(getRoleLabel).join(', ') : 'Sem perfil';

  return (
    <div className="min-h-screen bg-background flex">
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

        {/* User info */}
        {!collapsed && profile && (
          <div className="px-3 py-3 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-sidebar-foreground/60 shrink-0" />
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-sidebar-primary-foreground truncate">{profile.display_name}</p>
                <p className="text-[10px] text-sidebar-foreground/60">{roleLabel}</p>
              </div>
            </div>
          </div>
        )}

        {/* Team selector */}
        {!collapsed && teams.length > 0 && (
          <div className="px-3 py-3 border-b border-sidebar-border">
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold mb-1">Time</p>
            <Select value={currentTeamId || ""} onValueChange={setCurrentTeamId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione um time" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!collapsed && activeSprint && (
          <div className="px-3 py-3 border-b border-sidebar-border">
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold mb-1">Sprint Ativa</p>
            <p className="text-xs font-medium text-sidebar-primary-foreground truncate">{activeSprint.name}</p>
            <p className="text-[10px] text-sidebar-foreground/60">
              {new Date(activeSprint.startDate).toLocaleDateString("pt-BR")} — {new Date(activeSprint.endDate).toLocaleDateString("pt-BR")}
            </p>
          </div>
        )}

        <nav className="flex-1 py-2 px-2 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV_SECTIONS.map((section, sIdx) => {
            const visibleItems = section.items.filter((item) => canSeeNav(item.key));
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.title}>
                {!collapsed && (
                  <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold px-2 pt-3 pb-1">{section.title}</p>
                )}
                {collapsed && sIdx > 0 && <Separator className="my-1 bg-sidebar-border" />}
                {visibleItems.map((item) => {
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
              </div>
            );
          })}
        </nav>

        <div className="px-2 py-2 border-t border-sidebar-border space-y-1">
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 justify-start"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          )}
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
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
          {!loading && needsTeam && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Building2 className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">Selecione ou crie um time para começar</p>
              {hasPermission('manage_teams') && (
                <Button onClick={() => setActive("teams")}>Ir para Times</Button>
              )}
            </div>
          )}
          {!loading && !needsTeam && (
            <>
              {active === "teams" && <TeamManager />}
              {active === "backlog" && (
                <div className="space-y-8">
                  <SprintManager />
                  <UserStoryManager />
                </div>
              )}
              {active === "epics" && <EpicManager />}
              {active === "team" && <DeveloperManager />}
              {active === "activities" && <ActivityManager />}
              {active === "kanban" && <KanbanBoard />}
              {active === "impediments" && <ImpedimentList />}
              {active === "metrics" && <MetricsDashboard />}
              {active === "workflow" && <WorkflowManager />}
              {active === "custom-fields" && <CustomFieldManager />}
              {active === "automations" && <AutomationManager />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
