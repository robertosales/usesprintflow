import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Save } from "lucide-react";
import { ALL_ROLES, getRoleLabel, type AppRole } from "@/hooks/usePermissions";

interface UserWithRoles {
  user_id: string;
  display_name: string;
  email: string;
  roles: AppRole[];
  module_access: string;
}

export function UserRolesManager() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<AppRole[]>([]);
  const [pendingModule, setPendingModule] = useState<string>('sala_agil');
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email, module_access");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    const profileList = profiles || [];
    const roleList = roles || [];

    setUsers(
      profileList.map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        email: p.email,
        module_access: p.module_access || 'sala_agil',
        roles: roleList
          .filter((r: any) => r.user_id === p.user_id)
          .map((r: any) => r.role as AppRole),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const startEditing = (user: UserWithRoles) => {
    setEditingUser(user.user_id);
    setPendingRoles([...user.roles]);
    setPendingModule(user.module_access);
  };

  const toggleRole = (role: AppRole) => {
    setPendingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const saveRoles = async (userId: string) => {
    const currentUser = users.find((u) => u.user_id === userId);
    if (!currentUser) return;

    const toRemove = currentUser.roles.filter((r) => !pendingRoles.includes(r));
    const toAdd = pendingRoles.filter((r) => !currentUser.roles.includes(r));

    for (const role of toRemove) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    }
    for (const role of toAdd) {
      await supabase.from("user_roles").insert({ user_id: userId, role });
    }

    if (currentUser.module_access !== pendingModule) {
      await supabase.from("profiles").update({ module_access: pendingModule }).eq("user_id", userId);
    }

    toast.success("Perfis atualizados!");
    setEditingUser(null);
    await fetchUsers();
  };

  const MODULE_LABELS: Record<string, string> = {
    sala_agil: 'Sala Ágil',
    sustentacao: 'Sustentação',
    admin: 'Administrador (ambos)',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> Gestão de Perfis
        </h2>
        <p className="text-sm text-muted-foreground">
          Atribua perfis de acesso (RBAC) e módulo para cada usuário
        </p>
      </div>

      <div className="grid gap-4">
        {users.map((user) => {
          const isEditing = editingUser === user.user_id;
          return (
            <Card key={user.user_id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    {user.display_name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant="outline" className="text-[10px]">{MODULE_LABELS[user.module_access] || user.module_access}</Badge>
                  {isEditing ? (
                    <Button size="sm" onClick={() => saveRoles(user.user_id)}>
                      <Save className="h-4 w-4 mr-1" /> Salvar
                    </Button>
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
                    <div>
                      <Label className="text-xs font-semibold">Módulo de Acesso</Label>
                      <Select value={pendingModule} onValueChange={setPendingModule}>
                        <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sala_agil">Sala Ágil</SelectItem>
                          <SelectItem value="sustentacao">Sustentação</SelectItem>
                          <SelectItem value="admin">Administrador (ambos)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Perfis</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                        {ALL_ROLES.map((role) => (
                          <label key={role} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={pendingRoles.includes(role)}
                              onCheckedChange={() => toggleRole(role)}
                            />
                            {getRoleLabel(role)}
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
                          {getRoleLabel(role)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sem perfil atribuído
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {users.length === 0 && !loading && (
        <Card className="border-dashed p-8 text-center">
          <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
        </Card>
      )}
    </div>
  );
}
