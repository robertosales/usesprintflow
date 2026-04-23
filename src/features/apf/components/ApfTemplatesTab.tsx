import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, FileText, Table2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ApfTemplateModal } from "./ApfTemplateModal";
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  duplicateTemplate,
  toggleTemplateActive,
  type ApfTemplate,
} from "../services/apf.service";

export function ApfTemplatesTab() {
  const { currentTeamId, user } = useAuth();
  const [templates, setTemplates] = useState<ApfTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApfTemplate | null>(null);

  const load = async () => {
    if (!currentTeamId) return;
    setLoading(true);
    try {
      setTemplates(await fetchTemplates(currentTeamId));
    } catch {
      toast.error("Erro ao carregar templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentTeamId]);

  const handleSave = async (data: { name: string; description: string; output_type: string; prompt_content: string }) => {
    if (editing) {
      await updateTemplate(editing.id, editing.version, data);
      toast.success("Template atualizado!");
    } else {
      await createTemplate(currentTeamId!, user!.id, data);
      toast.success("Template criado!");
    }
    setEditing(null);
    load();
  };

  const handleDuplicate = async (t: ApfTemplate) => {
    try {
      await duplicateTemplate(t);
      toast.success("Template duplicado!");
      load();
    } catch {
      toast.error("Erro ao duplicar");
    }
  };

  const handleToggle = async (t: ApfTemplate) => {
    try {
      await toggleTemplateActive(t.id, t.is_active);
      toast.success(t.is_active ? "Template desativado" : "Template ativado");
      load();
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Templates</h2>
        <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-3">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum template cadastrado</p>
            <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>Criar primeiro template</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <Card key={t.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-semibold leading-tight pr-6">{t.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditing(t); setModalOpen(true); }}>Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(t)}>Duplicar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggle(t)}>
                        {t.is_active ? "Desativar" : "Ativar"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {t.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    {t.output_type === "docx" ? <FileText className="h-3 w-3" /> : <Table2 className="h-3 w-3" />}
                    {t.output_type.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">v{t.version}</Badge>
                  <Badge
                    variant={t.is_active ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {t.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Criado em {new Date(t.created_at).toLocaleDateString("pt-BR")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ApfTemplateModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        template={editing}
      />
    </div>
  );
}