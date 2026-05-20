/**
 * QueryClient central do SprintFlow.
 *
 * staleTime por categoria:
 *   - dados de usuário/perfil  : 10 min  (mudam raramente)
 *   - listas de referência     : 5 min   (times, projetos, fases)
 *   - demandas / kanban        : 30 s    (colaboração em tempo real via RT)
 *   - KPIs admin               : 60 s    (agregação pesada no banco)
 *   - dados de sessão ativa    : 0       (planning poker, retro)
 *
 * gcTime padrão: 5 min (mantém cache após unmount para navegação rápida)
 * retry: 2 tentativas com backoff exponencial
 * refetchOnWindowFocus: false (Supabase Realtime cobre updates em tempo real)
 */

import { QueryClient } from '@tanstack/react-query';

export const STALE = {
  /** Dados imutáveis na sessão: perfil, permissões, times */
  SESSION:    10 * 60 * 1000,
  /** Listas de referência: projetos, fases, workflow steps */
  REFERENCE:   5 * 60 * 1000,
  /** Demandas, HUs, Kanban — Realtime cobre invalidação */
  REALTIME:       30 * 1000,
  /** KPIs / agregações pesadas — RPC no banco */
  KPI:            60 * 1000,
  /** Dados de sessão colaborativa (planning poker, retro) */
  LIVE:                   0,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           STALE.REALTIME,  // padrão conservador
      gcTime:          5 * 60 * 1000,       // 5 min de cache após unmount
      retry:           2,
      retryDelay:      (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: false,          // Realtime cobre
    },
    mutations: {
      retry: 0,
    },
  },
});
