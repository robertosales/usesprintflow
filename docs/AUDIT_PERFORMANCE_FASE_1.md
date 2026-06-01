# Relatório de Auditoria de Performance - Fase 1

**Status:** AGUARDANDO APROVAÇÃO
**Data:** 01/06/2026
**Autor:** Jules (IA Agent)

## 1. Resumo Executivo
O sistema apresenta um padrão de **Over-fetching** e **Eager Loading**. A lentidão e os travamentos observados são causados pelo download e processamento no navegador de listas completas de demandas, mesmo em páginas que só precisam de resumos (KPIs). O problema dos "dados que aparecem após F5" está ligado à inicialização assíncrona do contexto de autenticação e seleção de times. O Realtime atual provoca um efeito de "manada", onde uma única alteração força todos os 150+ usuários a baixarem novamente toda a lista de dados.

## 2. Arquivos Envolvidos
- **Hooks de Dados:**
  - `src/features/sustentacao/hooks/useDemandas.ts`
  - `src/features/sustentacao/hooks/useKpisSustentacao.ts`
  - `src/features/kanban/hooks/useKanbanBoard.ts`
- **Componentes de Visão:**
  - `src/features/sustentacao/components/SustentacaoDashboard.tsx`
  - `src/features/sustentacao/components/SustentacaoBoard.tsx`
  - `src/features/sustentacao/components/DemandasList.tsx`
- **Contexto e Layout:**
  - `src/contexts/AuthContext.tsx`
  - `src/features/sustentacao/SustentacaoPage.tsx`

## 3. Consultas Executadas
1. **RPC `get_demandas_with_responsaveis`**: Busca lista completa. Impacta Dashboard e Board.
2. **RPC `calc_kpis_sustentacao`**: Agregações pesadas para KPIs.
3. **RPC `get_demandas_with_responsaveis_paged`**: Busca paginada. Eficiente, mas subutilizada.
4. **Tabela `user_stories`**: Select direto no Kanban Ágil (limite 500).
5. **Tabela `demanda_responsaveis`**: Select redundante em `DemandasList.tsx`.

## 4. Principais Gargalos Encontrados

### A. Redundância no Dashboard
O componente `SustentacaoDashboard` baixa centenas de demandas completas apenas para mostrar gráficos de situação e alertas, dados que já poderiam vir da RPC de KPIs.

### B. Chamada Redundante na Listagem
`DemandasList.tsx` dispara `fetchResponsaveisBatch` em um `useEffect`, ignorando que a RPC paginada já retorna os dados enriquecidos. Isso gera 1 chamada HTTP extra por página de scroll.

### C. "F5 Syndrome"
A condição `enabled: !!currentTeamId` causa estados `idle` prolongados se o sincronismo de estado entre `AuthContext` e `SustentacaoPage` falha no boot inicial.

### D. Realtime Ineficiente
A invalidação total (`qc.invalidateQueries`) em resposta a qualquer evento de Realtime força 150+ usuários a re-baixarem todo o dataset simultaneamente, sobrecarregando o IO do Supabase.

### E. Renderização Pesada no Board
O Board Kanban não possui paginação nem virtualização, tentando renderizar centenas de cards no DOM, o que trava a thread principal do navegador.

## 5. Correções Recomendadas (Ordenadas por Impacto)

| Prioridade | Correção | Impacto Esperado |
| :--- | :--- | :--- |
| **1 (Crítico)** | **Remover useDemandas do Dashboard**: Usar apenas o retorno da RPC de KPIs. | Redução de ~80% no tráfego de rede inicial. |
| **2 (Crítico)** | **Otimizar Sincronismo de Times**: Mover `currentTeamId` para o boot do `AuthContext`. | Elimina o problema do F5 e telas em branco. |
| **3 (Alto)** | **Update Optimístico / Granular no Realtime**: Atualizar apenas o objeto no cache em vez de invalidar a lista toda. | Estabilidade para 150+ usuários simultâneos. |
| **4 (Médio)** | **Limpar Redundância na Listagem**: Remover a chamada extra de responsáveis. | Redução de latência no scroll infinito. |
| **5 (Baixo)** | **Arquivamento Automático no Board**: Ocultar por padrão demandas concluídas há mais de 7 dias. | Melhora significativa na performance de renderização do Board. |

---
*Relatório gerado automaticamente pela Auditoria Técnica Fase 1.*
