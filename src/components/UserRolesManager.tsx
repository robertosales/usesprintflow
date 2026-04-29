import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Save, Search, Trash2, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { fetchAllRoles, getRoleLabel, type AppRole } from "@/hooks/usePermissions";
import { PaginationControls } from "@/shared/components/common/Pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import { useDebounce } from "@/shared/hooks/useDebounce";

// ── Configuração das tabelas ──────────────────────────────────────────────
const DEMANDAS_TABLE = "demandas";
const DEMANDAS_USER_COLS = [
  "responsavel_requisitos",
  "responsavel_dev",
  "responsavel_teste",
  "responsavel_arquiteto",
  "aceite_responsavel",
  "demandante",
] as const;
const DEMANDA_RESPONSAVEIS_TABLE = "demanda_responsaveis";

// ── Interfaces ────────────────────────────────────────────────────────────
interface UserWithRoles {
  user_id: string;
  display_name: string;
  email: string;
  roles: AppRole[];
  module_access: string;
}

interface RoleOption {
  name: AppRole;
  label: string;
}

interface DeleteState {
  user: UserWithRoles | null;
  affectedCount: number;
  reassignToId: string;
  checking: boolean;
  deleting: boolean;
}

const DELETE_INITIAL: DeleteState = {
  user: null,
  affectedCount: 0,
  reassignToId: "",
  checking: false,
  deleting: false,
};

const MODULE_LABELS: Record<string, string> = {
  sala_agil: "Sala Ágil",
  sustentacao: "Sustentação",
  admin: "Administrador (ambos)",
};

// ── Componente ────────────────────────────────────────────────────────────
export function UserRolesManager() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<AppRole[]>([]);
  const [pendingModule, setPendingModule] = useState<string>("sala_agil");
  const [pendingName, setPendingName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const debouncedSearch = useDebounce(searchFilter);
  const [deleteState, setDeleteState] = useState<DeleteState>(DELETE_INITIAL);

  // ── Carrega usuários + roles disponíveis ────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, userRolesRes, rolesFromBank] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, email, module_access"),
        supabase.from("user_roles").select("user_id, role"),
        fetchAllRoles(),
      ]);

      const profileList = (profilesRes.data || []) as any[];
      const userRoleList = (userRolesRes.data || []) as any[];

      setAvailableRoles(rolesFromBank.map((r) => ({ name: r.name as AppRole, label: r.label })));

      setUsers(
        profileList.map((p: any) => ({
          user_id: p.user_id,
          display_name: p.display_name || "—",
          email: p.email || "",
          module_access: p.module_access || "sala_agil",
          roles: userRoleList.filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role as AppRole),
        })),
      );
    } catch {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Filtro + paginação ──────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!debouncedSearch) return users;
    const q = debouncedSearch.toLowerCase();
    return users.filter((u) => u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, debouncedSearch]);

  const { paginatedItems, currentPage, setCurrentPage, totalItems, pageSize } = usePagination(filteredUsers, {
    pageSize: 10,
  });

  // ── Edição ──────────────────────────────────────────────────────────────
  function startEditing(user: UserWithRoles) {
    setEditingUser(user.user_id);
    setPendingRoles([...user.roles]);
    setPendingModule(user.module_access);
    setPendingName(user.display_name === "—" ? "" : user.display_name);
  }

  function cancelEditing() {
    setEditingUser(null);
    setPendingRoles([]);
    setPendingName("");
  }

  function toggleRole(role: AppRole) {
    setPendingRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  // ── Salvar edição ───────────────────────────────────────────────────────
  async function saveRoles(userId: string) {
    const currentUser = users.find((u) => u.user_id === userId);
    if (!currentUser) return;

    const trimmedName = pendingName.trim();
    if (!trimmedName) {
      toast.error("O nome não pode estar vazio");
      return;
    }

    setSaving(true);
    try {
      const toRemove = currentUser.roles.filter((r) => !pendingRoles.includes(r));
      const toAdd = pendingRoles.filter((r) => !currentUser.roles.includes(r));

      for (const role of toRemove) {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role as any);
      }
      for (const role of toAdd) {
        await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      }

      const nameChanged = trimmedName !== currentUser.display_name && trimmedName !== "—";
      const moduleChanged = currentUser.module_access !== pendingModule;

      if (nameChanged || moduleChanged) {
        await supabase
          .from("profiles")
          .update({
            ...(nameChanged && { display_name: trimmedName }),
            ...(moduleChanged && { module_access: pendingModule }),
          })
          .eq("user_id", userId);
      }

      toast.success("Perfis atualizados com sucesso!");
      setEditingUser(null);
      setPendingName("");
      await fetchUsers();
    } catch {
      toast.error("Erro ao salvar perfis");
    } finally {
      setSaving(false);
    }
  }

  // ── Exclusão: abre modal e verifica vínculos ────────────────────────────
  async function handleDeleteClick(user: UserWithRoles) {
    setDeleteState({ ...DELETE_INITIAL, user, checking: true });

    try {
      const orFilter = DEMANDAS_USER_COLS.map((col) => `${col}.eq.${user.user_id}`).join(",");

      const [directRes, relationalRes] = await Promise.all([
        supabase.from(DEMANDAS_TABLE).select("*", { count: "exact", head: true }).or(orFilter),
        supabase
          .from(DEMANDA_RESPONSAVEIS_TABLE)
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.user_id),
      ]);

      if (directRes.error) throw directRes.error;
      if (relationalRes.error) throw relationalRes.error;

      const totalAffected = (directRes.count ?? 0) + (relationalRes.count ?? 0);

      setDeleteState((prev) => ({
        ...prev,
        affectedCount: totalAffected,
        checking: false,
      }));
    } catch {
      toast.error("Erro ao verificar demandas do usuário");
      setDeleteState(DELETE_INITIAL);
    }
  }

  // ── Exclusão: confirma com transferência completa ───────────────────────
  async function confirmDelete() {
    const { user, affectedCount, reassignToId } = deleteState;
    if (!user) return;

    if (affectedCount > 0 && !reassignToId) {
      toast.error("Selecione um usuário para transferir as demandas");
      return;
    }

    setDeleteState((prev) => ({ ...prev, deleting: true }));

    try {
      if (affectedCount > 0 && reassignToId) {
        // 1a. Transfere colunas diretas em demandas
        for (const col of DEMANDAS_USER_COLS) {
          const { error } = await supabase
            .from(DEMANDAS_TABLE)
            .update({ [col]: reassignToId })
            .eq(col, user.user_id);
          if (error) throw new Error(`Erro ao transferir coluna ${col}: ${error.message}`);
        }

        // 1b. Transfere linhas em demanda_responsaveis (com deduplicação)
        const { data: relRows, error: fetchRelError } = await supabase
          .from(DEMANDA_RESPONSAVEIS_TABLE)
          .select("id, demanda_id, papel")
          .eq("user_id", user.user_id);

        if (fetchRelError) throw new Error(`Erro ao buscar responsáveis: ${fetchRelError.message}`);

        for (const row of relRows ?? []) {
          const { count } = await supabase
            .from(DEMANDA_RESPONSAVEIS_TABLE)
            .select("*", { count: "exact", head: true })
            .eq("demanda_id", row.demanda_id)
            .eq("user_id", reassignToId)
            .eq("papel", row.papel);

          if ((count ?? 0) > 0) {
            const { error } = await supabase.from(DEMANDA_RESPONSAVEIS_TABLE).delete().eq("id", row.id);
            if (error) throw new Error(`Erro ao remover duplicata: ${error.message}`);
          } else {
            const { error } = await supabase
              .from(DEMANDA_RESPONSAVEIS_TABLE)
              .update({ user_id: reassignToId })
              .eq("id", row.id);
            if (error) throw new Error(`Erro ao transferir responsável: ${error.message}`);
          }
        }
      }

      // 2. Remove todos os roles
      const { error: rolesError } = await supabase.from("user_roles").delete().eq("user_id", user.user_id);
      if (rolesError) throw new Error(`Erro ao remover roles: ${rolesError.message}`);

      // 3. Remove o perfil
      const { error: profileError } = await supabase.from("profiles").delete().eq("user_id", user.user_id);
      if (profileError) throw new Error(`Erro ao excluir perfil: ${profileError.message}`);

      toast.success(
        affectedCount > 0
          ? `Usuário excluído e ${affectedCount} vínculo(s) transferido(s) com sucesso!`
          : "Usuário excluído com sucesso!",
      );

      setDeleteState(DELETE_INITIAL);
      await fetchUsers();
    } catch (err: any) {
      // Exibe a mensagem real do erro para facilitar o diagnóstico
      toast.error(err?.message || "Erro ao excluir usuário");
      setDeleteState((prev) => ({ ...prev, deleting: false }));
    }
  }

  // ── Usuários disponíveis para reassociação ──────────────────────────────
  const reassignOptions = useMemo(
    () => users.filter((u) => u.user_id !== deleteState.user?.user_id),
    [users, deleteState.user],
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> Gestão de Perfis
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Atribua perfis de acesso (RBAC) e módulo para cada usuário</p>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Lista de usuários */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {paginatedItems.map((user) => {
            const isEditing = editingUser === user.user_id;

            return (
              <Card key={user.user_id}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
                      {(user.display_name[0] || "U").toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{user.display_name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center shrink-0">
                    <Badge variant="outline" className="text-[10px]">
                      {MODULE_LABELS[user.module_access] || user.module_access}
                    </Badge>

                    {isEditing ? (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" className="text-xs" onClick={cancelEditing} disabled={saving}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={() => saveRoles(user.user_id)} disabled={saving}>
                          {saving ? (
                            <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                          ) : (
                            <Save className="h-3.5 w-3.5 mr-1" />
                          )}
                          Salvar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => startEditing(user)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                          onClick={() => handleDeleteClick(user)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {isEditing ? (
                    <div className="space-y-4 mt-2">
                      {/* Nome de Exibição */}
                      <div className="max-w-xs">
                        <Label className="text-xs font-semibold">Nome de Exibição</Label>
                        <Input
                          value={pendingName}
                          onChange={(e) => setPendingName(e.target.value)}
                          placeholder="Nome do usuário"
                          className="h-8 mt-1 text-xs"
                          maxLength={80}
                        />
                      </div>

                      {/* Módulo */}
                      <div className="max-w-xs">
                        <Label className="text-xs font-semibold">Módulo de Acesso</Label>
                        <Select value={pendingModule} onValueChange={setPendingModule}>
                          <SelectTrigger className="h-8 mt-1 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sala_agil">Sala Ágil</SelectItem>
                            <SelectItem value="sustentacao">Sustentação</SelectItem>
                            <SelectItem value="admin">Administrador (ambos)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Perfis */}
                      <div>
                        <Label className="text-xs font-semibold">Perfis</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                          {availableRoles.map((r) => (
                            <label key={r.name} className="flex items-center gap-2 text-sm cursor-pointer group">
                              <Checkbox
                                checked={pendingRoles.includes(r.name)}
                                onCheckedChange={() => toggleRole(r.name)}
                              />
                              <span className="group-hover:text-foreground transition-colors text-xs">{r.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {availableRoles.find((r) => r.name === role)?.label || getRoleLabel(role)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem perfil atribuído</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredUsers.length === 0 && !loading && (
        <Card className="border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">Nenhum usuário encontrado.</p>
        </Card>
      )}

      <PaginationControls
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      {/* ── Modal de exclusão / reassociação ────────────────────────────── */}
      <Dialog
        open={!!deleteState.user}
        onOpenChange={(open) => {
          if (!open && !deleteState.deleting) setDeleteState(DELETE_INITIAL);
        }}
      >
        <DialogContent className="max-w-md">
          {deleteState.checking ? (
            // Verificando vínculos...
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground">Verificando demandas atribuídas...</p>
            </div>
          ) : deleteState.affectedCount > 0 ? (
            // Há vínculos → pede reassociação
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <ArrowRightLeft className="h-4 w-4" />
                  Transferir demandas antes de excluir
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-3 pt-1">
                    <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        O usuário <span className="font-semibold">{deleteState.user?.display_name}</span> possui{" "}
                        <span className="font-semibold">{deleteState.affectedCount} vínculo(s)</span> em demandas.
                        Selecione um novo responsável antes de excluir.
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Transferir responsabilidades para</Label>
                      <Select
                        value={deleteState.reassignToId}
                        onValueChange={(v) => setDeleteState((prev) => ({ ...prev, reassignToId: v }))}
                      >
                        <SelectTrigger className="h-8 mt-1 text-xs">
                          <SelectValue placeholder="Selecione um usuário..." />
                        </SelectTrigger>
                        <SelectContent>
                          {reassignOptions.map((u) => (
                            <SelectItem key={u.user_id} value={u.user_id}>
                              {u.display_name}
                              {u.email ? ` — ${u.email}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteState(DELETE_INITIAL)}
                  disabled={deleteState.deleting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={confirmDelete}
                  disabled={deleteState.deleting || !deleteState.reassignToId}
                >
                  {deleteState.deleting ? (
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  Transferir e Excluir
                </Button>
              </DialogFooter>
            </>
          ) : (
            // Sem vínculos → confirmação simples
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Excluir usuário
                </DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja excluir{" "}
                  <span className="font-semibold text-foreground">{deleteState.user?.display_name}</span>? Esta ação não
                  pode ser desfeita.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteState(DELETE_INITIAL)}
                  disabled={deleteState.deleting}
                >
                  Cancelar
                </Button>
                <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={deleteState.deleting}>
                  {deleteState.deleting ? (
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                  )}
                  Confirmar Exclusão
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
