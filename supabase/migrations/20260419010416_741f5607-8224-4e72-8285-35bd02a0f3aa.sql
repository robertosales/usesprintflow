-- Adiciona controle de fase na retrospectiva
ALTER TABLE public.retro_sessions
  ADD COLUMN IF NOT EXISTS current_phase TEXT NOT NULL DEFAULT 'writing';

-- Garante consistência: writing → reveal → voting → closed
ALTER TABLE public.retro_sessions
  DROP CONSTRAINT IF EXISTS retro_sessions_current_phase_check;

ALTER TABLE public.retro_sessions
  ADD CONSTRAINT retro_sessions_current_phase_check
  CHECK (current_phase IN ('writing', 'reveal', 'voting', 'closed'));

-- Coluna para marcar cards ocultados pelo facilitador antes do reveal
ALTER TABLE public.retro_cards
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;

-- Habilita realtime nas tabelas de retro (idempotente)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_sessions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_cards;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_votes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.retro_participants;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- REPLICA IDENTITY FULL para realtime payloads completos
ALTER TABLE public.retro_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.retro_cards REPLICA IDENTITY FULL;
ALTER TABLE public.retro_votes REPLICA IDENTITY FULL;
ALTER TABLE public.retro_participants REPLICA IDENTITY FULL;