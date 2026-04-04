import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useProjetos } from "../hooks/useProjetos";
import { useDemandas } from "../hooks/useDemandas";
import type { Projeto } from "../services/projetos.service";
import { Plus, Search, FolderKanban, MoreHorizontal, Users, FileText } from "lucide-react";
import { toast } from "sonner";

export function ProjetosManager() {
  const { projetos, loading, error, create, update, remove, reload } = useProjetos();
  const { demandas } = useDemandas();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Projeto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Projeto | null>(null);
  const [search, setSearch] = useState('');
  const [filterSla, setFilterSla] = useState('all');
  const debouncedSearch = useDebounce(search, 300);

  const [form, setForm] = useState({ nome: '', descricao: '', equipe: '', sla: 'padrao' });

  const filtered = useMemo(() => {
    return projetos.filter(p => {
      if (debouncedSearch && !p.nome.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
      if (filterSla !== 'all' && p.sla !== filterSla) return false;
      return true;
    });
  }, [projetos, debouncedSearch, filterSla]);

  const demandasPorProjeto = useMemo(() => {
    const map: Record<string, number> = {};
    demandas.forEach(d => {
      const key = d.projeto || '';
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [demandas]);

  const openCreate = () => {
    setForm({ nome: '', descricao: '', equipe: '', sla: 'padrao' });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (p: Projeto) => {
    setForm({ nome: p.nome, descricao: p.descricao || '', equipe: p.equipe || '', sla: p.sla });
    setEditing(p);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) { toast.error("Preencha os campos obrigatórios"); return; }
    if (editing) {
      await update(editing.id, form);
    } else {
      await create(form);
    }
    setShowForm(false);
  };

  if (loading) return <SkeletonList count={4} />;
  if (error) return <div className="text-center py-10 text-destructive">{error} <button onClick={reload} className="underline ml-2">Tentar novamente</button></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Projetos</h2>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Novo Projeto</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar projeto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterSla} onValueChange={setFilterSla}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="SLA" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="padrao">Padrão</SelectItem>
            <SelectItem value="24x7">24x7</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Nenhum projeto encontrado" actionLabel="Novo Projeto" onAction={openCreate} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">{p.nome}</h3>
                    {p.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{p.descricao}</p>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(p)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(p)}>Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {p.equipe && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />{p.equipe}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />{demandasPorProjeto[p.nome] || 0} demandas
                  </div>
                  {p.sla === '24x7' ? (
                    <Badge variant="destructive" className="text-[10px]">24x7</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Padrão</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={o => !o && setShowForm(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome do projeto" /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} rows={2} /></div>
            <div><Label>Equipe</Label><Input value={form.equipe} onChange={e => setForm(p => ({ ...p, equipe: e.target.value }))} placeholder="Nome da equipe" /></div>
            <div>
              <Label>SLA</Label>
              <Select value={form.sla} onValueChange={v => setForm(p => ({ ...p, sla: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="padrao">Padrão</SelectItem>
                  <SelectItem value="24x7">24x7</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>{editing ? 'Salvar' : 'Criar Projeto'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) { remove(deleteTarget.id); setDeleteTarget(null); } }} />
    </div>
  );
}
