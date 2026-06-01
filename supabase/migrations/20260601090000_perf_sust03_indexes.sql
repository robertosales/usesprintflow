-- ============================================================
-- PERF/SUST-03 — Índices complementares (sustentação + IMR)
-- Não duplica nenhum índice já criado em:
--   20260520040000_performance_indexes.sql
--   20260525_diagnostic_indexes.sql
-- ============================================================

-- --------------------------------------------------------
-- demandas: lookup por responsável (filtros de fila pessoal)
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_demandas_responsavel_id
  ON demandas (responsavel_id)
  WHERE responsavel_id IS NOT NULL;

-- demandas: filtro por data de abertura para o período do IMR
CREATE INDEX IF NOT EXISTS idx_demandas_team_opened_at
  ON demandas (team_id, opened_at DESC)
  WHERE opened_at IS NOT NULL;

-- demandas: filtro por situacao isolado (usado em contagens sem team_id)
CREATE INDEX IF NOT EXISTS idx_demandas_situacao
  ON demandas (situacao);

-- demandas: composto team_id + situacao + opened_at para o cálculo IMR
-- (evita recheck de situacao após o index scan por team_id)
CREATE INDEX IF NOT EXISTS idx_demandas_team_sit_opened
  ON demandas (team_id, situacao, opened_at DESC);

-- --------------------------------------------------------
-- demanda_transitions: lookup por status de destino
-- Usado em calc_imr_periodo para contar transições para 'resolvida'
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_demanda_transitions_to_status
  ON demanda_transitions (to_status);

CREATE INDEX IF NOT EXISTS idx_demanda_transitions_demanda_to_status
  ON demanda_transitions (demanda_id, to_status);

-- demanda_transitions: filtro por período (created_at isolado)
-- Usado nas queries de janela de tempo do IMR
CREATE INDEX IF NOT EXISTS idx_demanda_transitions_created_at
  ON demanda_transitions (created_at DESC);

-- --------------------------------------------------------
-- demanda_hours: tabela de horas lançadas por demanda
-- Sem nenhum índice existente — todos são novos
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_demanda_hours_demanda_id
  ON demanda_hours (demanda_id);

CREATE INDEX IF NOT EXISTS idx_demanda_hours_profile_id
  ON demanda_hours (profile_id)
  WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_demanda_hours_logged_at
  ON demanda_hours (logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_demanda_hours_demanda_logged
  ON demanda_hours (demanda_id, logged_at DESC);

-- --------------------------------------------------------
-- feriados: lookup por data (usado em calc_sla_demanda)
-- Pequena mas lida em loop; índice elimina seq scan por data
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_feriados_data
  ON feriados (data);
