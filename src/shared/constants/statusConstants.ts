/**
 * Constantes de status centralizadas para uso em todos os hooks e componentes.
 * ATENÇÃO: Qualquer alteração aqui impacta Visão Geral, Histórico e Capacidade.
 * Antes de adicionar um status, verifique se ele existe no banco de dados.
 */

/** Status que representam uma HU ou demanda concluída/aceita */
export const STATUS_CONCLUIDOS = [
  "concluido",
  "concluida",
  "done",
  "aceite",
  "aceite_final",
  "ag_aceite_final",
  "resolvido",
] as const;

export type StatusConcluido = typeof STATUS_CONCLUIDOS[number];

/** Status que representam bloqueio */
export const STATUS_BLOQUEADOS = [
  "bloqueada",
  "bloqueado",
] as const;

export type StatusBloqueado = typeof STATUS_BLOQUEADOS[number];

/** Status excluídos do cálculo de WIP (trabalho em progresso) */
export const STATUS_WIP_EXCLUIDOS = [
  ...STATUS_CONCLUIDOS,
  "cancelada",
  "backlog",
] as const;

/** Helper: verifica se um status é conclusivo (case-insensitive) */
export function isConcluido(status: string | null | undefined): boolean {
  if (!status) return false;
  return (STATUS_CONCLUIDOS as readonly string[]).includes(status.toLowerCase());
}

/** Helper: verifica se um status é de bloqueio (case-insensitive) */
export function isBloqueado(status: string | null | undefined): boolean {
  if (!status) return false;
  return (STATUS_BLOQUEADOS as readonly string[]).includes(status.toLowerCase());
}

/** Helper: verifica se um status está em progresso (WIP) */
export function isWip(status: string | null | undefined): boolean {
  if (!status) return false;
  return !(STATUS_WIP_EXCLUIDOS as readonly string[]).includes(status.toLowerCase());
}
