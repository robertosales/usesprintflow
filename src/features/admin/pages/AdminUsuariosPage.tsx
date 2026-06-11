import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";
import { useUsersAdmin } from "../hooks/useUsersAdmin";
import { useTeamsAdmin } from "../hooks/useTeamsAdmin";
import { UserFormDialog } from "../components/UserFormDialog";
import { UserRolesManager } from "@/components/UserRolesManager";
import { supabase } from "@/integrations/supabase/client";

export function AdminUsuariosPage() {
  const { createUser } = useUsersAdmin();
  const { teams }      = useTeamsAdmin();

  const [dialogOpen,          setDialogOpen]          = useState(false);
  const [isCurrentUserAdmin,  setIsCurrentUserAdmin]  = useState(false);
  const [contractName,        setContractName]        = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      // Verifica se é admin master
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsCurrentUserAdmin(!!roleData);

      // Busca contrato vinculado (funciona para admin_contrato e admin master)
      const { data: uc } = await supabase
        .from("user_contracts")
        .select("contracts(name)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (uc?.contracts) {
        // contracts pode ser objeto ou array dependendo do client gerado
        const name = Array.isArray(uc.contracts)
          ? uc.contracts[0]?.name
          : (uc.contracts as { name: string }).name;
        setContractName(name ?? null);
      }
    });
  }, []);

  return (
    <div className="space-y-4">

      {/* Cabeçalho com subtítulo + badge do contrato */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold">Usuários</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {contractName ? (
              <>
                <span className="text-xs text-muted-foreground">
                  Usuários cadastrados no contrato
                </span>
                <Badge
                  variant="outline"
                  className="gap-1 text-[11px] font-medium text-amber-400 border-amber-400/50 bg-amber-400/5"
                >
                  <FileText className="h-3 w-3" />
                  {contractName}
                </Badge>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                Gerencie usuários, perfis RBAC e módulos de acesso
              </span>
            )}
          </div>
        </div>

        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <UserRolesManager />

      <UserFormDialog
        open={dialogOpen}
        user={null}
        teams={teams}
        isCurrentUserAdmin={isCurrentUserAdmin}
        onClose={() => setDialogOpen(false)}
        onCreate={createUser}
        onUpdate={async () => false}
      />
    </div>
  );
}
