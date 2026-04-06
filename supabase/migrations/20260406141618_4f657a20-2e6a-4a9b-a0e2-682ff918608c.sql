
-- Add new IMR columns to demandas table
ALTER TABLE public.demandas 
  ADD COLUMN IF NOT EXISTS demandante uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS ordem_servico text,
  ADD COLUMN IF NOT EXISTS tipo_defeito text,
  ADD COLUMN IF NOT EXISTS originada_diagnostico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prazo_inicio_atendimento timestamptz,
  ADD COLUMN IF NOT EXISTS prazo_solucao timestamptz,
  ADD COLUMN IF NOT EXISTS data_previsao_encerramento date,
  ADD COLUMN IF NOT EXISTS nota_satisfacao integer,
  ADD COLUMN IF NOT EXISTS cobertura_testes numeric,
  ADD COLUMN IF NOT EXISTS artefatos_atualizados text,
  ADD COLUMN IF NOT EXISTS hard_code_identificado boolean,
  ADD COLUMN IF NOT EXISTS reincidencia_defeito boolean,
  ADD COLUMN IF NOT EXISTS contador_rejeicoes integer NOT NULL DEFAULT 0;

-- Create demanda_eventos table for E1-E14 tracking
CREATE TABLE IF NOT EXISTS public.demanda_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  tipo_evento text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  redutor numeric NOT NULL DEFAULT 0,
  incidencia text NOT NULL DEFAULT 'limitada',
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demanda_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access demanda_eventos" ON public.demanda_eventos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Member view demanda_eventos" ON public.demanda_eventos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM demandas d WHERE d.id = demanda_eventos.demanda_id AND is_team_member(auth.uid(), d.team_id))
  );

CREATE POLICY "Member insert demanda_eventos" ON public.demanda_eventos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM demandas d WHERE d.id = demanda_eventos.demanda_id AND is_team_member(auth.uid(), d.team_id))
  );

CREATE POLICY "Member delete demanda_eventos" ON public.demanda_eventos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM demandas d WHERE d.id = demanda_eventos.demanda_id AND is_team_member(auth.uid(), d.team_id))
  );
