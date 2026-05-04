import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSprint } from "@/contexts/SprintContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  ListTodo,
  Layers,
  Kanban,
  Calendar,
  BarChart3,
  History,
  Users,
  Settings,
  LogOut,
  User,
  GitBranch,
  AlertTriangle,
  FileText,
  Upload,
  Repeat,
  Activity,
  ShieldCheck,
  ChevronRight,
  Building2,
  ChevronsUpDown,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Flame,
  Zap,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";

type ActiveModule = "sala_agil" | "sustentacao";

interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  path: string;
  group: "main" | "org" | "config";
  roles?: string[];
}

interface AppShellProps {
  module: ActiveModule;
  children: React.ReactNode;
  activeKey?: string;
  onNavigate?: (key: string) => void;
}

// ── Logo SVG SprintFlow ────────────────────────────────────────────────────────
function SprintFlowLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", collapsed && "justify-center")}>
      <svg aria-label="SprintFlow" width="28" height="28" viewBox="0 0 28 28" fill="none" className="shrink-0">
        <polygon points="14,2 25,8 25,20 14,26 3,20 3,8" fill="hsl(var(--sidebar-primary))" opacity="0.18" />
        <polygon
          points="14,2 25,8 25,20 14,26 3,20 3,8"
          stroke="hsl(var(--sidebar-primary))"
          strokeWidth="1.5"
          fill="none"
        />
        <path d="M15.5 7L10 15h5l-2.5 6L19 13h-5z" fill="hsl(var(--sidebar-primary))" />
      </svg>
      {!collapsed && (
        <span className="text-[13px] font-semibold tracking-tight text-white/90 leading-none">
          Sprint<span className="text-[hsl(var(--sidebar-primary))]">Flow</span>
        </span>
      )}
    </div>
  );
}

function PlayingCardIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="2" width="11" height="15" rx="1.5" />
      <path
        d="M7 5.5c0-.8.6-1.5 1.4-1.5.4 0 .8.2 1.1.6.3-.4.7-.6 1.1-.6.8 0 1.4.7 1.4 1.5 0 1.2-1.5 2.3-2.5 3C9.5 7.8 7 6.7 7 5.5z"
        fill="currentColor"
        stroke="none"
      />
      <rect x="9" y="7" width="11" height="15" rx="1.5" />
    </svg>
  );
}

const GROUP_LABELS = { main: "PRINCIPAL", org: "RELATÓRIOS", config: "CONFIGURAÇÕES" };

const NAV_SALA_AGIL: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/sala-agil", group: "main" },
  { key: "board", label: "Board Kanban", icon: Kanban, path: "/sala-agil/board", group: "main" },
  { key: "backlog", label: "Backlog", icon: ListTodo, path: "/sala-agil/backlog", group: "main" },
  { key: "epicos", label: "Épicos", icon: Layers, path: "/sala-agil/epicos", group: "main" },
  { key: "planning", label: "Planning Poker", icon: PlayingCardIcon, path: "/sala-agil/planning", group: "main" },
  { key: "calendario", label: "Calendário", icon: Calendar, path: "/sala-agil/calendario", group: "main" },
  { key: "equipe", label: "Equipe", icon: Users, path: "/sala-agil/equipe", group: "main" },
  { key: "atividades", label: "Atividades", icon: Activity, path: "/sala-agil/atividades", group: "main" },
  { key: "impedimentos", label: "Impedimentos", icon: AlertTriangle, path: "/sala-agil/impedimentos", group: "main" },
  { key: "retro", label: "Retrospectiva", icon: Repeat, path: "/sala-agil/retro", group: "main" },
  {
    key: "gerador-apf",
    label: "Rel. de Evidências",
    icon: FileText,
    path: "/sala-agil/gerador-apf",
    group: "main",
    roles: ["scrum_master", "analyst"],
  },
  { key: "metricas", label: "Métricas", icon: BarChart3, path: "/sala-agil/metricas", group: "org" },
  { key: "historico", label: "Histórico", icon: History, path: "/sala-agil/historico", group: "org" },
  { key: "times", label: "Times", icon: Users, path: "/sala-agil/times", group: "config" },
  { key: "membros", label: "Membros", icon: User, path: "/sala-agil/membros", group: "config" },
  { key: "perfis", label: "Perfis (RBAC)", icon: ShieldCheck, path: "/sala-agil/perfis", group: "config" },
  { key: "fluxo", label: "Fluxo", icon: GitBranch, path: "/sala-agil/fluxo", group: "config" },
  { key: "campos", label: "Campos Custom", icon: Settings, path: "/sala-agil/campos", group: "config" },
  { key: "automacoes", label: "Automações", icon: Repeat, path: "/sala-agil/automacoes", group: "config" },
];

const NAV_SUSTENTACAO: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/sustentacao", group: "main" },
  { key: "board", label: "Board Kanban", icon: Kanban, path: "/sustentacao/board", group: "main" },
  { key: "demandas", label: "Demandas", icon: ListTodo, path: "/sustentacao/demandas", group: "main" },
  { key: "projetos", label: "Projetos", icon: Layers, path: "/sustentacao/projetos", group: "main" },
  { key: "importacao", label: "Importação Excel", icon: Upload, path: "/sustentacao/importacao", group: "main" },
  { key: "equipe", label: "Equipe", icon: Users, path: "/sustentacao/equipe", group: "main" },
  { key: "fluxo", label: "Fluxo de Trabalho", icon: GitBranch, path: "/sustentacao/fluxo", group: "main" },
  { key: "relatorios", label: "Relatórios", icon: FileText, path: "/sustentacao/relatorios", group: "org" },
  { key: "times", label: "Times", icon: Users, path: "/sustentacao/times", group: "config" },
  { key: "membros", label: "Membros", icon: User, path: "/sustentacao/membros", group: "config" },
  { key: "perfis", label: "Perfis (RBAC)", icon: ShieldCheck, path: "/sustentacao/perfis", group: "config" },
  { key: "campos", label: "Campos Custom", icon: Settings, path: "/sustentacao/campos", group: "config" },
  { key: "automacoes", label: "Automações", icon: Repeat, path: "/sustentacao/automacoes", group: "config" },
];

function getAccent(module: ActiveModule) {
  return module === "sala_agil"
    ? {
        text: "text-[hsl(var(--sidebar-primary))]",
        bg: "bg-[hsl(var(--sidebar-primary)/0.12)]",
        border: "border-[hsl(var(--sidebar-primary)/0.25)]",
        dot: "bg-[hsl(var(--sidebar-primary))]",
        avatar: "bg-[hsl(var(--sidebar-primary))]",
      }
    : {
        text: "text-amber-400",
        bg: "bg-amber-400/10",
        border: "border-amber-400/25",
        dot: "bg-amber-400",
        avatar: "bg-amber-500",
      };
}

function TeamSwitcher({ module, collapsed }: { module: ActiveModule; collapsed: boolean }) {
  const { teams, currentTeamId, setCurrentTeamId } = useAuth();
  const moduleTeams = teams.filter((t) => t.module === module);
  const activeTeam = moduleTeams.find((t) => t.id === currentTeamId);
  if (moduleTeams.length <= 1) return null;

  if (collapsed)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="w-full flex items-center justify-center p-2 rounded-md hover:bg-white/[0.05] transition-colors">
            <Building2 className="h-4 w-4 text-white/40" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {activeTeam?.name ?? "Time"}
        </TooltipContent>
      </Tooltip>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-white/[0.06] transition-colors group">
          <div className="h-7 w-7 rounded-md bg-white/[0.07] flex items-center justify-center shrink-0">
            <Building2 className="h-3.5 w-3.5 text-white/50" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[10px] text-white/30 leading-none mb-0.5">Time ativo</p>
            <p className="text-[12px] font-medium text-white truncate leading-none">
              {activeTeam?.name ?? "Selecionar time"}
            </p>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-white/30 group-hover:text-white/60 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="right" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Trocar time</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {moduleTeams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => setCurrentTeamId(team.id)}
            className="text-xs gap-2 justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              {team.name}
            </span>
            {team.id === currentTeamId && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavItemButton({
  item,
  module,
  isActive,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  module: ActiveModule;
  isActive: boolean;
  collapsed: boolean;
  onNavigate?: (key: string) => void;
}) {
  const navigate = useNavigate();
  const accent = getAccent(module);
  const Icon = item.icon;
  const handleClick = () => (onNavigate ? onNavigate(item.key) : navigate(item.path));

  const btn = (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-2.5 rounded-md text-[12.5px] font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30",
        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
        isActive
          ? cn("text-white", accent.bg, "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]")
          : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className={cn("shrink-0 h-[15px] w-[15px]", isActive ? accent.text : "text-white/40")} />
      {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
      {!collapsed && isActive && <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", accent.dot)} />}
    </button>
  );

  if (collapsed)
    return (
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  return btn;
}

function Sidebar({
  module,
  activeKey,
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  module: ActiveModule;
  activeKey: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: (key: string) => void;
}) {
  const navigate = useNavigate();
  const { profile, signOut, isAdmin } = useAuth();
  const { activeSprint } = useSprint();
  const accent = getAccent(module);
  const navItems = module === "sala_agil" ? NAV_SALA_AGIL : NAV_SUSTENTACAO;
  const userRole = profile?.role ?? "";
  const filtered = navItems.filter((i) => !i.roles || i.roles.includes(userRole) || isAdmin);
  const groups = (["main", "org", "config"] as const)
    .map((g) => ({ key: g, label: GROUP_LABELS[g], items: filtered.filter((i) => i.group === g) }))
    .filter((g) => g.items.length > 0);

  const userInitials = (profile?.full_name ?? profile?.email ?? "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[hsl(var(--sidebar-background))] border-r border-white/[0.05]",
        "transition-[width] duration-200 ease-in-out overflow-hidden shrink-0",
        collapsed ? "w-[56px]" : "w-[220px]",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center border-b border-white/[0.06] shrink-0",
          collapsed ? "justify-center py-4 px-2" : "justify-between px-4 py-4",
        )}
      >
        <button onClick={() => navigate("/modulos")} className="hover:opacity-80 transition-opacity">
          <SprintFlowLogo collapsed={collapsed} />
        </button>
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="text-white/30 hover:text-white/70 transition-colors p-1 rounded"
            aria-label="Recolher sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Module badge */}
      {!collapsed && (
        <div className="px-3 py-2 shrink-0">
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border",
              accent.bg,
              accent.border,
            )}
          >
            <div className={cn("h-1.5 w-1.5 rounded-full shrink-0 animate-pulse", accent.dot)} />
            <span className={accent.text}>{module === "sala_agil" ? "Sala Ágil" : "Sustentação"}</span>
            {activeSprint && module === "sala_agil" && (
              <span className="ml-auto text-white/30 truncate max-w-[80px]">{activeSprint.name}</span>
            )}
          </div>
        </div>
      )}

      {/* Team switcher */}
      <div className={cn("shrink-0", collapsed ? "px-2 py-1" : "px-3 pb-2")}>
        <TeamSwitcher module={module} collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 scrollbar-thin scrollbar-thumb-white/10">
        {groups.map((group, gi) => (
          <div key={group.key} className={cn(gi > 0 && "mt-4")}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-white/20 tracking-widest px-2 mb-1.5">{group.label}</p>
            )}
            {collapsed && gi > 0 && <div className="h-px bg-white/[0.06] mx-2 mb-2" />}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavItemButton
                  key={item.key}
                  item={item}
                  module={module}
                  isActive={activeKey === item.key}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/[0.06] pb-2 pt-2">
        {collapsed && (
          <div className="flex justify-center mb-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleCollapse}
                  className="text-white/30 hover:text-white/70 transition-colors p-2 rounded"
                  aria-label="Expandir sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Expandir
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2.5 rounded-md transition-all hover:bg-white/[0.05]",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20",
                "mx-2 w-[calc(100%-16px)]",
                collapsed ? "justify-center px-0 py-2" : "px-2 py-2",
              )}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className={cn("text-[10px] font-bold text-white", accent.avatar)}>
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[12px] font-medium text-white/80 truncate leading-none mb-0.5">
                    {profile?.full_name ?? "Usuário"}
                  </p>
                  <p className="text-[10px] text-white/30 truncate leading-none">{profile?.role ?? ""}</p>
                </div>
              )}
              {!collapsed && <ChevronRight className="h-3 w-3 text-white/20 shrink-0" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">{profile?.full_name ?? profile?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/modulos")} className="text-xs gap-2 cursor-pointer">
              <Zap className="h-3.5 w-3.5" /> Trocar módulo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-xs gap-2 text-destructive cursor-pointer focus:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

function Header({ module, activeKey, activeLabel }: { module: ActiveModule; activeKey: string; activeLabel: string }) {
  const { activeSprint } = useSprint();
  const [dark, setDark] = useState(
    () =>
      document.documentElement.getAttribute("data-theme") === "dark" ||
      (!document.documentElement.getAttribute("data-theme") &&
        window.matchMedia("(prefers-color-scheme:dark)").matches),
  );

  const toggleTheme = useCallback(() => {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setDark(!dark);
  }, [dark]);

  const sprintDaysLeft = activeSprint
    ? Math.ceil((new Date(activeSprint.endDate).getTime() - Date.now()) / 86400000)
    : null;

  const allNav = module === "sala_agil" ? NAV_SALA_AGIL : NAV_SUSTENTACAO;
  const activeItem = allNav.find((i) => i.key === activeKey);

  return (
    <header className="h-12 border-b border-border/50 bg-background/95 backdrop-blur-sm flex items-center px-4 gap-3 shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-1 min-w-0">
        <span className="font-medium text-foreground/70">{module === "sala_agil" ? "Sala Ágil" : "Sustentação"}</span>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="font-semibold text-foreground truncate">{activeLabel}</span>
      </div>

      {activeSprint && module === "sala_agil" && sprintDaysLeft !== null && (
        <div
          className={cn(
            "hidden sm:flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border",
            sprintDaysLeft <= 1
              ? "bg-destructive/10 text-destructive border-destructive/20"
              : sprintDaysLeft <= 3
                ? "bg-warning/10 text-warning border-warning/20"
                : "bg-muted text-muted-foreground border-border",
          )}
        >
          <Flame className={cn("h-3 w-3", sprintDaysLeft <= 3 && "text-orange-500")} />
          <span>{activeSprint.name}</span>
          <span className="text-muted-foreground/60">·</span>
          <span>{sprintDaysLeft <= 0 ? "Último dia" : `${sprintDaysLeft}d restantes`}</span>
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Alternar tema"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <NotificationBell />
      </div>
    </header>
  );
}

// ─── AppShell ──────────────────────────────────────────────────────────────────
export function AppShell({ module, children, activeKey = "dashboard", onNavigate }: AppShellProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.innerWidth < 1024;
    } catch {
      return false;
    }
  });

  const allNav = module === "sala_agil" ? NAV_SALA_AGIL : NAV_SUSTENTACAO;
  const resolvedKey = allNav.find((i) => i.path === location.pathname)?.key ?? activeKey;
  const activeLabel = allNav.find((i) => i.key === resolvedKey)?.label ?? "Dashboard";

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          module={module}
          activeKey={resolvedKey}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onNavigate={onNavigate}
        />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header module={module} activeKey={resolvedKey} activeLabel={activeLabel} />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
