-- ============================================================
-- Migration: fix_profiles_full_name_trigger
-- Garante que a coluna full_name exista e que o trigger
-- handle_new_user preencha corretamente display_name e full_name
-- ao criar um novo usuário.
-- ============================================================

-- 1. Adiciona a coluna full_name caso ainda não exista
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. Recria a função do trigger com o preenchimento correto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name    TEXT;
  v_display_name TEXT;
BEGIN
  -- Tenta obter o nome completo dos metadados do usuário
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'),      '')
  );

  -- display_name: usa o nome completo ou cai no prefixo do email
  v_display_name := COALESCE(
    v_full_name,
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    user_id,
    display_name,
    full_name,
    email,
    avatar_url,
    module_access
  )
  VALUES (
    NEW.id,
    v_display_name,
    v_full_name,
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    'sala_agil'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET
      display_name = EXCLUDED.display_name,
      full_name    = EXCLUDED.full_name,
      email        = EXCLUDED.email;

  RETURN NEW;
END;
$$;

-- 3. Recria o trigger (DROP IF EXISTS para evitar duplicata)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
