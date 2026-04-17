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
import { AppShell } from "@/components/layout/AppShell";
import { Building2, ShieldAlert } from "lucide-react";

// ─── AccessDenied ─────────────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-3">
      <ShieldAlert className="h-14 w-14 text-destructive/40" />
      <p className="text-lg font-semibold text-foreground">Acesso Restrito</p>
      <p className="text-sm text-muted-foreground">Você não tem permissão para acessar esta seção.</p>
    </div>
  );
}

// ─── SectionGuard ─────────────────────────────────────────────────────────────

function SectionGuard({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? <>{children}</> : <AccessDenied />;
}

// ─── SustentacaoPage ──────────────────────────────────────────────────────────

export function SustentacaoPage() {
  const [active, setActive] = useState("dashboard");
  const { currentTeamId, setCurrentTeamId, teams, loading, hasPermission } = useAuth();
  const [showTeamModal, setShowTeamModal] = useState(false);

  const moduleTeams = teams.filter((t) => t.module === "sustentacao");

  useEffect(() => {
    if (loading || moduleTeams.length === 0) return;
    const currentIsValid = currentTeamId && moduleTeams.some((t) => t.id === currentTeamId);
    if (currentIsValid) return;
    if (moduleTeams.length === 1) {
      setCurrentTeamId(moduleTeams[0].id);
    } else {
      setShowTeamModal(true);
    }
  }, [loading, teams]);

  return (
    <AppShell module="sustentacao" activeKey={active} onNavigate={setActive}>
      <TeamSelectionModal
        open={showTeamModal}
        teams={moduleTeams}
        moduleLabel="Sustentação"
        onSelect={(id) => {
          setCurrentTeamId(id);
          setShowTeamModal(false);
        }}
        onClose={() => setShowTeamModal(false)}
      />

      <div className={`mx-auto p-4 md:p-6 ${active === "board" ? "max-w-full" : "max-w-7xl"}`}>
        {/* Sem time selecionado */}
        {!currentTeamId && active !== "times" ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3 text-muted-foreground">
            <Building2 className="h-14 w-14 text-muted-foreground/30" />
            <p className="text-lg font-medium">Selecione um time para começar</p>
            {hasPermission("manage_teams") && (
              <button onClick={() => setActive("times")} className="text-sm text-primary underline underline-offset-4">
                Ir para Times
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Sem restrição ────────────────────────────── */}
            {active === "dashboard" && <SustentacaoDashboard key={`dash-${currentTeamId}`} />}
            {active === "equipe" && <DeveloperManager />}

            {/* ── Requer view_kanban ───────────────────────── */}
            {active === "board" && (
              <SectionGuard permission="view_kanban">
                <SustentacaoBoard />
              </SectionGuard>
            )}

            {/* ── Requer view_backlog ──────────────────────── */}
            {active === "demandas" && (
              <SectionGuard permission="view_backlog">
                <DemandasList />
              </SectionGuard>
            )}
            {active === "projetos" && (
              <SectionGuard permission="view_backlog">
                <ProjetosManager />
              </SectionGuard>
            )}

            {/* ── Requer manage_teams (importação é privilegiada) */}
            {active === "importacao" && (
              <SectionGuard permission="manage_teams">
                <ImportacaoView />
              </SectionGuard>
            )}

            {/* ── Requer view_dashboard ────────────────────── */}
            {active === "relatorios" && (
              <SectionGuard permission="view_dashboard">
                <SustentacaoRelatorios />
              </SectionGuard>
            )}

            {/* ── Config — manage_teams ────────────────────── */}
            {active === "times" && (
              <SectionGuard permission="manage_teams">
                <TeamManager moduleFilter="sustentacao" />
              </SectionGuard>
            )}

            {/* ── Config — manage_users ────────────────────── */}
            {active === "membros" && (
              <SectionGuard permission="manage_users">
                <TeamMembersManager />
              </SectionGuard>
            )}

            {/* ── Config — manage_roles ────────────────────── */}
            {active === "perfis" && (
              <SectionGuard permission="manage_roles">
                <UserRolesManager />
              </SectionGuard>
            )}

            {/* ── Config — manage_workflow ─────────────────── */}
            {active === "fluxo" && (
              <SectionGuard permission="manage_workflow">
                <SustentacaoWorkflow />
              </SectionGuard>
            )}

            {/* ── Config — manage_custom_fields ────────────── */}
            {active === "campos" && (
              <SectionGuard permission="manage_custom_fields">
                <CustomFieldManager />
              </SectionGuard>
            )}

            {/* ── Config — manage_automations ──────────────── */}
            {active === "automacoes" && (
              <SectionGuard permission="manage_automations">
                <AutomationManager />
              </SectionGuard>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
