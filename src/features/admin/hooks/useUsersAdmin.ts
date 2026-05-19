import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserModuleRole {
  module:    string;
  role_name: string;
}

export interface UserAdmin {
  id:                   string;
  user_id:              string;
  display_name:         string;
  email:                string;
  module_access:        string;   // legado — mantido para fallback
  team_id:              string | null;
  team_name?:           string;
  teams:                { id: string; name: string }[];
  module_roles:         UserModuleRole[];  // NOVO — fonte de verdade
  is_admin:             boolean;
  is_active:            boolean;
  must_change_password: boolean;
  created_at:           string;
}

export function useUsersAdmin() {
  const [users,   setUsers]   = useState<UserAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profilesRes, rolesRes, membersRes, moduleRolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, user_id, display_name, email, module_access, team_id, must_change_password, is_active, created_at")
          .order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("team_members").select("user_id, teams(id, name)"),
        // NOVO: leitura da tabela user_module_roles
        supabase.from("user_module_roles").select("user_id, module, role_name"),
      ]);

      if (profilesRes.error) {
        setError(`Erro ao buscar usuários: ${profilesRes.error.message}`);
        return;
      }

      const profiles    = profilesRes.data    || [];
      const roles       = rolesRes.data       || [];
      const members     = membersRes.data     || [];
      // dual-read: se tabela nova nao existe ainda, cai sem erro
      const moduleRoles = moduleRolesRes.error ? [] : (moduleRolesRes.data || []);

      const adminSet = new Set(
        roles.filter((r: any) => r.role === "admin").map((r: any) => r.user_id)
      );

      // mapa user_id → times
      const teamsMap: Record<string, { id: string; name: string }[]> = {};
      members.forEach((m: any) => {
        if (!m.user_id || !m.teams) return;
        if (!teamsMap[m.user_id]) teamsMap[m.user_id] = [];
        const t = Array.isArray(m.teams) ? m.teams : [m.teams];
        t.forEach((team: any) => {
          if (team?.id && team?.name) teamsMap[m.user_id].push({ id: team.id, name: team.name });
        });
      });

      // mapa user_id → array de { module, role_name }
      const moduleRolesMap: Record<string, UserModuleRole[]> = {};
      moduleRoles.forEach((mr: any) => {
        if (!mr.user_id) return;
        if (!moduleRolesMap[mr.user_id]) moduleRolesMap[mr.user_id] = [];
        moduleRolesMap[mr.user_id].push({ module: mr.module, role_name: mr.role_name });
      });

      setUsers(profiles.map((p: any) => {
        const umr = moduleRolesMap[p.user_id] || [];
        // fallback: se user_module_roles vazio, sintetiza do campo legado
        const fallbackRoles: UserModuleRole[] = umr.length === 0
          ? [{
              module:    p.module_access === "admin" ? "sala_agil" : (p.module_access || "sala_agil"),
              role_name: "member",
            }]
          : umr;

        return {
          id:                   p.id,
          user_id:              p.user_id,
          display_name:         p.display_name || "",
          email:                p.email || "",
          module_access:        p.module_access || "sala_agil",
          team_id:              p.team_id || null,
          team_name:            undefined,
          teams:                teamsMap[p.user_id] || [],
          module_roles:         fallbackRoles,
          is_admin:             adminSet.has(p.user_id),
          is_active:            p.is_active ?? true,
          must_change_password: p.must_change_password ?? false,
          created_at:           p.created_at,
        };
      }));
    } catch (err: any) {
      console.error("[useUsersAdmin] Erro:", err);
      setError("Erro inesperado ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Salva module_roles na nova tabela ─────────────────────────────────────
  const saveModuleRoles = async (userId: string, moduleRoles: UserModuleRole[]) => {
    // Remove todos os registros existentes do usuário
    const { error: delErr } = await supabase
      .from("user_module_roles")
      .delete()
      .eq("user_id", userId);
    if (delErr) throw delErr;

    // Insere os novos
    if (moduleRoles.length > 0) {
      const { error: insErr } = await supabase
        .from("user_module_roles")
        .insert(moduleRoles.map(mr => ({ user_id: userId, module: mr.module, role_name: mr.role_name })));
      if (insErr) throw insErr;
    }

    // Mantém module_access legado como primeiro módulo (compatibilidade)
    const primaryModule = moduleRoles[0]?.module || "sala_agil";
    const legacyValue   = moduleRoles.length > 1 ? "admin" : primaryModule;
    await supabase.from("profiles").update({ module_access: legacyValue }).eq("user_id", userId);
  };

  const update = async (userId: string, data: {
    display_name?:  string;
    module_access?: string;
    team_id?:       string | null;
    is_active?:     boolean;
    module_roles?:  UserModuleRole[];
  }) => {
    try {
      const profileData: Record<string, any> = {};
      if (data.display_name  !== undefined) profileData.display_name  = data.display_name;
      if (data.team_id       !== undefined) profileData.team_id       = data.team_id;
      if (data.is_active     !== undefined) profileData.is_active     = data.is_active;
      if (data.module_access !== undefined) profileData.module_access = data.module_access;

      if (Object.keys(profileData).length > 0) {
        const { error } = await supabase.from("profiles").update(profileData).eq("user_id", userId);
        if (error) throw error;
      }

      if (data.module_roles) {
        await saveModuleRoles(userId, data.module_roles);
      }

      toast.success("Usuário atualizado");
      await load();
      return true;
    } catch (e: any) {
      toast.error("Erro ao atualizar usuário: " + (e?.message ?? ""));
      return false;
    }
  };

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" });
      if (error) { toast.error("Erro ao promover usuário"); return false; }
      toast.success("Usuário promovido a admin");
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) { toast.error("Erro ao remover papel admin"); return false; }
      toast.success("Papel admin removido");
    }
    await load();
    return true;
  };

  const toggleActive = async (userId: string, active: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_active: active }).eq("user_id", userId);
    if (error) { toast.error("Erro ao alterar status"); return false; }
    toast.success(active ? "Usuário reativado" : "Usuário desativado");
    await load();
    return true;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error("Erro ao enviar reset de senha"); return false; }
    toast.success(`Link de reset enviado para ${email}`);
    return true;
  };

  const createUser = async (data: {
    email:         string;
    password:      string;
    display_name:  string;
    module_roles:  UserModuleRole[];
    team_id:       string | null;
  }) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email:   data.email,
        password: data.password,
        options: { data: { display_name: data.display_name } },
      });
      if (authError || !authData.user) {
        toast.error("Erro ao criar usuário: " + authError?.message);
        return false;
      }

      const primaryModule = data.module_roles[0]?.module || "sala_agil";
      const legacyValue   = data.module_roles.length > 1 ? "admin" : primaryModule;

      await supabase.from("profiles").update({
        display_name:         data.display_name,
        module_access:        legacyValue,
        team_id:              data.team_id,
        must_change_password: true,
      }).eq("user_id", authData.user.id);

      await saveModuleRoles(authData.user.id, data.module_roles);

      if (data.team_id) {
        await supabase.from("team_members").upsert({
          user_id: authData.user.id,
          team_id: data.team_id,
        });
      }

      toast.success("Usuário criado com sucesso.");
      await load();
      return true;
    } catch (e: any) {
      toast.error("Erro ao criar usuário: " + (e?.message ?? ""));
      return false;
    }
  };

  return { users, loading, error, reload: load, update, toggleAdmin, toggleActive, resetPassword, createUser };
}
