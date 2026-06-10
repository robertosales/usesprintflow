-- ============================================================
-- MIGRATION: Fase 1 — Contratos Foundation (Produção-Safe)
-- Data: 2026-06-10
-- Branch: refactor/contracts-phase0-homolog
--
-- O QUE FAZ:
--   1. Remove RPCs órfãs nunca chamadas pelo frontend
--   2. Recria contract_room_teams com estrutura limpa
--   3. Cria 1 contrato por time existente (sustentacao/agil)
--   4. Popula teams.contract_id e teams.team_type
--   5. Popula contract_slas com os valores hardcoded do frontend
--   6. Popula contract_room_teams a partir dos times reais
--
-- GARANTIAS:
--   ✅ Todas as operações são ON CONFLICT DO NOTHING ou idempotentes
--   ✅ Nenhuma coluna existente é alterada
--   ✅ Sistema legado continua funcionando durante e após a migration
--   ✅ Seguro para rodar múltiplas vezes sem efeitos colaterais
-- ============================================================

-- ============================================================
-- BLOCO 1: LIMPEZA — Remove RPCs nunca usadas pelo frontend
-- ============================================================

-- fn_check_sla_status: criada em 20260603_contracts_sla_module.sql
-- Status: nunca chamada. fn_sla_dashboard_batch usa calc_sla_demanda diretamente.
-- Será reimplementada corretamente na Fase 3 com lógica dinâmica real.
DROP FUNCTION IF EXISTS public.fn_check_sla_status(UUID, UUID, VARCHAR, TIMESTAMPTZ, TIMESTAMPTZ);

-- fn_get_team_contract: criada em 20260603_contracts_sla_module.sql
-- Status: nunca chamada. Lógica incorreta (time→contrato direto, sem room_type).
-- Será reimplementada na Fase 2 com a hierarquia correta.
DROP FUNCTION IF EXISTS public.fn_get_team_contract(UUID);

-- ============================================================
-- BLOCO 2: RECRIAR contract_room_teams (estrutura limpa)
-- A tabela original (20260603170000_hu001) estava correta no
-- design mas nunca foi populada. Recriamos mantendo a estrutura
-- e adicionando a coluna is_active para controle futuro.
-- ============================================================

-- Drop e recriação apenas se a tabela estiver vazia (seguro)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.contract_room_teams) = 0 THEN
    DROP TABLE public.contract_room_teams;

    CREATE TABLE public.contract_room_teams (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id UUID        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
      team_id     UUID        NOT NULL REFERENCES public.teams(id)     ON DELETE CASCADE,
      room_type   TEXT        NOT NULL CHECK (room_type IN ('agil', 'sustentacao')),
      is_active   BOOLEAN     NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (contract_id, team_id, room_type)
    );

    CREATE INDEX idx_crt_contract ON public.contract_room_teams(contract_id);
    CREATE INDEX idx_crt_team     ON public.contract_room_teams(team_id);
    CREATE INDEX idx_crt_active   ON public.contract_room_teams(is_active) WHERE is_active = true;

    ALTER TABLE public.contract_room_teams ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Admins manage contract_room_teams"
      ON public.contract_room_teams FOR ALL
      USING (public.is_admin());

    CREATE POLICY "Members view contract_room_teams"
      ON public.contract_room_teams FOR SELECT
      USING (true);

    -- Trigger updated_at
    DROP TRIGGER IF EXISTS trg_crt_updated_at ON public.contract_room_teams;
    CREATE TRIGGER trg_crt_updated_at
      BEFORE UPDATE ON public.contract_room_teams
      FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

    COMMENT ON TABLE public.contract_room_teams IS
      'Vínculo N:N entre contratos, times e tipos de sala (agil/sustentacao). '
      'Permite que o mesmo time opere em múltiplas modalidades de um contrato (híbrido).';
  END IF;
END;
$$;

-- ============================================================
-- BLOCO 3: CRIAR CONTRATOS a partir dos times existentes
--
-- Lógica:
--   • Cada time do tipo 'sustentacao' (module = 'sustentacao') vira
--     um contrato de sustentação, usando o nome do time como nome base.
--   • Cada time do tipo 'agil' vira um contrato ágil.
--   • Times sem module definido recebem contrato 'sustentacao' como default.
--   • ON CONFLICT DO NOTHING — idempotente.
--
-- NOTA: Esta lógica cria 1 contrato por time. Na Fase 2, o admin
-- poderá consolidar times diferentes no mesmo contrato real via UI.
-- ============================================================

-- Garante que a tabela temporária não existe de runs anteriores
DROP TABLE IF EXISTS _phase1_team_contract_map;

-- Tabela temporária de trabalho para mapear team_id → contract_id
CREATE TEMP TABLE _phase1_team_contract_map (
  team_id     UUID,
  contract_id UUID,
  room_type   TEXT
);

-- Insere contratos para times que ainda não têm contract_id
-- Usa CTE para capturar o contract_id gerado e salvar no mapa
WITH teams_sem_contrato AS (
  SELECT
    t.id                                              AS team_id,
    t.name                                            AS team_name,
    COALESCE(t.module::TEXT, 'sustentacao')           AS module,
    CASE
      WHEN COALESCE(t.module::TEXT, '') = 'agil' THEN 'agil'
      ELSE 'sustentacao'
    END                                               AS room_type
  FROM public.teams t
  WHERE t.deleted_at IS NULL
    AND t.contract_id IS NULL
),
contratos_inseridos AS (
  INSERT INTO public.contracts (name, description, status, room_mode)
  SELECT
    t.team_name                                                   AS name,
    'Contrato gerado automaticamente pela migração Fase 1 a partir do time: ' || t.team_name AS description,
    'active'                                                      AS status,
    t.room_type                                                   AS room_mode
  FROM teams_sem_contrato t
  ON CONFLICT DO NOTHING
  RETURNING id, name
)
INSERT INTO _phase1_team_contract_map (team_id, contract_id, room_type)
SELECT
  ts.team_id,
  ci.id AS contract_id,
  ts.room_type
FROM teams_sem_contrato ts
JOIN contratos_inseridos ci ON ci.name = ts.team_name;

-- ============================================================
-- BLOCO 4: ATUALIZAR teams.contract_id e teams.team_type
-- Usa o mapa criado no bloco anterior.
-- ============================================================
UPDATE public.teams t
SET
  contract_id = m.contract_id,
  team_type   = CASE m.room_type
                  WHEN 'agil'        THEN 'agile'
                  WHEN 'sustentacao' THEN 'sustenance'
                  ELSE 'sustenance'
                END
FROM _phase1_team_contract_map m
WHERE t.id = m.team_id
  AND t.contract_id IS NULL;   -- seguro: só atualiza quem não tem contrato

-- ============================================================
-- BLOCO 5: POPULAR contract_slas
--
-- SLAs hardcoded extraídos do frontend (sustentação):
--   urgent : resposta 60 min   | resolução 240 min
--   high   : resposta 120 min  | resolução 480 min
--   medium : resposta 240 min  | resolução 1440 min (1 dia útil)
--   low    : resposta 480 min  | resolução 2880 min (2 dias úteis)
--
-- Aplica a matriz para todos os contratos que não têm SLA configurado.
-- ON CONFLICT DO NOTHING — idempotente.
-- ============================================================
INSERT INTO public.contract_slas
  (contract_id, priority, response_time_minutes, resolution_time_minutes, business_hours_only)
SELECT
  c.id    AS contract_id,
  sla.priority,
  sla.response_time_minutes,
  sla.resolution_time_minutes,
  true    AS business_hours_only
FROM public.contracts c
CROSS JOIN (
  VALUES
    ('urgent', 60,  240),
    ('high',   120, 480),
    ('medium', 240, 1440),
    ('low',    480, 2880)
) AS sla(priority, response_time_minutes, resolution_time_minutes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.contract_slas cs
  WHERE cs.contract_id = c.id
    AND cs.priority    = sla.priority
)
ON CONFLICT ON CONSTRAINT unique_contract_priority DO NOTHING;

-- ============================================================
-- BLOCO 6: POPULAR contract_room_teams
-- Usa teams.contract_id (agora preenchido) para criar os vínculos N:N.
-- ON CONFLICT DO NOTHING — idempotente.
-- ============================================================
INSERT INTO public.contract_room_teams (contract_id, team_id, room_type)
SELECT
  t.contract_id,
  t.id AS team_id,
  CASE t.team_type
    WHEN 'agile'      THEN 'agil'
    WHEN 'sustenance' THEN 'sustentacao'
    ELSE 'sustentacao'
  END AS room_type
FROM public.teams t
WHERE t.contract_id IS NOT NULL
  AND t.deleted_at  IS NULL
ON CONFLICT (contract_id, team_id, room_type) DO NOTHING;

-- ============================================================
-- BLOCO 7: LIMPEZA
-- ============================================================
DROP TABLE IF EXISTS _phase1_team_contract_map;

-- ============================================================
-- VERIFICAÇÃO (comentada — rode manualmente no SQL Editor para conferir)
-- ============================================================
-- SELECT c.name, c.room_mode, c.status,
--        COUNT(DISTINCT cs.id) AS sla_rules,
--        COUNT(DISTINCT crt.id) AS team_links
-- FROM public.contracts c
-- LEFT JOIN public.contract_slas cs ON cs.contract_id = c.id
-- LEFT JOIN public.contract_room_teams crt ON crt.contract_id = c.id
-- GROUP BY c.id, c.name, c.room_mode, c.status
-- ORDER BY c.name;

-- ============================================================
-- FIM DA MIGRATION — Fase 1 concluída
-- Próximo: 20260610_phase2_projects_contract_link.sql
--   • UPDATE projects.contract_id herdando do time
--   • UPDATE projects.room_type baseado em module_type
--   • ADD fn_get_team_contract (versão correta)
--   • FIX RPC get_demandas expondo contract_id e room_type
-- ============================================================
