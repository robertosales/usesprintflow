-- Migration: Suporte a impedimentos no nível da Sprint
-- Data: 2026-05-08
--
-- Mudanças:
--   1. hu_id passa a ser nullable (impedimento pode ser da sprint, nao de uma HU)
--   2. Adiciona coluna sprint_id nullable com FK para sprints
--   3. Adiciona constraint: pelo menos hu_id OU sprint_id deve estar preenchido
--
-- Segura para rodar em produção — não destrói dados existentes.

-- 1. Torna hu_id opcional
ALTER TABLE impediments
  ALTER COLUMN hu_id DROP NOT NULL;

-- 2. Adiciona sprint_id (se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'impediments' AND column_name = 'sprint_id'
  ) THEN
    ALTER TABLE impediments
      ADD COLUMN sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- 3. Constraint: hu_id OU sprint_id (nunca nenhum dos dois)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'impediments'
      AND constraint_name = 'impediments_must_have_target'
  ) THEN
    ALTER TABLE impediments
      ADD CONSTRAINT impediments_must_have_target
      CHECK (hu_id IS NOT NULL OR sprint_id IS NOT NULL);
  END IF;
END;
$$;

-- 4. Index para queries por sprint_id
CREATE INDEX IF NOT EXISTS idx_impediments_sprint_id
  ON impediments (sprint_id)
  WHERE sprint_id IS NOT NULL;

-- 5. Index composto para queries por team + sprint
CREATE INDEX IF NOT EXISTS idx_impediments_team_sprint
  ON impediments (team_id, sprint_id)
  WHERE sprint_id IS NOT NULL;
