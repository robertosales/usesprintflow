
-- Tabela de fases configuráveis para lançamento de horas em demandas de Sustentação
CREATE TABLE IF NOT EXISTS public.demanda_fases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.demanda_fases ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode visualizar a lista de fases (catálogo global)
CREATE POLICY "Authenticated can view demanda_fases"
ON public.demanda_fases FOR SELECT
TO authenticated
USING (true);

-- Apenas admins podem criar/editar/excluir fases
CREATE POLICY "Admin manage demanda_fases"
ON public.demanda_fases FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_demanda_fases_updated_at
BEFORE UPDATE ON public.demanda_fases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.demanda_fases;

-- Seed com fases existentes (hard-coded antes) + duas novas reuniões
INSERT INTO public.demanda_fases (key, label, ordem) VALUES
  ('analise', 'Análise', 1),
  ('planejamento', 'Planejamento', 2),
  ('execucao', 'Execução', 3),
  ('homologacao', 'Homologação', 4),
  ('producao', 'Produção', 5),
  ('reuniao_interna', 'Reunião Interna', 6),
  ('reuniao_cliente', 'Reunião Cliente', 7)
ON CONFLICT (key) DO NOTHING;
