
-- Table: apf_templates
CREATE TABLE public.apf_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  output_type text NOT NULL CHECK (output_type IN ('docx', 'xlsx')),
  prompt_content text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apf_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access apf_templates" ON public.apf_templates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view own team apf_templates" ON public.apf_templates FOR SELECT USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team apf_templates" ON public.apf_templates FOR INSERT WITH CHECK (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team apf_templates" ON public.apf_templates FOR UPDATE USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team apf_templates" ON public.apf_templates FOR DELETE USING (is_team_member(auth.uid(), team_id));

CREATE TRIGGER update_apf_templates_updated_at BEFORE UPDATE ON public.apf_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: apf_generations
CREATE TABLE public.apf_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.apf_templates(id),
  sprint_id uuid REFERENCES public.sprints(id),
  generated_by uuid REFERENCES public.profiles(user_id),
  baseline_file text,
  hu_file text,
  model_file text,
  output_filename text,
  status text NOT NULL CHECK (status IN ('pending', 'success', 'error')) DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apf_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access apf_generations" ON public.apf_generations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Member view own team apf_generations" ON public.apf_generations FOR SELECT USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team apf_generations" ON public.apf_generations FOR INSERT WITH CHECK (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own team apf_generations" ON public.apf_generations FOR UPDATE USING (is_team_member(auth.uid(), team_id));
CREATE POLICY "Member delete own team apf_generations" ON public.apf_generations FOR DELETE USING (is_team_member(auth.uid(), team_id));
