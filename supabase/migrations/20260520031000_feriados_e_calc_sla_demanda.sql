-- ============================================================
-- STEP 1: Tabela feriados configurável
-- Unicidade via colunas geradas uf_key e municipio_key,
-- que materializam COALESCE(uf,'') e COALESCE(municipio,'').
-- Postgres não aceita expressões em CONSTRAINT UNIQUE nem em
-- CREATE UNIQUE INDEX dentro da mesma transaction de migration.
-- ============================================================

CREATE TABLE IF NOT EXISTS feriados (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  data          DATE        NOT NULL,
  nome          TEXT        NOT NULL,
  tipo          TEXT        NOT NULL DEFAULT 'nacional'
                 CHECK (tipo IN ('nacional','estadual','municipal')),
  uf            CHAR(2),
  municipio     TEXT,
  ativo         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Colunas geradas para garantir unicidade sem NULLs
  uf_key        TEXT GENERATED ALWAYS AS (COALESCE(uf, ''))        STORED,
  municipio_key TEXT GENERATED ALWAYS AS (COALESCE(municipio, '')) STORED,

  CONSTRAINT uq_feriados_chave UNIQUE (data, tipo, uf_key, municipio_key)
);

CREATE INDEX IF NOT EXISTS idx_feriados_data_ativo
  ON feriados (data, ativo);

-- RLS
ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;

CREATE POLICY feriados_select ON feriados
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY feriados_insert ON feriados
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY feriados_update ON feriados
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- SEED: 8 feriados nacionais × 3 anos (2025-2027)
-- ============================================================

INSERT INTO feriados (data, nome, tipo) VALUES
  ('2025-01-01', 'Confraternização Universal',  'nacional'),
  ('2025-04-21', 'Tiradentes',                  'nacional'),
  ('2025-05-01', 'Dia do Trabalho',             'nacional'),
  ('2025-09-07', 'Independência do Brasil',     'nacional'),
  ('2025-10-12', 'Nossa Sra. Aparecida',        'nacional'),
  ('2025-11-02', 'Finados',                     'nacional'),
  ('2025-11-15', 'Proclamação da República',    'nacional'),
  ('2025-12-25', 'Natal',                       'nacional'),
  ('2026-01-01', 'Confraternização Universal',  'nacional'),
  ('2026-04-21', 'Tiradentes',                  'nacional'),
  ('2026-05-01', 'Dia do Trabalho',             'nacional'),
  ('2026-09-07', 'Independência do Brasil',     'nacional'),
  ('2026-10-12', 'Nossa Sra. Aparecida',        'nacional'),
  ('2026-11-02', 'Finados',                     'nacional'),
  ('2026-11-15', 'Proclamação da República',    'nacional'),
  ('2026-12-25', 'Natal',                       'nacional'),
  ('2027-01-01', 'Confraternização Universal',  'nacional'),
  ('2027-04-21', 'Tiradentes',                  'nacional'),
  ('2027-05-01', 'Dia do Trabalho',             'nacional'),
  ('2027-09-07', 'Independência do Brasil',     'nacional'),
  ('2027-10-12', 'Nossa Sra. Aparecida',        'nacional'),
  ('2027-11-02', 'Finados',                     'nacional'),
  ('2027-11-15', 'Proclamação da República',    'nacional'),
  ('2027-12-25', 'Natal',                       'nacional')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 2: Funções auxiliares de calendário
-- ============================================================

CREATE OR REPLACE FUNCTION is_feriado(
  p_data DATE,
  p_uf   CHAR(2) DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM feriados f
    WHERE f.data  = p_data
      AND f.ativo = TRUE
      AND (
        f.tipo = 'nacional'
        OR (f.tipo = 'estadual' AND f.uf = p_uf)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION is_feriado(DATE, CHAR) TO authenticated;

CREATE OR REPLACE FUNCTION is_dia_util(
  p_data DATE,
  p_uf   CHAR(2) DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXTRACT(DOW FROM p_data) NOT IN (0, 6)
    AND NOT is_feriado(p_data, p_uf);
$$;

GRANT EXECUTE ON FUNCTION is_dia_util(DATE, CHAR) TO authenticated;

CREATE OR REPLACE FUNCTION calc_horas_uteis(
  p_inicio   TIMESTAMPTZ,
  p_fim      TIMESTAMPTZ,
  p_regime   TEXT    DEFAULT 'padrao',
  p_uf       CHAR(2) DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total      NUMERIC := 0;
  v_atual      TIMESTAMPTZ;
  v_dia_fim    TIMESTAMPTZ;
  v_hora_ini   CONSTANT INT := 8;
  v_hora_fim   CONSTANT INT := 20;
  v_hora_atual NUMERIC;
  v_hora_efim  NUMERIC;
BEGIN
  IF p_inicio >= p_fim THEN RETURN 0; END IF;

  IF p_regime = 'continuo' THEN
    RETURN EXTRACT(EPOCH FROM (p_fim - p_inicio)) / 3600.0;
  END IF;

  v_atual := p_inicio;

  WHILE v_atual < p_fim LOOP
    IF NOT is_dia_util(v_atual::DATE, p_uf) THEN
      v_atual := DATE_TRUNC('day', v_atual) + INTERVAL '1 day' + (v_hora_ini || ' hours')::INTERVAL;
      CONTINUE;
    END IF;

    v_hora_atual := EXTRACT(HOUR   FROM v_atual AT TIME ZONE 'America/Sao_Paulo')
                  + EXTRACT(MINUTE FROM v_atual AT TIME ZONE 'America/Sao_Paulo') / 60.0;

    IF v_hora_atual < v_hora_ini THEN
      v_atual := DATE_TRUNC('day', v_atual) + (v_hora_ini || ' hours')::INTERVAL;
      CONTINUE;
    END IF;

    IF v_hora_atual >= v_hora_fim THEN
      v_atual := DATE_TRUNC('day', v_atual) + INTERVAL '1 day' + (v_hora_ini || ' hours')::INTERVAL;
      CONTINUE;
    END IF;

    v_dia_fim := DATE_TRUNC('day', v_atual) + (v_hora_fim || ' hours')::INTERVAL;

    IF p_fim <= v_dia_fim THEN
      v_hora_efim := EXTRACT(HOUR   FROM p_fim AT TIME ZONE 'America/Sao_Paulo')
                   + EXTRACT(MINUTE FROM p_fim AT TIME ZONE 'America/Sao_Paulo') / 60.0;
      v_total := v_total + LEAST(v_hora_efim, v_hora_fim) - v_hora_atual;
      EXIT;
    ELSE
      v_total := v_total + (v_hora_fim - v_hora_atual);
      v_atual := DATE_TRUNC('day', v_atual) + INTERVAL '1 day' + (v_hora_ini || ' hours')::INTERVAL;
    END IF;
  END LOOP;

  RETURN GREATEST(0, v_total);
END;
$$;

GRANT EXECUTE ON FUNCTION calc_horas_uteis(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, CHAR) TO authenticated;

-- ============================================================
-- STEP 3: RPC calc_sla_demanda
-- ============================================================

CREATE OR REPLACE FUNCTION calc_sla_demanda(
  p_demanda_id  UUID,
  p_regime      TEXT    DEFAULT 'padrao',
  p_uf          CHAR(2) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demanda       RECORD;
  v_transitions   RECORD;
  v_total_horas   NUMERIC := 0;
  v_ultimo_ts     TIMESTAMPTZ;
  v_ultimo_status TEXT;
  v_prazo_horas   NUMERIC;
  v_status_sla    TEXT;
  v_atraso        NUMERIC;
  v_sla_ativos    TEXT[] := ARRAY['nova','planejamento','planejamento_aprovado','execucao_dev'];
BEGIN
  SELECT id, created_at, situacao, sla, aceite_data
  INTO   v_demanda
  FROM   demandas
  WHERE  id = p_demanda_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'demanda_not_found');
  END IF;

  v_ultimo_ts     := v_demanda.created_at;
  v_ultimo_status := 'nova';

  FOR v_transitions IN
    SELECT from_status, to_status, created_at
    FROM   demanda_transitions
    WHERE  demanda_id = p_demanda_id
    ORDER  BY created_at ASC
  LOOP
    IF v_ultimo_status = ANY(v_sla_ativos) THEN
      v_total_horas := v_total_horas +
        calc_horas_uteis(v_ultimo_ts, v_transitions.created_at, p_regime, p_uf);
    END IF;
    v_ultimo_ts     := v_transitions.created_at;
    v_ultimo_status := v_transitions.to_status;
  END LOOP;

  IF v_ultimo_status = ANY(v_sla_ativos) AND v_demanda.situacao != 'aceite_final' THEN
    v_total_horas := v_total_horas + calc_horas_uteis(v_ultimo_ts, NOW(), p_regime, p_uf);
  END IF;

  v_prazo_horas := CASE v_demanda.sla
    WHEN '24x7'   THEN 4
    WHEN 'padrao' THEN 24
    ELSE 24
  END;

  IF v_demanda.situacao = 'aceite_final' THEN
    v_status_sla := 'concluido';
    v_atraso     := GREATEST(0, v_total_horas - v_prazo_horas);
  ELSIF v_total_horas > v_prazo_horas THEN
    v_status_sla := 'violado';
    v_atraso     := v_total_horas - v_prazo_horas;
  ELSIF v_total_horas > (v_prazo_horas * 0.85) THEN
    v_status_sla := 'em_risco';
    v_atraso     := 0;
  ELSE
    v_status_sla := 'dentro';
    v_atraso     := 0;
  END IF;

  RETURN jsonb_build_object(
    'demandaId',       p_demanda_id,
    'horasAcumuladas', ROUND(v_total_horas::NUMERIC, 2),
    'prazoHoras',      v_prazo_horas,
    'statusSLA',       v_status_sla,
    'atrasoHoras',     ROUND(v_atraso::NUMERIC, 2),
    'regime',          p_regime,
    'calculadoEm',     NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION calc_sla_demanda(UUID, TEXT, CHAR) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION calc_sla_demanda(UUID, TEXT, CHAR) TO authenticated;

COMMENT ON FUNCTION calc_sla_demanda IS 'Calcula horas SLA acumuladas no servidor. Substitui slaEngine.ts.';
COMMENT ON TABLE feriados IS 'Feriados configuráveis — nacionais, estaduais, municipais. Substitui hardcode em slaEngine.ts.';
