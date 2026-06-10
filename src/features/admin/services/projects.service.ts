/**
 * projects.service.ts
 * Fase 5c: CRUD em public.projects (tabela nova).
 * Interface ProjetoAdmin é compatível com Projeto (sustentacao) via mapeamento.
 */
import { supabase } from '@/integrations/supabase/client';

export interface ProjetoAdmin {
  id:                  string;
  contract_id:         string | null;
  team_id:             string | null;
  name:                string;
  description:         string | null;
  code:                string | null;
  module_type:         'sustenance' | 'agile' | 'mixed';
  status:              'active' | 'paused' | 'archived';
  redmine_id:          number | null;
  sla_id:              string | null;
  legacy_projetos_id:  string | null;
  created_at:          string;
  updated_at:          string;
  // joins opcionais
  contract_name?:      string | null;
  team_name?:          string | null;
  demandas_count?:     number;
}

export async function fetchProjetosAdmin(): Promise<ProjetoAdmin[]> {
  const { data, error } = await (supabase as any)
    .from('projects')
    .select(`
      id, contract_id, team_id, name, description, code,
      module_type, status, redmine_id, sla_id, legacy_projetos_id,
      created_at, updated_at,
      contracts ( name ),
      teams     ( name )
    `)
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return ((data ?? []) as any[]).map((p: any) => ({
    ...p,
    contract_name: p.contracts?.name ?? null,
    team_name:     p.teams?.name     ?? null,
    contracts:     undefined,
    teams:         undefined,
  })) as ProjetoAdmin[];
}

export async function createProjetoAdmin(payload: {
  contract_id:  string;
  team_id:      string | null;
  name:         string;
  description?: string | null;
  code?:        string | null;
  module_type:  string;
  redmine_id?:  number | null;
}): Promise<ProjetoAdmin> {
  const { data, error } = await (supabase as any)
    .from('projects')
    .insert({ ...payload, status: 'active' })
    .select()
    .single();
  if (error) throw error;
  return data as ProjetoAdmin;
}

export async function updateProjetoAdmin(
  id: string,
  updates: Partial<ProjetoAdmin>,
): Promise<ProjetoAdmin> {
  const { data, error } = await (supabase as any)
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ProjetoAdmin;
}

export async function archiveProjetoAdmin(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('projects')
    .update({ status: 'archived' })
    .eq('id', id);
  if (error) throw error;
}
