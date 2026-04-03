import { useState, useMemo } from "react";
import { useSprint } from "@/contexts/SprintContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, Mail, Briefcase, Pencil, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PaginationControls } from "@/shared/components/common/Pagination";
import { EmptyState } from "@/shared/components/common/EmptyState";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { usePagination } from "@/shared/hooks/usePagination";
import { useDebounce } from "@/shared/hooks/useDebounce";

const ROLES = [
  "Analista de Requisitos",
  "Arquiteto de Software",
  "Desenvolvedor Fullstack",
  "Designer UX/UI",
  "QA / Tester",
  "Scrum Master",
];

export function DeveloperManager() {
  const { developers, addDeveloper, removeDeveloper, updateDeveloper, loading } = useSprint();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Search
  const [searchFilter, setSearchFilter] = useState("");
  const debouncedSearch = useDebounce(searchFilter);

  const filteredDevs = useMemo(() => {
    if (!debouncedSearch) return developers;
    const q = debouncedSearch.toLowerCase();
    return developers.filter((d) => d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q));
  }, [developers, debouncedSearch]);

  const { paginatedItems: pageDevelopers, currentPage, setCurrentPage, totalItems, pageSize } = usePagination(filteredDevs, { pageSize: 10 });

  const resetForm = () => { setName(""); setEmail(""); setRole(""); setErrors({}); setEditId(null); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nome é obrigatório";
    if (!email.trim()) e.email = "Email é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Email inválido";
    if (!role) e.role = "Função é obrigatória";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSubmitting(true);
    try {
      if (editId) {
        await updateDeveloper(editId, { name: name.trim(), email: email.trim(), role });
        toast.success("Alterações salvas com sucesso");
      } else {
        await addDeveloper({ name: name.trim(), email: email.trim(), role });
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

  const openEdit = (devId: string) => {
    const dev = developers.find((d) => d.id === devId);
    if (!dev) return;
    setEditId(dev.id); setName(dev.name); setEmail(dev.email); setRole(dev.role); setErrors({}); setOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!deleteTarget) return;
    try {
      await removeDeveloper(deleteTarget);
      toast.success("Registro excluído com sucesso");
    } catch {
      toast.error("Falha ao excluir item");
    }
    setDeleteTarget(null);
  };

  if (loading) return <SkeletonList count={6} variant="card" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Time</h2>
          <Badge variant="secondary">{totalItems}</Badge>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Adicionar Membro</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {editId ? "Editar Membro" : "Novo Membro do Time"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome completo <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }} placeholder="João da Silva" className="mt-1" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
              <div>
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }} placeholder="joao@empresa.com" className="mt-1" />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
              <div>
                <Label>Função <span className="text-destructive">*</span></Label>
                <Select value={role} onValueChange={(v) => { setRole(v); setErrors((p) => ({ ...p, role: "" })); }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-destructive mt-1">{errors.role}</p>}
              </div>
              <Button type="submit" className="w-full gap-2" disabled={submitting}>
                {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" /> : <Plus className="h-4 w-4" />}
                {editId ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-[300px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={searchFilter} onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }} placeholder="Buscar por nome..." className="pl-8 h-8 text-xs" />
        </div>
        {searchFilter && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={() => { setSearchFilter(""); setCurrentPage(1); }}>
            <X className="h-3 w-3" /> Limpar
          </Button>
        )}
      </div>

      {totalItems === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum item encontrado"
          description={searchFilter ? "Tente ajustar a busca" : "Adicione os membros do time para atribuir atividades"}
          actionLabel={!searchFilter ? "Criar novo" : undefined}
          onAction={!searchFilter ? () => setOpen(true) : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pageDevelopers.map((dev) => (
            <Card key={dev.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      {dev.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{dev.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3" /> {dev.email}
                      </p>
                      <Badge variant="outline" className="mt-1.5 text-xs gap-1">
                        <Briefcase className="h-3 w-3" /> {dev.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(dev.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(dev.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationControls currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} onConfirm={handleConfirmRemove} />
    </div>
  );
}
