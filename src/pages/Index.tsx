import { useState, useEffect } from "react";
import { AgileHistory } from "@/components/AgileHistory";
import { TeamSelectionModal } from "@/shared/components/common/TeamSelectionModal";
import { SprintManager } from "@/components/SprintManager";
import { DeveloperManager } from "@/components/DeveloperManager";
import { UserStoryManager } from "@/components/UserStoryManager";
import { ActivityManager } from "@/components/ActivityManager";
import { KanbanBoard } from "@/components/KanbanBoard";
import { MetricsDashboard } from "@/components/MetricsDashboard";
import { ImpedimentList } from "@/components/ImpedimentManager";
import { EpicManager } from "@/components/EpicManager";
import { WorkflowManager } from "@/components/WorkflowManager";
import { CustomFieldManager } from "@/components/CustomFieldManager";
import { AutomationManager } from "@/components/AutomationManager";
import { TeamManager } from "@/components/TeamManager";
import { TeamMembersManager } from "@/components/TeamMembersManager";
import { UserRolesManager } from "@/components/UserRolesManager";
import { DashboardHome } from "@/components/DashboardHome";
import { CalendarView } from "@/components/CalendarView";
import { PlanningPoker } from "@/components/PlanningPoker";
import { RetroManager } from "@/components/RetroManager";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

const Index = () => {
  const [active, setActive] = useState("dashboard");
  const { loading, currentTeamId, setCurrentTeamId, teams, hasPermission } = useAuth();
  const { activeSprint, userStories } = useSprint();
  const [showTeamModal, setShowTeamModal] = useState(false);

  const moduleTeams = teams.filter((t) => t.module === "sala_agil");

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

  const needsTeam = !currentTeamId && active !== "times";

  return (
    <AppShell module="sala_agil" activeKey={active} onNavigate={setActive}>
      <TeamSelectionModal
        open={showTeamModal}
        teams={moduleTeams}
        moduleLabel="Sala Ágil"
        onSelect={(id) => {
          setCurrentTeamId(id);
          setShowTeamModal(false);
        }}
        onClose={() => setShowTeamModal(false)}
      />
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-success" />
          </div>
        )}
        {!loading && needsTeam && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Building2 className="h-14 w-14 text-muted-foreground/30" />
            <p className="text-lg text-muted-foreground font-medium">Selecione ou crie um time para começar</p>
            {hasPermission("manage_teams") && (
              <Button onClick={() => setActive("times")} size="lg">
                <Building2 className="h-4 w-4 mr-2" /> Ir para Times
              </Button>
            )}
          </div>
        )}
        {!loading && !needsTeam && (
          <>
            {active === "dashboard" && <DashboardHome key={`dash-${currentTeamId}`} />}
            {active === "times" && <TeamManager moduleFilter="sala_agil" />}
            {active === "membros" && <TeamMembersManager />}
            {active === "perfis" && <UserRolesManager />}
            {active === "backlog" && (
              <div className="space-y-8">
                <SprintManager />
                <UserStoryManager />
              </div>
            )}
            {active === "epicos" && <EpicManager />}
            {active === "planning" && <PlanningPoker />}
            {active === "equipe" && <DeveloperManager />}
            {active === "atividades" && <ActivityManager />}
            {active === "board" && <KanbanBoard />}
            {active === "calendario" && <CalendarView />}
            {active === "impedimentos" && <ImpedimentList />}
            {active === "retro" && <RetroManager />}
            {active === "metricas" && <MetricsDashboard />}
            {active === "historico" && <AgileHistory />}
            {active === "fluxo" && <WorkflowManager />}
            {active === "campos" && <CustomFieldManager />}
            {active === "automacoes" && <AutomationManager />}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default Index;
