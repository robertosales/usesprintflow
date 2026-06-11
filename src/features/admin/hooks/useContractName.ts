import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna o nome do contrato vinculado ao usuário logado.
 * Usado em todas as pages do Admin para exibir o badge do contrato.
 */
export function useContractName() {
  const [contractName, setContractName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("user_contracts")
        .select("contracts(name)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.contracts) {
        const name = Array.isArray(data.contracts)
          ? data.contracts[0]?.name
          : (data.contracts as { name: string }).name;
        setContractName(name ?? null);
      }
    });
  }, []);

  return contractName;
}
