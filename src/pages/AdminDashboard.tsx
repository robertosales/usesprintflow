import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminKpis } from "@/features/admin/hooks/useAdminKpis";
import { SalaAgilKpis }      from "@/features/admin/components/SalaAgilKpis";
import { SustentacaoKpis }   from "@/features/admin/components/SustentacaoKpis";
import { ModuleQuickAccess } from "@/features/admin/components/ModuleQuickAccess";
import { ComparativeChart }  from "@/features/admin/components/ComparativeChart";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { LayoutDashboard, LogOut, Users } from "lucide-react";

export default function AdminDashboard() {
  const { profile, signOut, teams } = useAuth();
  const kpis    = useAdminKpis();
  const navigate = useNavigate();

  const now = new Date();
  const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const data = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">Dashboard Admin</span>
            <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
              {teams.length} time{teams.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden md:block">
              {data} · {hora}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{profile?.display_name || profile?.email}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={async () => { await signOut(); navigate("/auth"); }}>
              <LogOut className="h-3.5 w-3.5" /> Sair
            </Button>
          </div>
        </div>
      </header>

      {/* ── Conteúdo ────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* Saudação */}
        <div>
          <h1 className="text-xl font-bold">Olá, {profile?.display_name?.split(" ")[0] ?? "Admin"} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão consolidada de todos os módulos do SprintFlow.
          </p>
        </div>

        {/* KPIs Sala Ágil */}
        <SalaAgilKpis kpis={kpis} />

        {/* KPIs Sustentação */}
        <SustentacaoKpis kpis={kpis} />

        {/* Gráfico comparativo */}
        <ComparativeChart />

        {/* Acesso rápido */}
        <ModuleQuickAccess kpis={kpis} />

      </main>
    </div>
  );
}
