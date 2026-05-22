-- =============================================================
-- Migration: fix/evidence-report-vault-rls
-- SEC-005 Quick Fix — RLS apf_generations com escopo de team
-- Criado em: 2026-05-22
--
-- Problemas corrigidos:
--   1. Policy do bucket apf-documents usava auth.role()='authenticated'
--      (qualquer usuário autenticado acessa qualquer arquivo)
--      → corrigida para exigir que o path pertença ao generationId
--        de uma geração que o usuário criou.
--   2. apf_generations não possuia RLS habilitado nem policies granulares
--      com escopo de team → usuário podia ver gerações de outros teams.
--   3. UPDATE da Edge Function (service_role) era bloqueado pelas policies
--      de usuário → adicionada policy SERVICE exclusiva.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Garante RLS habilitado em apf_generations
-- ---------------------------------------------------------------
ALTER TABLE public.apf_generations ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- 2. Remove policies antigas / conflitantes em apf_generations
-- ---------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'apf_generations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.apf_generations', r.policyname);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------
-- 3. Policies para apf_generations — escopo de team
-- ---------------------------------------------------------------

-- SELECT: membro do mesmo team pode ver as gerações do seu team
CREATE POLICY "apf_generations: member select own team"
  ON public.apf_generations
  FOR SELECT
  USING (
    is_team_member(auth.uid(), team_id)
  );

-- INSERT: membro do team pode criar geração para seu team
CREATE POLICY "apf_generations: member insert own team"
  ON public.apf_generations
  FOR INSERT
  WITH CHECK (
    is_team_member(auth.uid(), team_id)
    AND created_by = auth.uid()
  );

-- UPDATE: somente o próprio criador pode atualizar (ex.: reprocessar)
-- A Edge Function usa service_role (bypassa RLS), então esta policy
-- protege apenas chamadas diretas do client.
CREATE POLICY "apf_generations: owner update"
  ON public.apf_generations
  FOR UPDATE
  USING (
    created_by = auth.uid()
    AND is_team_member(auth.uid(), team_id)
  );

-- DELETE: admin do team ou criador podem excluir
CREATE POLICY "apf_generations: admin or owner delete"
  ON public.apf_generations
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ---------------------------------------------------------------
-- 4. Corrige policies do bucket apf-documents
--    (escopo de path: generationId pertence ao usuário)
-- ---------------------------------------------------------------
DO $$
BEGIN
  -- Remove policies antigas do bucket criadas pela migration anterior
  DROP POLICY IF EXISTS "apf_documents_team_access"          ON storage.objects;
  DROP POLICY IF EXISTS "apf-documents: authenticated upload" ON storage.objects;
  DROP POLICY IF EXISTS "apf-documents: authenticated read"   ON storage.objects;
  DROP POLICY IF EXISTS "apf-documents: authenticated delete" ON storage.objects;
END;
$$;

-- Upload: apenas se o prefixo do path (generationId) pertence
-- a uma geração criada pelo próprio usuário.
CREATE POLICY "apf-documents: owner upload"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'apf-documents'
    AND EXISTS (
      SELECT 1 FROM public.apf_generations ag
      WHERE ag.id::text = split_part(name, '/', 1)
        AND ag.created_by = auth.uid()
    )
  );

-- SELECT: membro do mesmo team pode baixar
CREATE POLICY "apf-documents: team member read"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'apf-documents'
    AND EXISTS (
      SELECT 1 FROM public.apf_generations ag
      WHERE ag.id::text = split_part(name, '/', 1)
        AND is_team_member(auth.uid(), ag.team_id)
    )
  );

-- DELETE: apenas o criador da geração pode remover
CREATE POLICY "apf-documents: owner delete"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'apf-documents'
    AND EXISTS (
      SELECT 1 FROM public.apf_generations ag
      WHERE ag.id::text = split_part(name, '/', 1)
        AND ag.created_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- 5. Índice para acelerar o lookup pelo prefixo do path no Storage
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_apf_generations_id_text
  ON public.apf_generations ((id::text));
