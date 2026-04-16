import { useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSprint } from "@/contexts/SprintContext";
import { getRoleLabel } from "@/hooks/usePermissions";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Kanban, ListTodo, Layers, GitBranch, Calendar, Users,
  Activity, AlertTriangle, Repeat, BarChart3, History, User, ShieldCheck,
  Settings, Upload, FileText, Zap, Wrench, LogOut, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Nav definitions ──

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const SALA_AGIL_NAV: NavGroup[] = [
  {
    id: "main",
    label: "Principal",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/sala-agil" },
      { key: "board", label: "Board Kanban", icon: Kanban, path: "/sala-agil/board" },
      { key: "backlog", label: "Backlog", icon: ListTodo, path: "/sala-agil/backlog" },
      { key: "epicos", label: "Épicos", icon: Layers, path: "/sala-agil/epicos" },
      { key: "planning", label: "Planning", icon: GitBranch, path: "/sala-agil/planning" },
      { key: "calendario", label: "Calendário", icon: Calendar, path: "/sala-agil/calendario" },
      { key: "equipe", label: "Equipe", icon: Users, path: "/sala-agil/equipe" },
      { key: "atividades", label: "Atividades", icon: Activity, path: "/sala-agil/atividades" },
      { key: "impedimentos", label: "Impedimentos", icon: AlertTriangle, path: "/sala-agil/impedimentos" },
      { key: "retro", label: "Retrospectiva", icon: Repeat, path: "/sala-agil/retro" },
    ],
  },
  {
    id: "org",
    label: "Relatórios",
    items: [
      { key: "metricas", label: "Métricas", icon: BarChart3, path: "/sala-agil/metricas" },
      { key: "historico", label: "Histórico", icon: History, path: "/sala-agil/historico" },
    ],
  },
  {
    id: "config",
    label: "Configurações",
    items: [
      { key: "times", label: "Times", icon: Users, path: "/sala-agil/times" },
      { key: "membros", label: "Membros", icon: User, path: "/sala-agil/membros" },
      { key: "perfis", label: "Perfis RBAC", icon: ShieldCheck, path: "/sala-agil/perfis" },
      { key: "fluxo", label: "Fluxo de Trabalho", icon: GitBranch, path: "/sala-agil/fluxo" },
      { key: "campos", label: "Campos Custom", icon: Settings, path: "/sala-agil/campos" },
      { key: "automacoes", label: "Automações", icon: Repeat, path: "/sala-agil/automacoes" },
    ],
  },
];

const SUSTENTACAO_NAV: NavGroup[] = [
  {
    id: "main",
    label: "Principal",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/sustentacao" },
      { key: "board", label: "Board Kanban", icon: Kanban, path: "/sustentacao/board" },
      { key: "demandas", label: "Demandas", icon: ListTodo, path: "/sustentacao/demandas" },
      { key: "projetos", label: "Projetos", icon: Layers, path: "/sustentacao/projetos" },
      { key: "importacao", label: "Importação Excel", icon: Upload, path: "/sustentacao/importacao" },
    ],
  },
  {
    id: "org",
    label: "Relatórios",
    items: [
      { key: "relatorios", label: "Relatórios", icon: FileText, path: "/sustentacao/relatorios" },
    ],
  },
  {
    id: "config",
    label: "Configurações",
    items: [
      { key: "times", label: "Times", icon: Users, path: "/sustentacao/times" },
      { key: "membros", label: "Membros", icon: User, path: "/sustentacao/membros" },
      { key: "perfis", label: "Perfis RBAC", icon: ShieldCheck, path: "/sustentacao/perfis" },
      { key: "equipe", label: "Equipe", icon: Users, path: "/sustentacao/equipe" },
      { key: "workflow", label: "Fluxo de Trabalho", icon: GitBranch, path: "/sustentacao/workflow" },
      { key: "campos", label: "Campos Custom", icon: Settings, path: "/sustentacao/campos" },
      { key: "automacoes", label: "Automações", icon: Repeat, path: "/sustentacao/automacoes" },
    ],
  },
];

// ── Sidebar ──

function AppSidebar({
  module,
  activeKey,
  onNavigate,
}: {
  module: "sala_agil" | "sustentacao";
  activeKey: string;
  onNavigate: (item: NavItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { profile, isAdmin, roles } = useAuth();
  const navigate = useNavigate();

  const canSwitch = isAdmin || profile?.module_access === "admin";
  const groups = module === "sala_agil" ? SALA_AGIL_NAV : SUSTENTACAO_NAV;

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        "hidden md:flex flex-col shrink-0 bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 overflow-hidden",
        expanded ? "w-[220px]" : "w-14"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 h-12 shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
          <span className="text-xs font-bold">N</span>
        </div>
        {expanded && <span className="text-sm font-bold truncate">NexOps</span>}
      </div>

      {/* Module indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 shrink-0">
        {module === "sala_agil" ? (
          <Zap className="h-4 w-4 text-sidebar-primary shrink-0" />
        ) : (
          <Wrench className="h-4 w-4 text-amber-400 shrink-0" />
        )}
        {expanded && (
          <span className="text-xs font-medium truncate">
            {module === "sala_agil" ? "Sala Ágil" : "Sustentação"}
          </span>
        )}
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1">
        {groups.map((group, gi) => (
          <div key={group.id}>
            {gi > 0 && <Separator className="my-1 bg-sidebar-border" />}
            {expanded && (
              <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = activeKey === item.key;
              const btn = (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item)}
                  className={cn(
                    "flex items-center gap-2 w-full text-left text-sm transition-colors duration-150",
                    expanded ? "px-3 py-1.5" : "justify-center py-2",
                    isActive
                      ? "bg-sidebar-accent border-l-2 border-sidebar-primary text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 border-l-2 border-transparent"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {expanded && <span className="truncate">{item.label}</span>}
                </button>
              );

              if (!expanded) {
                return (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }
              return btn;
            })}
          </div>
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Footer */}
      <div className="shrink-0 py-1">
        {canSwitch && (
          <>
            {expanded ? (
              <button
                onClick={() => navigate("/modulos")}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              >
                <Layers className="h-4 w-4 shrink-0" />
                <span className="truncate">Trocar Módulo</span>
              </button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate("/modulos")}
                    className="flex justify-center w-full py-2 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
                  >
                    <Layers className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Trocar Módulo
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

// ── Topbar ──

function Topbar({ module }: { module: "sala_agil" | "sustentacao" }) {
  const { profile, isAdmin, roles, signOut } = useAuth();
  const { activeSprint } = useSprint();
  const navigate = useNavigate();

  const canSwitch = isAdmin || profile?.module_access === "admin";
  const initials = profile?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "";
  const roleLabel =
    roles.length > 0 ? roles.map(getRoleLabel).join(", ") : "Sem perfil";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-12 px-3 bg-sidebar-background border-b border-sidebar-border shrink-0">
      {/* Left — logo */}
      <button
        onClick={() => navigate("/")}
        className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shrink-0"
      >
        <span className="text-xs font-bold">N</span>
      </button>

      {/* Center — module switcher or label */}
      <div className="hidden sm:flex items-center">
        {canSwitch ? (
          <div className="flex items-center bg-sidebar-accent rounded-full p-0.5">
            <button
              onClick={() => module !== "sala_agil" && navigate("/sala-agil")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                module === "sala_agil"
                  ? "bg-sidebar-primary text-white"
                  : "text-sidebar-foreground hover:text-sidebar-foreground/80"
              )}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Sala Ágil</span>
            </button>
            <button
              onClick={() => module !== "sustentacao" && navigate("/sustentacao")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                module === "sustentacao"
                  ? "bg-amber-500 text-white"
                  : "text-sidebar-foreground hover:text-sidebar-foreground/80"
              )}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Sustentação</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-medium text-sidebar-foreground">
            {module === "sala_agil" ? (
              <>
                <Zap className="h-3.5 w-3.5 text-sidebar-primary" />
                <span>Sala Ágil</span>
              </>
            ) : (
              <>
                <Wrench className="h-3.5 w-3.5 text-amber-400" />
                <span>Sustentação</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Sprint badge */}
        {module === "sala_agil" && activeSprint && (
          <Badge
            variant="outline"
            className="hidden sm:flex items-center gap-1 border-sidebar-border bg-sidebar-accent text-sidebar-foreground text-[10px]"
          >
            <GitBranch className="h-3 w-3" />
            {activeSprint.name}
          </Badge>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* Avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full p-0">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] font-bold bg-sidebar-accent text-sidebar-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{profile?.display_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{roleLabel}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {canSwitch && (
              <>
                <DropdownMenuItem onClick={() => navigate("/modulos")}>
                  <Layers className="h-4 w-4 mr-2" />
                  Trocar Módulo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// ── AppShell ──

export interface AppShellProps {
  module: "sala_agil" | "sustentacao";
  activeKey: string;
  onNavigate: (key: string) => void;
  children: ReactNode;
}

export function AppShell({ module, activeKey, onNavigate, children }: AppShellProps) {
  const groups = module === "sala_agil" ? SALA_AGIL_NAV : SUSTENTACAO_NAV;

  const handleNavigate = (item: NavItem) => {
    onNavigate(item.key);
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <Topbar module={module} />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar
          module={module}
          activeKey={activeKey}
          onNavigate={handleNavigate}
        />
        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
