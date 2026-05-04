import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSprint } from "@/contexts/SprintContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Trello,
  BookOpen,
  Zap,
  Users,
  Settings,
  BarChart3,
  ChevronRight,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarDays,
  FlaskConical,
  Layers,
  Wrench,
  ClipboardList,
  TrendingUp,
} from "lucide-react";

function HeartsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 21.593c-.59-.565-9-5.889-9-11.093 0-3.273 2.655-5.5 5.5-5.5 1.471 0 2.814.559 3.75 1.483A4.978 4.978 0 0115.5 5c2.845 0 5.5 2.227 5.5 5.5 0 5.204-8.41 10.528-9 11.093z" />
    </svg>
  );
}

interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

const NAV_SALA_AGIL: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/sala-agil" },
  { key: "board", label: "Board Kanban", icon: Trello, path: "/sala-agil/kanban" },
  { key: "backlog", label: "Backlog", icon: BookOpen, path: "/sala-agil/backlog" },
  { key: "sprints", label: "Sprints", icon: Zap, path: "/sala-agil/sprints" },
  { key: "planning", label: "Planning Poker", icon: FlaskConical, path: "/sala-agil/planning" },
  { key: "epicos", label: "Épicos", icon: Layers, path: "/sala-agil/epicos" },
  { key: "calendario", label: "Calendário", icon: CalendarDays, path: "/sala-agil/calendario" },
  { key: "produtividade", label: "Produtividade", icon: TrendingUp, path: "/sala-agil/produtividade" },
  { key: "equipe", label: "Equipe", icon: Users, path: "/sala-agil/equipe" },
  { key: "settings", label: "Configurações", icon: Settings, path: "/sala-agil/configuracoes" },
];

const NAV_SUSTENTACAO: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/sustentacao" },
  { key: "demandas", label: "Demandas", icon: ClipboardList, path: "/sustentacao/demandas" },
  { key: "kanban", label: "Kanban", icon: Trello, path: "/sustentacao/kanban" },
  { key: "relatorios", label: "Relatórios", icon: BarChart3, path: "/sustentacao/relatorios" },
  { key: "manutencao", label: "Manutenção", icon: Wrench, path: "/sustentacao/manutencao" },
  { key: "settings", label: "Configurações", icon: Settings, path: "/sustentacao/configuracoes" },
];

function NavItemBtn({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const btn = (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
        collapsed ? "justify-center px-2" : "",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      <item.icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }
  return btn;
}

interface AppShellProps {
  module: "sala_agil" | "sustentacao";
  children: React.ReactNode;
  activeKey?: string;
  onNavigate?: (key: string) => void;
}

export function AppShell({ module, children, activeKey, onNavigate }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { activeSprint } = useSprint();
  const { signOut, profile } = useAuth();

  const profileName =
    (profile as any)?.full_name ?? (profile as any)?.name ?? profile?.email?.split("@")[0] ?? "Usuário";
  const profileRole = (profile as any)?.role ?? "Membro";

  const navItems = module === "sala_agil" ? NAV_SALA_AGIL : NAV_SUSTENTACAO;

  const currentKey =
    activeKey ||
    (() => {
      const seg = location.pathname.split("/").filter(Boolean);
      return seg[1] || "dashboard";
    })();

  const handleNav = (item: NavItem) => {
    if (onNavigate) onNavigate(item.key);
    else navigate(item.path);
  };

  const moduleLabel = module === "sala_agil" ? "Sala Ágil" : "Sustentação";
  const moduleColor = module === "sala_agil" ? "text-primary" : "text-amber-500";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col shrink-0 h-full bg-sidebar border-r border-border transition-all duration-300 ease-in-out",
          collapsed ? "w-14" : "w-[220px]",
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center gap-2 px-3 py-4 mb-1", collapsed && "justify-center px-2")}>
          <HeartsIcon className={cn("shrink-0 text-primary", collapsed ? "h-7 w-7" : "h-6 w-6")} />
          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-bold tracking-tight">NexOps</span>
              <span className={cn("text-[10px] font-medium truncate", moduleColor)}>{moduleLabel}</span>
            </div>
          )}
        </div>

        {/* Sprint ativo */}
        {!collapsed && module === "sala_agil" && activeSprint && (
          <div className="mx-3 mb-3">
            <div className="rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1.5">
              <p className="text-[10px] text-primary/70 uppercase tracking-wide font-medium">Sprint ativo</p>
              <p className="text-xs font-semibold text-primary truncate">{activeSprint.name}</p>
            </div>
          </div>
        )}

        {/* Collapse btn */}
        <div className={cn("mb-2 px-2", collapsed && "flex justify-center")}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-sidebar-foreground/40 hover:text-sidebar-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        <Separator className="mx-3 mb-2" />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5 py-1">
          {navItems.map((item) => (
            <NavItemBtn
              key={item.key}
              item={item}
              isActive={currentKey === item.key}
              collapsed={collapsed}
              onClick={() => handleNav(item)}
            />
          ))}
        </nav>

        <Separator className="mx-3 mt-2" />

        {/* User */}
        <div className={cn("p-2 flex items-center gap-2", collapsed && "justify-center")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2 rounded-lg p-1.5 w-full hover:bg-sidebar-accent transition-colors text-left",
                  collapsed && "justify-center w-auto",
                )}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                    {profileName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{profileName}</p>
                    <p className="text-[10px] text-sidebar-foreground/50 truncate">{profileRole}</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <p className="font-semibold text-sm">{profileName}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-red-500 focus:text-red-500 gap-2 cursor-pointer"
              >
                <LogOut className="h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-background">
        <header className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-border bg-sidebar">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground hidden sm:block">{moduleLabel}</span>
            {currentKey !== "dashboard" && (
              <>
                <ChevronRight className="h-3 w-3 hidden sm:block" />
                <span className="capitalize hidden sm:block">
                  {navItems.find((n) => n.key === currentKey)?.label || currentKey}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
