-- =============================================================
-- BUGFIX: user_module_roles_role_name_fkey
-- Erro: insert or update on table "user_module_roles" violates
--       foreign key constraint "user_module_roles_role_name_fkey"
--
-- Causa: a FK aponta para uma tabela de lookup que nao contém
--        todos os valores usados pelo app (incluindo 'architect').
--
-- Solução: remover FK, normalizar dados, aplicar CHECK.
-- =============================================================

-- 1. Remove a FK problemática
ALTER TABLE public.user_module_roles
  DROP CONSTRAINT IF EXISTS user_module_roles_role_name_fkey;

-- 2. Remove CHECK anterior se existir
ALTER TABLE public.user_module_roles
  DROP CONSTRAINT IF EXISTS chk_user_module_roles_role_name;

-- 3. Normaliza valores que estejam fora da lista válida
--    (deve rodar ANTES do ADD CONSTRAINT)
UPDATE public.user_module_roles
  SET role_name = 'member'
WHERE role_name NOT IN (
  'admin', 'scrum_master', 'developer',
  'member', 'viewer', 'product_owner', 'tech_lead',
  'architect'
);

-- 4. Adiciona CHECK com todos os valores válidos
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
      'tech_lead',
      'architect'
    )
  );
