
-- Create SLAs table
CREATE TABLE public.slas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  regime_base TEXT NOT NULL DEFAULT 'padrao',
  team_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(nome, team_id)
);

ALTER TABLE public.slas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access slas" ON public.slas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view own team slas" ON public.slas FOR SELECT USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team slas" ON public.slas FOR INSERT WITH CHECK (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team slas" ON public.slas FOR UPDATE USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team slas" ON public.slas FOR DELETE USING (is_team_member(auth.uid(), team_id));

CREATE TRIGGER update_slas_updated_at BEFORE UPDATE ON public.slas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add sla_id FK column to projetos (nullable, to be populated after seeding)
ALTER TABLE public.projetos ADD COLUMN sla_id UUID REFERENCES public.slas(id) ON DELETE SET NULL;
