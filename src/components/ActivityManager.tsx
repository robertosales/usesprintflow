import { useState, useMemo } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ListTodo, Plus, Trash2, Pencil, CheckCircle2, RotateCcw, MessageCircle,
  ChevronDown, ChevronRight, Search, X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTotalHoursForHU, ActivityType, ACTIVITY_TYPE_LABELS } from "@/types/sprint";
import { toast } from "sonner";
import { ActivityComments } from "@/components/ActivityComments";
import { FileUploader } from "@/components/FileUploader";
import { PaginationControls } from "@/shared/components/common/Pagination";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { usePagination } from "@/shared/hooks/usePagination";
import { useDebounce } from "@/shared/hooks/useDebounce";

export function ActivityManager() {
  const {
    activities, addActivity, removeActivity, updateActivity, closeActivity, reopenActivity,
    userStories, developers, activeSprint, loading,
  } = useSprint();
  const { currentTeamId, hasPermission } = useAuth();
  const canUpdate = hasPermission("update_tasks");

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("task");
  const [huId, setHuId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [hours, setHours] = useState("4");
  const [startDate, setStartDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const isLimitado = ["task", "bug"].includes(activityType);

  // Filters
  const [searchFilter, setSearchFilter] = useState("");
  const debouncedSearch = useDebounce(searchFilter);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const hasFilters = searchFilter !== "" || typeFilter !== "all" || statusFilter !== "all";
  const clearFilters = () => { setSearchFilter(""); setTypeFilter("all"); setStatusFilter("all"); };

  const sprintStories = activeSprint ? userStories.filter((hu) => hu.sprintId === activeSprint.id) : [];

  const filteredActivities = useMemo(() => {
    let acts = activeSprint ? activities.filter((a) => sprintStories.some((hu) => hu.id === a.huId)) : [];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      acts = acts.filter((a) => a.title.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") acts = acts.filter((a) => a.activityType === typeFilter);
    if (statusFilter === "open") acts = acts.filter((a) => !a.isClosed);
    if (statusFilter === "closed") acts = acts.filter((a) => a.isClosed);
    return acts;
  }, [activities, activeSprint, sprintStories, debouncedSearch, typeFilter, statusFilter]);

  const { paginatedItems: pageActivities, currentPage, setCurrentPage, totalItems, pageSize } = usePagination(filteredActivities, { pageSize: 10 });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Título é obrigatório";
    if (!huId) e.huId = "Selecione uma User Story";
    if (!assigneeId) e.assigneeId = "Selecione um responsável";
    if (!startDate) e.startDate = "Data de início é obrigatória";
    if (!hours || Number(hours) < 1) e.hours = "Horas deve ser no mínimo 1";
    if (isLimitado && Number(hours) > 8) e.hours = "Máximo de 8 horas por atividade";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setActivityType("task"); setHuId(""); setAssigneeId("");
    setHours("4"); setStartDate(""); setErrors({}); setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSubmitting(true);
    try {
      const numHours = Number(hours);
      if (editId) {
        await updateActivity(editId, { title: title.trim(), description: description.trim(), activityType, huId, assigneeId, hours: numHours, startDate });
        toast.success("Alterações salvas com sucesso");
      } else {
        await addActivity({ title: title.trim(), description: description.trim(), activityType, huId, assigneeId, hours: numHours, startDate });
        toast.success("Registro criado com sucesso");
      }
      resetForm();
      setOpen(false);
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (actId: string) => {
    const act = activities.find((a) => a.id === actId);
    if (!act) return;
    setEditId(act.id); setTitle(act.title); setDescription(act.description);
    setActivityType(act.activityType); setHuId(act.huId); setAssigneeId(act.assigneeId);
    setHours(String(act.hours)); setStartDate(act.startDate); setErrors({}); setOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!deleteTarget) return;
    try {
      await removeActivity(deleteTarget);
      toast.success("Registro excluído com sucesso");
    } catch {
      toast.error("Falha ao excluir item");
    }
    setDeleteTarget(null);
  };

  if (loading) return <SkeletonList count={5} variant="row" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <ListTodo className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Atividades</h2>
          <Badge variant="secondary">{totalItems}</Badge>
        </div>

        {canUpdate && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" disabled={sprintStories.length === 0 || developers.length === 0}>
                <Plus className="h-4 w-4" /> Nova Atividade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-primary" />
                  {editId ? "Editar Atividade" : "Nova Atividade"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Título <span className="text-destructive">*</span></Label>
                  <Input value={title} onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: "" })); }} placeholder="Descrição da atividade" className="mt-1" />
                  {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes técnicos, observações..." className="mt-1" />
                </div>
                <div>
                  <Label>Tipo <span className="text-destructive">*</span></Label>
                  <Select value={activityType} onValueChange={(v) => setActivityType(v as ActivityType)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>User Story <span className="text-destructive">*</span></Label>
                  <Select value={huId} onValueChange={(v) => { setHuId(v); setErrors((p) => ({ ...p, huId: "" })); }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a HU" /></SelectTrigger>
                    <SelectContent>
                      {sprintStories.map((hu) => {
                        const used = getTotalHoursForHU(activities, hu.id);
                        return <SelectItem key={hu.id} value={hu.id}>{hu.code} — {hu.title} ({used}/24h)</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                  {errors.huId && <p className="text-xs text-destructive mt-1">{errors.huId}</p>}
                </div>
                <div>
                  <Label>Responsável <span className="text-destructive">*</span></Label>
                  <Select value={assigneeId} onValueChange={(v) => { setAssigneeId(v); setErrors((p) => ({ ...p, assigneeId: "" })); }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                    <SelectContent>
                      {developers.map((dev) => <SelectItem key={dev.id} value={dev.id}>{dev.name} — {dev.role}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.assigneeId && <p className="text-xs text-destructive mt-1">{errors.assigneeId}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Horas estimadas <span className="text-destructive">*</span></Label>
                    <Input type="number" min="1" max={isLimitado ? 8 : undefined} value={hours} onChange={(e) => { setHours(e.target.value); setErrors((p) => ({ ...p, hours: "" })); }} className="mt-1" />
                    {errors.hours && <p className="text-xs text-destructive mt-1">{errors.hours}</p>}
                  </div>
                  <div>
                    <Label>Data início <span className="text-destructive">*</span></Label>
                    <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setErrors((p) => ({ ...p, startDate: "" })); }} className="mt-1" />
                    {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate}</p>}
                  </div>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" /> : <Plus className="h-4 w-4" />}
                  {editId ? "Salvar Alterações" : "Criar Atividade"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={searchFilter} onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }} placeholder="Buscar atividade..." className="pl-8 h-8 text-xs" />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abertas</SelectItem>
            <SelectItem value="closed">Concluídas</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={() => { clearFilters(); setCurrentPage(1); }}>
            <X className="h-3 w-3" /> Limpar
          </Button>
        )}
      </div>

      {(sprintStories.length === 0 || developers.length === 0) && (
        <EmptyState
          icon={ListTodo}
          title={developers.length === 0 ? "Cadastre membros do time primeiro" : "Crie User Stories primeiro"}
        />
      )}

      {sprintStories.length > 0 && developers.length > 0 && totalItems === 0 && (
        <EmptyState
          icon={ListTodo}
          title="Nenhum item encontrado"
          description={hasFilters ? "Tente ajustar os filtros" : "Crie atividades para as User Stories da sprint"}
          actionLabel={!hasFilters && canUpdate ? "Criar novo" : undefined}
          onAction={!hasFilters && canUpdate ? () => setOpen(true) : undefined}
        />
      )}

      <div className="space-y-2">
        {pageActivities.map((act) => {
          const hu = userStories.find((h) => h.id === act.huId);
          const dev = developers.find((d) => d.id === act.assigneeId);
          const typeInfo = ACTIVITY_TYPE_LABELS[act.activityType || "task"];
          const isClosed = !!act.isClosed;
          const isExpanded = expandedComments === act.id;

          return (
            <Card key={act.id} className={`group hover:shadow-md transition-shadow ${isClosed ? "opacity-60" : ""}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs font-bold">{hu?.code}</Badge>
                      <Badge className={`text-[10px] border ${typeInfo.color}`}>{typeInfo.label}</Badge>
                      {isClosed && <Badge className="bg-success/15 text-success border-success/30 text-[10px]">✓ Concluída</Badge>}
                    </div>
                    <span className={`text-sm font-semibold ${isClosed ? "line-through" : ""}`}>{act.title}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{dev?.name || "N/A"}</span>
                      <span>{act.hours}h</span>
                      <span>{new Date(act.startDate).toLocaleDateString("pt-BR")} → {new Date(act.endDate).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Comentários" onClick={() => setExpandedComments(isExpanded ? null : act.id)}>
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
                    {!isClosed ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-success" title="Concluir atividade" onClick={() => { closeActivity(act.id); toast.success("Atividade concluída!"); }}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Reabrir atividade" onClick={() => { reopenActivity(act.id); toast.info("Atividade reaberta"); }}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(act.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(act.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {isExpanded && currentTeamId && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    <FileUploader entityType="activity" entityId={act.id} teamId={currentTeamId} />
                    <ActivityComments activityId={act.id} teamId={currentTeamId} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PaginationControls currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} onConfirm={handleConfirmRemove} />
    </div>
  );
}
