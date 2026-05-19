import { useState, useEffect } from "react";
import { AppShell }         from "@/components/layout/AppShell";
import { useAuth }          from "@/contexts/AuthContext";
import { TeamSelectionModal } from "@/shared/components/common/TeamSelectionModal";
import { Building2 }        from "lucide-react";
import { Button }           from "@/components/ui/button";
import { toast }            from "sonner";
import { useRdms }          from "./hooks/useRdms";
import { RdmList }          from "./components/RdmList";
import { RdmForm }          from "./components/RdmForm";
import { RdmDetail }        from "./components/RdmDetail";
import { RdmDashboard }     from "./components/RdmDashboard";
import { TeamManager }      from "@/components/TeamManager";
import { TeamMembersManager } from "@/components/TeamMembersManager";
import { UserRolesManager }   from "@/components/UserRolesManager";
import type { Rdm, RdmUpdate } from "./types/rdm";

export default function RdmPage() {
  const [active, setActive] = useState("dashboard");
  const { loading: authLoading, currentTeamId, setCurrentTeamId, teams, hasPermission, profile } = useAuth();
  const [showTeamModal, setShowTeamModal] = useState(false);

  const moduleTeams = teams.filter((t) => t.module === "rdm");

  useEffect(() => {
    if (authLoading || moduleTeams.length === 0) return;
    const currentIsValid = currentTeamId && moduleTeams.some((t) => t.id === currentTeamId);
    if (currentIsValid) return;
    if (moduleTeams.length === 1) {
      setCurrentTeamId(moduleTeams[0].id);
    } else {
      setShowTeamModal(true);
    }
  }, [authLoading, teams]);

  const needsTeam = !currentTeamId && active !== "times";

  return (
    <AppShell module="rdm" activeKey={active} onNavigate={setActive}>
      <TeamSelectionModal
        open={showTeamModal}
        teams={moduleTeams}
        moduleLabel="RDM"
        onSelect={(id) => {
          setCurrentTeamId(id);
          setShowTeamModal(false);
        }}
        onClose={() => setShowTeamModal(false)}
      />

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {authLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rdm" />
          </div>
        )}

        {!authLoading && needsTeam && (
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

        {!authLoading && !needsTeam && (
          <RdmSection active={active} setActive={setActive} />
        )}
      </div>
    </AppShell>
  );
}

function RdmSection({ active, setActive }: { active: string; setActive: (v: string) => void }) {
  const { rdms, loading, create, update, load } = useRdms();
  const { profile } = useAuth();
  const [selected, setSelected] = useState<Rdm | null>(null);
  const [showForm, setShowForm]   = useState(false);

  const handleCreate = async (payload: any) => {
    try {
      await create({ ...payload, criado_por: profile?.id ?? "" });
      toast.success("RDM criada com sucesso! Checklist gerado automaticamente.");
    } catch (e: any) {
      toast.error("Erro ao criar RDM: " + (e?.message ?? ""));
      throw e;
    }
  };

  const handleUpdate = async (id: string, updates: RdmUpdate) => {
    try {
      await update(id, updates);
      toast.success("RDM atualizada.");
      // Atualiza o selecionado na memória
      setSelected((prev) => prev ? { ...prev, ...updates } : prev);
    } catch (e: any) {
      toast.error("Erro ao atualizar RDM: " + (e?.message ?? ""));
    }
  };

  // Detalhes de uma RDM sobrepõem qualquer view
  if (selected) {
    return (
      <RdmDetail
        rdm={selected}
        onBack={() => setSelected(null)}
        onUpdate={handleUpdate}
      />
    );
  }

  switch (active) {
    case "dashboard":
      return <RdmDashboard rdms={rdms} />;

    case "rdms":
      return (
        <>
          <RdmList
            rdms={rdms}
            loading={loading}
            onNew={() => setShowForm(true)}
            onSelect={setSelected}
            onRefresh={load}
          />
          <RdmForm
            open={showForm}
            onClose={() => setShowForm(false)}
            onSubmit={handleCreate}
          />
        </>
      );

    case "times":
      return <TeamManager moduleFilter="rdm" />;
    case "membros":
      return <TeamMembersManager />;
    case "perfis":
      return <UserRolesManager />;

    default:
      return <RdmDashboard rdms={rdms} />;
  }
}
