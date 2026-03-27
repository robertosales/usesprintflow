
-- Activity Comments table
CREATE TABLE IF NOT EXISTS public.activity_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access activity_comments" ON public.activity_comments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Member view own team comments" ON public.activity_comments FOR SELECT USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member insert own team comments" ON public.activity_comments FOR INSERT WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Member update own comments" ON public.activity_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Member delete own comments" ON public.activity_comments FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_activity_comments_updated_at
  BEFORE UPDATE ON public.activity_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
