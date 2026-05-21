# Relatório de Auditoria Front-end - Axion/SprintFlow

Este relatório apresenta uma análise técnica detalhada da estrutura atual do front-end, identificando pontos críticos e sugerindo melhorias priorizadas para performance, manutenibilidade e experiência do usuário (UX).

---

## 1. Arquitetura e Estado

### 🚩 Problema: Contextos Monolíticos
O arquivo `src/contexts/SprintContext.tsx` gerencia quase todo o estado do módulo "Sala Ágil" (HUs, Atividades, Desenvolvedores, Sprints, Épicos, etc.) em um único objeto de estado.
- **Impacto:** Qualquer alteração em uma única Atividade faz com que *todos* os componentes que consomem `useSprint` re-renderizem, incluindo o Board Kanban inteiro e o Backlog.
- **Sugestão:** Migrar o estado para **TanStack Query** com chaves granulares (ex: `['userStories', teamId]`, `['activities', huId]`).

### ✅ Ponto Positivo: Padrão `useDemandas`
O módulo de Sustentação (`src/features/sustentacao/hooks/useDemandas.ts`) já utiliza TanStack Query de forma eficiente, com invalidação de cache via Realtime. Este deve ser o padrão para todo o sistema.

---

## 2. Performance

### 🚩 Problema: Kanban Re-renders
Apesar do uso de `React.memo` no `KanbanCard`, ele ainda é afetado pelas atualizações frequentes do `SprintContext`.
- **Melhoria Sugerida:** Implementar seletores ou hooks especializados que retornem apenas os dados necessários para o card (ex: `useUserStory(id)`), evitando que o card dependa de uma lista gigante de HUs.

### 🚩 Problema: Fetching Pesado em Dashboards
O `MetricsDashboard.tsx` realiza buscas manuais massivas em `useEffect` para múltiplos times, o que bloqueia a UI e não aproveita cache.
- **Melhoria Sugerida:** Quebrar os gráficos em componentes menores, cada um com seu próprio hook `useQuery`. Isso permite carregamento paralelo e "skeletons" individuais.

---

## 3. Layout e Responsividade

### 🚩 Problema: Larguras Hardcoded no Kanban
As colunas do Kanban têm largura fixa de `260px` (`src/components/KanbanBoard.tsx`).
- **Impacto:** Em telas muito grandes, sobra espaço vazio; em tablets, o scroll horizontal é excessivo.
- **Sugestão:** Usar `min-width` com `flex-1` ou um sistema de grid que se adapte à largura do container.

### 🚩 Problema: Sidebar e AppShell
A sidebar usa larguras fixas (`220px`). Embora funcional, dificulta a adaptação em dispositivos intermediários.
- **Sugestão:** Utilizar variáveis CSS para as larguras da sidebar, permitindo ajustes globais mais simples via Media Queries.

---

## 4. Qualidade de Código (Clean Code)

### 🚩 Problema: Débito Técnico de Tipagem (`any`)
Existem mais de 900 erros de lint, a maioria relacionada ao uso de `any`.
- **Impacto:** Perda de segurança em refatorações e bugs silenciosos em produção.
- **Sugestão:** Iniciar uma força-tarefa para tipar os retornos do Supabase usando o comando `supabase gen types`.

### 🚩 Problema: Componentes "God Class"
Arquivos como `Index.tsx` e `AppShell.tsx` estão acumulando muita lógica de roteamento, permissões e UI.
- **Sugestão:** Extrair a lógica de `SectionGuard` e roteamento de seções para um componente de configuração de rotas dedicado.

---

## 5. Plano de Ação Priorizado

| Prioridade | Ação | Benefício |
| :--- | :--- | :--- |
| **Crítica** | Migrar `SprintContext` para TanStack Query Hooks | Performance (fim dos re-renders globais) |
| **Alta** | Resolver conflitos de mesclagem e tipagem básica | Estabilidade e fim de erros de build |
| **Média** | Tornar colunas do Kanban fluidas (`min-width`) | Melhor aproveitamento de tela (UX) |
| **Média** | Implementar Lazy Loading nas rotas principais | Redução do bundle inicial (Speed Index) |
| **Baixa** | Abstrair utilitários de `color-mix` para temas | Código mais limpo e padronizado |

---

## Conclusão
O sistema possui uma base visual sólida e funcionalidades ricas, mas o crescimento orgânico gerou gargalos de performance no estado global. A transição total para **TanStack Query** e a eliminação do uso de `any` são os passos mais importantes para garantir a escalabilidade do front-end.
