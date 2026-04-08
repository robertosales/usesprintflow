
-- Evolução 1.6: Remover coluna ordem_servico da tabela demandas
ALTER TABLE public.demandas DROP COLUMN IF EXISTS ordem_servico;

-- Evolução 2: Normalizar regime de atendimento - converter valores NxN para 'continuo'
UPDATE public.demandas SET sla = 'continuo' WHERE sla ~* '\d+\s*x\s*7';
UPDATE public.demandas SET sla = 'padrao' WHERE sla = 'PADRÃO' OR sla = 'Padrão';

-- Normalizar SLA nos projetos também
UPDATE public.projetos SET sla = 'continuo' WHERE sla ~* '\d+\s*x\s*7' OR sla = '24x7';
UPDATE public.projetos SET sla = 'padrao' WHERE sla = 'PADRÃO' OR sla = 'Padrão';

-- Evolução 9: Criar tabela sustentacao_workflow_steps se não existir
CREATE TABLE IF NOT EXISTS public.sustentacao_workflow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#3b82f6',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sustentacao_workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access sustentacao_workflow_steps" ON public.sustentacao_workflow_steps
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Member view own team sustentacao_workflow_steps" ON public.sustentacao_workflow_steps
  FOR SELECT TO public USING (is_team_member(auth.uid(), team_id));

CREATE POLICY "Member insert own team sustentacao_workflow_steps" ON public.sustentacao_workflow_steps
  FOR INSERT TO public WITH CHECK (is_team_member(auth.uid(), team_id));

CREATE POLICY "Member update own team sustentacao_workflow_steps" ON public.sustentacao_workflow_steps
  FOR UPDATE TO public USING (is_team_member(auth.uid(), team_id));

CREATE POLICY "Member delete own team sustentacao_workflow_steps" ON public.sustentacao_workflow_steps
  FOR DELETE TO public USING (is_team_member(auth.uid(), team_id));
