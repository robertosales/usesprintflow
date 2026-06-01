# AUDITORIA DE PERFORMANCE — FASE 1 (CONSOLIDADA)

**STATUS: AGUARDANDO APROVAÇÃO**
**Nenhum arquivo modificado. Nenhum PR aberto. Nenhuma correção implementada.**

## 1. Resumo Executivo
O sistema apresenta um padrão de **Over-fetching estrutural** combinado com um **Efeito Manada no Realtime**. O `useDemandas` carrega o dataset completo em contextos que precisam apenas de resumos (Dashboard) ou apenas de funções de escrita (DemandasList). O problema **"dados só aparecem após F5"** é uma condição de corrida entre a inicialização do Auth e o disparo das queries.

## 2. Arquivos Envolvidos
- `src/features/sustentacao/hooks/useDemandas.ts`
- `src/features/sustentacao/hooks/useKpisSustentacao.ts`
- `src/features/sustentacao/hooks/useAllTransitions.ts`
- `src/features/sustentacao/components/SustentacaoDashboard.tsx`
- `src/features/sustentacao/components/DemandasList.tsx`
- `src/contexts/AuthContext.tsx`
- `src/features/kanban/hooks/useKanbanBoard.ts`

## 3. Principais Gargalos Encontrados

### 🔴 CRÍTICO-1 — Over-fetching no Dashboard
Download desnecessário de centenas de demandas completas via `useDemandas` para exibir dados que já constam na RPC de KPIs.

### 🔴 CRÍTICO-2 — Realtime Ineficiente (Efeito Manada)
Uso de `invalidateQueries` forçando 150+ usuários a re-baixarem todo o dataset simultaneamente a cada pequena edição de card.

### 🔴 CRÍTICO-3 — Canais WebSocket Duplicados
Abertura de múltiplos canais para a mesma tabela (`demandas-rt` + `demandas-paginadas-rt`), atingindo limites de infraestrutura.

### 🟠 ALTO-1 — "F5 Syndrome" (Race Condition)
Inicialização tardia do `currentTeamId` no `AuthContext`, deixando os hooks de dados em estado `idle` no primeiro carregamento.

### 🟠 ALTO-2 — Fetch de Responsáveis sem Cache
`fetchResponsaveisBatch` em `DemandasList` ignorando o cache do TanStack Query e os dados já retornados pela RPC paginada.

### 🟡 MÉDIO-1 — Renderização do Board (Falta de Virtualização)
Excesso de nós no DOM ao renderizar centenas de cards, travando a interação de Drag and Drop.

## 4. Plano de Ação Recomendado

1. **Dashboard Lean**: Remover `useDemandas` do Dashboard e centralizar nos KPIs.
2. **Boot de Time Resiliente**: Resolver `currentTeamId` no boot do app.
3. **Update Otimista**: Trocar `invalidateQueries` por `setQueryData` no Realtime.
4. **Extração de Mutations**: Criar hook de escrita puro sem fetch de dados.
5. **Arquivamento e Virtualização**: Ocultar demandas antigas do Board para melhorar renderização.

---
*Relatório de Auditoria Técnica - 01/06/2026*
