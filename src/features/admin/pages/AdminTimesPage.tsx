import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { useTeamsAdmin, type TeamAdmin } from "../hooks/useTeamsAdmin";
import { TeamsTable } from "../components/TeamsTable";
import { TeamFormDialog } from "../components/TeamFormDialog";

/**
 * Aba "Times" do Dashboard Admin.
 * Usa hook + componentes dedicados do feature/admin, com loading state explícito
 * (evita exibir EmptyState enquanto a query ainda está em andamento).
 */
export function AdminTimesPage() {
  const { teams, loading, create, update, remove } = useTeamsAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeamAdmin | null>(null);

  const handleSave = async (data: { name: string; module: string }) => {
    if (editing) return update(editing.id, data);
    return create(data);
  };

  const openNew  = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (team: TeamAdmin) => { setEditing(team); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Times / Squads</h2>
          <p className="text-xs text-muted-foreground">
            {loading ? "Carregando..." : `${teams.length} time${teams.length !== 1 ? "s" : ""} cadastrado${teams.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo Time
        </Button>
      </div>

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
