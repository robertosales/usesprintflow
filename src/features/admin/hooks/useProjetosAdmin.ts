import { useCallback, useEffect, useState } from 'react';
import { projectsService, type ProjetoAdmin } from '../services/projects.service';
import { supabase } from '@/integrations/supabase/client';

/**
 * contractId: quando fornecido, retorna apenas projetos desse contrato.
 * null = todos os projetos.
 */
export function useProjetosAdmin(contractId?: string | null) {
  const [projetos, setProjetos] = useState<ProjetoAdmin[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let query = (supabase as any)
        .from('projects')
        .select(`
          id, name, description, code, status, module_type,
          contract_id, team_id, redmine_id,
          legacy_projetos_id,
          contracts(name),
          teams(name)
        `)
        .eq('status', 'active')
        .order('name');

      if (contractId) query = query.eq('contract_id', contractId);

      const { data, error: err } = await query;
      if (err) throw err;

      setProjetos((data ?? []).map((p: any) => ({
        id:               p.id,
        name:             p.name,
        description:      p.description,
        code:             p.code,
        status:           p.status,
        module_type:      p.module_type,
        contract_id:      p.contract_id,
        contract_name:    p.contracts?.name ?? null,
        team_id:          p.team_id,
        team_name:        p.teams?.name ?? null,
        redmine_id:       p.redmine_id,
        legacy_projetos_id: p.legacy_projetos_id,
      })));
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar projetos');
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => { load(); }, [load]);

  const create  = (payload: any) => projectsService.create(payload).then(() => load());
  const update  = (id: string, payload: any) => projectsService.update(id, payload).then(() => load());
  const archive = (id: string) => projectsService.archive(id).then(() => load());

  return { projetos, loading, error, reload: load, create, update, archive };
}
