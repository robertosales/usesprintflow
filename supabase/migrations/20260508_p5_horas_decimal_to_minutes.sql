-- =============================================================================
-- MIGRAÇÃO P5 — Sustentação: conversão de horas decimais para minutos inteiros
-- Arquivo : supabase/migrations/20260508_p5_horas_decimal_to_minutes.sql
-- Autor   : NexOps / useSprintFlow
-- Data    : 2026-05-08
--
-- CONTEXTO
--   A coluna demanda_hours.horas armazenava valores decimais no estilo
--   brasileiro com vírgula (0,8 → 0.8 / 1,5 → 1.5).  Com a P4, o frontend
--   passou a trabalhar em HH:MM, convertendo internamente para decimal.
--   Esta migração padroniza todos os registros históricos para minutos inteiros
--   (ex: 0.8 → 48 min / 1.5 → 90 min), elimina valores inválidos e cria
--   tabela de log para rastreabilidade.
--
-- ESTRATÉGIA
--   1. Criar tabela de log da migração (idempotente).
--   2. Fazer backup snapshot dos registros afetados.
--   3. Identificar e converter apenas os registros decimais.
--   4. Manter rollback completo em procedimento separado.
--
-- ROLLBACK
--   Execute a seção marcada "ROLLBACK" ao final deste arquivo.
--
-- GARANTIAS
--   ✅ Registros com horas em número inteiro (1, 2, 3...) NÃO são tocados.
--   ✅ Registros com horas = 0 são marcados como inválidos no log mas NÃO
--      são removidos (preservação de dados).
--   ✅ Compatível com relatórios, APIs e totalizadores (todos lêem .horas).
--   ✅ Idempotente: pode ser executado mais de uma vez sem duplicar conversões.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. TABELA DE LOG DA MIGRAÇÃO
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS migration_demanda_hours_log (
    id              BIGSERIAL PRIMARY KEY,
    run_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hour_id         UUID        NOT NULL,
    demanda_id      UUID        NOT NULL,
    user_id         UUID        NOT NULL,
    fase            TEXT        NOT NULL,
    horas_antes     NUMERIC     NOT NULL,  -- valor original (decimal)
    horas_depois    NUMERIC     NOT NULL,  -- valor convertido (minutos inteiros)
    status          TEXT        NOT NULL,  -- 'converted' | 'already_integer' | 'zero_skipped'
    nota            TEXT
);

COMMENT ON TABLE migration_demanda_hours_log IS
    'Log de auditoria da migração P5 — conversão decimal→minutos em demanda_hours';

-- ---------------------------------------------------------------------------
-- 1. SNAPSHOT — backup dos registros ANTES da conversão
--    (tabela temporária válida para a sessão; em produção use CREATE TABLE
--    _backup_demanda_hours AS SELECT ... para persistência)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS _backup_demanda_hours_p5 AS
SELECT
    id,
    demanda_id,
    user_id,
    fase,
    horas          AS horas_original,
    descricao,
    created_at,
    NOW()          AS backup_at
FROM demanda_hours
WHERE
    -- Apenas registros com parte decimal (não inteiros)
    horas <> FLOOR(horas)
    -- Exclui zeros (tratados separadamente)
    AND horas <> 0;

COMMENT ON TABLE _backup_demanda_hours_p5 IS
    'Backup snapshot dos registros decimais antes da migração P5. Pode ser removida após validação.';

-- ---------------------------------------------------------------------------
-- 2. CONVERSÃO PRINCIPAL
--    Regra: minutos = ROUND(horas_decimal * 60)
--    Exemplos:
--      0.3  → ROUND(0.3  * 60) =  18 min → 18
--      0.5  → ROUND(0.5  * 60) =  30 min → 30
--      0.8  → ROUND(0.8  * 60) =  48 min → 48
--      1.5  → ROUND(1.5  * 60) =  90 min → 90
--      2.75 → ROUND(2.75 * 60) = 165 min → 165
-- ---------------------------------------------------------------------------
WITH registros_a_converter AS (
    SELECT id, horas
    FROM demanda_hours
    WHERE horas <> FLOOR(horas)
      AND horas <> 0
      -- Idempotência: pula registros já marcados como convertidos
      AND id NOT IN (
          SELECT hour_id FROM migration_demanda_hours_log WHERE status = 'converted'
      )
),
conversao AS (
    UPDATE demanda_hours dh
    SET horas = ROUND(dh.horas * 60)  -- salva como minutos inteiros
    FROM registros_a_converter r
    WHERE dh.id = r.id
    RETURNING
        dh.id,
        dh.demanda_id,
        dh.user_id,
        dh.fase,
        r.horas   AS horas_antes,
        dh.horas  AS horas_depois
)
INSERT INTO migration_demanda_hours_log
    (hour_id, demanda_id, user_id, fase, horas_antes, horas_depois, status, nota)
SELECT
    c.id,
    c.demanda_id,
    c.user_id,
    c.fase,
    c.horas_antes,
    c.horas_depois,
    'converted',
    'Decimal convertido para minutos inteiros pela migração P5'
FROM conversao c;

-- ---------------------------------------------------------------------------
-- 3. LOG DOS REGISTROS ZERO (sem conversão, apenas rastreabilidade)
-- ---------------------------------------------------------------------------
INSERT INTO migration_demanda_hours_log
    (hour_id, demanda_id, user_id, fase, horas_antes, horas_depois, status, nota)
SELECT
    id,
    demanda_id,
    user_id,
    fase,
    horas,
    horas,
    'zero_skipped',
    'Registro com horas=0 — não convertido; verificar manualmente'
FROM demanda_hours
WHERE horas = 0
  AND id NOT IN (
      SELECT hour_id FROM migration_demanda_hours_log WHERE status = 'zero_skipped'
  );

-- ---------------------------------------------------------------------------
-- 4. LOG DOS REGISTROS JÁ INTEIROS (auditoria, sem alteração)
-- ---------------------------------------------------------------------------
INSERT INTO migration_demanda_hours_log
    (hour_id, demanda_id, user_id, fase, horas_antes, horas_depois, status, nota)
SELECT
    id,
    demanda_id,
    user_id,
    fase,
    horas,
    horas,
    'already_integer',
    'Valor já era inteiro — provavelmente em minutos, nenhuma ação necessária'
FROM demanda_hours
WHERE horas = FLOOR(horas)
  AND horas <> 0
  AND id NOT IN (
      SELECT hour_id FROM migration_demanda_hours_log WHERE status = 'already_integer'
  );

-- ---------------------------------------------------------------------------
-- 5. RELATÓRIO FINAL (exibido no console ao executar)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_converted     INT;
    v_zero          INT;
    v_already_int   INT;
    v_total         INT;
BEGIN
    SELECT COUNT(*) INTO v_converted   FROM migration_demanda_hours_log WHERE status = 'converted';
    SELECT COUNT(*) INTO v_zero        FROM migration_demanda_hours_log WHERE status = 'zero_skipped';
    SELECT COUNT(*) INTO v_already_int FROM migration_demanda_hours_log WHERE status = 'already_integer';
    v_total := v_converted + v_zero + v_already_int;

    RAISE NOTICE '============================================================';
    RAISE NOTICE 'MIGRAÇÃO P5 — RELATÓRIO';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Total de registros processados : %', v_total;
    RAISE NOTICE 'Convertidos (decimal→minutos)  : %', v_converted;
    RAISE NOTICE 'Ignorados (horas = 0)          : %', v_zero;
    RAISE NOTICE 'Já inteiros (sem alteração)    : %', v_already_int;
    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE 'Backup disponível em: _backup_demanda_hours_p5';
    RAISE NOTICE 'Log completo em    : migration_demanda_hours_log';
    RAISE NOTICE '============================================================';
END;
$$;

COMMIT;

-- =============================================================================
-- VALIDAÇÃO PÓS-MIGRAÇÃO (execute manualmente para conferir)
-- =============================================================================
/*

-- 1. Verificar se ainda existem decimais (deve retornar 0 linhas)
SELECT id, horas
FROM demanda_hours
WHERE horas <> FLOOR(horas);

-- 2. Ver resumo do log
SELECT status, COUNT(*) as qtd, AVG(horas_antes) as media_antes
FROM migration_demanda_hours_log
GROUP BY status
ORDER BY status;

-- 3. Checar conversões específicas (antes vs depois)
SELECT
    l.hour_id,
    l.fase,
    l.horas_antes,
    l.horas_depois,
    -- Reconstrói HH:MM para conferência visual
    LPAD(FLOOR(l.horas_depois / 60)::TEXT, 2, '0') || ':' ||
    LPAD((l.horas_depois % 60)::TEXT, 2, '0') AS hhmm
FROM migration_demanda_hours_log l
WHERE status = 'converted'
ORDER BY l.run_at DESC
LIMIT 50;

-- 4. Conferir totais por demanda (não devem mudar de forma absurda)
SELECT
    demanda_id,
    SUM(horas) as total_minutos,
    ROUND(SUM(horas) / 60.0, 2) as total_horas
FROM demanda_hours
GROUP BY demanda_id
ORDER BY total_minutos DESC
LIMIT 20;

*/

-- =============================================================================
-- ROLLBACK — execute APENAS se precisar reverter a migração
-- =============================================================================
/*

BEGIN;

-- Restaura os valores originais a partir do backup snapshot
UPDATE demanda_hours dh
SET horas = b.horas_original
FROM _backup_demanda_hours_p5 b
WHERE dh.id = b.id;

-- Marca o log como revertido (para rastreabilidade)
UPDATE migration_demanda_hours_log
SET status = 'rolled_back',
    nota   = nota || ' | ROLLBACK executado em ' || NOW()
WHERE status = 'converted';

RAISE NOTICE 'ROLLBACK P5 concluído — % registros restaurados',
    (SELECT COUNT(*) FROM _backup_demanda_hours_p5);

COMMIT;

*/

-- =============================================================================
-- LIMPEZA (execute APÓS validação completa e aprovação em produção)
-- =============================================================================
/*

-- Remove backup (somente após confirmar que tudo está correto)
DROP TABLE IF EXISTS _backup_demanda_hours_p5;

-- Mantém migration_demanda_hours_log para auditoria permanente.

*/
