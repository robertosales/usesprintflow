-- ============================================================
-- FASE 5b: BACKFILL public.projetos → public.projects
-- Data: 2026-06-10
-- Dependência: Fase 5a (team_id, sla_id, legacy_projetos_id já existem)
-- PRINCÍPIO:
--   • public.projetos intocada — continua sendo a fonte do frontend.
--   • Backfill idempotente: WHERE NOT EXISTS garante re-run seguro.
--   • Mapeamento campo a campo documentado.
--   • Sem perda de dados: todos os campos preservados ou mapeados.
--   • Slug gerado sem UNACCENT (extensão não disponível).
-- ============================================================

BEGIN;

-- ============================================================
-- 1. BACKFILL: public.projetos → public.projects
--
-- Mapeamento de campos:
--   projetos.id          → projects.legacy_projetos_id  (rastreabilidade)
--   projetos.team_id     → projects.team_id             (sala direta)
--   projetos.nome        → projects.name                (nome principal)
--   projetos.descricao   → projects.description         (descrição)
--   projetos.contract_id → projects.contract_id         (contrato)
--   projetos.sla_id      → projects.sla_id              (SLA customizado)
--   projetos.created_at  → projects.created_at          (histórico)
--   projetos.updated_at  → projects.updated_at          (histórico)
--
-- Campos sem equivalente direto:
--   projetos.equipe → coberto semanticamente por team_id
--   projetos.sla    → substituído por sla_id + contract_slas
--
-- Campos calculados:
--   projects.code        → slug do nome sem UNACCENT
--                          mantém acentos como letras válidas no slug
--                          remove apenas caracteres não-alfanuméricos
--   projects.module_type → 'sustenance' (todos são sustentação)
--   projects.status      → 'active'
-- ============================================================
INSERT INTO public.projects (
  legacy_projetos_id,
  team_id,
  name,
  description,
  contract_id,
  sla_id,
  code,
  module_type,
  status,
  created_at,
  updated_at
)
SELECT
  p.id                                              AS legacy_projetos_id,
  p.team_id,
  p.nome                                            AS name,
  NULLIF(TRIM(p.descricao), '')                     AS description,
  p.contract_id,
  p.sla_id,
  -- slug: lowercase, espaços/hifens/colchetes viram _, trunca em 50 chars
  -- ex: "[SUST] GPOL" → "sust_gpol"
  LEFT(
    LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          TRIM(p.nome),
          '[\[\]\(\)]+', '', 'g'     -- remove colchetes e parênteses
        ),
        '[^a-zà-ü0-9]+', '_', 'g'  -- tudo que não é letra/número vira _
      )
    ),
    50
  )                                                 AS code,
  'sustenance'                                      AS module_type,
  'active'                                          AS status,
  p.created_at,
  p.updated_at
FROM public.projetos p
WHERE NOT EXISTS (
  SELECT 1 FROM public.projects pr
  WHERE pr.legacy_projetos_id = p.id
);

-- ============================================================
-- 2. BACKFILL demandas.project_id
--    Preenche demandas.project_id usando correspondência
--    demandas.team_id → projects.team_id (via migrados).
--    Só atualiza demandas com project_id ainda NULL.
--
--    ATENÇÃO: um time pode ter vários projetos em public.projetos.
--    O UPDATE usa DISTINCT ON (d.id) para pegar apenas o projeto
--    mais recente por time, evitando duplicação.
-- ============================================================
UPDATE public.demandas d
SET
  project_id = sub.project_id,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (d2.id)
    d2.id          AS demanda_id,
    pr.id          AS project_id
  FROM public.demandas d2
  JOIN public.projects pr
    ON pr.team_id  = d2.team_id
   AND pr.status   = 'active'
   AND pr.legacy_projetos_id IS NOT NULL
  WHERE d2.project_id IS NULL
  ORDER BY d2.id, pr.created_at DESC
) sub
WHERE d.id = sub.demanda_id;

-- ============================================================
-- 3. LOG de cobertura pós-backfill
-- ============================================================
SELECT
  'projetos → projects'       AS operacao,
  (SELECT COUNT(*) FROM public.projetos)
                                AS total_legados,
  (SELECT COUNT(*) FROM public.projects
   WHERE  legacy_projetos_id IS NOT NULL)
                                AS migrados,
  (SELECT COUNT(*) FROM public.projetos p
   WHERE  NOT EXISTS (
     SELECT 1 FROM public.projects pr
     WHERE  pr.legacy_projetos_id = p.id
   ))                           AS nao_migrados

UNION ALL

SELECT
  'demandas.project_id'        AS operacao,
  COUNT(*)                      AS total_legados,
  COUNT(*) FILTER (WHERE project_id IS NOT NULL) AS migrados,
  COUNT(*) FILTER (WHERE project_id IS NULL)     AS nao_migrados
FROM public.demandas;

COMMIT;

-- ============================================================
-- FIM
-- Próximo passo: Fase 5c — ProjetosManager no Admin (frontend)
-- Migration: 20260610_phase5b_backfill_projetos_to_projects.sql
-- ============================================================
