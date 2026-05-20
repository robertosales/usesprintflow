/**
 * Query keys centralizadas e tipadas.
 *
 * Padrão: ['entidade', 'operação', ...params]
 * Permite invalidação granular:
 *   queryClient.invalidateQueries({ queryKey: KEYS.demandas.all(teamId) })
 *   → invalida todas as queries de demandas daquele time
 */

export const KEYS = {
  // ── Demandas ────────────────────────────────────────────────
  demandas: {
    all:    (teamId: string) => ['demandas', teamId]             as const,
    list:   (teamId: string) => ['demandas', teamId, 'list']     as const,
    detail: (id: string)     => ['demandas', 'detail', id]       as const,
    transitions: (id: string)=> ['demandas', 'transitions', id]  as const,
    hours:  (id: string)     => ['demandas', 'hours', id]        as const,
  },

  // ── Kanban / User Stories ────────────────────────────────────
  kanban: {
    all:    (teamId: string) => ['kanban', teamId]               as const,
    board:  (teamId: string, sprintId?: string | null) =>
              ['kanban', teamId, 'board', sprintId ?? 'all']     as const,
  },

  // ── Sprints ─────────────────────────────────────────────────
  sprints: {
    all:    (teamId: string) => ['sprints', teamId]              as const,
    active: (teamId: string) => ['sprints', teamId, 'active']    as const,
  },

  // ── Referência ──────────────────────────────────────────────
  projetos:   (teamId: string) => ['projetos', teamId]           as const,
  fases:      (teamId: string) => ['fases', teamId]              as const,
  workflow:   (teamId: string) => ['workflow', teamId]           as const,

  // ── Admin / KPIs ─────────────────────────────────────────────
  adminKpis:  (teamIds: string[]) => ['admin', 'kpis', ...teamIds] as const,

  // ── Perfil / Auth ────────────────────────────────────────────
  profile:    (userId: string) => ['profile', userId]            as const,
  teams:      ()               => ['teams']                      as const,
} as const;
