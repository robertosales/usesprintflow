---
name: Retro 4-phase realtime
description: Retrospective feature with 4 facilitator-controlled phases (writing, reveal, voting, closed) using Supabase Realtime broadcast by sessionId
type: feature
---
# Retrospectiva — Fluxo de 4 fases com Realtime

## Arquitetura
- Feature em `src/features/retro/`
  - `types/retro.ts` — interfaces RetroSession/Card/Vote/Participant + RetroPhase
  - `services/retro.service.ts` — CRUD de sessions, cards, votes, participants
  - `hooks/useRetroSession.ts` — single hook que orquestra realtime + heartbeat
  - `components/` — RetroPage (orchestrator), RetroStartScreen, RetroPhaseHeader, RetroWritingPhase, RetroRevealPhase, RetroVotingPhase
- `src/components/RetroManager.tsx` é apenas um re-export para compatibilidade com `Index.tsx`.

## Schema (já no banco)
- `retro_sessions.current_phase` TEXT CHECK IN ('writing','reveal','voting','closed') DEFAULT 'writing'
- `retro_cards.hidden` BOOLEAN DEFAULT false (facilitador oculta antes do reveal)
- Realtime habilitado em retro_sessions, retro_cards, retro_votes, retro_participants com REPLICA IDENTITY FULL.

## Regras
- Facilitador: criador da sessão. Apenas Admin/Scrum Master/Product Owner podem criar.
- Transferência de facilitação via dropdown na header.
- Facilitador offline > 60s → outros participantes podem assumir (botão "Assumir").
- Heartbeat dos participantes: 20s (last_seen_at + is_online).
- Apenas o facilitador avança fases (writing → reveal → voting → closed) e encerra a sessão.
- Cancelamento: status = 'cancelled', não vai para o histórico do AgileHistory de retros (filtra por finished/cancelled — cancelled aparece como tal).
- Encerramento: status = 'finished', current_phase = 'closed', finished_at = now().

## Fases
1. WRITING — todos escrevem em paralelo. Cards aparecem em tempo real. Facilitador pode ocultar cards individualmente antes do reveal. Autor pode editar/deletar o próprio card.
2. REVEAL — todos os cards (não-ocultos) ficam visíveis com nome do autor. Sem reveal parcial.
3. VOTING — todos votam simultaneamente. Auto-ranking em tempo real. Top 3 destacado no topo.
4. CLOSED — sessão arquivada, somente leitura via AgileHistory.

## Modelos suportados
4Ls, Start/Stop/Continue, Mad/Sad/Glad, Starfish, KPT — selecionáveis na criação. Cada um define columnKeys próprios em `utils/retroModels.ts`.

## Histórico
AgileHistory.tsx já lê `retro_sessions` finalizadas e exibe na aba retro com cards/actions. Não precisou alterar — o schema é compatível.
