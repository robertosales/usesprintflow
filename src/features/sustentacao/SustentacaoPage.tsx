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

export function SustentacaoPage() {
  const [active, setActive] = useState("dashboard");
  const { currentTeamId, setCurrentTeamId, teams, loading } = useAuth();
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
        {!currentTeamId && active !== "times" ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">Selecione um time para começar</p>
          </div>
        ) : (
          <>
            {active === "dashboard" && <SustentacaoDashboard key={`dash-${currentTeamId}`} />}
            {active === "board" && <SustentacaoBoard />}
            {active === "demandas" && <DemandasList />}
            {active === "projetos" && <ProjetosManager />}
            {active === "importacao" && <ImportacaoView />}
            {active === "times" && <TeamManager moduleFilter="sustentacao" />}
            {active === "membros" && <TeamMembersManager />}
            {active === "perfis" && <UserRolesManager />}
            {active === "equipe" && <DeveloperManager />}
            {active === "fluxo" && <SustentacaoWorkflow />}
            {active === "campos" && <CustomFieldManager />}
            {active === "automacoes" && <AutomationManager />}
            {active === "relatorios" && <SustentacaoRelatorios />}
          </>
        )}
      </div>
    </AppShell>
  );
}
