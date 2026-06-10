-- ============================================================
-- FASE 5b: BACKFILL public.projetos → public.projects
-- Data: 2026-06-10
-- Dependência: Fase 5a (team_id, sla_id, legacy_projetos_id já existem)
-- PRINCÍPIO:
--   • public.projetos intocada — continua sendo a fonte do frontend.
--   • Backfill idempotente: ON CONFLICT (legacy_projetos_id) DO NOTHING.
--   • Mapeamento campo a campo documentado.
--   • Sem perda de dados: todos os campos preservados ou mapeados.
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
--   projetos.equipe      → sem coluna em projects (campo texto livre,
--                           semanticamente coberto por team_id)
--   projetos.sla         → sem coluna em projects (valor texto 'padrao'|etc,
--                           substituído por sla_id + contract_slas)
--
-- Campos calculados:
--   projects.code        → slug do nome (lower, sem acento, espaço vira _)
--   projects.module_type → 'sustenance' (todos os projetos de projetos são
--                           de sustentação por definição)
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
  p.id                                          AS legacy_projetos_id,
  p.team_id,
  p.nome                                        AS name,
  NULLIF(TRIM(p.descricao), '')                 AS description,
  p.contract_id,
  p.sla_id,
  -- code: slug do nome (max 50 chars, lowercase, sem caracteres especiais)
  LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        UNACCENT(TRIM(p.nome)),
        '[^a-zA-Z0-9\s_-]', '', 'g'
      ),
      '[\s]+', '_', 'g'
    )
  )::VARCHAR(50)                                AS code,
  'sustenance'                                  AS module_type,
  'active'                                      AS status,
  p.created_at,
  p.updated_at
FROM public.projetos p
WHERE NOT EXISTS (
  -- idempotente: pula se já foi migrado
  SELECT 1 FROM public.projects pr
  WHERE pr.legacy_projetos_id = p.id
);

-- ============================================================
-- 2. BACKFILL demandas.project_id
--    Agora que public.projects tem os projetos migrados,
--    preenche demandas.project_id usando a correspondência
--    demandas.team_id → projects.team_id (via legacy).
--    Só atualiza demandas que ainda estão com project_id NULL.
-- ============================================================
UPDATE public.demandas d
SET
  project_id = pr.id,
  updated_at = NOW()
FROM public.projects pr
WHERE pr.team_id     = d.team_id
  AND pr.status      = 'active'
  AND d.project_id   IS NULL
  AND pr.legacy_projetos_id IS NOT NULL;  -- só via projetos migrados

-- ============================================================
-- 3. LOG de cobertura pós-backfill
-- ============================================================
SELECT
  'projetos → projects' AS operacao,
  (SELECT COUNT(*) FROM public.projetos)                              AS total_projetos_legados,
  (SELECT COUNT(*) FROM public.projects WHERE legacy_projetos_id IS NOT NULL) AS migrados,
  (SELECT COUNT(*) FROM public.projetos p
   WHERE NOT EXISTS (
     SELECT 1 FROM public.projects pr WHERE pr.legacy_projetos_id = p.id
   ))                                                                 AS nao_migrados

UNION ALL

SELECT
  'demandas.project_id' AS operacao,
  COUNT(*)                                                            AS total_projetos_legados,
  COUNT(*) FILTER (WHERE project_id IS NOT NULL)                     AS migrados,
  COUNT(*) FILTER (WHERE project_id IS NULL)                         AS nao_migrados
FROM public.demandas;

COMMIT;

-- ============================================================
-- FIM
-- Próximo passo: Fase 5c — ProjetosManager no Admin
-- Migration: 20260610_phase5b_backfill_projetos_to_projects.sql
-- ============================================================
