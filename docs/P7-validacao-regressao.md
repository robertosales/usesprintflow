# P7 — Validação Final e Regressão

> Gerado automaticamente após implementação das Partes 1–6.
> Execute cada item no browser antes de liberar em produção.

---

## ✅ Legenda

| Símbolo | Significado |
|---|---|
| `[ ]` | Pendente |
| `[x]` | Aprovado |
| `[!]` | Falhou — descrever abaixo do item |

---

## 1. Nomes e Avatares (P1)

### 1.1 Regra Primeiro + Último Nome
- [ ] Sala Ágil → Dashboard: cards de membros exibem `Primeiro Último` (ex: `Roberto Sales`)
- [ ] Sala Ágil → Kanban: tooltip dos avatars exibe nome completo formatado
- [ ] Sala Ágil → Planning Poker: avatars com iniciais corretas (`RS`)
- [ ] Sustentação → Board: tooltip dos responsáveis exibe `Primeiro Último`
- [ ] Sustentação → Detalhe da demanda: responsáveis formatados
- [ ] Comentários / Histórico: autor exibido como `Primeiro Último`
- [ ] Menu / Header: nome do usuário logado formatado

### 1.2 Regra de Iniciais
- [ ] Nome com preposição: `Roberto de Araujo Sales` → iniciais `RS`
- [ ] Nome com preposição: `Maria Fernanda Lima Costa` → iniciais `MC`
- [ ] Nome único sem sobrenome: 2 primeiras letras (`Jo` → `JO`)
- [ ] Nenhum avatar exibe só 1 letra quando há sobrenome

### 1.3 Avatar com Foto
- [ ] Usuário com foto configurada: exibe foto (não iniciais)
- [ ] Usuário sem foto: exibe iniciais padronizadas

---

## 2. Correção Visual Dashboard (P2)

### 2.1 SprintCard — Percentual vs Data
- [ ] Desktop (1920×1080): percentual e data **não se sobrepõem**
- [ ] Notebook (1366×768): percentual e data **não se sobrepõem**
- [ ] Resolução menor (1024×600): percentual e data **não se sobrepõem**
- [ ] Sprint com nome longo: layout não quebra o card
- [ ] Percentual `100%` especificamente: sem sobreposição

### 2.2 Cálculos
- [ ] Percentual calculado corretamente (HUs concluídas / total)
- [ ] Data da sprint exibida corretamente

---

## 3. Filtro por Responsável no Kanban (P3)

### 3.1 Sala Ágil — KanbanBoard
- [ ] Select de membros aparece na barra de filtros
- [ ] Só exibe membros que têm HUs no sprint atual
- [ ] Selecionar membro filtra os cards corretamente
- [ ] "Todos os membros" mostra todos os cards
- [ ] Badge "Limpar filtro ×" aparece ao selecionar membro
- [ ] "Limpar filtro" volta para todos os cards
- [ ] Busca textual + filtro de membro funcionam **juntos**
- [ ] Contador de cards por coluna atualiza com o filtro
- [ ] Drag-and-drop continua funcionando durante filtro ativo
- [ ] Collapsar/expandir colunas continua funcionando

### 3.2 Sustentação — SustentacaoBoard
- [ ] Avatars dos responsáveis aparecem na barra de filtros
- [ ] Clicar em avatar filtra somente cards desse responsável
- [ ] Múltiplos responsáveis selecionados funcionam (OR)
- [ ] Opção "Todos" exibe todas as demandas
- [ ] Busca textual + filtro de responsável funcionam **juntos**
- [ ] Badge contador de demandas atualiza em tempo real
- [ ] Context menu (botão direito) continua funcionando
- [ ] Mover demanda entre colunas continua funcionando

---

## 4. Campo Hora HH:MM (P4)

### 4.1 Máscara e Autoformato
- [ ] Digitar `15` → autoformata para `00:15`
- [ ] Digitar `130` → autoformata para `01:30`
- [ ] Digitar `245` → autoformata para `02:45`
- [ ] Digitar `0800` → autoformata para `08:00`
- [ ] Campo não aceita decimal: `0,8` → erro ou bloqueio
- [ ] Campo não aceita decimal: `1,5` → erro ou bloqueio
- [ ] Minutos inválidos (`99`) → mensagem de erro amigável
- [ ] Campo vazio → não salva sem preenchimento obrigatório

### 4.2 Exibição na Tabela de Atividades
- [ ] Atividades salvas exibem `HH:MM` (ex: `01:30`)
- [ ] Totalização de horas no rodapé exibe `HH:MM` corretamente
- [ ] Relatórios mostram horas em `HH:MM`

### 4.3 Backend
- [ ] Valor salvo no banco é em minutos inteiros (não decimal)
- [ ] Editar atividade existente: valor pré-preenchido em `HH:MM`

---

## 5. Migração dos Dados Antigos (P5)

### 5.1 Validação Pós-Migração
```sql
-- Deve retornar 0 linhas
SELECT id, horas FROM demanda_hours WHERE horas <> FLOOR(horas);
```
- [x] Query retornou **0 linhas** — executado em 08/05/2026 ✅

### 5.2 Integridade dos Dados
- [ ] Relatório de horas da Sustentação: totais batem com valores antigos convertidos
- [ ] Filtros por período: funcionam corretamente após migração
- [ ] Exportações (PDF/Excel): exibem horas em `HH:MM` correto
- [ ] Tabela `_backup_demanda_hours_p5` existe e tem dados originais

---

## 6. Encerramento Automático de Sessão (P6)

### 6.1 Alerta Visual
- [ ] Após 4 min de inatividade: alerta aparece no canto inferior direito
- [ ] Alerta exibe mensagem: "Sua sessão será encerrada por inatividade em MM:SS"
- [ ] Contador regressivo decrementa a cada segundo em tempo real
- [ ] Barra de progresso encolhe proporcionalmente ao tempo restante
- [ ] Botão "Continuar sessão" visível no alerta

### 6.2 Comportamento
- [ ] Mover mouse reseta o contador (alerta some se ainda visível)
- [ ] Pressionar tecla reseta o contador
- [ ] Scroll reseta o contador
- [ ] Clicar em "Continuar sessão" reseta o contador e fecha o alerta
- [ ] Após 5 min sem interação: redireciona para `/auth`
- [ ] Após logout automático: sessão encerrada no Supabase

### 6.3 Compatibilidade
- [ ] Alerta não aparece na tela de login (`/auth`)
- [ ] Alerta não aparece na tela de reset de senha
- [ ] Alerta aparece em todas as rotas protegidas
- [ ] Não interfere com dialogs/modals abertos

---

## 7. Regressão Geral

### 7.1 Sala Ágil
- [ ] Login e redirecionamento correto por perfil
- [ ] Sprint ativa carrega corretamente
- [ ] Criar HU: formulário salva e aparece no Kanban
- [ ] Mover card entre colunas: confirmação funciona
- [ ] Planning Poker: fluxo completo (criar sala → votar → revelar)
- [ ] Retrospectiva: criar, editar e concluir itens
- [ ] Relatórios R1–R7: todos carregam sem erro
- [ ] Dashboard (MetricsDashboard): todas as abas funcionando

### 7.2 Sustentação
- [ ] Listar demandas: carrega corretamente
- [ ] Criar nova demanda: formulário salva
- [ ] Detalhe da demanda: abre corretamente
- [ ] Lançar atividade: salva em `HH:MM` e aparece na tabela imediatamente
- [ ] Editar atividade (admin): dialog abre com dados pré-preenchidos
- [ ] Excluir atividade (admin): remove e atualiza tabela
- [ ] Combo "Lançado por" (admin): altera `user_id` e atualiza tabela
- [ ] Usuário não-admin: botões Editar/Excluir **não aparecem**
- [ ] Mover demanda entre colunas: context menu funciona

### 7.3 Performance
- [ ] Sala Ágil: carregamento inicial < 3s
- [ ] Sustentação: carregamento inicial < 3s
- [ ] Filtros no Kanban: resposta imediata (< 100ms)
- [ ] Sem erros no console do browser
- [ ] Sem queries duplicadas no Network tab

### 7.4 Responsividade
- [ ] Desktop 1920×1080: layout OK
- [ ] Notebook 1366×768: layout OK
- [ ] Tablet 1024×768: layout OK
- [ ] Nenhum scroll horizontal inesperado

### 7.5 Autenticação e Permissões
- [ ] Admin: acesso a todos os módulos
- [ ] Usuário sala_agil: sem acesso à Sustentação
- [ ] Usuário sustentacao: sem acesso à Sala Ágil
- [ ] Rota protegida sem sessão: redireciona para `/auth`

---

## Resultado Final

| Bloco | Total de itens | Aprovados | Falhos |
|---|---|---|---|
| P1 Nomes e avatares | 13 | — | — |
| P2 Dashboard | 7 | — | — |
| P3 Filtro Kanban | 18 | — | — |
| P4 Campo HH:MM | 10 | — | — |
| P5 Migração SQL | 5 | 1 | — |
| P6 SessionTimeout | 11 | — | — |
| P7 Regressão geral | 27 | — | — |
| **TOTAL** | **91** | — | — |

---

## Falhas Encontradas

> Registre aqui qualquer item que falhou durante a validação:

```
[data] [tela] [item] — descrição do problema
```

---

*Documento gerado em 08/05/2026 — useSprintFlow / NexOps*
