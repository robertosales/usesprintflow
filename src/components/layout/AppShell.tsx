import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSprint } from "@/contexts/SprintContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Trello, BookOpen, Zap, Users, Settings,
  BarChart3, ChevronRight, LogOut, PanelLeftClose, PanelLeftOpen,
  CalendarDays, FlaskConical, Layers, Wrench, ClipboardList, TrendingUp,
} from "lucide-react";

function HeartsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 21.593c-.59-.565-9-5.889-9-11.093 0-3.273 2.655-5.5
        5.5-5.5 1.471 0 2.814.559 3.75 1.483A4.978 4.978 0 0115.5 5c2.845 0
        5.5 2.227 5.5 5.5 0 5.204-8.41 10.528-9 11.093z"/>
    </svg>
  );
}

interface NavItem { key: string; label: string; icon: React.ElementType; path: string; }

const NAV_SALA_AGIL: NavItem[] = [
  { key: "dashboard",    label: "Dashboard",      icon: LayoutDashboard, path: "/sala-agil" },
  { key: "kanban",       label: "Kanban",         icon: Trello,          path: "/sala-agil/kanban" },
  { key: "backlog",      label: "Backlog",        icon: BookOpen,        path: "/sala-agil/backlog" },
  { key: "sprints",      label: "Sprints",        icon: Zap,             path: "/sala-agil/sprints" },
  { key: "planning",     label: "Planning Poker", icon: FlaskConical,    path: "/sala-agil/planning" },
  { key: "epicos",       label: "Épicos",         icon: Layers,          path: "/sala-agil/epics" },
  { key: "calendario",   label: "Calendário",     icon: CalendarDays,    path: "/sala-agil/calendario" },
  { key: "produtividade",label: "Produtividade",  icon: TrendingUp,      path: "/sala-agil/produtividade" },
  { key: "equipe",       label: "Equipe",         icon: Users,           path: "/sala-agil/equipe" },
  { key: "settings",     label: "Configurações",  icon: Settings,        path: "/sala-agil/configuracoes" },
];

const NAV_SUSTENTACAO: NavItem[] = [
  { key: "dashboard",  label: "Dashboard",     icon: LayoutDashboard, path: "/sustentacao" },
  { key: "demandas",   label: "Demandas",      icon: ClipboardList,   path: "/sustentacao/demandas" },
  { key: "kanban",     label: "Kanban",        icon: Trello,          path: "/sustentacao/kanban" },
  { key: "relatorios", label: "Relatórios",    icon: BarChart3,       path: "/sustentacao/relatorios" },
  { key: "manutencao", label: "Manutenção",    icon: Wrench,          path: "/sustentacao/manutencao" },
  { key: "settings",   label: "Configurações", icon: Settings,        path: "/sustentacao/configuracoes" },
];

function NavItemBtn({ item, isActive, collapsed, onClick }:
  { item: NavItem; isActive: boolean; collapsed: boolean; onClick: () 