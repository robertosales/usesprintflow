import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Kanban, Wrench, LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Logo SVG reutilizável
function SprintFlowLogo() {
  return (
    <div className="flex items-center gap-3 select-none">
      <svg aria-label="SprintFlow" width="36" height="36" viewBox="0 0 28 28" fill="none">
        <polygon points="14,2 25,8 25,20 14,26 3,20 3,8" fill="hsl(var(--primary))" opacity="0.15" />
        <polygon points="14,2 25,8 25,20 14,26 3,20 3,8" stroke="hsl(var(--primary))" strokeWidth="1.5" fill="none" />
        <path d="M15.5 7L10 15h5l-2.5 6L19 13h-5z" fill="hsl(var(--primary))" />
      </svg>
      <span className="text-2xl font-bold tracking-tight">
        Sprint<span className="text-primary">Flow</span>
      </span>
    </div>
  );
}

interface ModuleCardProps {
  title: string;
  description: string;
  badge: string;
  icon: React.ElementType;
  accent: string;
  accentBg: string;
  onClick: () => void;
  allowed: boolean;
}

function ModuleCard({ title, description, badge, icon: Icon, accent, accentBg, onClick, allowed }: ModuleCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!allowed}
      className={cn(
        "group relative text-left w-full rounded-2xl border bg-card p-6 transition-all duration-200",
        "shadow-sm hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        allowed ? "hover:border-primary/40 hover:-translate-y-0.5 cursor-pointer" : "opacity-40 cursor-not-allowed",
      )}
    >
      {/* Icon */}
      <div className={cn("inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4", accentBg)}>
        <Icon className={cn("h-6 w-6", accent)} />
      </div>

      {/* Badge */}
      <span
        className={cn(
          "absolute top-4 right-4 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
          accentBg,
          accent,
          "border-current/20",
        )}
      >
        {badge}
      </span>

      <h2 className="text-lg font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{description}</p>

      <div
        className={cn(
          "flex items-center gap-1 text-xs font-medium transition-colors",
          allowed ? cn(accent, "group-hover:gap-2") : "text-muted-foreground",
        )}
      >
        <span>Acessar módulo</span>
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

export function ModuleSelector() {
  const navigate = useNavigate();
  const { profile, signOut, isAdmin } = useAuth();
  const access = profile?.module_access ?? "sala_agil";

  const canAgil = isAdmin || access === "admin" || access === "sala_agil";
  const canSust = isAdmin || access === "admin" || access === "sustentacao";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6">
        <SprintFlowLogo />
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">{profile?.full_name ?? profile?.email}</span>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center mb-10">
          <h1 className="text-2xl font-bold text-foreground mb-2">Bem-vindo ao SprintFlow</h1>
          <p className="text-muted-foreground text-sm">Escolha o módulo para começar</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl w-full">
          <ModuleCard
            title="Sala Ágil"
            description="Gestão de sprints, Kanban, planning poker, retrospectivas e métricas de time."
            badge="Scrum / Kanban"
            icon={Kanban}
            accent="text-primary"
            accentBg="bg-primary/10"
            onClick={() => navigate("/sala-agil")}
            allowed={canAgil}
          />
          <ModuleCard
            title="Sustentação"
            description="Controle de demandas de manutenção, RHMs, atividades e relatórios gerenciais."
            badge="Manutenção"
            icon={Wrench}
            accent="text-amber-500"
            accentBg="bg-amber-500/10"
            onClick={() => navigate("/sustentacao")}
            allowed={canSust}
          />
        </div>
      </main>
    </div>
  );
}
