import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { PaginationControls } from "@/shared/components/common/Pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useProjetos } from "../hooks/useProjetos";
import { useDemandas } from "../hooks/useDemandas";
import { useAuth } from "@/contexts/AuthContext";
import type { Projeto } from "../services/projetos.service";
import { ensureDefaultSLAs, type SLA } from "../services/slas.service";
import { Plus, Search, FolderKanban, MoreHorizontal, Users, FileText } from "lucide-react";
import { toast } from "sonner";

export function ProjetosManager() {
  const { projetos, loading, error, create, update, remove, reload } = useProjetos();
  const { demandas } = useDemandas();
  const { teams, currentTeamId } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Projeto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Projeto | null>(null);
  const [search, setSearch] = useState('');
  const [filterSla, setFilterSla] = useState('all');
  const debouncedSearch = useDebounce(search, 300);

  const [slas, setSlas] = useState<SLA[]>([]);
  const [form, setForm] = useState({ nome: '', descricao: '', equipe: '', sla: 'padrao', sla_id: '' });

  useEffect(() => {
    if (!currentTeamId) return;
    ensureDefaultSLAs(currentTeamId).then(setSlas).catch(() => {});
  }, [currentTeamId]);

  const slaMap = useMemo(() => {
    const m: Record<string, SLA> = {};
    slas.forEach(s => { m[s.id] = s; m[s.regime_base] = s; });
    return m;
  }, [slas]);

  const filtered = useMemo(() => {
    return projetos.filter(p => {
      if (debouncedSearch && !p.nome.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
      if (filterSla !== 'all') {
        const projetoSla = p.sla_id ? slaMap[p.sla_id]?.regime_base : p.sla;
        if (projetoSla !== filterSla) return false;
      }
      return true;
    });
  }, [projetos, debouncedSearch, filterSla, slaMap]);

  const { paginatedItems, currentPage, setCurrentPage, totalPages, totalItems } = usePagination(filtered, { pageSize: 20 });

  const demandasPorProjeto = useMemo(() => {
    const map: Record<string, number> = {};
    demandas.forEach(d => {
      const key = d.projeto || '';
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [demandas]);

  const getSlaLabel = (p: Projeto) => {
    if (p.sla_id && slaMap[p.sla_id]) return slaMap[p.sla_id].nome;
    if (p.sla === 'continuo') return 'Contínuo';
    return 'Padrão';
  };

  const getSlaRegime = (p: Projeto) => {
    if (p.sla_id && slaMap[p.sla_id]) return slaMap[p.sla_id].regime_base;
    return p.sla;
  };

  const openCreate = () => {
    const defaultSla = slas.find(s => s.regime_base === 'padrao');
    setForm({ nome: '', descricao: '', equipe: '', sla: 'padrao', sla_id: defaultSla?.id || '' });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (p: Projeto) => {
    setForm({ nome: p.nome, descricao: p.descricao || '', equipe: p.equipe || '', sla: p.sla, sla_id: p.sla_id || '' });
    setEditing(p);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) { toast.error("Preencha os campos obrigatórios"); return; }
    const selectedSla = slas.find(s => s.id === form.sla_id);
    const payload: any = {
      nome: form.nome,
      descricao: form.descricao,
      equipe: form.equipe,
      sla: selectedSla?.regime_base || form.sla,
      sla_id: form.sla_id || null,
    };
    if (editing) {
      await update(editing.id, payload);
    } else {
      await create(payload);
    }
    setShowForm(false);
  };

  if (loading) return <SkeletonList count={4} />;
  if (error) return <div className="text-center py-10 text-destructive">{error} <button onClick={reload} className="underline ml-2">Tentar novamente</button></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Projetos de Sustentação</h2>
          <p className="text-sm text-muted-foreground">Gerencie os projetos e seus SLAs</p>
        </div>
        <Button size="sm" className="bg-info hover:bg-info/90 text-info-foreground" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Novo Projeto</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar projeto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterSla} onValueChange={setFilterSla}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Todos os SLAs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os SLAs</SelectItem>
            {slas.map(s => (
              <SelectItem key={s.id} value={s.regime_base}>{s.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Nenhum projeto encontrado" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedItems.map(p => {
              const regime = getSlaRegime(p);
              return (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm truncate">{p.nome}</h3>
                          {regime === 'continuo' ? (
                            <Badge variant="destructive" className="text-[10px] shrink-0">SLA Contínuo</Badge>
                          ) : (
                            <Badge className="text-[10px] shrink-0 bg-info/10 text-info border-info/20">SLA {getSlaLabel(p)}</Badge>
                          )}
                        </div>
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
                    <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                      {p.equipe && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />Equipe: {p.equipe}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />{demandasPorProjeto[p.nome] || 0} demandas ativas
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <PaginationControls currentPage={currentPage} totalItems={totalItems} pageSize={20} onPageChange={setCurrentPage} />
        </>
      )}

      <Dialog open={showForm} onOpenChange={o => !o && setShowForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
            <DialogDescription>{editing ? 'Atualize as informações do projeto.' : 'Preencha os dados para criar um novo projeto.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome do projeto" /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Equipe</Label>
              <Select value={form.equipe || '_none'} onValueChange={v => setForm(p => ({ ...p, equipe: v === '_none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione uma equipe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhuma</SelectItem>
                  {teams.filter(t => t.module === 'sustentacao').map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>SLA</Label>
              <Select value={form.sla_id || '_legacy'} onValueChange={v => {
                if (v === '_legacy') return;
                const sla = slas.find(s => s.id === v);
                setForm(p => ({ ...p, sla_id: v, sla: sla?.regime_base || 'padrao' }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione o SLA" /></SelectTrigger>
                <SelectContent>
                  {slas.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome} ({s.regime_base === 'continuo' ? '24x7' : '8h-20h seg-sex'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">Define o regime de horas para cálculo de SLA das demandas deste projeto.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button className="bg-info hover:bg-info/90 text-info-foreground" onClick={handleSubmit}>{editing ? 'Salvar' : 'Criar Projeto'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)} onConfirm={() => {
        if (deleteTarget) {
          const count = demandasPorProjeto[deleteTarget.nome] || 0;
          if (count > 0) {
            toast.error(`Não é possível excluir: existem ${count} demanda(s) vinculada(s) a este projeto.`);
            setDeleteTarget(null);
            return;
          }
          remove(deleteTarget.id);
          setDeleteTarget(null);
        }
      }} />
    </div>
  );
}
