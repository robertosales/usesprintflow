import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Save, Search } from "lucide-react";
import { fetchAllRoles, getRoleLabel, type AppRole } from "@/hooks/usePermissions";
import { PaginationControls } from "@/shared/components/common/Pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import { useDebounce } from "@/shared/hooks/useDebounce";

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

const MODULE_LABELS: Record<string, string> = {
  sala_agil: "Sala Ágil",
  sustentacao: "Sustentação",
  admin: "Administrador (ambos)",
};

export function UserRolesManager() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<AppRole[]>([]);
  const [pendingModule, setPendingModule] = useState<string>("sala_agil");
  // ✅ NOVO: estado para edição do nome
  const [pendingName, setPendingName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const debouncedSearch = useDebounce(searchFilter);

  // ── Carrega usuários + roles disponíveis ──────────────────────────────────
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

  // ── Filtro + paginação ────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!debouncedSearch) return users;
    const q = debouncedSearch.toLowerCase();
    return users.filter((u) => u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, debouncedSearch]);

  const { paginatedItems, currentPage, setCurrentPage, totalItems, pageSize } = usePagination(filteredUsers, {
    pageSize: 10,
  });

  // ── Edição ────────────────────────────────────────────────────────────────
  function startEditing(user: UserWithRoles) {
    setEditingUser(user.user_id);
    setPendingRoles([...user.roles]);
    setPendingModule(user.module_access);
    // ✅ NOVO: popula o nome atual
    setPendingName(user.display_name === "—" ? "" : user.display_name);
  }

  function cancelEditing() {
    setEditingUser(null);
    setPendingRoles([]);
    // ✅ NOVO: reseta o nome
    setPendingName("");
  }

  function toggleRole(role: AppRole) {
    setPendingRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  // ── Salvar ────────────────────────────────────────────────────────────────
  async function saveRoles(userId: string) {
    const currentUser = users.find((u) => u.user_id === userId);
    if (!currentUser) return;

    // ✅ NOVO: valida que o nome não está vazio
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

      // ✅ NOVO: atualiza nome e/ou módulo se mudaram
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

  // ── Render ────────────────────────────────────────────────────────────────
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
                      <Button size="sm" variant="outline" onClick={() => startEditing(user)}>
                        Editar Perfis
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {isEditing ? (
                    <div className="space-y-4 mt-2">
                      {/* ✅ NOVO: Campo de edição de nome */}
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

                      {/* Perfis — dinâmicos do banco */}
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
    </div>
  );
}
