-- ============================================================
-- RPC: calc_imr_periodo
-- Semana 7+ do plano de acao de performance.
--
-- Substitui no frontend:
--   calcIAP()           -- Indice de Atendimento de Prazo
--   calcIQS()           -- Indice de Qualidade de Servico
--   calcICT()           -- Indice de Cobertura de Testes
--   calcISS()           -- Indice de Satisfacao do Servico
--   calcGlosasSummary() -- Totais de glosas por incidencia
--   detectE8Alerts()    -- Demandas em alerta/glosa por atraso
--
-- Parametros:
--   p_team_id    UUID
--   p_inicio     TIMESTAMPTZ
--   p_fim        TIMESTAMPTZ
--   p_e8_alerta  INT DEFAULT 45
--   p_e8_glosa   INT DEFAULT 60
--
-- Retorna JSONB com: { iap, iqs, ict, iss, glosas, e8Alerts }
-- ============================================================

CREATE OR REPLACE FUNCTION calc_imr_periodo(
  p_team_id   UUID,
  p_inicio    TIMESTAMPTZ,
  p_fim       TIMESTAMPTZ,
  p_e8_alerta INT DEFAULT 45,
  p_e8_glosa  INT DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_now TIMESTAMPTZ := NOW();

  -- IAP
  v_qdtot INT     := 0;
  v_qdap  INT     := 0;
  v_iap   NUMERIC := 0;

  -- IQS
  v_qde   INT     := 0;
  v_qdr   INT     := 0;
  v_iqs   NUMERIC := 0;

  -- ICT
  v_ict_sum   NUMERIC := 0;
  v_ict_count INT     := 0;
  v_ict       NUMERIC := 0;

  -- ISS
  v_iss_sum   NUMERIC := 0;
  v_iss_count INT     := 0;
  v_iss       NUMERIC := 0;

  -- Glosas
  v_glosa_integral NUMERIC := 0;
  v_glosa_limitada NUMERIC := 0;
  v_glosas_by_evt  JSONB   := jsonb_build_object();

  -- E8 Alerts
  v_e8_alerts JSONB := jsonb_build_array();

BEGIN

  -- ============================================================
  -- IAP
  -- ============================================================
  SELECT
    COUNT(*) FILTER (
      WHERE d.data_previsao_encerramento IS NOT NULL
        AND d.created_at BETWEEN p_inicio AND p_fim
    ),
    COUNT(*) FILTER (
      WHERE d.data_previsao_encerramento IS NOT NULL
        AND d.created_at BETWEEN p_inicio AND p_fim
        AND LOWER(d.situacao) = 'ag_aceite_final'
        AND d.aceite_data IS NOT NULL
        AND d.aceite_data::TIMESTAMPTZ
              <= d.data_previsao_encerramento::TIMESTAMPTZ
    )
  INTO v_qdtot, v_qdap
  FROM demandas d
  WHERE d.team_id = p_team_id;

  v_iap := CASE WHEN v_qdtot > 0
    THEN ROUND((v_qdap::NUMERIC / v_qdtot) * 100, 2)
    ELSE 0 END;

  -- ============================================================
  -- IQS
  -- ============================================================
  SELECT
    COUNT(*) FILTER (
      WHERE LOWER(d.situacao) IN (
        'hom_ag_homologacao', 'hom_homologada',
        'fila_producao', 'ag_aceite_final'
      )
      AND d.created_at BETWEEN p_inicio AND p_fim
    ),
    COUNT(*) FILTER (
      WHERE LOWER(d.situacao) IN (
        'hom_ag_homologacao', 'hom_homologada',
        'fila_producao', 'ag_aceite_final'
      )
      AND d.created_at BETWEEN p_inicio AND p_fim
      AND COALESCE(d.contador_rejeicoes, 0) > 0
    )
  INTO v_qde, v_qdr
  FROM demandas d
  WHERE d.team_id = p_team_id;

  v_iqs := CASE WHEN v_qde > 0
    THEN ROUND((1 - v_qdr::NUMERIC / v_qde) * 100, 2)
    ELSE 0 END;

  -- ============================================================
  -- ICT
  -- ============================================================
  SELECT
    COALESCE(SUM(d.cobertura_testes), 0),
    COUNT(*)
  INTO v_ict_sum, v_ict_count
  FROM demandas d
  WHERE d.team_id = p_team_id
    AND LOWER(d.situacao) = 'ag_aceite_final'
    AND d.cobertura_testes IS NOT NULL
    AND d.created_at BETWEEN p_inicio AND p_fim;

  v_ict := CASE WHEN v_ict_count > 0
    THEN ROUND(v_ict_sum / v_ict_count, 2)
    ELSE 0 END;

  -- ============================================================
  -- ISS
  -- ============================================================
  SELECT
    COALESCE(SUM(d.nota_satisfacao), 0),
    COUNT(*)
  INTO v_iss_sum, v_iss_count
  FROM demandas d
  WHERE d.team_id = p_team_id
    AND LOWER(d.situacao) = 'ag_aceite_final'
    AND d.nota_satisfacao IS NOT NULL
    AND d.created_at BETWEEN p_inicio AND p_fim;

  v_iss := CASE WHEN v_iss_count > 0
    THEN ROUND(v_iss_sum / v_iss_count, 2)
    ELSE 0 END;

  -- ============================================================
  -- Glosas
  -- ============================================================
  SELECT
    COALESCE(SUM(e.redutor) FILTER (WHERE e.incidencia = 'integral'), 0),
    COALESCE(SUM(e.redutor) FILTER (WHERE e.incidencia <> 'integral'), 0)
  INTO v_glosa_integral, v_glosa_limitada
  FROM demanda_eventos e
  JOIN demandas d ON d.id = e.demanda_id
  WHERE d.team_id = p_team_id
    AND e.created_at BETWEEN p_inicio AND p_fim;

  SELECT COALESCE(
    jsonb_object_agg(
      sub.tipo_evento,
      jsonb_build_object('count', sub.cnt, 'total', ROUND(sub.tot::NUMERIC, 4))
    ),
    jsonb_build_object()
  )
  INTO v_glosas_by_evt
  FROM (
    SELECT
      e.tipo_evento,
      COUNT(*)     AS cnt,
      SUM(e.redutor) AS tot
    FROM demanda_eventos e
    JOIN demandas d ON d.id = e.demanda_id
    WHERE d.team_id = p_team_id
      AND e.created_at BETWEEN p_inicio AND p_fim
    GROUP BY e.tipo_evento
  ) sub;

  -- ============================================================
  -- E8 Alerts
  -- ============================================================
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'demandaId',  d.id,
        'rhm',        d.rhm,
        'titulo',     d.titulo,
        'projeto',    d.projeto,
        'situacao',   d.situacao,
        'prazo',      d.data_previsao_encerramento,
        'diasAtraso', EXTRACT(DAY FROM (v_now - d.data_previsao_encerramento::TIMESTAMPTZ))::INT,
        'tipo',       CASE
                        WHEN EXTRACT(DAY FROM (v_now - d.data_previsao_encerramento::TIMESTAMPTZ))
                               >= p_e8_glosa THEN 'glosa'
                        ELSE 'alerta'
                      END
      )
      ORDER BY EXTRACT(DAY FROM (v_now - d.data_previsao_encerramento::TIMESTAMPTZ)) DESC
    ),
    jsonb_build_array()
  )
  INTO v_e8_alerts
  FROM demandas d
  WHERE d.team_id = p_team_id
    AND LOWER(d.situacao) NOT IN ('ag_aceite_final', 'cancelada')
    AND d.data_previsao_encerramento IS NOT NULL
    AND d.data_previsao_encerramento::TIMESTAMPTZ < v_now
    AND EXTRACT(DAY FROM (v_now - d.data_previsao_encerramento::TIMESTAMPTZ)) >= p_e8_alerta;

  -- ============================================================
  -- Retorno
  -- ============================================================
  RETURN jsonb_build_object(
    'iap', jsonb_build_object(
      'valor', v_iap, 'qdap', v_qdap, 'qdtot', v_qdtot
    ),
    'iqs', jsonb_build_object(
      'valor', v_iqs, 'qdr', v_qdr, 'qde', v_qde
    ),
    'ict', jsonb_build_object(
      'valor', v_ict, 'total', v_ict_count
    ),
    'iss', jsonb_build_object(
      'valor', v_iss, 'total', v_iss_count
    ),
    'glosas', jsonb_build_object(
      'totalIntegral', ROUND(v_glosa_integral::NUMERIC, 4),
      'totalLimitada', ROUND(v_glosa_limitada::NUMERIC, 4),
      'byEvento',      v_glosas_by_evt
    ),
    'e8Alerts', v_e8_alerts
  );

END;
$func$;

REVOKE ALL ON FUNCTION calc_imr_periodo(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION calc_imr_periodo(UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT) TO authenticated;

COMMENT ON FUNCTION calc_imr_periodo IS
  'Agrega indices IMR (IAP, IQS, ICT, ISS, glosas, E8 alerts) no banco para um periodo. '
  'Substitui imrCalculations.ts no frontend.';
