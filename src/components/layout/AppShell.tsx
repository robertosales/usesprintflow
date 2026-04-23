import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSprint } from "@/contexts/SprintContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Zap,
  Wrench,
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
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── SVGs ─────────────────────────────────────────────────────────────────────

function HeartSuitIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
    </svg>
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
      xmlns="http://www.w3.org/2000/svg"
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

// ─── Constants ────────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<NavItem["group"], string> = {
  main: "PRINCIPAL",
  org: "RELATÓRIOS",
  config: "CONFIGURAÇÕES",
};

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
  { key: "gerador-apf", label: "Gerador APF", icon: FileText, path: "/sala-agil/gerador-apf", group: "main", roles: ["scrum_master", "analyst"] },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── TeamSwitcher ─────────────────────────────────────────────────────────────

function TeamSwitcher({ module }: { module: ActiveModule }) {
  const { teams, currentTeamId, setCurrentTeamId } = useAuth();

  const moduleTeams = teams.filter((t) => t.module === module);
  const activeTeam = moduleTeams.find((t) => t.id === currentTeamId);

  if (moduleTeams.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-white/[0.05] transition-colors group">
          <div className="h-7 w-7 rounded-md bg-white/[0.08] flex items-center justify-center shrink-0">
            <Building2 className="h-3.5 w-3.5 text-white/50" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[10px] text-white/30 leading-none mb-0.5">Time ativo</p>
            <p className="text-[12px] font-medium text-white truncate leading-none">
              {activeTeam?.name ?? "Selecionar time"}
            </p>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
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

// ─── NavItemButton ────────────────────────────────────────────────────────────

function NavItemButton({
  item,
  module,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  module: ActiveModule;
  isActive: boolean;
  onNavigate?: (key: string) => void;
}) {
  const navigate = useNavigate();
  const accent = getAccent(module);
  const Icon = item.icon;

  const handleClick = () => {
    onNavigate ? onNavigate(item.key) : navigate(item.path);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-3 px-[10px] py-[7px] rounded-md text-[13px] transition-all duration-100 relative",
        isActive
          ? "bg-white/[0.06] text-white"
          : "text-[hsl(var(--sidebar-foreground))] hover:bg-white/[0.05] hover:text-white",
      )}
    >
      {isActive && (
        <span
          className={cn("absolute left-1.5 top-1/2 -translate-y-1/2 h-[5px] w-[5px] rounded-full shrink-0", accent.dot)}
        />
      )}
      <Icon className={cn("h-4 w-4 shrink-0", isActive ? accent.text : "text-[hsl(var(--sidebar-foreground))]")} />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

// ─── SidebarNav ───────────────────────────────────────────────────────────────

function SidebarNav({
  module,
  activeKey,
  onNavigate,
}: {
  module: ActiveModule;
  activeKey?: string;
  onNavigate?: (key: string) => void;
}) {
  const location = useLocation();
  const { roles, isAdmin } = useAuth();
  const allItems = module === "sala_agil" ? NAV_SALA_AGIL : NAV_SUSTENTACAO;
  const items = allItems.filter((item) => {
    if (!item.roles) return true;
    if (isAdmin) return true;
    return item.roles.some((r) => roles.includes(r));
  });
  const groups: NavItem["group"][] = ["main", "org", "config"];

  const isActive = (item: NavItem): boolean => {
    if (activeKey !== undefined) return item.key === activeKey;
    const roots = ["/sala-agil", "/sustentacao"];
    if (roots.includes(item.path)) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-thin px-2">
      {groups.map((group) => {
        const groupItems = items.filter((i) => i.group === group);
        if (!groupItems.length) return null;
        return (
          <div key={group} className="mt-4 first:mt-0">
            <p className="px-3 mb-1 text-[10px] font-semibold tracking-[0.08em] text-white/25 uppercase select-none">
              {GROUP_LABELS[group]}
            </p>
            {groupItems.map((item) => (
              <NavItemButton
                key={item.key}
                item={item}
                module={module}
                isActive={isActive(item)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        );
      })}
    </nav>
  );
}

// ─── ModuleSwitcher ───────────────────────────────────────────────────────────

function ModuleSwitcher({ module }: { module: ActiveModule }) {
  const navigate = useNavigate();
  return (
    <div className="mx-2 mb-2 flex items-center gap-1 rounded-lg bg-white/[0.05] p-1">
      <button
        onClick={() => navigate("/sala-agil")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all",
          module === "sala_agil"
            ? "bg-[hsl(var(--sidebar-accent))] text-white shadow-sm"
            : "text-white/40 hover:text-white/70",
        )}
      >
        <Zap className="h-3 w-3" /> Ágil
      </button>
      <button
        onClick={() => navigate("/sustentacao")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all",
          module === "sustentacao" ? "bg-amber-500/80 text-white shadow-sm" : "text-white/40 hover:text-white/70",
        )}
      >
        <Wrench className="h-3 w-3" /> Sust.
      </button>
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function Topbar({ module, activeKey }: { module: ActiveModule; activeKey?: string }) {
  const { activeSprint } = useSprint();
  const location = useLocation();
  const accent = getAccent(module);
  const items = module === "sala_agil" ? NAV_SALA_AGIL : NAV_SUSTENTACAO;

  const activeItem = activeKey
    ? items.find((i) => i.key === activeKey)
    : items.find((i) => {
        const roots = ["/sala-agil", "/sustentacao"];
        if (roots.includes(i.path)) return location.pathname === i.path;
        return location.pathname.startsWith(i.path);
      });

  const pageLabel = activeItem?.label ?? "Dashboard";

  return (
    <header
      className="h-11 shrink-0 flex items-center justify-between px-4 bg-[#0f0f11]"
      style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.06)" }}
    >
      <span className="text-[13px] font-medium text-white">{pageLabel}</span>
      <div className="flex items-center gap-2">
        {module === "sala_agil" && activeSprint && (
          <Badge
            variant="outline"
            className={cn(
              "hidden sm:flex h-6 gap-1 text-[10px] font-medium cursor-default",
              accent.bg,
              accent.text,
              accent.border,
            )}
          >
            <GitBranch className="h-2.5 w-2.5" />
            {activeSprint.name}
          </Badge>
        )}
        <NotificationBell />
      </div>
    </header>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export function AppShell({ module, children, activeKey, onNavigate }: AppShellProps) {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const moduleAccess = profile?.module_access ?? "sala_agil";
  const canSwitch = isAdmin || moduleAccess === "admin";
  const accent = getAccent(module);

  const initials = (profile?.display_name ?? "U")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background" data-module={module}>
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside
        className="flex flex-col h-full w-[220px] shrink-0 bg-[#0f0f11]"
        style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.4)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-11 shrink-0">
          <HeartSuitIcon className={cn("h-6 w-6 shrink-0", accent.text)} />
          <span className="text-[15px] font-bold text-white tracking-tight">NexOps</span>
        </div>

        {/* ① Switcher de módulo (Ágil / Sust.) */}
        {canSwitch ? (
          <ModuleSwitcher module={module} />
        ) : (
          <div
            className={cn(
              "mx-2 mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold",
              accent.bg,
              accent.text,
            )}
          >
            {module === "sala_agil" ? (
              <Zap className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Wrench className="h-3.5 w-3.5 shrink-0" />
            )}
            {module === "sala_agil" ? "Sala Ágil" : "Sustentação"}
          </div>
        )}

        {/* ② Time ativo — logo abaixo do switcher */}
        <div className="px-2 mb-1">
          <TeamSwitcher module={module} />
        </div>

        {/* Separador visual entre time e nav */}
        <div className="h-px bg-white/[0.07] mx-2 mb-1" />

        {/* ③ Nav */}
        <SidebarNav module={module} activeKey={activeKey} onNavigate={onNavigate} />

        {/* ④ Rodapé — apenas avatar/usuário */}
        <div className="shrink-0 px-2 pb-3 pt-2">
          <div className="h-px bg-white/[0.07] mb-2" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-white/[0.05] transition-colors group">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className={cn("text-[10px] font-bold text-white", accent.avatar)}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[12px] font-medium text-white truncate leading-none mb-0.5">
                    {profile?.display_name ?? "Usuário"}
                  </p>
                  <p className="text-[10px] text-white/40 capitalize truncate leading-none">
                    {profile?.module_access ?? "membro"}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 mb-1">
              <DropdownMenuLabel className="text-xs">
                <p className="font-semibold">{profile?.display_name}</p>
                <p className="text-muted-foreground font-normal capitalize">{profile?.module_access}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {canSwitch && (
                <DropdownMenuItem onClick={() => navigate("/modulos")} className="text-xs gap-2">
                  <Layers className="h-3.5 w-3.5" /> Trocar Módulo
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-xs gap-2 text-destructive focus:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Área principal ──────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-[#0f0f11]">
        <Topbar module={module} activeKey={activeKey} />
        <main className="flex-1 overflow-y-auto bg-background rounded-tl-xl">{children}</main>
      </div>
    </div>
  );
}
