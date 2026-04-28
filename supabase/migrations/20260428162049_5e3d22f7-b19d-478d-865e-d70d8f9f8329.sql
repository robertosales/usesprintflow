ALTER TABLE public.retro_cards DROP CONSTRAINT IF EXISTS retro_cards_action_target_sprint_id_fkey;
ALTER TABLE public.retro_cards ADD CONSTRAINT retro_cards_action_target_sprint_id_fkey FOREIGN KEY (action_target_sprint_id) REFERENCES public.sprints(id) ON DELETE SET NULL;

ALTER TABLE public.retro_actions DROP CONSTRAINT IF EXISTS retro_actions_target_sprint_id_fkey;
ALTER TABLE public.retro_actions ADD CONSTRAINT retro_actions_target_sprint_id_fkey FOREIGN KEY (target_sprint_id) REFERENCES public.sprints(id) ON DELETE SET NULL;

ALTER TABLE public.apf_generations DROP CONSTRAINT IF EXISTS apf_generations_sprint_id_fkey;
ALTER TABLE public.apf_generations ADD CONSTRAINT apf_generations_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE SET NULL;