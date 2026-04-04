import { supabase } from "@/integrations/supabase/client";

export interface DemandaEvidencia {
  id: string;
  demanda_id: string;
  fase: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  url_externa: string | null;
  obrigatoria: boolean;
  user_id: string;
  created_at: string;
  profile?: { display_name: string };
}

export async function fetchEvidencias(demandaId: string): Promise<DemandaEvidencia[]> {
  const { data, error } = await supabase
    .from("demanda_evidencias" as any)
    .select("*")
    .eq("demanda_id", demandaId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  
  const items = (data || []) as unknown as DemandaEvidencia[];
  // Fetch profiles
  const userIds = [...new Set(items.map(i => i.user_id))];
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);
    const map = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));
    items.forEach(i => { i.profile = { display_name: map.get(i.user_id) || 'Usuário' }; });
  }
  return items;
}

export async function addEvidencia(params: {
  demanda_id: string;
  fase: string;
  tipo: string;
  titulo: string;
  descricao?: string;
  file_path?: string;
  file_name?: string;
  mime_type?: string;
  url_externa?: string;
  user_id: string;
}) {
  const { error } = await supabase.from("demanda_evidencias" as any).insert(params as any);
  if (error) throw error;
}

export async function removeEvidencia(id: string) {
  const { error } = await supabase.from("demanda_evidencias" as any).delete().eq("id", id);
  if (error) throw error;
}

export async function uploadEvidenciaFile(file: File, demandaId: string): Promise<{ path: string }> {
  const ext = file.name.split('.').pop();
  const path = `evidencias/${demandaId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("attachments").upload(path, file);
  if (error) throw error;
  return { path };
}

// Evidências obrigatórias por fase
export const EVIDENCIAS_OBRIGATORIAS: Record<string, string[]> = {
  nova: ['Evidência do erro / solicitação'],
  teste: ['Registro de testes realizados'],
  aguardando_homologacao: ['Validação em homologação'],
  aceite_final: ['Aceite final do cliente'],
};

// Evidências condicionais por tipo de demanda
export const EVIDENCIAS_CONDICIONAIS: Record<string, Record<string, string[]>> = {
  evolutiva: {
    execucao_dev: ['Script de banco de dados (se aplicável)'],
    producao: ['Log de deploy / evidência de publicação'],
  },
};
