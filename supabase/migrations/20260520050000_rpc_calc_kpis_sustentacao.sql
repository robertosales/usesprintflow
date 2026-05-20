-- ============================================================
-- RPC: calc_kpis_sustentacao
-- Semana 4-5 do plano de ação de performance.
--
-- Substitui no frontend:
--   calcTempos()       — TMR, MTTR, MTTA
--   calcSLA()          — compliance, violados, em_risco
--   calcAtendimento()  — total, abertos_hoje, resolvidos_hoje, backlog
--   calcKpiGeral()     — taxa_resolucao, mttr_geral, total_horas
--   calcProdutividade()— stats por analista
--
-- Parâmetros:
--   p_team_id    UUID    — time
--   p_backlog_dias INT   — janela de backlog (default 30)
--   p_sla_risco_h  INT  — horas restantes para "em_risco" (default 2)
--
-- Retorna JSONB com:
--   atendimento, tempos, sla, kpiGeral, produtividade[]
-- ============================================================

CREATE OR REPLACE FUNCTION calc_kpis_sustentacao(
  p_team_id      UUID,
  p_backlog_dias INT DEFAULT 30,
  p_sla_risco_h  INT DEFAULT 2
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now          TIMESTAMPTZ := NOW();
  v_backlog_cut  TIMESTAMPTZ := NOW() - (p_backlog_dias || ' days')::INTERVAL;
  v_risco_cut    INTERVAL    := (p_sla_risco_h || ' hours')::INTERVAL;

  -- Atendimento
  v_total             INT := 0;
  v_abertos_hoje      INT := 0;
  v_resolvidos_hoje   INT := 0;
  v_backlog           INT := 0;

  -- Tempos
  v_tmr_sum    NUMERIC := 0;  v_tmr_count  INT := 0;
  v_mttr_sum   NUMERIC := 0;  v_mttr_count INT := 0;
  v_mtta_sum   NUMERIC := 0;  v_mtta_count INT := 0;

  -- SLA
  v_sla_total    INT := 0;
  v_sla_dentro   INT := 0;
  v_sla_risco    INT := 0;
  v_sla_violado  INT := 0;

  -- KPI geral
  v_total_horas  NUMERIC := 0;

BEGIN

  -- ============================================================
  -- BLOCO 1: Atendimento + KPI Geral
  -- ============================================================
  SELECT
    COUNT(*)                                                              AS total,
    COUNT(*) FILTER (WHERE d.created_at::DATE = CURRENT_DATE)            AS abertos_hoje,
    COUNT(*) FILTER (
      WHERE LOWER(d.situacao) IN ('concluido','resolvido','aceite_final')
        AND d.aceite_data::DATE = CURRENT_DATE
    )                                                                     AS resolvidos_hoje,
    COUNT(*) FILTER (
      WHERE d.created_at < v_backlog_cut
        AND LOWER(d.situacao) NOT IN ('concluido','resolvido','aceite_final')
    )                                                                     AS backlog
  INTO v_total, v_abertos_hoje, v_resolvidos_hoje, v_backlog
  FROM demandas d
  WHERE d.team_id = p_team_id;

  -- Total de horas lançadas
  SELECT COALESCE(SUM(h.horas), 0)
  INTO   v_total_horas
  FROM   demanda_hours h
  JOIN   demandas d ON d.id = h.demanda_id
  WHERE  d.team_id = p_team_id;

  -- ============================================================
  -- BLOCO 2: Tempos (TMR, MTTR, MTTA) via transitions
  -- ============================================================
  WITH
  -- Primeira transition de cada demanda (para MTTA)
  primeira_transition AS (
    SELECT DISTINCT ON (t.demanda_id)
      t.demanda_id,
      t.created_at AS first_ts
    FROM   demanda_transitions t
    JOIN   demandas d ON d.id = t.demanda_id
    WHERE  d.team_id = p_team_id
    ORDER  BY t.demanda_id, t.created_at ASC
  ),
  -- Primeira transition que SAÍU de "nova" (para TMR)
  primeira_acao AS (
    SELECT DISTINCT ON (t.demanda_id)
      t.demanda_id,
      t.created_at AS first_action_ts
    FROM   demanda_transitions t
    JOIN   demandas d ON d.id = t.demanda_id
    WHERE  d.team_id = p_team_id
      AND  t.from_status = 'nova'
    ORDER  BY t.demanda_id, t.created_at ASC
  ),
  -- Transition de aceite_final (para MTTR)
  aceite_transition AS (
    SELECT DISTINCT ON (t.demanda_id)
      t.demanda_id,
      t.created_at AS aceite_ts
    FROM   demanda_transitions t
    JOIN   demandas d ON d.id = t.demanda_id
    WHERE  d.team_id  = p_team_id
      AND  t.to_status = 'aceite_final'
    ORDER  BY t.demanda_id, t.created_at ASC
  )
  SELECT
    -- TMR: tempo médio até primeira ação (horas)
    COALESCE(AVG(
      EXTRACT(EPOCH FROM (pa.first_action_ts - d.created_at)) / 3600.0
    ), 0),
    COUNT(pa.demanda_id),
    -- MTTR: tempo médio até aceite_final (horas)
    COALESCE(AVG(
      EXTRACT(EPOCH FROM (at2.aceite_ts - d.created_at)) / 3600.0
    ), 0),
    COUNT(at2.demanda_id),
    -- MTTA: tempo médio até primeiro toque (horas)
    COALESCE(AVG(
      EXTRACT(EPOCH FROM (pt.first_ts - d.created_at)) / 3600.0
    ), 0),
    COUNT(pt.demanda_id)
  INTO
    v_tmr_sum, v_tmr_count,
    v_mttr_sum, v_mttr_count,
    v_mtta_sum, v_mtta_count
  FROM  demandas d
  LEFT  JOIN primeira_acao     pa  ON pa.demanda_id  = d.id
  LEFT  JOIN aceite_transition at2 ON at2.demanda_id = d.id
  LEFT  JOIN primeira_transition pt ON pt.demanda_id  = d.id
  WHERE d.team_id = p_team_id;

  -- ============================================================
  -- BLOCO 3: SLA compliance
  -- SLA_HOURS: 24x7 = 4h, padrao = 24h (compat. kpiCalculations.ts)
  -- ============================================================
  SELECT
    COUNT(*)                                                              AS total,
    COUNT(*) FILTER (
      WHERE
        CASE
          -- Resolvida dentro do prazo
          WHEN at2.aceite_ts IS NOT NULL
            THEN at2.aceite_ts <= (d.created_at + sla_h)
          -- Em aberto dentro do prazo
          ELSE v_now <= (d.created_at + sla_h)
               AND (d.created_at + sla_h) - v_now >= v_risco_cut
        END
    )                                                                     AS dentro,
    COUNT(*) FILTER (
      WHERE
        at2.aceite_ts IS NULL
        AND v_now <= (d.created_at + sla_h)
        AND (d.created_at + sla_h) - v_now < v_risco_cut
    )                                                                     AS em_risco,
    COUNT(*) FILTER (
      WHERE
        CASE
          WHEN at2.aceite_ts IS NOT NULL THEN at2.aceite_ts > (d.created_at + sla_h)
          ELSE v_now > (d.created_at + sla_h)
        END
    )                                                                     AS violado
  INTO v_sla_total, v_sla_dentro, v_sla_risco, v_sla_violado
  FROM demandas d
  CROSS JOIN LATERAL (
    SELECT
      CASE d.sla
        WHEN '24x7'   THEN INTERVAL '4 hours'
        ELSE               INTERVAL '24 hours'
      END AS sla_h
  ) sla_calc
  LEFT JOIN LATERAL (
    SELECT MIN(t.created_at) AS aceite_ts
    FROM   demanda_transitions t
    WHERE  t.demanda_id = d.id
      AND  t.to_status  = 'aceite_final'
  ) at2 ON TRUE
  WHERE d.team_id = p_team_id;

  -- ============================================================
  -- BLOCO 4: Produtividade por analista
  -- ============================================================
  RETURN jsonb_build_object(

    'atendimento', jsonb_build_object(
      'total',          v_total,
      'abertosHoje',    v_abertos_hoje,
      'resolvidosHoje', v_resolvidos_hoje,
      'backlog',        v_backlog,
      'backlogDias',    p_backlog_dias
    ),

    'tempos', jsonb_build_object(
      'tmr',       ROUND(v_tmr_sum::NUMERIC,  2),
      'mttr',      ROUND(v_mttr_sum::NUMERIC, 2),
      'tma',       ROUND(v_mttr_sum::NUMERIC, 2),  -- alias de MTTR (compat. frontend)
      'mtta',      ROUND(v_mtta_sum::NUMERIC, 2),
      'tmrCount',  v_tmr_count,
      'mttrCount', v_mttr_count,
      'mttaCount', v_mtta_count
    ),

    'sla', jsonb_build_object(
      'total',      v_sla_total,
      'dentro',     v_sla_dentro,
      'emRisco',    v_sla_risco,
      'violados',   v_sla_violado,
      'compliance', CASE WHEN v_sla_total > 0
                      THEN ROUND((v_sla_dentro::NUMERIC / v_sla_total) * 100, 2)
                      ELSE 100.0
                    END
    ),

    'kpiGeral', jsonb_build_object(
      'total',        v_total,
      'resolvidos',   (
        SELECT COUNT(*) FROM demandas d
        WHERE d.team_id = p_team_id
          AND LOWER(d.situacao) IN ('concluido','resolvido','aceite_final')
      ),
      'emAberto',     (
        SELECT COUNT(*) FROM demandas d
        WHERE d.team_id = p_team_id
          AND LOWER(d.situacao) IN ('aberto','em_andamento','nova','em_analise')
      ),
      'taxa',         CASE WHEN v_total > 0
                        THEN ROUND((
                          SELECT COUNT(*)::NUMERIC FROM demandas d
                          WHERE d.team_id = p_team_id
                            AND LOWER(d.situacao) IN ('concluido','resolvido','aceite_final')
                        ) / v_total * 100, 2)
                        ELSE 0
                      END,
      'totalHoras',   ROUND(v_total_horas::NUMERIC, 2),
      'mttrGeral',    ROUND(v_mttr_sum::NUMERIC, 2)
    ),

    -- Produtividade: agrega por user_id cruzando horas + responsaveis
    'produtividade', (
      WITH
      -- analistas que lançaram horas
      analistas_horas AS (
        SELECT h.user_id, SUM(h.horas) AS total_horas,
               COUNT(DISTINCT h.demanda_id) AS demandas_com_hora
        FROM   demanda_hours h
        JOIN   demandas d ON d.id = h.demanda_id
        WHERE  d.team_id = p_team_id
          AND  h.user_id IS NOT NULL
        GROUP  BY h.user_id
      ),
      -- analistas responsáveis em qualquer papel
      analistas_resp AS (
        SELECT unnest(ARRAY[
          d.responsavel_dev,
          d.responsavel_requisitos,
          d.responsavel_arquiteto,
          d.responsavel_teste
        ]) AS user_id,
        d.id AS demanda_id,
        d.situacao
        FROM demandas d
        WHERE d.team_id = p_team_id
          AND (
            d.responsavel_dev IS NOT NULL OR
            d.responsavel_requisitos IS NOT NULL OR
            d.responsavel_arquiteto IS NOT NULL OR
            d.responsavel_teste IS NOT NULL
          )
      ),
      -- união de todos os user_ids
      todos_analistas AS (
        SELECT user_id FROM analistas_horas
        UNION
        SELECT user_id FROM analistas_resp WHERE user_id IS NOT NULL
      ),
      -- stats por analista
      stats AS (
        SELECT
          ta.user_id,
          p.display_name                                                AS nome,
          COUNT(DISTINCT CASE
            WHEN ah.user_id IS NOT NULL OR ar.user_id IS NOT NULL
            THEN COALESCE(ar.demanda_id, NULL)
          END)                                                          AS atribuidos,
          COUNT(DISTINCT CASE
            WHEN LOWER(ar.situacao) IN ('concluido','resolvido','aceite_final')
            THEN ar.demanda_id
          END)                                                          AS resolvidos,
          COUNT(DISTINCT CASE
            WHEN LOWER(ar.situacao) IN ('aberto','em_andamento','nova','em_analise')
            THEN ar.demanda_id
          END)                                                          AS em_aberto,
          COALESCE(ah.total_horas, 0)                                   AS horas_lancadas
        FROM       todos_analistas ta
        LEFT JOIN  analistas_horas ah  ON ah.user_id  = ta.user_id
        LEFT JOIN  analistas_resp  ar  ON ar.user_id  = ta.user_id
        LEFT JOIN  profiles        p   ON p.user_id   = ta.user_id
        GROUP BY ta.user_id, p.display_name, ah.total_horas
      )
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'userId',        s.user_id,
          'nome',          COALESCE(s.nome, LEFT(s.user_id::TEXT, 8)),
          'atribuidos',    s.atribuidos,
          'resolvidos',    s.resolvidos,
          'emAberto',      s.em_aberto,
          'horasLancadas', ROUND(s.horas_lancadas::NUMERIC, 2),
          'taxaResolucao', CASE WHEN s.atribuidos > 0
                             THEN ROUND((s.resolvidos::NUMERIC / s.atribuidos) * 100, 2)
                             ELSE 0 END
        ) ORDER BY s.resolvidos DESC
      ), '[]'::JSONB)
      FROM stats s
    )
  );

END;
$$;

REVOKE ALL ON FUNCTION calc_kpis_sustentacao(UUID, INT, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION calc_kpis_sustentacao(UUID, INT, INT) TO authenticated;

COMMENT ON FUNCTION calc_kpis_sustentacao IS
  'Agrega KPIs de sustentação no banco (TMR, MTTR, MTTA, SLA, atendimento, produtividade). Substitui kpiCalculations.ts no frontend.';
