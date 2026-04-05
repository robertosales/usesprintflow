import { useState, useEffect } from "react";
import { TeamSelectionModal } from "@/shared/components/common/TeamSelectionModal";
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
import { TeamMembersManager } from "@/components/TeamMembersManager";
import { UserRolesManager } from "@/components/UserRolesManager";
import { DashboardHome } from "@/components/DashboardHome";
import { CalendarView } from "@/components/CalendarView";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { getRoleLabel } from "@/hooks/usePermissions";
import type { Permission } from "@/hooks/usePermissions";
import { APP_NAME } from "@/lib/constants";
import {
  LayoutDashboard, Users, ListTodo, Columns3, BarChart3, Zap, ShieldAlert,
  Layers, GitBranch, SlidersHorizontal, Wand2,
  LogOut, Building2, UserCircle, UsersRound, ShieldCheck, CalendarDays, Home, Hexagon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasActiveImpediment } from "@/types/sprint";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotificationBell } from "@/components/NotificationBell";
import { useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarHeader, SidebarFooter, SidebarSeparator, useSidebar,
} from "@/components/ui/sidebar";

type NavKey = "dashboard" | "teams" | "team-members" | "user-roles" | "backlog" | "epics" | "team" | "activities" | "kanban" | "impediments" | "metrics" | "workflow" | "custom-fields" | "automations" | "calendar";

const NAV_PERMISSIONS: Partial<Record<NavKey, Permission>> = {
  teams: 'manage_teams',
  "team-members": 'manage_teams',
  "user-roles": 'manage_roles',
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
  { title: "Geral", items: [{ key: "dashboard" as NavKey, label: "Dashboard", icon: Home }] },
  { title: "Planejamento", items: [
    { key: "backlog" as NavKey, label: "Backlog", icon: LayoutDashboard },
    { key: "epics" as NavKey, label: "Épicos", icon: Layers },
    { key: "team" as NavKey, label: "Equipe", icon: Users },
    { key: "activities" as NavKey, label: "Atividades", icon: ListTodo },
  ]},
  { title: "Execução", items: [
    { key: "kanban" as NavKey, label: "Board", icon: Columns3 },
    { key: "calendar" as NavKey, label: "Calendário", icon: CalendarDays },
    { key: "impediments" as NavKey, label: "Impedimentos", icon: ShieldAlert },
    { key: "metrics" as NavKey, label: "Métricas", icon: BarChart3 },
  ]},
  { title: "Organização", items: [
    { key: "teams" as NavKey, label: "Times", icon: Building2 },
    { key: "team-members" as NavKey, label: "Membros", icon: UsersRound },
    { key: "user-roles" as NavKey, label: "Perfis (RBAC)", icon: ShieldCheck },
  ]},
  { title: "Configurações", items: [
    { key: "workflow" as NavKey, label: "Fluxo de Trabalho", icon: GitBranch },
    { key: "custom-fields" as NavKey, label: "Campos Custom", icon: SlidersHorizontal },
    { key: "automations" as NavKey, label: "Automações", icon: Wand2 },
  ]},
];

function AppSidebar({ active, setActive }: { active: NavKey; setActive: (k: NavKey) => void }) {
  const { activeSprint, userStories } = useSprint();
  const { profile, signOut, teams, currentTeamId, setCurrentTeamId, roles, hasPermission } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const moduleAccess = profile?.module_access || 'sala_agil';
  const showModuleSwitch = moduleAccess === 'admin' || roles.some(r => r === 'admin');

  const sprintStories = activeSprint ? userStories.filter((hu) => hu.sprintId === activeSprint.id) : [];
  const blockedCount = sprintStories.filter(hasActiveImpediment).length;

  const canSeeNav = (key: NavKey): boolean => {
    const perm = NAV_PERMISSIONS[key];
    if (!perm) return true;
    return hasPermission(perm);
  };

  const roleLabel = roles.length > 0 ? roles.map(getRoleLabel).join(', ') : 'Sem perfil';

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success shrink-0">
            <Zap className="h-4 w-4 text-success-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">Sala Ágil</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">{APP_NAME}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {!collapsed && profile && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent shrink-0">
                <UserCircle className="h-4 w-4 text-sidebar-foreground/70" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium truncate">{profile.display_name}</p>
                <p className="text-[10px] text-sidebar-foreground/50">{roleLabel}</p>
              </div>
            </div>
          </div>
        )}

        {!collapsed && teams.length > 0 && (
          <div className="px-4 pb-3">
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold mb-1.5">Time Ativo</p>
            <Select value={currentTeamId || ""} onValueChange={setCurrentTeamId}>
              <SelectTrigger className="h-8 text-xs bg-sidebar-accent/50 border-sidebar-border">
                <SelectValue placeholder="Selecione um time" />
              </SelectTrigger>
              <SelectContent>
                {teams.filter(t => t.module === 'sala_agil').map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!collapsed && activeSprint && (
          <div className="px-4 pb-3">
            <div className="rounded-lg bg-sidebar-accent/50 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-success" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Sprint</span>
              </div>
              <p className="text-xs font-medium truncate">{activeSprint.name}</p>
              <p className="text-[10px] text-sidebar-foreground/50">
                {new Date(activeSprint.startDate).toLocaleDateString("pt-BR")} — {new Date(activeSprint.endDate).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        )}

        <SidebarSeparator />

        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => canSeeNav(item.key));
          if (visibleItems.length === 0) return null;
          return (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold">
                {section.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const isActive = active === item.key;
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton isActive={isActive} onClick={() => setActive(item.key)} tooltip={item.label} className="transition-all duration-150">
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1">{item.label}</span>
                          {item.key === "impediments" && blockedCount > 0 && !collapsed && (
                            <Badge className="bg-warning text-warning-foreground text-[10px] h-5 min-w-5 flex items-center justify-center px-1 ml-auto">
                              {blockedCount}
                            </Badge>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {showModuleSwitch && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => navigate('/modulos')} tooltip="Trocar Módulo" className="text-sidebar-foreground/50 hover:text-sidebar-foreground">
                <Hexagon className="h-4 w-4" /><span>Trocar Módulo</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sair" className="text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

const Index = () => {
  const [active, setActive] = useState<NavKey>("dashboard");
  const { activeSprint, userStories, loading } = useSprint();
  const { profile, currentTeamId, setCurrentTeamId, teams, hasPermission } = useAuth();
  const [showTeamModal, setShowTeamModal] = useState(false);

  const moduleTeams = teams.filter(t => t.module === 'sala_agil');

  // Auto-select team for this module on mount
  useEffect(() => {
    if (loading || moduleTeams.length === 0) return;
    const currentIsValid = currentTeamId && moduleTeams.some(t => t.id === currentTeamId);
    if (currentIsValid) return;
    if (moduleTeams.length === 1) {
      setCurrentTeamId(moduleTeams[0].id);
    } else {
      setShowTeamModal(true);
    }
  }, [loading, teams]);

  const needsTeam = !currentTeamId && active !== "teams";
  const pageTitle = NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.key === active)?.label || APP_NAME;

  return (
    <SidebarProvider>
      <TeamSelectionModal
        open={showTeamModal}
        teams={moduleTeams}
        moduleLabel="Sala Ágil"
        onSelect={(id) => { setCurrentTeamId(id); setShowTeamModal(false); }}
      />
      <div className="min-h-screen flex w-full">
        <AppSidebar active={active} setActive={setActive} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b h-14 flex items-center justify-between px-4 md:px-6 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8" />
              <div className="h-5 w-px bg-border hidden md:block" />
              <h1 className="text-base font-semibold text-foreground hidden md:block">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              {profile && (
                <div className="hidden md:flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-success/10 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-success">
                      {profile.display_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{profile.display_name}</span>
                </div>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto p-4 md:p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 md:hidden">{pageTitle}</h2>
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-success" />
                </div>
              )}
              {!loading && needsTeam && (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Building2 className="h-14 w-14 text-muted-foreground/30" />
                  <p className="text-lg text-muted-foreground font-medium">Selecione ou crie um time para começar</p>
                  {hasPermission('manage_teams') && (
                    <Button onClick={() => setActive("teams")} size="lg">
                      <Building2 className="h-4 w-4 mr-2" />Ir para Times
                    </Button>
                  )}
                </div>
              )}
              {!loading && !needsTeam && (
                <>
                  {active === "dashboard" && <DashboardHome />}
                  {active === "teams" && <TeamManager moduleFilter="sala_agil" />}
                  {active === "team-members" && <TeamMembersManager />}
                  {active === "user-roles" && <UserRolesManager />}
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
                  {active === "calendar" && <CalendarView />}
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
      </div>
    </SidebarProvider>
  );
};

export default Index;
