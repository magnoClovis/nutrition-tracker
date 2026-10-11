# Distribuição dos visuais `UI_visuals`

## Estado desta análise

- **Data da revisão:** 11/10/2026.
- **Origem auditada:** `UI_visuals/`, com 132 PNGs, 21 HTMLs, 6 arquivos JavaScript, 6 JSXs e 6 documentos Markdown.
- **Autoridade:** PNGs e documentos de fluxo são a especificação visual e comportamental recebida; os HTMLs/JSX são referência interativa, não código a copiar. Dados, datas, metas e refeições exibidos são mock data.
- **Prioridade aprovada:** redesenhar as quatro abas principais — Diário, Alimentos/Despensa, Semana e Métricas — antes de aprofundar superfícies secundárias que não sejam pré-requisitos dessas abas.
- **Cobertura comprovada:** a pasta contém especificação completa para as **quatro** abas principais: Diário, Alimentos/Despensa, Semana e Métricas. O pacote de Métricas foi auditado em 11/10/2026 e substitui o placeholder anterior da I10 por quatro fatias implementáveis.
- **Implementações em curso preservadas:** I4-A continua em andamento na worktree própria; CAM-RED-9 e seus gates/prova física permanecem independentes deste fatiamento.

## Inventário e precedência das fontes

1. `trofia-diary-timeline-calendar-add-sheet/`: Diário Timeline v2, calendário, histórico e fluxo Adicionar.
2. `trofia-diary-supplements-notes-meal-detail/`: extensão do Diário com nutrientes, suplementos, notas e detalhe expansível; quando houver conflito, `DiaryTimelineV3.dc.html` prevalece sobre a Timeline v2.
3. `trofia-foods-tabs-categories/`: aba Alimentos/Despensa com alimentos, refeições salvas, suplementos, categorias, favoritos e busca local/base aberta.
4. `trofia-week-overview/`: aba Semana com janela móvel de sete dias, banco calórico, gráficos, recortes treino/descanso, médias e análise por IA.
5. `trofia-metrics-journey/`: aba Métricas com Progresso/Metas, jornada, gráficos, composição corporal, histórico, pesagens e edição do perfil/metas.
6. `handoff/`: consolidação anterior do Diário/Adicionar/câmera. Serve para rastrear decisões compartilhadas, mas não reabre CAM-RED-7/8/9 e não prevalece sobre os cinco pacotes mais específicos acima.

Os estados claro e escuro dos PNGs foram conferidos. A composição é consistente em tipografia, raios, superfícies tonais, barra inferior, ação central, sheets e estados vazio/preenchido. Hexadecimais externos orientam a aparência, mas devem ser mapeados aos tokens do `one-ui.css` e comprovados por contraste no runtime.

## Distribuição por família

### Família I4 — entrada e criação compartilhada

#### I4-A — ação principal e menu de criação

- ação central/FAB e menu já aprovados;
- foto, descrição, montagem manual e refeição salva;
- foco, Android Back, alvos, movimento reduzido e encaminhamento aos fluxos existentes;
- identidade instalada “T + folha” em Android e web dentro do mesmo gate.
- implementação e gate local integral concluídos na base `74a988a4`; a fatia permanece em andamento até PR, CI e merge.

#### I4-B — orquestração do sheet Adicionar

- destino da refeição e horário;
- repetição recente com Undo;
- entrada manual e retorno ao contexto que abriu o sheet;
- Barcode continua pendente de decisão específica, pois não foi aprovado junto ao menu I4-A.

#### I4-C — pesquisa e bandeja de refeição

- busca do fluxo Adicionar, filtros e seleção cumulativa;
- bandeja inferior com totais e ação Revisar;
- revisão no `MealResultSheet` existente, sem novo resultado paralelo.

I4-C não é a busca permanente da aba Alimentos: ela monta uma refeição no contexto do sheet Adicionar. A busca e a gestão da biblioteca pertencem à I8-C.

### Família I6 — aba Diário

#### I6-A — cabeçalho, resumo e navegação

- título, data, Hoje contextual e avatar por iniciais/foto abrindo Configurações;
- treino/descanso, resumo de proteína/calorias/água e frase do dia;
- barra inferior compartilhada e encaixe com a ação I4-A;
- composição desktop própria preservando o contrato D2.

#### I6-B — timeline diária e hidratação

- água rápida/favorita/personalizada e Undo;
- timeline de refeições e água, marcador Agora, vazio e slot da próxima refeição;
- ordenação, conteúdo longo e estados vazio/parcial/preenchido.

#### I6-C — histórico semanal, mensal e salto de período

- faixa semanal com gesto/setas;
- calendário mensal e seletor mês/ano;
- limites entre primeiro registro e hoje;
- agregações pelos loaders/cache, sem leitura individual por célula.

#### I6-D — nutrientes e atalhos de IA

- atalhos para os fluxos de IA já existentes;
- sheet de macros e micronutrientes com cobertura explícita;
- nenhuma coleta, endpoint ou alegação nutricional nova.

#### I6-E — suplementos e notas temporizadas

- ações rápidas e eventos na timeline;
- doses múltiplas, horário, Undo, offline e restauração;
- migração de nota e qualquer mudança de schema/rules dependem de contrato da frente Principal.

#### I6-F — detalhe expansível de refeição

- uma refeição expandida por vez;
- itens, gramas, macros, avaliação e suposições existentes;
- mover horário/categoria, salvar e excluir com sincronização/Undo/`GenericDialog`;
- reutilização de `DIARY-MENU-A`, `PHOTO-03` e do domínio de recálculo atual.

### Família I8 — aba Alimentos/Despensa

#### I8-A — shell, abas e categorias

- cabeçalho e contagens reais de alimentos/refeições/suplementos;
- busca visível, controle segmentado Alimentos/Refeições/Suplementos/Categorias e barra inferior comum;
- filtros locais, grade de categorias e lista interna com estados vazios;
- loading, listas longas, claro/escuro, mobile e composição desktop própria.

O pacote usa o rótulo inglês `Foods`; PT-BR deve preservar o termo aprovado pelo produto — atualmente Alimentos/Despensa — e não será renomeado por tradução literal silenciosa.

#### I8-B — cartões, porções e ações da biblioteca

- linhas recolhidas/expandidas com uma expansão por vez e `aria-expanded`;
- stepper de porção, macros recalculadas, favorito, editar, excluir e Undo;
- adicionar alimento/refeição ao Diário e registrar dose de suplemento;
- reutilização dos modelos atuais de despensa, refeições salvas e suplementos, sem schema novo por aparência.

#### I8-C — busca unificada e base aberta

- resultados locais imediatos, normalização sem acentos, ranking existente e debounce da base aberta;
- separação visual entre biblioteca e base, salvar item externo na biblioteca e estados sem resultado;
- Barcode permanece fora até decisão coordenada com I4-B e auditoria de ciclo de vida da câmera/scanner;
- o sheet `+ Novo` continua usando o formulário atual, porque seu redesenho não foi definido pelo pacote.

### Família I9 — aba Semana

#### I9-A — contrato semanal, banco calórico e resumo

- janela móvel dos últimos sete dias terminando hoje;
- hoje excluído de médias e banco até o encerramento civil do dia;
- banco `Σ(meta − consumido)`, dias registrados, médias e meta de proteína;
- metas históricas treino/descanso resolvidas por data, água incluída e estados sem dados.

#### I9-B — gráficos configuráveis e detalhe do dia

- gráficos de proteína, calorias, carboidratos, gordura, fibra e água em ordem fixa;
- seleção persistida por usuário, Protein/Calories como padrão e possibilidade de zero gráficos;
- metas por dia, hoje com progresso parcial, hit area acessível e sheet do dia;
- abrir/logar o dia diretamente no Diário sem toast substituindo navegação real.

#### I9-C — comparação treino/descanso e médias de refeições

- médias separadas por tipo de dia;
- médias de refeição dos últimos 30 dias, ordenadas por proteína;
- reuso de `aggregateMealAverages`, `resolveHistoricalGoals` e loaders existentes;
- exportação sai da Semana e permanece responsabilidade de Configurações.

#### I9-D — análise semanal consolidada

- unificar feedback semanal e padrões de 30 dias em um card de IA;
- execução paralela, sucesso parcial, erro recuperável, atualização e salvamento combinado nas notas;
- esconder sem dias registrados e não criar endpoint novo;
- nota temporizada depende do contrato I6-E; até lá, usar o salvamento de nota existente.

### Família I10 — aba Métricas

#### I10-A — shell, jornada e estado atual

- cabeçalho, segmentos Progresso/Metas com seleção por sessão, navegação compartilhada e retorno ao topo;
- card Jornada, progresso do plano, previsão e CTA de pesagem;
- tiles Peso/IMC/TMB, skeletons, primeiro uso, uma única pesagem e ausência de altura;
- preservação dos hooks `metrics-measures`, `metrics-current` e da composição desktop D4.

#### I10-B — gráficos, composição e previsão

- seleção persistida de gráficos e intervalo global persistido por usuário;
- Peso/TMB/gordura/cintura/músculo com estados sem dados e linhas-alvo reais;
- composição corporal e meta de gordura usando `body-metrics-model.js`;
- progresso/previsão e relatórios avançados usando os contratos existentes, sem endpoint novo.

#### I10-C — pesagens e histórico determinístico

- sheet de nova pesagem com data e campos Peso/Gordura/Cintura/Músculo;
- validação equivalente ao `NumericField`, substituição por data e confirmação de persistência;
- histórico compacto, edição, exclusão, paginação e Undo;
- falha/offline preserva a entrada e restauração cobre todas as mutações.

#### I10-D — metas, perfil e objetivos nutricionais

- seção Metas com alvos diários de treino/descanso;
- lista de perfil para atividade, objetivo, altura, meta de gordura, kg, semanas, ajuste calórico e proteína/kg;
- objetivos nutricionais Auto/Personalizado com `ChoiceField`/`NumericField` e callbacks existentes;
- recálculo, PT/EN/ES, acessibilidade e persistência sem criar schema visual paralelo.

### I7 — domínio transversal de metas e consistência

Pertencem à I7, não ao CSS das abas:

- classificação diária `meta atingida`, `parcial` e `sem registros`;
- pontos de status na faixa/calendário e totais mensais;
- frases motivacionais e slot “normalmente cerca de ...” quando derivados de metas/médias;
- contador opcional e preferência para desativá-lo.

I6 e I9 podem exibir esses dados, mas devem consumir uma classificação única. O material ainda não define completamente o contador opcional da I7.

## Limites e dependências

- **D2:** mocks são mobile; cada família deve preservar o desktop já entregue e acrescentar composição larga própria.
- **I5:** Configurações não integra o caminho crítico atual. O avatar pode abrir a tela existente; quando o novo desenho solicitado for recebido, ele será auditado como reabertura `I5-R` e subdividido sem apagar nem reclassificar entregas históricas anteriores.
- **CAM-RED-7/8/9:** captura, análise e resultado são reutilizados. Nenhum PNG reabre câmera ou amplia a auditoria física.
- **Persistência:** qualquer schema/rules/migração descoberto por I6-E, I8 ou I9 vira pré-requisito explícito da frente Principal.
- **Navegação compartilhada:** Diário, Alimentos, Semana e Métricas usam a mesma barra; sua geometria e ação central devem ter uma única implementação e cobertura comum.
- **Testes:** toda fatia que alterar design, função ou background deve atualizar helpers, seletores e provas visuais no mesmo PR para que os gates futuros descrevam o runtime novo.

## Ordem priorizada

1. concluir I4-A já em andamento, porque a navegação/ação central é pré-requisito compartilhado;
2. **passagem de núcleo visual:** I6-A/I6-B → I8-A → I9-A → I10-A;
3. **passagem de conclusão funcional:** I6-C/I6-D/I6-F → I8-B/I8-C → I9-B/I9-C/I9-D → I10-B/I10-C/I10-D;
4. I4-B/I4-C — completar o fluxo Adicionar depois de estabilizar as quatro abas;
5. I6-E e I7 — somente após os contratos de persistência/domínio aplicáveis;
6. I5-R — somente quando o novo pacote de Configurações for recebido e aprovado.

A estratégia em duas passagens coloca rapidamente as quatro superfícies principais no novo sistema visual e depois conclui cada contrato profundo sem misturar grandes domínios no mesmo PR. Dentro de cada passagem, as fatias são sequenciais porque compartilham navegação, `one-ui.css`, helpers e snapshots; trabalho paralelo só é seguro quando o diff e o gate autenticado não se sobrepõem.
