export type DemandaTipo = 'corretiva' | 'evolutiva';
export type DemandaSLA = '24x7' | 'padrao';

export const SITUACOES_CORRETIVA = [
  'nova', 'execucao_dev', 'bloqueada', 'aguardando_retorno', 'teste',
  'aguardando_homologacao', 'homologada', 'fila_producao', 'producao', 'aceite_final',
] as const;

export const SITUACOES_EVOLUTIVA_PREFIX = [
  'nova', 'planejamento', 'envio_aprovacao', 'planejamento_aprovado',
] as const;

export const ALL_SITUACOES = [
  'nova', 'planejamento', 'envio_aprovacao', 'planejamento_aprovado',
  'execucao_dev', 'bloqueada', 'aguardando_retorno', 'teste',
  'aguardando_homologacao', 'homologada', 'fila_producao', 'producao', 'aceite_final',
] as const;

export type DemandaSituacao = typeof ALL_SITUACOES[number];

export const SITUACAO_LABELS: Record<string, string> = {
  nova: 'Nova',
  planejamento: 'Planejamento',
  envio_aprovacao: 'Envio Aprovação',
  planejamento_aprovado: 'Planejamento Aprovado',
  execucao_dev: 'Execução Dev',
  bloqueada: 'Bloqueada',
  aguardando_retorno: 'Aguardando Retorno',
  teste: 'Teste',
  aguardando_homologacao: 'Aguardando Homologação',
  homologada: 'Homologada',
  fila_producao: 'Fila Produção',
  producao: 'Produção',
  aceite_final: 'Aceite Final',
};

export const SITUACAO_COLORS: Record<string, string> = {
  nova: 'bg-blue-100 text-blue-800 border-blue-200',
  planejamento: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  envio_aprovacao: 'bg-purple-100 text-purple-800 border-purple-200',
  planejamento_aprovado: 'bg-violet-100 text-violet-800 border-violet-200',
  execucao_dev: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  bloqueada: 'bg-red-100 text-red-800 border-red-200',
  aguardando_retorno: 'bg-orange-100 text-orange-800 border-orange-200',
  teste: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  aguardando_homologacao: 'bg-amber-100 text-amber-800 border-amber-200',
  homologada: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  fila_producao: 'bg-teal-100 text-teal-800 border-teal-200',
  producao: 'bg-green-100 text-green-800 border-green-200',
  aceite_final: 'bg-lime-100 text-lime-800 border-lime-200',
};

export const BOARD_COLUMNS_CORRETIVA = SITUACOES_CORRETIVA;
export const BOARD_COLUMNS_EVOLUTIVA = [...SITUACOES_EVOLUTIVA_PREFIX, ...SITUACOES_CORRETIVA.slice(1)] as const;

export const FASES = ['analise', 'planejamento', 'execucao', 'teste', 'homologacao', 'producao'] as const;
export const FASE_LABELS: Record<string, string> = {
  analise: 'Análise', planejamento: 'Planejamento', execucao: 'Execução',
  teste: 'Teste', homologacao: 'Homologação', producao: 'Produção',
};

export const REQUIRES_JUSTIFICATIVA = ['bloqueada', 'aguardando_retorno'];

export interface Demanda {
  id: string;
  team_id: string;
  rhm: string;
  projeto: string;
  tipo: DemandaTipo;
  situacao: string;
  descricao: string;
  sla: DemandaSLA;
  responsavel_requisitos: string | null;
  responsavel_dev: string | null;
  responsavel_teste: string | null;
  responsavel_arquiteto: string | null;
  aceite_data: string | null;
  aceite_responsavel: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemandaTransition {
  id: string;
  demanda_id: string;
  from_status: string | null;
  to_status: string;
  user_id: string;
  justificativa: string | null;
  created_at: string;
}

export interface DemandaHour {
  id: string;
  demanda_id: string;
  user_id: string;
  horas: number;
  fase: string;
  descricao: string;
  created_at: string;
}

export function getResponsavelAtivo(demanda: Demanda): 'requisitos' | 'dev' | 'teste' | 'arquiteto' | null {
  const s = demanda.situacao;
  if (['nova', 'planejamento', 'envio_aprovacao', 'planejamento_aprovado'].includes(s)) return 'requisitos';
  if (['execucao_dev', 'bloqueada', 'aguardando_retorno', 'fila_producao', 'producao'].includes(s)) return 'dev';
  if (['teste'].includes(s)) return 'teste';
  if (['aguardando_homologacao', 'homologada'].includes(s)) return 'arquiteto';
  return null;
}
