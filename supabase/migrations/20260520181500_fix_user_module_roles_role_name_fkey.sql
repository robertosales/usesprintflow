-- =============================================================
-- BUGFIX: user_module_roles_role_name_fkey
-- Erro: insert or update on table "user_module_roles" violates
--       foreign key constraint "user_module_roles_role_name_fkey"
--
-- Causa: a FK aponta para uma tabela de lookup que nao contém
--        todos os valores usados pelo app (PROFILES_BY_MODULE em
--        UserRolesManager.tsx define mais roles do que a tabela
--        de lookup continha).
--
-- Solução: remover FK, normalizar dados sujos, aplicar CHECK
--          com TODOS os valores válidos do front-end.
-- =============================================================

-- 1. Remove a FK problemática
ALTER TABLE public.user_module_roles
  DROP CONSTRAINT IF EXISTS user_module_roles_role_name_fkey;

-- 2. Remove CHECK anterior se existir
ALTER TABLE public.user_module_roles
  DROP CONSTRAINT IF EXISTS chk_user_module_roles_role_name;

-- 3. Normaliza valores fora da lista válida ANTES do CHECK
UPDATE public.user_module_roles
  SET role_name = 'member'
WHERE role_name NOT IN (
  -- roles globais
  'admin',
  'member',
  'viewer',
  -- sala_agil + sustentacao
  'scrum_master',
  'product_owner',
  'developer',
  'tech_lead',
  'architect',
  'analyst',
  'qa',
  -- rdm
  'change_manager',
  'rdm_approver',
  'rdm_executor'
);

-- 4. Aplica CHECK com todos os valores válidos do front-end
ALTER TABLE public.user_module_roles
  ADD CONSTRAINT chk_user_module_roles_role_name
  CHECK (
    role_name IN (
      'admin',
      'member',
      'viewer',
      'scrum_master',
      'product_owner',
      'developer',
      'tech_lead',
      'architect',
      'analyst',
      'qa',
      'change_manager',
      'rdm_approver',
      'rdm_executor'
    )
  );
