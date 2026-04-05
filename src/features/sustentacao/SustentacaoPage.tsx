import { useState, useEffect } from "react";
import { TeamSelectionModal } from "@/shared/components/common/TeamSelectionModal";
import { useAuth } from "@/contexts/AuthContext";
import { SustentacaoBoard } from "./components/SustentacaoBoard";
import { DemandasList } from "./components/DemandasList";
import { ProjetosManager } from "./components/ProjetosManager";
import { ImportacaoView } from "./components/ImportacaoView";
import { SustentacaoDashboard } from "./components/SustentacaoDashboard";
import { SustentacaoRelatorios } from "./components/reports/SustentacaoRelatorios";
import { TeamManager } from "@/components/TeamManager";
import { TeamMembersManager } from "@/components/TeamMembersManager";
import { UserRolesManager } from "@/components/UserRolesManager";
import { DeveloperManager } from "@/components/DeveloperManager";
import { SustentacaoWorkflow } from "./components/SustentacaoWorkflow";
import { CustomFieldManager } from "@/components/CustomFieldManager";
import { AutomationManager } from "@/components/AutomationManager";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotificationBell } from "@/components/NotificationBell";
import { APP_NAME } from "@/lib/constants";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarHeader, SidebarFooter, SidebarSeparator, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Columns3, ListTodo, Upload, LogOut, UserCircle, Wrench,
  FolderKanban, FileBarChart, Hexagon, Building2, UsersRound, ShieldCheck,
  Users, GitBranch, SlidersHorizontal, Wand2,
} from "lucide-react";
import { getRoleLabel } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";

type SustNav = 'dashboard' | 'board' | 'demandas' | 'projetos' | 'importacao' | 'relatorios'
  | 'teams' | 'team-members' | 'user-roles' | 'equipe'
  | 'workflow' | 'custom-fields' | 'automations';

const NAV_SECTIONS = [
  { title: "Menu", items: [
    { key: 'dashboard' as SustNav, label: 'Dashboard', icon: LayoutDashboard },
    { key: 'board' as SustNav, label: 'Board Kanban', icon: Columns3 },
    { key: 'demandas' as SustNav, label: 'Demandas', icon: ListTodo },
    { key: 'projetos' as SustNav, label: 'Projetos', icon: FolderKanban },
    { key: 'importacao' as SustNav, label: 'Importação Excel', icon: Upload },
    { key: 'relatorios' as SustNav, label: 'Relatórios', icon: FileBarChart },
  ]},
  { title: "Organização", items: [
    { key: 'teams' as SustNav, label: 'Times', icon: Building2 },
    { key: 'team-members' as SustNav, label: 'Membros', icon: UsersRound },
    { key: 'user-roles' as SustNav, label: 'Perfis (RBAC)', icon: ShieldCheck },
    { key: 'equipe' as SustNav, label: 'Equipe', icon: Users },
  ]},
  { title: "Configurações", items: [
    { key: 'workflow' as SustNav, label: 'Fluxo de Trabalho', icon: GitBranch },
    { key: 'custom-fields' as SustNav, label: 'Campos Custom', icon: SlidersHorizontal },
    { key: 'automations' as SustNav, label: 'Automações', icon: Wand2 },
  ]},
];

function SustSidebar({ active, setActive }: { active: SustNav; setActive: (k: SustNav) => void }) {
  const { profile, signOut, teams, currentTeamId, setCurrentTeamId, roles } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const roleLabel = roles.length > 0 ? roles.map(getRoleLabel).join(', ') : 'Sem perfil';
  const navigate = useNavigate();
  const moduleAccess = profile?.module_access || 'sala_agil';
  const showModuleSwitch = moduleAccess === 'admin' || roles.some(r => r === 'admin');

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info shrink-0">
            <Wrench className="h-4 w-4 text-info-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">Sustentação</p>
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
              <SelectTrigger className="h-8 text-xs bg-sidebar-accent/50 border-sidebar-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{teams.filter(t => t.module === 'sustentacao').map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        <SidebarSeparator />

        {NAV_SECTIONS.map(section => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold">{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map(item => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton isActive={active === item.key} onClick={() => setActive(item.key)} tooltip={item.label} className="transition-all duration-150">
                      <item.icon className="h-4 w-4" /><span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
              <LogOut className="h-4 w-4" /><span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function SustentacaoPage() {
  const [active, setActive] = useState<SustNav>('dashboard');
  const { profile, currentTeamId } = useAuth();

  const allItems = NAV_SECTIONS.flatMap(s => s.items);
  const pageTitle = allItems.find(i => i.key === active)?.label || 'Sustentação';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <SustSidebar active={active} setActive={setActive} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b h-14 flex items-center justify-between px-4 md:px-6 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8" />
              <div className="h-5 w-px bg-border hidden md:block" />
              <div className="hidden md:flex items-center gap-2">
                <Badge className="bg-info/10 text-info border-info/20 text-[10px]">Sustentação</Badge>
                <h1 className="text-base font-semibold text-foreground">{pageTitle}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              {profile && (
                <div className="hidden md:flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-info/10 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-info">{profile.display_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium block">{profile.display_name}</span>
                  </div>
                </div>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div className={`mx-auto p-4 md:p-6 ${active === 'board' ? 'max-w-full' : 'max-w-7xl'}`}>
              {!currentTeamId && active !== 'teams' ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <p className="text-lg font-medium">Selecione um time para começar</p>
                </div>
              ) : (
                <>
                  {active === 'dashboard' && <SustentacaoDashboard />}
                  {active === 'board' && <SustentacaoBoard />}
                  {active === 'demandas' && <DemandasList />}
                  {active === 'projetos' && <ProjetosManager />}
                  {active === 'importacao' && <ImportacaoView />}
                  {active === 'teams' && <TeamManager moduleFilter="sustentacao" />}
                  {active === 'team-members' && <TeamMembersManager />}
                  {active === 'user-roles' && <UserRolesManager />}
                  {active === 'equipe' && <DeveloperManager />}
                  {active === 'workflow' && <SustentacaoWorkflow />}
                  {active === 'custom-fields' && <CustomFieldManager />}
                  {active === 'automations' && <AutomationManager />}
                  {active === 'relatorios' && <SustentacaoRelatorios />}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
