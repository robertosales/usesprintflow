import { useState } from "react";
import { Plus, UsersRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamsAdmin, type TeamAdmin } from "../hooks/useTeamsAdmin";
import { TeamsTable } from "../components/TeamsTable";
import { TeamFormDialog } from "../components/TeamFormDialog";
import { PageHeader } from "../components/PageHeader";

export function AdminTimesPage() {
  const { teams, loading, create, update, remove } = useTeamsAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing,    setEditing]    = useState<TeamAdmin | null>(null);

  const handleSave = async (data: { name: string; module: string }) => {
    if (editing) return update(editing.id, data);
    return create(data);
  };

  const openNew  = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (team: TeamAdmin) => { setEditing(team); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={UsersRound}
        iconColor="text-blue-400"
        description={
          loading
            ? "Carregando..."
            : `${teams.length} time${teams.length !== 1 ? "s" : ""} cadastrado${teams.length !== 1 ? "s" : ""}`
        }
        actions={[{ label: "Novo Time", icon: Plus, onClick: openNew }]}
      />

      {loading
        ? <Skeleton className="h-64 w-full rounded-xl" />
        : <TeamsTable teams={teams} onEdit={openEdit} onDelete={remove} />}

      <TeamFormDialog
        open={dialogOpen}
        team={editing}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSave={handleSave}
      />
    </div>
  );
}
