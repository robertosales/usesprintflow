import os
os.makedirs(os.path.expanduser('~/output'), exist_ok=True)

# ─── types/demanda.ts ────────────────────────────────────────────────────────
demanda_ts = '''// ─────────────────────────────────────────────────────────────────────────────
// types/demanda.ts — Novo fluxo de 11 etapas
// ─────────────────────────────────────────────────────────────────────────────

export type DemandaTipo = 'corretiva' | 'evolutiva' | 'manutencao_corretiva';
export type DemandaSLA  = '24x7' | 'padrao' | 'continuo';

// ── Fluxo principal sequencial (sem desvios) ─────────────────────────────────
export const FLOW_PRINCIPAL = [
  'fila_atendimento',
  'planejamento_elaboracao',
  'planejamento_ag_aprovacao',
  'planejamento_aprovada',
  'em_execucao',
  'hom_ag_homologacao',
  'hom_homologada',
  'fila_producao',
  'ag_aceite_final',
] as const;

// ── Todos os status possíveis (inclui desvios) ───────────────────────────────
export const ALL_SITUACOES = [
  'fila_atendimento',
  'planejamento_elaboracao',
  'planejamento_ag_aprovacao',
  'planejamento_aprovada',
  'em_execucao',
  'bloqueada',
  'hom_ag_homologacao',
  'hom_homologada',
  'rejeitada',
  'fila_producao',
  'ag_aceite_final',
  'cancelada',
] as const;

export type DemandaSituacao = typeof ALL_SITUACOES[number];

// ── Labels exibidos na UI ────────────────────────────────────────────────────
export const SITUACAO_LABELS: Record<string, string> = {
  fila_atendimento:          'Fila de Atendimento',
  planejamento_elaboracao:   'Planejamento: Em Elaboração',
  planejamento_ag_aprovacao: 'Planejamento: Ag. Aprovação',
  planejamento_aprovada:     'Planejamento: Aprovada p/ Exec',
  em_execucao:               'Em Execução',
  bloqueada:                 'Bloqueada',
  hom_ag_homologacao:        'Hom: Ag. Homologação',
  hom_homologada:            'Hom: Homologada',
  rejeitada:                 'Rejeitada',
  fila_producao:             'Fila para Produção (Infra)',
  ag_aceite_final:           'Ag. Aceite Final',
  cancelada:                 'Cancelada',
};

// ── Classes de cor para badges ───────────────────────────────────────────────
export const SITUACAO_COLORS: Record<string, string> = {
  fila_atendimento:          'bg-slate-100 text-slate-700 border-slate-300',
  planejamento_elaboracao:   'bg-blue-100 text-blue-700 border-blue-300',
  planejamento_ag_aprovacao: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  planejamento_aprovada:     'bg-violet-100 text-violet-700 border-violet-300',
  em_execucao:               'bg-amber-100 text-amber-700 border-amber-300',
  bloqueada:                 'bg-red-100 text-red-700 border-red-300',
  hom_ag_homologacao:        'bg-cyan-100 text-cyan-700 border-cyan-300',
  hom_homologada:            'bg-teal-100 text-teal-700 border-teal-300',
  rejeitada:                 'bg-rose-100 text-rose-800 border-rose-300',
  fila_producao:             'bg-orange-100 text-orange-700 border-orange-300',
  ag_aceite_final:           'bg-emerald-100 text-emerald-700 border-emerald-300',
  cancelada:                 'bg-gray-200 text-gray-700 border-gray-300',
};

// ── Fases para lançamento de horas ──────────────────────────────────────────
export const FASES = [
  'analise',
  'planejamento',
  'execucao',
  'homologacao',
  'producao',
] as const;

export const FASE_LABELS: Record<string, string> = {
  analise:      'Análise',
  planejamento: 'Planejamento',
  execucao:     'Execução',
  homologacao:  'Homologação',
  producao:     'Produção',
};

// ── Status que exigem justificativa ─────────────────────────────────────────
export const REQUIRES_JUSTIFICATIVA = [
  'rejeitada',
  'cancelada',
  'planejamento_ag_aprovacao',
] as const;

// ── Status terminais (não permitem mais edição/movimentação) ─────────────────
export const TERMINAL_STATUSES = [
  'ag_aceite_final',
  'cancelada',
] as const;

// ── Status de desvio ─────────────────────────────────────────────────────────
export const SITUACOES_DESVIO = ['bloqueada', 'rejeitada'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface Demanda {
  id:                 string;
  team_id:            string;
  rhm:                string;
  projeto:            string;
  tipo:               DemandaTipo;
  situacao:           string;
  descricao:          string;
  sla:                DemandaSLA;
  responsavel_requisitos?: string | null;
  responsavel_dev?:        string | null;
  responsavel_teste?:      string | null;
  responsavel_arquiteto?:  string | null;
  aceite_data?:            string | null;
  aceite_responsavel?:     string | null;
  created_at:         string;
  updated_at:         string;
}

export interface DemandaTransition {
  id:           string;
  demanda_id:   string;
  from_status:  string | null;
  to_status:    string;
  user_id:      string;
  justificativa: string | null;
  created_at:   string;
}

export interface DemandaHour {
  id:         string;
  demanda_id: string;
  user_id:    string;
  horas:      number;
  fase:       string;
  descricao:  string;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Verifica se a demanda já foi iniciada (saiu de fila_atendimento) */
export function isDemandaIniciada(demanda: Demanda): boolean {
  return demanda.situacao !== 'fila_atendimento';
}

/** Retorna o responsável ativo de acordo com a etapa atual */
export function getResponsavelAtivo(demanda: Demanda): string | null {
  const s = demanda.situacao;
  if (['fila_atendimento', 'planejamento_elaboracao', 'planejamento_ag_aprovacao', 'planejamento_aprovada'].includes(s))
    return demanda.responsavel_requisitos ?? null;
  if (['em_execucao', 'bloqueada', 'fila_producao'].includes(s))
    return demanda.responsavel_dev ?? null;
  if (['hom_ag_homologacao', 'hom_homologada'].includes(s))
    return demanda.responsavel_arquiteto ?? null;
  return null;
}

// ── Compatibilidade legada (evita quebrar imports existentes) ────────────────
/** @deprecated Use FLOW_PRINCIPAL */
export const SITUACOES_CORRETIVA = ALL_SITUACOES;
/** @deprecated Use FLOW_PRINCIPAL */
export const SITUACOES_EVOLUTIVA_PREFIX: readonly string[] = [];
/** @deprecated Use ALL_SITUACOES */
export const BOARD_COLUMNS_CORRETIVA = ALL_SITUACOES;
/** @deprecated Use ALL_SITUACOES */
export const BOARD_COLUMNS_EVOLUTIVA = ALL_SITUACOES;
'''

with open(os.path.expanduser('~/output/demanda.ts'), 'w') as f:
    f.write(demanda_ts)
print("demanda.ts:", demanda_ts.count('\n'), "linhas")+ID0gewogIGZpbGFfYXRlbmRpbWVudG86ICJiZy1zbGF0ZS0xMDAgdGV4dC1zbGF0ZS03MDAgYm9yZGVyLXNsYXRlLTMwMCIsCiAgcGxhbmVqYW1lbnRvX2VsYWJvcmFjYW86ICJiZy1ibHVlLTEwMCB0ZXh0LWJsdWUtNzAwIGJvcmRlci1ibHVlLTMwMCIsCiAgcGxhbmVqYW1lbnRvX2FnX2Fwcm92YWNhbzogImJnLWluZGlnby0xMDAgdGV4dC1pbmRpZ28tNzAwIGJvcmRlci1pbmRpZ28tMzAwIiwKICBwbGFuZWphbWVudG9fYXByb3ZhZGE6ICJiZy12aW9sZXQtMTAwIHRleHQtdmlvbGV0LTcwMCBib3JkZXItdmlvbGV0LTMwMCIsCiAgZW1fZXhlY3VjYW86ICJiZy1hbWJlci0xMDAgdGV4dC1hbWJlci03MDAgYm9yZGVyLWFtYmVyLTMwMCIsCiAgYmxvcXVlYWRhOiAiYmctcmVkLTEwMCB0ZXh0LXJlZC03MDAgYm9yZGVyLXJlZC0zMDAiLAogIGhvbV9hZ19ob21vbG9nYWNhbzogImJnLWN5YW4tMTAwIHRleHQtY3lhbi03MDAgYm9yZGVyLWN5YW4tMzAwIiwKICBob21faG9tb2xvZ2FkYTogImJnLXRlYWwtMTAwIHRleHQtdGVhbC03MDAgYm9yZGVyLXRlYWwtMzAwIiwKICByZWplaXRhZGE6ICJiZy1yb3NlLTEwMCB0ZXh0LXJvc2UtODAwIGJvcmRlci1yb3NlLTMwMCIsCiAgZmlsYV9wcm9kdWNhbzogImJnLW9yYW5nZS0xMDAgdGV4dC1vcmFuZ2UtNzAwIGJvcmRlci1vcmFuZ2UtMzAwIiwKICBhZ19hY2VpdGVfZmluYWw6ICJiZy1lbWVyYWxkLTEwMCB0ZXh0LWVtZXJhbGQtNzAwIGJvcmRlci1lbWVyYWxkLTMwMCIsCiAgY2FuY2VsYWRhOiAiYmctZ3JheS0yMDAgdGV4dC1ncmF5LTcwMCBib3JkZXItZ3JheS0zMDAiLAp9OwoKLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACi8vIENvbHVuYXMgZGUgQm9hcmQgKEthbmJhbikKLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACgovKiogVG9kYXMgYXMgY29sdW5hcyBkbyBib2FyZCDigJQgaWd1YWwgcGFyYSB0b2RvcyBvcyB0aXBvcyBkZSBkZW1hbmRhICovCmV4cG9ydCBjb25zdCBCT0FSRF9DT0xVTU5TID0gRkxPV19QUklOQ0lQQUw7CgovKioKICogQGRlcHJlY2F0ZWQgVXNlIEJPQVJEX0NPTFVNTlMg4oCUIG1hbnRpZG8gcGFyYSBjb21wYXRpYmlsaWRhZGUuCiAqLwpleHBvcnQgY29uc3QgQk9BUkRfQ09MVU1OU19DT1JSRVRJVkEgPSBCT0FSRF9DT0xVTU5TOwovKiogQGRlcHJlY2F0ZWQgKi8KZXhwb3J0IGNvbnN0IEJPQVJEX0NPTFVNTlNfRVZPTFVUSVZBID0gQk9BUkRfQ09MVU1OUzsKCi8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgAovLyBGYXNlcyBkZSBsYW7Dp2FtZW50byBkZSBob3JhcwovLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKCmV4cG9ydCBjb25zdCBGQVNFUyA9IFsiYW5hbGlzZSIsICJwbGFuZWphbWVudG8iLCAiZXhlY3VjYW8iLCAiaG9tb2xvZ2FjYW8iLCAiaW1wbGFudGFjYW8iXSBhcyBjb25zdDsKCmV4cG9ydCBjb25zdCBGQVNFX0xBQkVMUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsKICBhbmFsaXNlOiAiQW7DoWxpc2UiLAogIHBsYW5lamFtZW50bzogIlBsYW5lamFtZW50byIsCiAgZXhlY3VjYW86ICJFeGVjdcOnw6NvIiwKICBob21vbG9nYWNhbzogIkhvbW9sb2dhw6fDo28iLAogIGltcGxhbnRhY2FvOiAiSW1wbGFudGHDp8OjbyIsCn07CgovLyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIAKLy8gUmVncmFzIGRlIHRyYW5zacOnw6NvCi8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgAoKLyoqIFRyYW5zacOnw7VlcyBxdWUgZXhpZ2VtIHByZWVuY2hpbWVudG8gZGUganVzdGlmaWNhdGl2YSAqLwpleHBvcnQgY29uc3QgUkVRVUlSRVNfSlVTVElGSUNBVElWQTogc3RyaW5nW10gPSBbImJsb3F1ZWFkYSIsICJyZWplaXRhZGEiLCAiY2FuY2VsYWRhIiwgInBsYW5lamFtZW50b19hZ19hcHJvdmFjYW8iXTsKCi8qKgogKiBTdGF0dXMgdGVybWluYWlzIOKAlCBhIGRlbWFuZGEgbsOjbyBwb2RlIHNlciBlZGl0YWRhIG5lbSBtb3ZpZGEgYSBwYXJ0aXIgZGVsZXMuCiAqIGBhZ19hY2VpdGVfZmluYWxgIMOpIG8gZW5jZXJyYW1lbnRvIG5vcm1hbDsgYGNhbmNlbGFkYWAgw6kgbyBlbmNlcnJhbWVudG8gZm9yw6dhZG8uCiAqLwpleHBvcnQgY29uc3QgVEVSTUlOQUxfU1RBVFVTRVMgPSBbImFnX2FjZWl0ZV9maW5hbCIsICJjYW5jZWxhZGEiXSBhcyBjb25zdDsKCi8qKiBTdGF0dXMgcXVlIGF0aXZhbSBtb2RhbCBkZSBibG9xdWVpby9zdXNwZW5zw6NvICovCmV4cG9ydCBjb25zdCBTVVNQRU5TQU9fU1RBVFVTRVM6IHN0cmluZ1tdID0gWyJibG9xdWVhZGEiXTsKCi8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgAovLyBIZWxwZXJzCi8vIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgAoKLyoqIFJldG9ybmEgdHJ1ZSBzZSBhIGRlbWFuZGEgasOhIGZvaSBpbmljaWFkYSAoc2FpdSBkZSBmaWxhX2F0ZW5kaW1lbnRvKSAqLwpleHBvcnQgZnVuY3Rpb24gaXNEZW1hbmRhSW5pY2lhZGEoZGVtYW5kYTogeyBzaXR1YWNhbzogc3RyaW5nIH0pOiBib29sZWFuIHsKICByZXR1cm4gZGVtYW5kYS5zaXR1YWNhbyAhPT0gImZpbGFfYXRlbmRpbWVudG8iOwp9CgovKioKICogUmV0b3JuYSBvIHJlc3BvbnPDoXZlbCBhdGl2byBjb20gYmFzZSBuYSBldGFwYSBhdHVhbC4KICogLSByZXF1aXNpdG9zICDihpIgZXRhcGFzIGRlIHBsYW5lamFtZW50bwogKiAtIGRldiAgICAgICAgIOKGkiBleGVjdcOnw6NvIGUgZGVzdmlvcyB0w6ljbmljb3MKICogLSBhcnF1aXRldG8gICDihpIgaG9tb2xvZ2HDp8OjbwogKiAtIGdlc3RvciAgICAgIOKGkiBhZ3VhcmRhbmRvIGFjZWl0ZQogKi8KZXhwb3J0IGZ1bmN0aW9uIGdldFJlc3BvbnNhdmVsQXRpdm8oZGVtYW5kYTogewogIHNpdHVhY2FvOiBzdHJpbmc7Cn0pOiAicmVxdWlzaXRvcyIgfCAiZGV2IiB8ICJhcnF1aXRldG8iIHwgImdlc3RvciIgfCBudWxsIHsKICBjb25zdCBzID0gZGVtYW5kYS5zaXR1YWNhbzsKICBpZiAoWyJmaWxhX2F0ZW5kaW1lbnRvIiwgInBsYW5lamFtZW50b19lbGFib3JhY2FvIiwgInBsYW5lamFtZW50b19hZ19hcHJvdmFjYW8iLCAicGxhbmVqYW1lbnRvX2Fwcm92YWRhIl0uaW5jbHVkZXMocykpCiAgICByZXR1cm4gInJlcXVpc2l0b3MiOwogIGlmIChbImVtX2V4ZWN1Y2FvIiwgImJsb3F1ZWFkYSIsICJyZWplaXRhZGEiLCAiZmlsYV9wcm9kdWNhbyJdLmluY2x1ZGVzKHMpKSByZXR1cm4gImRldiI7CiAgaWYgKFsiaG9tX2FnX2hvbW9sb2dhY2FvIiwgImhvbV9ob21vbG9nYWRhIl0uaW5jbHVkZXMocykpIHJldHVybiAiYXJxdWl0ZXRvIjsKICBpZiAoWyJhZ19hY2VpdGVfZmluYWwiXS5pbmNsdWRlcyhzKSkgcmV0dXJuICJnZXN0b3IiOwogIHJldHVybiBudWxsOwp9CgovKiogUmV0b3JuYSBhcyBwcsOzeGltYXMgc2l0dWHDp8O1ZXMgcGVybWl0aWRhcyBhIHBhcnRpciBkYSBzaXR1YcOnw6NvIGF0dWFsICovCmV4cG9ydCBmdW5jdGlvbiBnZXROZXh0U2l0dWFjb2VzKHNpdHVhY2FvOiBEZW1hbmRhU2l0dWFjYW8pOiBEZW1hbmRhU2l0dWFjYW9bXSB7CiAgaWYgKChURVJNSU5BTF9TVEFUVVNFUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMoc2l0dWFjYW8pKSByZXR1cm4gW107CiAgaWYgKHNpdHVhY2FvID09PSAiYmxvcXVlYWRhIikgcmV0dXJuIFtdOyAvLyBkZXNibG9xdWVpbyDDqSB0cmF0YWRvIHNlcGFyYWRhbWVudGUKICBpZiAoc2l0dWFjYW8gPT09ICJyZWplaXRhZGEiKSByZXR1cm4gWyJlbV9leGVjdWNhbyJdOwoKICBjb25zdCBpZHggPSBGTE9XX1BSSU5DSVBBTC5pbmRleE9mKHNpdHVhY2FvKTsKICBpZiAoaWR4IDwgMCkgcmV0dXJuIFtdOwoKICBjb25zdCBuZXh0ID0gRkxPV19QUklOQ0lQQUwuc2xpY2UoaWR4ICsgMSk7CgogIC8vIEVtIGhvbW9sb2dhZGEsIMOpIHBvc3PDrXZlbCByZWplaXRhcgogIGlmIChzaXR1YWNhbyA9PT0gImhvbV9ob21vbG9nYWRhIikgewogICAgcmV0dXJuIFsuLi5uZXh0LCAicmVqZWl0YWRhIl0gYXMgRGVtYW5kYVNpdHVhY2FvW107CiAgfQoKICByZXR1cm4gbmV4dDsKfQoKLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACi8vIEludGVyZmFjZXMgZGUgZGFkb3MKLy8g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSACgpleHBvcnQgaW50ZXJmYWNlIERlbWFuZGEgewogIGlkOiBzdHJpbmc7CiAgdGVhbV9pZDogc3RyaW5nOwogIHJobTogc3RyaW5nOwogIHByb2pldG86IHN0cmluZzsKICB0aXBvOiBEZW1hbmRhVGlwbzsKICBzaXR1YWNhbzogRGVtYW5kYVNpdHVhY2FvIHwgc3RyaW5nOyAvLyBzdHJpbmcgcGFyYSBjb21wYXRpYmlsaWRhZGUgY29tIGRhZG9zIGxlZ2Fkb3MKICBkZXNjcmljYW86IHN0cmluZzsKICBzbGE6IERlbWFuZGFTTEE7CiAgcmVzcG9uc2F2ZWxfcmVxdWlzaXRvczogc3RyaW5nIHwgbnVsbDsKICByZXNwb25zYXZlbF9kZXY6IHN0cmluZyB8IG51bGw7CiAgcmVzcG9uc2F2ZWxfdGVzdGU6IHN0cmluZyB8IG51bGw7CiAgcmVzcG9uc2F2ZWxfYXJxdWl0ZXRvOiBzdHJpbmcgfCBudWxsOwogIGFjZWl0ZV9kYXRhOiBzdHJpbmcgfCBudWxsOwogIGFjZWl0ZV9yZXNwb25zYXZlbDogc3RyaW5nIHwgbnVsbDsKICBjcmVhdGVkX2F0OiBzdHJpbmc7CiAgdXBkYXRlZF9hdDogc3RyaW5nOwp9CgpleHBvcnQgaW50ZXJmYWNlIERlbWFuZGFUcmFuc2l0aW9uIHsKICBpZDogc3RyaW5nOwogIGRlbWFuZGFfaWQ6IHN0cmluZzsKICBmcm9tX3N0YXR1czogc3RyaW5nIHwgbnVsbDsKICB0b19zdGF0dXM6IHN0cmluZzsKICB1c2VyX2lkOiBzdHJpbmc7CiAganVzdGlmaWNhdGl2YTogc3RyaW5nIHwgbnVsbDsKICBjcmVhdGVkX2F0OiBzdHJpbmc7Cn0KCmV4cG9ydCBpbnRlcmZhY2UgRGVtYW5kYUhvdXIgewogIGlkOiBzdHJpbmc7CiAgZGVtYW5kYV9pZDogc3RyaW5nOwogIHVzZXJfaWQ6IHN0cmluZzsKICBob3JhczogbnVtYmVyOwogIGZhc2U6IHN0cmluZzsKICBkZXNjcmljYW86IHN0cmluZzsKICBjcmVhdGVkX2F0OiBzdHJpbmc7Cn0K