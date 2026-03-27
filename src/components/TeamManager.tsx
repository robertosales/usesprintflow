import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Users } from "lucide-react";

export function TeamManager() {
  const { teams, refreshTeams, currentTeamId, setCurrentTeamId, isAdmin, hasPermission } = useAuth();
  const canManage = hasPermission('manage_teams');
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<{ id: string; name: string; description: string } | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Nome do time é obrigatório *"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data, error } = await supabase.from("teams").insert({
      name: name.trim(), description: description.trim(), created_by: user.id,
    }).select().single();
    
    if (error) { toast.error("Erro ao criar time"); return; }
    
    // Add creator as team member
    await supabase.from("team_members").insert({
      team_id: (data as any).id, user_id: user.id, role: "admin",
    });
    
    // Insert default workflow columns
    const defaultCols = [
      { key: "aguardando_desenvolvimento", label: "Aguardando Desenvolvimento", color_class: "bg-kanban-aguardando", dot_color: "bg-muted-foreground", sort_order: 0 },
      { key: "em_desenvolvimento", label: "Em Desenvolvimento", color_class: "bg-kanban-desenvolvimento", dot_color: "bg-info", sort_order: 1 },
      { key: "em_code_review", label: "Em Code Review", color_class: "bg-kanban-review", dot_color: "bg-accent", sort_order: 2 },
      { key: "em_teste", label: "Em Teste", color_class: "bg-kanban-teste", dot_color: "bg-warning", sort_order: 3 },
      { key: "bug", label: "Bug", color_class: "bg-kanban-bug", dot_color: "bg-destructive", sort_order: 4 },
      { key: "pronto_para_publicacao", label: "Pronto para Publicação", color_class: "bg-kanban-pronto", dot_color: "bg-success", sort_order: 5 },
    ];
    await supabase.from("workflow_columns").insert(
      defaultCols.map((c) => ({ ...c, team_id: (data as any).id }))
    );
    
    toast.success("Time criado com sucesso!");
    setName("");
    setDescription("");
    setOpen(false);
    await refreshTeams();
    setCurrentTeamId((data as any).id);
  };

  const handleUpdate = async () => {
    if (!editingTeam) return;
    const { error } = await supabase.from("teams").update({
      name: editingTeam.name, description: editingTeam.description,
    }).eq("id", editingTeam.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Time atualizado!");
    setEditingTeam(null);
    await refreshTeams();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este time? Todos os dados serão perdidos.")) return;
    await supabase.from("teams").delete().eq("id", id);
    toast.success("Time excluído!");
    await refreshTeams();
    if (currentTeamId === id) setCurrentTeamId(teams.find((t) => t.id !== id)?.id || null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Times / Squads
          </h2>
          <p className="text-sm text-muted-foreground">Gerencie os times do projeto</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo Time</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Time</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Squad Alpha" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do time" />
              </div>
              <Button onClick={handleCreate} className="w-full">Criar Time</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card
            key={team.id}
            className={`cursor-pointer transition-all ${currentTeamId === team.id ? "ring-2 ring-primary" : "hover:shadow-md"}`}
            onClick={() => setCurrentTeamId(team.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">{team.name}</CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost" size="icon"
                  onClick={(e) => { e.stopPropagation(); setEditingTeam({ ...team, description: "" }); }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost" size="icon"
                    onClick={(e) => { e.stopPropagation(); handleDelete(team.id); }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {currentTeamId === team.id && (
                <span className="text-xs text-primary font-medium">● Time ativo</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {teams.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum time criado ainda. Crie seu primeiro time para começar!</p>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTeam} onOpenChange={(o) => !o && setEditingTeam(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Time</DialogTitle></DialogHeader>
          {editingTeam && (
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={editingTeam.name} onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={editingTeam.description} onChange={(e) => setEditingTeam({ ...editingTeam, description: e.target.value })} />
              </div>
              <Button onClick={handleUpdate} className="w-full">Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
