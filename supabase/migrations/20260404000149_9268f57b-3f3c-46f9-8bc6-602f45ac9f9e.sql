
-- Add module_access column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS module_access text NOT NULL DEFAULT 'sala_agil';

-- Create demandas table
CREATE TABLE public.demandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  rhm text NOT NULL,
  projeto text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'corretiva',
  situacao text NOT NULL DEFAULT 'nova',
  descricao text DEFAULT '',
  sla text NOT NULL DEFAULT 'padrao',
  responsavel_requisitos uuid REFERENCES public.profiles(id),
  responsavel_dev uuid REFERENCES public.profiles(id),
  responsavel_teste uuid REFERENCES public.profiles(id),
  responsavel_arquiteto uuid REFERENCES public.profiles(id),
  aceite_data timestamp with time zone,
  aceite_responsavel uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(team_id, rhm)
);

ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access demandas" ON public.demandas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view own team demandas" ON public.demandas FOR SELECT USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team demandas" ON public.demandas FOR INSERT WITH CHECK (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team demandas" ON public.demandas FOR UPDATE USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team demandas" ON public.demandas FOR DELETE USING (is_team_member(auth.uid(), team_id));

-- Create demanda_transitions table
CREATE TABLE public.demanda_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  user_id uuid NOT NULL,
  justificativa text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.demanda_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access demanda_transitions" ON public.demanda_transitions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view demanda_transitions" ON public.demanda_transitions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.demandas d WHERE d.id = demanda_id AND is_team_member(auth.uid(), d.team_id))
);
CREATE POLICY "Member insert demanda_transitions" ON public.demanda_transitions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.demandas d WHERE d.id = demanda_id AND is_team_member(auth.uid(), d.team_id))
);

-- Create demanda_hours table
CREATE TABLE public.demanda_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  horas numeric NOT NULL DEFAULT 0,
  fase text NOT NULL DEFAULT 'execucao',
  descricao text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.demanda_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access demanda_hours" ON public.demanda_hours FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view demanda_hours" ON public.demanda_hours FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.demandas d WHERE d.id = demanda_id AND is_team_member(auth.uid(), d.team_id))
);
CREATE POLICY "Member insert demanda_hours" ON public.demanda_hours FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.demandas d WHERE d.id = demanda_id AND is_team_member(auth.uid(), d.team_id))
);
CREATE POLICY "Member delete own demanda_hours" ON public.demanda_hours FOR DELETE USING (user_id = auth.uid());

-- Trigger for updated_at on demandas
CREATE TRIGGER update_demandas_updated_at BEFORE UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
