-- =============================================================
-- BUGFIX: user_module_roles_role_name_fkey
-- Erro: insert or update on table "user_module_roles" violates
--       foreign key constraint "user_module_roles_role_name_fkey"
--
-- Causa: a FK aponta para uma tabela de lookup de roles que nao
--        contém todos os valores usados pelo código (ex: 'member',
--        'scrum_master', 'developer', 'viewer', etc.).
--
-- Solução: remover a FK e usar CHECK constraint, que é mais
--          adequado para enumerações controladas pelo app.
-- =============================================================

-- 1. Remove a FK problemática (idempotente)
ALTER TABLE public.user_module_roles
  DROP CONSTRAINT IF EXISTS user_module_roles_role_name_fkey;

-- 2. Remove CHECK anterior se existir (para recriar limpo)
ALTER TABLE public.user_module_roles
  DROP CONSTRAINT IF EXISTS chk_user_module_roles_role_name;

-- 3. Adiciona CHECK com todos os valores válidos usados pelo app
ALTER TABLE public.user_module_roles
  ADD CONSTRAINT chk_user_module_roles_role_name
  CHECK (
    role_name IN (
      'admin',
      'scrum_master',
      'developer',
      'member',
      'viewer',
      'product_owner',
      'tech_lead'
    )
  );

-- 4. Garante que valores inválidos já existentes na tabela
--    sejam normalizados para 'member' antes do CHECK entrar em vigor.
--    (Roda antes do CHECK — ordem das statements garante isso em uma
--     única transação DDL no Postgres)
UPDATE public.user_module_roles
  SET role_name = 'member'
WHERE role_name NOT IN (
  'admin', 'scrum_master', 'developer',
  'member', 'viewer', 'product_owner', 'tech_lead'
);
