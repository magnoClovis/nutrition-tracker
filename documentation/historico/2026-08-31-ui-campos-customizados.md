# Histórico da frente de UI — campos customizados e seletores do Trofia

## Escopo, autoria e método

Este arquivo registra exclusivamente a frente de UI/UX desenvolvida nesta conversa: substituição de controles nativos do navegador/Android por componentes próprios do Trofia, integração desses componentes nas telas autorizadas e validação visual correspondente. A atribuição foi determinada pela memória integral da conversa e confirmada pelos branches `codex/ui-*`, pelos commits e pelos pull requests citados em cada item.

O registro não reivindica trabalhos intercalados de App Check, arquitetura de dados, score, avaliação nutricional ou IA. Esses PRs aparecem na mesma cronologia da `main`, mas pertencem a outras conversas. Também não apresenta protótipos ou decisões aprovadas como se fossem código entregue: itens sem arquivo versionado são identificados explicitamente como auditoria, prototipação ou planejamento.

As datas dos itens implementados são as datas de merge ou, para o PR ainda aberto, as datas dos commits confirmadas no Git/GitHub. Todos os horários observados foram normalizados pelo histórico Git local para `Europe/Madrid`; como o formato solicitado usa data civil, os horários não são reproduzidos abaixo.

### Relação com os códigos formais do projeto

- Os componentes `ChoiceField`, `SearchableChoiceField`, `TemporalField` e `NumericField` não correspondem diretamente a nenhum item C01–C28, N01–N09 ou bug formal A01–A12, G01, B05 ou F06. Por isso, seus títulos não recebem códigos artificiais.
- A cobertura transversal de CI e Playwright corresponde à manutenção e ampliação de **C07 — Testes autenticados e CI verde**; essa associação aparece somente no item específico de validação.
- O trabalho não resolveu C01, C11 nem qualquer bug formal do inventário. Semelhanças de tela ou tecnologia não foram tratadas como equivalência de escopo.

## Estado resumido da frente

| Entrega | Estado confirmado em 01/09/2026 |
|---|---|
| PRs #126, #130, #133, #136, #138, #141, #144, #146 e #148 | Mesclados na `main` |
| PR #150 | Aberto em modo draft; não integrado à `main` |
| S8 — checkboxes e sliders | Mesclada na `main` pelo PR #166, com CI autenticado integralmente verde |
| S9 — diálogo genérico | Implementada no PR #172; passa a compor a `main` com o merge desse PR |
| Fechamento S1–S9 | Pendente exclusivamente da S7b: o PR #150 continua draft e seus commits não integram a `main` |
| Sequência I1–I7 | Planejada, sem implementação no app por esta frente |

## ChoiceField reutilizável para tipo de refeição

**Data (se determinável):** 30/08/2026.

**Propósito:** substituir o `<select>` nativo usado para escolher o tipo de refeição por um controle visualmente coerente com One UI 8/Glass UI. A mudança precisava eliminar a lista de radio buttons “crua” apresentada pelo Android, manter o valor controlado pelo host e preservar funcionamento, idioma e acessibilidade nos runtimes legado e Vite.

**Recursos:**

- React, com componente controlado e estado de apresentação local.
- HTML semântico e atributos ARIA para diálogo, listbox, opções e gerenciamento de foco.
- CSS responsivo em `one-ui.css`, incluindo temas claro e escuro, safe areas e bottom sheet com efeito de vidro.
- SVGs próprios de traço fino para chevron, seleção e fechamento, sem dependência de biblioteca genérica de ícones.
- Node.js Test Runner e Playwright Chromium.
- Build Vite e loader legado mantidos em paridade.
- Firebase Authentication/App Check apenas na fixture do teste visual autenticado; nenhuma lógica de autenticação foi alterada.

**Arquivos:**

- `choice-field.js`
- `src/components/choice-field.js`
- `add-screen.js`
- `app.js`
- `nutrition-tracker.jsx`
- `src/App.jsx`
- `one-ui.css`
- `tests/fixtures/index.legacy.html`
- `tests/smoke/choice-field.visual.spec.js`
- `tests/unit/add-screen.test.js`
- `tests/unit/app-entry.test.js`
- `tests/unit/choice-field.test.js`

**O que foi feito:**

- Foi criado o `ChoiceField` como componente UMD reutilizável, recebendo o runtime React explicitamente para funcionar tanto no bundle Vite quanto no carregamento legado.
- O componente manteve a responsabilidade de persistência no host: recebe `value`, `options` e `onChange`, normaliza valores e labels, aceita opções desabilitadas e pode espelhar o valor em um `input type="hidden"` quando um formulário exige `name`/`required`.
- O primeiro uso substituiu a seleção nativa de tipo de refeição no fluxo de Adicionar, com oito opções e apresentação em bottom sheet.
- A seleção passou a confirmar imediatamente: clicar ou ativar uma opção por teclado chama `onChange`, fecha a lista e devolve foco ao gatilho, sem botão de confirmação redundante.
- A acessibilidade incluiu `aria-haspopup`, `aria-expanded`, `aria-controls`, `role="dialog"`, `aria-modal`, `role="listbox"`, `role="option"`, `aria-selected`, foco inicial na opção selecionada, navegação por setas/Home/End, ativação por Enter/Espaço, fechamento por Escape e contenção de Tab no diálogo.
- O scroll do `body` é bloqueado somente durante o bottom sheet e restaurado no cleanup. Clique no backdrop fecha o diálogo sem transformar cliques internos em fechamento acidental.
- Chevron e check foram redesenhados em SVG com `strokeWidth` fino, extremidades arredondadas e `vectorEffect="non-scaling-stroke"`, atendendo à decisão de evitar símbolos genéricos.
- Correções posteriores no mesmo PR estabilizaram o raio do campo fechado e do sheet em telas autenticadas, evitando que estilos antigos reduzissem os cantos aprovados.
- A integração foi registrada nos dois entrypoints e coberta por testes unitários e por Playwright autenticado em claro/escuro, desktop/mobile e legado/Vite.

**PRs/commits relacionados:**

- [PR #126 — Fatia 1: ChoiceField reutilizável para tipo de refeição](https://github.com/magnoClovis/nutrition-tracker/pull/126).
- [Commit `532d869` — criação do ChoiceField](https://github.com/magnoClovis/nutrition-tracker/commit/532d869c64c751011e777df10a83e6fc6ee025f1).
- [Commit `0c9ee63` — fixture App Check para o smoke visual](https://github.com/magnoClovis/nutrition-tracker/commit/0c9ee63fe82e74dbe0532c62f1992e714c2147e0).
- [Commit `19d64f5` — preservação do raio do controle](https://github.com/magnoClovis/nutrition-tracker/commit/19d64f530e1cbb1fb6af08444cb4986c360bab6c).
- [Commit `4b2d917` — consistência do raio do sheet](https://github.com/magnoClovis/nutrition-tracker/commit/4b2d917c693571f8af9af534d8e7881f5095319f).
- [Merge `1f8beee`](https://github.com/magnoClovis/nutrition-tracker/commit/1f8beee1b1f5d0d6e19f96441873bf7a10edb11d).

## ChoiceField nos seletores estáticos de refeição

**Data (se determinável):** 30/08/2026.

**Propósito:** estender o componente aprovado aos seletores estáticos relacionados à composição e ao destino de refeições, evitando soluções isoladas e removendo mais controles nativos dos fluxos de análise, edição e reaproveitamento de refeições.

**Recursos:**

- React e o `ChoiceField` compartilhado.
- CSS One UI 8/Glass UI com tokens dos temas claro e escuro.
- SVGs internos do componente e indicadores cromáticos semânticos.
- Playwright autenticado, Node.js Test Runner, Vite e runtime legado.

**Arquivos:**

- `choice-field.js`
- `meal-estimate-editor.js`
- `saved-meal-card.js`
- `diary-screen.js`
- `nutrition-tracker-controller.js`
- `app.js`
- `nutrition-tracker.jsx`
- `src/App.jsx`
- `one-ui.css`
- `tests/smoke/authenticated-flows.spec.js`
- `tests/smoke/choice-field.visual.spec.js`
- `tests/unit/choice-field.test.js`
- `tests/unit/meal-estimate-editor.test.js`
- `tests/unit/saved-meal-card.test.js`
- `tests/unit/diary-screen.test.js`
- `tests/unit/nutrition-tracker-controller.test.js`

**O que foi feito:**

- O `ChoiceField` foi aplicado aos quatro contextos aprovados: categoria da foto, refeição alvo, refeição padrão e confiança da estimativa.
- Categoria da foto, refeição alvo e refeição padrão permaneceram em bottom sheet porque cada lista contém oito opções; a escolha continua fechando imediatamente e atualizando o campo correspondente.
- Confiança da estimativa, apesar de ter apenas três níveis, permaneceu em bottom sheet porque cada opção possui texto explicativo. Essa decisão antecipou a regra posteriormente formalizada: descrição por opção torna a decisão mais complexa que uma lista compacta inline.
- O modelo de opção recebeu suporte a `description` e a um `tone` sanitizado. O `tone` gera uma barra/indicador visual próprio, permitindo diferenciar os níveis de confiança sem transformar cor na única fonte de significado.
- Labels, descrições, títulos e ações foram fornecidos pelo idioma selecionado dentro do Trofia em PT/EN/ES; o componente não consulta o idioma do sistema operacional.
- Os hosts continuaram responsáveis pelos valores e callbacks existentes, preservando os contratos de dados de refeição em vez de introduzir um novo schema persistido.
- Os testes verificaram integração nos fluxos autenticados e contratos de renderização dos editores/cartões, sem modificar backend, Firestore ou autenticação.

**PRs/commits relacionados:**

- [PR #130 — UI: ChoiceField nos seletores estáticos de refeição](https://github.com/magnoClovis/nutrition-tracker/pull/130).
- [Commit `3ccce71` — expansão para os contextos de refeição](https://github.com/magnoClovis/nutrition-tracker/commit/3ccce719088d61c12aa0d3f8292c2a984d923370).
- [Merge `b77208f`](https://github.com/magnoClovis/nutrition-tracker/commit/b77208f835545f60224bdc06906b98e99dd05c97).

## ChoiceField no Cadastro e Perfil obrigatório

**Data (se determinável):** 30/08/2026.

**Propósito:** substituir os seletores nativos de gênero, atividade física e objetivo nos dois pontos de coleta de perfil, usando uma regra visual previsível em vez de obrigar toda decisão a abrir um bottom sheet.

**Recursos:**

- React e `ChoiceField` compartilhado.
- CSS de disclosure inline e bottom sheet Glass UI.
- APIs ARIA de listbox/dialog e navegação por teclado.
- Localização PT/EN/ES já mantida pelos hosts.
- Playwright em páginas públicas e autenticadas, Node.js Test Runner, Vite e loader legado.

**Arquivos:**

- `choice-field.js`
- `login-screen.js`
- `required-profile-modal.js`
- `app.js`
- `nutrition-tracker.jsx`
- `src/App.jsx`
- `one-ui.css`
- `tests/smoke/app-orchestration.spec.js`
- `tests/smoke/app.smoke.spec.js`
- `tests/smoke/auth.setup.js`
- `tests/smoke/cutover-visual-matrix.spec.js`
- `tests/smoke/profile-choice-field.visual.spec.js`
- `tests/unit/choice-field.test.js`
- `tests/unit/login-screen.test.js`
- `tests/unit/required-profile-modal.test.js`

**O que foi feito:**

- Foi formalizado no cabeçalho do próprio `choice-field.js` o contrato de apresentação usado pelo projeto: até cinco opções sem descrição usam expansão inline; mais de cinco opções ou qualquer descrição usam bottom sheet.
- `resolveChoiceFieldMode` passou a calcular o modo a partir das opções normalizadas, impedindo que cada tela escolhesse um padrão arbitrário.
- Gênero, com duas opções e sem descrição, passou a expandir no fluxo do documento: a lista aparece logo abaixo do campo e empurra o conteúdo seguinte, sem overlay.
- Atividade física, com cinco opções descritas, e objetivo, com três opções descritas, usam bottom sheet. A presença de explicações foi tratada como critério de complexidade, não apenas a contagem bruta.
- Em ambos os modos, a escolha confirma e fecha imediatamente. O campo fechado mostra a seleção nova e o foco retorna ao gatilho.
- O mesmo comportamento foi integrado tanto no cadastro (`login-screen.js`) quanto no modal de perfil obrigatório, reduzindo divergência entre a criação da conta e o preenchimento posterior.
- O CSS do modo inline recebeu transição curta de disclosure, vidro discreto e espaçamento compatível com os campos vizinhos. O sheet preservou a linguagem já aprovada.
- Uma correção no mesmo PR impediu que regras das telas autenticadas sobrescrevessem os raios aprovados do `ChoiceField`.
- A matriz visual confirmou a convivência de um campo inline com campos em bottom sheet na mesma tela, nos dois temas e nos dois tamanhos de viewport.

**PRs/commits relacionados:**

- [PR #133 — UI: ChoiceField em Cadastro e Perfil obrigatório](https://github.com/magnoClovis/nutrition-tracker/pull/133).
- [Commit `c50bf7` — modos do ChoiceField no perfil](https://github.com/magnoClovis/nutrition-tracker/commit/c50bf7b9db0344fd0dc90e26ee6d419f169936f1).
- [Commit `5932d64` — correção de raio em telas autenticadas](https://github.com/magnoClovis/nutrition-tracker/commit/5932d648b26e4b87a9bd55175af05bf8040caa4e).
- [Merge `5f9cf8b`](https://github.com/magnoClovis/nutrition-tracker/commit/5f9cf8bb07c292bd2f8f7f01185d6d1858bcfd84).

## ChoiceField nas metas de Métricas

**Data (se determinável):** 30/08/2026.

**Propósito:** reaproveitar em Métricas o mesmo contrato de atividade física e objetivo já aprovado no perfil, evitando que a edição posterior das metas voltasse a abrir seletores nativos ou apresentasse uma interação diferente para a mesma decisão.

**Recursos:**

- React e `ChoiceField` compartilhado.
- CSS One UI 8/Glass UI já aprovado.
- Playwright autenticado, Node.js Test Runner, Vite e runtime legado.
- Localização interna PT/EN/ES.

**Arquivos:**

- `metrics-screen.js`
- `app.js`
- `nutrition-tracker.jsx`
- `src/App.jsx`
- `tests/smoke/metrics-choice-field.visual.spec.js`
- `tests/unit/metrics-screen.test.js`

**O que foi feito:**

- Os seletores de atividade e objetivo da área de metas em Métricas foram substituídos pelo `ChoiceField` descrito.
- As listas reutilizam os mesmos labels, descrições e valores de perfil; por conterem descrições, ambas abrem bottom sheet conforme a regra do componente.
- A integração preservou os callbacks e o cálculo de metas existentes. O PR alterou a camada de entrada/apresentação, não o modelo nutricional nem a persistência dos dados.
- A escolha fecha imediatamente e a tela passa a refletir o valor selecionado, mantendo consistência entre cadastro, perfil obrigatório e edição de metas.
- Testes unitários verificaram o contrato da `MetricsScreen`; o smoke autenticado validou textos PT/EN/ES, temas claro/escuro e comportamento visual nos dois runtimes.

**PRs/commits relacionados:**

- [PR #136 — UI: ChoiceField em Métricas](https://github.com/magnoClovis/nutrition-tracker/pull/136).
- [Commit `42568ac` — uso do ChoiceField nas metas](https://github.com/magnoClovis/nutrition-tracker/commit/42568ac96bc999da14131a5767d3a4eb8da25035).
- [Merge `d98eafd`](https://github.com/magnoClovis/nutrition-tracker/commit/d98eafdf5df338067d2925af1384316037e2372f).

## ChoiceField nas unidades de Alimentos

**Data (se determinável):** 30/08/2026.

**Propósito:** remover os selects nativos de unidade nos formulários de alimento e suplemento, aplicando o critério inline/sheet também na Despensa/Alimentos sem alterar o significado dos valores persistidos.

**Recursos:**

- React e `ChoiceField` compartilhado.
- CSS responsivo nos temas claro e escuro.
- Playwright autenticado, Node.js Test Runner, Vite e loader legado.
- Sistema interno de idioma PT/EN/ES.

**Arquivos:**

- `pantry-screen.js`
- `app.js`
- `nutrition-tracker.jsx`
- `src/App.jsx`
- `tests/smoke/pantry-choice-field.visual.spec.js`
- `tests/unit/pantry-screen.test.js`

**O que foi feito:**

- A unidade de alimento, com três opções sem descrição, passou a usar expansão inline e fechamento imediato após a seleção.
- A unidade de suplemento, com seis opções, passou a usar bottom sheet por exceder o limite de cinco opções, mesmo sem descrições.
- Os valores continuaram controlados pela `PantryScreen`; a mudança não renomeou unidades persistidas nem modificou o schema dos alimentos/suplementos.
- A integração foi mantida nos entrypoints Vite e legado e coberta por teste visual autenticado em claro/escuro, desktop/mobile e PT/EN/ES.
- Um commit de teste adicional estabilizou a troca de idioma no fluxo da Despensa para que a validação aguardasse o estado localizado real, em vez de depender de timing incidental.

**PRs/commits relacionados:**

- [PR #138 — UI: ChoiceField nas unidades de Alimentos](https://github.com/magnoClovis/nutrition-tracker/pull/138).
- [Commit `4de9027` — ChoiceField nas unidades da Despensa](https://github.com/magnoClovis/nutrition-tracker/commit/4de902767f86cb0a3f4f1d0fc1167bd5f06d2a9d).
- [Commit `3602275` — estabilização da validação de idioma](https://github.com/magnoClovis/nutrition-tracker/commit/360227568b1bf87c73cefa482c575c4f34f72c58).
- [Merge `f59cd45`](https://github.com/magnoClovis/nutrition-tracker/commit/f59cd459ea2c2952b38b3959c0efb52f33a61369).

## SearchableChoiceField para listas dinâmicas

**Data (se determinável):** 30/08/2026.

**Propósito:** oferecer um seletor próprio para coleções dinâmicas ou potencialmente longas, nas quais o `ChoiceField` estático não seria suficiente. Os casos iniciais foram ingrediente de refeição salva e suplemento no Diário, ambos com necessidade de localizar rapidamente uma opção existente.

**Recursos:**

- React e componente UMD reutilizável.
- Busca local em JavaScript com normalização Unicode NFD e remoção de diacríticos.
- HTML semântico com combobox, listbox, diálogo modal, live region e controle de foco.
- CSS One UI 8/Glass UI, scrollbar temática e estados claro/escuro.
- SVGs próprios para busca, chevron, seleção e fechamento.
- Playwright autenticado, Node.js Test Runner, Vite e loader legado.

**Arquivos:**

- `searchable-choice-field.js`
- `src/components/searchable-choice-field.js`
- `saved-meal-card.js`
- `diary-screen.js`
- `nutrition-tracker-controller.js`
- `app.js`
- `nutrition-tracker.jsx`
- `src/App.jsx`
- `one-ui.css`
- `tests/fixtures/index.legacy.html`
- `tests/smoke/searchable-choice-field.visual.spec.js`
- `tests/unit/searchable-choice-field.test.js`
- `tests/unit/saved-meal-card.test.js`
- `tests/unit/diary-screen.test.js`
- `tests/unit/nutrition-tracker-controller.test.js`

**O que foi feito:**

- Foi criado o `SearchableChoiceField`, sempre em bottom sheet porque o número de opções pode mudar em runtime e o campo de busca faz parte do contrato do componente.
- O componente normaliza opções sem alterar o valor fornecido pelo host e filtra sobre label e descrição. A busca remove diacríticos e diferenças de caixa, permitindo, por exemplo, encontrar o mesmo termo com ou sem acento.
- A busca permanece fixa na parte superior do sheet enquanto os resultados rolam. Uma região `aria-live="polite"` anuncia a contagem filtrada.
- O input usa `role="combobox"`, `aria-autocomplete="list"`, `aria-controls` e `inputMode="search"`; seta para baixo transfere foco ao primeiro resultado habilitado.
- Resultados usam `role="option"`, `aria-selected`, navegação por setas/Home/End, ativação por teclado e check customizado para a seleção atual. Marcas fornecidas pelo host ou iniciais calculadas ajudam na diferenciação visual sem substituir o texto.
- Busca sem correspondência produz estado vazio localizado e ação para limpar o termo. O botão de limpar devolve foco ao input.
- A seleção continua imediata: atualiza o host, limpa a busca, fecha o sheet e restaura o foco do gatilho.
- A scrollbar lateral recebeu trilho e polegar coerentes com o tema ativo, removendo o contraste inadequado da scrollbar escura nativa no tema claro.
- O componente foi integrado ao ingrediente de refeição salva e ao suplemento do Diário, preservando as coleções e callbacks já existentes.
- Commits de teste posteriores eliminaram dependência de timing na busca e ajustaram a ação localizada do suplemento, mantendo PT/EN/ES e os dois runtimes no gate.

**PRs/commits relacionados:**

- [PR #141 — UI: seletores dinâmicos pesquisáveis](https://github.com/magnoClovis/nutrition-tracker/pull/141).
- [Commit `50b774b` — criação e integração dos seletores pesquisáveis](https://github.com/magnoClovis/nutrition-tracker/commit/50b774bbc03c71f1abe6b6bf787fd5dc9fd6c626).
- [Commit `b5c6237` — estabilização do smoke pesquisável](https://github.com/magnoClovis/nutrition-tracker/commit/b5c623721fcb90a19d43d5d5036ab376ac1e4d0d).
- [Commit `4ea5a18` — correspondência da ação localizada de suplemento](https://github.com/magnoClovis/nutrition-tracker/commit/4ea5a18f7062617358c41a13492825f4206e19dc).
- [Merge `fd85d0e`](https://github.com/magnoClovis/nutrition-tracker/commit/fd85d0e8525071e5446bfcd8388e0d9899cb640c).

## TemporalField de horário

**Data (se determinável):** 30/08/2026.

**Propósito:** substituir o relógio nativo do Android no horário da refeição. Além da diferença visual, o picker do sistema seguia o idioma do sistema operacional, criando inconsistência quando o usuário escolhia outro idioma dentro do Trofia.

**Recursos:**

- React e módulo UMD `temporal-field.js`.
- Contrato de valor de 24 horas (`HH:mm`) independente de locale.
- Numeric keypad interno em React para entrada direta de hora/minuto.
- CSS Glass UI com safe areas, claro/escuro e SVGs próprios.
- ARIA dialog, status/live regions, focus trap e navegação por teclado.
- Playwright autenticado, Node.js Test Runner, Vite e loader legado.

**Arquivos:**

- `temporal-field.js`
- `src/components/temporal-field.js`
- `add-screen.js`
- `app.js`
- `nutrition-tracker.jsx`
- `src/App.jsx`
- `one-ui.css`
- `tests/fixtures/index.legacy.html`
- `tests/smoke/temporal-field.visual.spec.js`
- `tests/unit/temporal-field.test.js`
- `tests/unit/add-screen.test.js`
- `tests/unit/app-entry.test.js`

**O que foi feito:**

- Foi criado o `TemporalField` em modo horário com contrato controlado `HH:mm`, validação de hora `0–23` e minuto `0–59` e sem dependência do formato/idioma do picker do sistema.
- O sheet apresenta segmentos separados de hora e minuto. Cada segmento mantém botões de incremento/decremento; horas circulam em 24 posições e minutos usam passo configurável de cinco minutos.
- Tocar diretamente no número abre o keypad interno aprovado. O usuário pode substituir rapidamente hora ou minuto e confirmar; valores fora do intervalo produzem mensagem localizada sem fechar o sheet.
- Setas para cima/baixo também ajustam o segmento pelo teclado físico. Os botões possuem labels acessíveis específicos para aumentar, diminuir e editar.
- A ação “agora” usa a hora local fornecida pelo host/runtime e atualiza os dois segmentos; confirmar emite um único valor normalizado ao host.
- Todo texto visível — título, labels, ações e erros — é fornecido pelo idioma PT/EN/ES selecionado dentro do app. O locale do sistema não controla a interface.
- O `TemporalField` substituiu o input nativo de horário da refeição em `add-screen.js`; persistência e regras da refeição permaneceram no host.
- O sheet, keypad, estados de foco e cores foram validados por `getComputedStyle` em claro/escuro, desktop/mobile e legado/Vite.

**PRs/commits relacionados:**

- [PR #144 — Fatia 5: TemporalField de horário](https://github.com/magnoClovis/nutrition-tracker/pull/144).
- [Commit `84946ef` — picker de horário local ao app](https://github.com/magnoClovis/nutrition-tracker/commit/84946efaa0a0e602d4e03ac55bc59121f11c48f3).
- [Merge `182a197`](https://github.com/magnoClovis/nutrition-tracker/commit/182a1977bdc5ad0def9a0f8cb76fc3d014a82324).

## TemporalField de data de nascimento

**Data (se determinável):** 30/08/2026.

**Propósito:** retirar o calendário nativo de data de nascimento no cadastro e no perfil obrigatório, garantindo a mesma linguagem visual e o mesmo idioma interno do Trofia, com navegação eficiente para datas distantes no passado.

**Recursos:**

- React e extensão do módulo `temporal-field.js` com `DateField`.
- Datas civis no formato ISO `YYYY-MM-DD` e cálculos UTC apenas para evitar deslocamento de dia durante formatação do calendário.
- `Intl.DateTimeFormat` parametrizado pelo locale fornecido pelo app.
- Numeric keypad interno para salto direto de ano.
- CSS Glass UI, SVGs próprios e temas claro/escuro.
- Playwright, Node.js Test Runner, Vite e loader legado.

**Arquivos:**

- `temporal-field.js`
- `login-screen.js`
- `required-profile-modal.js`
- `app.js`
- `nutrition-tracker.jsx`
- `src/App.jsx`
- `one-ui.css`
- `tests/smoke/app-orchestration.spec.js`
- `tests/smoke/app.smoke.spec.js`
- `tests/smoke/auth.setup.js`
- `tests/smoke/cutover-visual-matrix.spec.js`
- `tests/smoke/temporal-field-date.visual.spec.js`
- `tests/smoke/test-helpers.js`
- `tests/unit/login-screen.test.js`
- `tests/unit/required-profile-modal.test.js`
- `tests/unit/temporal-field.test.js`

**O que foi feito:**

- O módulo temporal recebeu o `DateField`, mantendo o valor externo como data civil ISO e separando esse contrato da apresentação localizada.
- O sheet oferece três vistas: calendário mensal, salto por mês/ano e keypad de ano. Essa divisão evita centenas de toques para alcançar um ano de nascimento distante.
- A barra mensal possui anterior/próximo e botão de mês/ano. A vista de salto permite avançar/recuar o ano, selecionar um dos 12 meses ou tocar no ano para digitá-lo diretamente.
- O grid usa `role="grid"`/`role="gridcell"`, `aria-selected` e labels completos de cada dia no locale do app. Dias fora de `min`/`max` ficam desabilitados.
- A quantidade de dias respeita mês e ano bissexto; mudança de mês/ano limita o dia atual ao último dia válido do novo período.
- PT/EN/ES controlam nomes de mês, dias da semana, títulos, ações e mensagens. `Intl.DateTimeFormat` recebe explicitamente o locale do Trofia e `timeZone: "UTC"` para formatar os campos civis sem deslocá-los.
- O calendário substituiu os inputs nativos em `login-screen.js` e `required-profile-modal.js`, mantendo a validação e os callbacks de perfil existentes.
- O teste visual cobre calendário, salto por ano, dois temas, desktop/mobile, os dois runtimes e os três idiomas.

**PRs/commits relacionados:**

- [PR #146 — S6: substituir datas de nascimento pelo TemporalField](https://github.com/magnoClovis/nutrition-tracker/pull/146).
- [Commit squash/merge `26328fa` — date picker local ao app](https://github.com/magnoClovis/nutrition-tracker/commit/26328fa061af9dbfc97e8e4b1e28f2e3f7baba14).

## NumericField para quantidade de alimento

**Data (se determinável):** 31/08/2026.

**Propósito:** reduzir a dependência do teclado numérico do sistema em um campo de uso frequente, sem criar um IME Android. O keypad deveria ser um componente normal dentro do app, preservar acessibilidade e oferecer feedback de validação coerente com a linguagem visual do Trofia.

**Recursos:**

- React e `NumericField` incorporado ao módulo `temporal-field.js` para reutilizar sheet, foco e keypad.
- JavaScript para entrada decimal, limites e normalização de valor.
- CSS Glass UI com estados neutro, inválido e válido em claro/escuro.
- ARIA dialog, `role="status"`, `aria-live`, labels de apagar/separador/confirmar e focus trap.
- Playwright autenticado, Node.js Test Runner, Vite e loader legado.

**Arquivos:**

- `temporal-field.js`
- `add-screen.js`
- `app.js`
- `nutrition-tracker.jsx`
- `src/App.jsx`
- `one-ui.css`
- `tests/smoke/authenticated-flows.spec.js`
- `tests/smoke/numeric-field.visual.spec.js`
- `tests/unit/add-screen.test.js`
- `tests/unit/temporal-field.test.js`

**O que foi feito:**

- Foi criado o `NumericField` controlado, usando o keypad interno de dígitos `0–9`, separador decimal, apagar e confirmar, sem código nativo Android e sem substituir o IME global do aparelho.
- O primeiro escopo foi a quantidade de alimento, campo de alta frequência. O trigger fechado apresenta valor e unidade; abrir o sheet cria um draft que só é enviado ao host após confirmação válida.
- O componente aceita mínimo, máximo, casas decimais, unidade e mensagens localizadas. O separador mostrado é vírgula, enquanto a normalização interna mantém um número compatível com o contrato existente.
- A validação visual foi corrigida após revisão: campo vazio começa neutro; vermelho aparece apenas depois de tentativa inválida; verde de ação aparece somente após existir um valor válido. Isso evita indicar erro antes de qualquer interação e evita tratar ausência como sucesso.
- A mensagem de erro usa live region e o botão Confirmar respeita o estado do draft, preservando uso por leitor de tela e teclado.
- O input nativo `type="number"` deixou de ser visível nesse fluxo, mas a lógica de quantidade e o callback de inclusão do alimento permaneceram no `AddScreen`.
- A cobertura verificou edição decimal, apagar, confirmação, localização PT/EN/ES, `getComputedStyle`, desktop/mobile, claro/escuro e paridade legado/Vite.

**PRs/commits relacionados:**

- [PR #148 — S7a: teclado numérico para quantidade de alimento](https://github.com/magnoClovis/nutrition-tracker/pull/148).
- [Commit `217ec37` — NumericField da quantidade](https://github.com/magnoClovis/nutrition-tracker/commit/217ec37f2ee45c61a7c891a5cdc88a8106dc57d6).
- [Commit `fcc2b0e` — feedback neutro antes da interação](https://github.com/magnoClovis/nutrition-tracker/commit/fcc2b0ebb086248ea998f850dc2c643e58bb779a).
- [Merge `e00257c`](https://github.com/magnoClovis/nutrition-tracker/commit/e00257c3f51b8271492509677cc1d04d0ebd5690).

## NumericField para medidas corporais

**Data (se determinável):** 31/08/2026.

**Propósito:** ampliar o keypad aprovado aos campos numéricos mais frequentes de Métricas — peso, gordura corporal, cintura e massa muscular — mantendo o mesmo padrão de entrada e feedback da quantidade de alimento.

**Recursos:**

- React e `NumericField` compartilhado.
- CSS One UI 8/Glass UI.
- Playwright autenticado e Node.js Test Runner.
- GitHub Actions com conta Firebase/App Check de teste para o gate real.
- Vite e runtime legado.

**Arquivos:**

- `metrics-screen.js`
- `app.js`
- `nutrition-tracker.jsx`
- `src/App.jsx`
- `one-ui.css`
- `tests/smoke/metrics-numeric-field.visual.spec.js`
- `tests/unit/metrics-screen.test.js`

**O que foi feito:**

- O branch do PR #150 substituiu quatro inputs numéricos visíveis na seção de acompanhamento de Métricas por `NumericField`: peso, percentual de gordura, cintura e massa muscular.
- Cada campo recebeu unidade, limites, precisão e mensagens PT/EN/ES específicas, mantendo os callbacks da `MetricsScreen` e o registro conjunto das medidas.
- O teste unitário foi ajustado para contar e validar os campos na seção correta de acompanhamento, evitando misturar o formulário de metas.
- O smoke visual foi criado para verificar os quatro triggers, ausência de `input[type="number"]` visível, estado neutro inicial, entrada decimal, confirmação, idioma, temas e viewports.
- A primeira execução autenticada mostrou o keypad renderizado atrás do conteúdo de Métricas. O diagnóstico identificou containing/stacking context criado pela animação do container; o commit `ac6dc45` tentou neutralizar `animation`/`transform` do `[data-app-main="metricas"]` enquanto o overlay estivesse aberto.
- O gate seguinte demonstrou que a correção era insuficiente: `[data-tutorial="metrics-measures"]` também aplica `backdrop-filter` e `overflow: hidden`, recortando o sheet dentro do cartão e fazendo o conteúdo da tela interceptar o clique no dígito `7`.
- O primeiro teste autenticado expirou; as falhas seguintes foram cascata de `ERR_CONNECTION_REFUSED` após o servidor encerrar. Como o gate não ficou verde, o PR permaneceu draft e **não foi mesclado**.
- Nenhuma correção adicional do stacking context foi implementada após esse resultado. Portanto, estes campos não devem ser descritos como disponíveis na `main` em 31/08/2026.

**PRs/commits relacionados:**

- [PR #150 — S7b: teclado numérico nas métricas corporais — aberto/draft](https://github.com/magnoClovis/nutrition-tracker/pull/150).
- [Commit `0059a8d` — NumericField nas medidas corporais](https://github.com/magnoClovis/nutrition-tracker/commit/0059a8dff11e3dad97e68fb0c0a831f65cdbd871).
- [Commit `73f24c7` — escopo dos asserts na seção de acompanhamento](https://github.com/magnoClovis/nutrition-tracker/commit/73f24c75694e3b9fd83815c8ecd4837a90168342).
- [Commit `ac6dc45` — tentativa de neutralizar a animação do container](https://github.com/magnoClovis/nutrition-tracker/commit/ac6dc453383540cedf521907485198ef4deb57a5).
- [CI autenticado `33374098903` — falha que bloqueou o merge](https://github.com/magnoClovis/nutrition-tracker/actions/runs/33374098903).

## Controles semânticos de checkbox e slider

**Data (se determinável):** 31/08/2026.

**Propósito:** substituir checkboxes e sliders ainda apresentados pelo estilo cru do navegador/Android por controles coerentes com One UI 8/Glass UI, sem perder as garantias dos elementos nativos. A fatia precisava aplicar uma semântica visual previsível — quadrado arredondado para seleção múltipla, círculo reservado a escolha exclusiva e switch reservado a preferência persistente — e manter teclado, leitor de tela, `min`, `max`, `step`, foco e valor acessível.

**Recursos:**

- React com componentes controlados e runtime injetado para paridade UMD/legado e ESM/Vite.
- Inputs HTML nativos `type="checkbox"` e `type="range"` como fonte semântica e de interação.
- CSS One UI 8/Glass UI com tokens de tema do Trofia, cores de ação/proteína, foco visível e responsividade.
- SVG próprio de traço fino para o check, sem glifo do sistema ou biblioteca genérica.
- Node.js Test Runner para contratos do componente, hosts e composição dos dois runtimes.
- Playwright Chromium autenticado com Firebase Authentication/App Check para a matriz legado/Vite, desktop/mobile e claro/escuro.

**Arquivos:**

- `selection-controls.js`
- `src/components/selection-controls.js`
- `diary-screen.js`
- `backup-modal.js`
- `app.js`
- `nutrition-tracker.jsx`
- `src/App.jsx`
- `one-ui.css`
- `tests/fixtures/index.legacy.html`
- `tests/unit/selection-controls.test.js`
- `tests/unit/diary-screen.test.js`
- `tests/unit/backup-modal.test.js`
- `tests/unit/app-entry.test.js`
- `tests/smoke/selection-controls.visual.spec.js`
- `CHANGELOG_DESIGN.md`
- `documentation/estado-atual/CHANGELOG_DESIGN.md`
- `documentation/estado-atual/RESUMO-STATUS.md`
- `documentation/historico/2026-08-31-ui-campos-customizados.md`

**O que foi feito:**

- O protótipo interativo foi aprovado após corrigir uma inconsistência percebida entre círculos, quadrados e um switch aparente. A regra final tornou todos os usos múltiplos um único checkbox quadrado arredondado de `24 × 24 px`, raio de `7 px` e check SVG fino; tema não altera o tipo visual do controle.
- Foi criado `SelectionControlsModule`, com `CheckboxField` e `SliderField` controlados. O módulo UMD recebe React explicitamente, e a fachada ESM reutiliza o mesmo contrato para evitar duas implementações visuais divergentes.
- `CheckboxField` mantém um `input type="checkbox"` real associado ao texto por `label`. O input fica transparente e posicionado sobre toda a linha de toque, continuando focável e expondo `checked`, `disabled`, `required`, `name`, `value` e `aria-describedby`; o evento nativo é traduzido para `onChange(checked, event)`. Essa cobertura integral também evita que automação e tecnologias de entrada precisem acertar um alvo recortado de `1 px`.
- `SliderField` mantém um `input type="range"` real, com `min`, `max`, `step`, setas do teclado, `aria-valuetext` e `output` associado por `htmlFor`. O preenchimento visual é calculado entre os limites, sem substituir a mecânica nativa do range.
- No Diário, a seleção individual de alimentos da despensa e “usar todos” migraram para `CheckboxField`. A seleção manual permanece no estado quando “usar todos” é ligado e desligado; descrições de calorias/proteína ficaram associadas ao checkbox para leitura contextual.
- Os ajustes avançados da sugestão de refeição migraram para `SliderField`: tamanho entre `−40%` e `+40%`, com valor/calorias atualizados, e flexibilidade de proteína entre `5%` e `50%`, exibida somente quando seu `CheckboxField` dependente está ativo.
- Na restauração de backup acessada por Configurações, cada categoria importável passou a usar o mesmo `CheckboxField`, preservando total, itens novos/existentes e as estratégias posteriores de anexar/substituir. Nenhuma lógica de backup, Firestore, autenticação ou persistência foi alterada.
- A preferência de tema em Configurações permaneceu como o botão já existente. Não foi criado um switch novo nesta fatia, porque sua aparência ainda não teve protótipo próprio; a regra semântica aprovada apenas reserva o formato de switch para esse tipo de preferência futura.
- O CSS usa tokens já existentes do Trofia nos dois temas, alvo efetivo de toque de pelo menos `44 px`, foco visível, estado desabilitado, marca quadrada invariável e trilhas action/protein distintas. `prefers-reduced-motion` continua sendo respeitado pela camada global do app.
- Os testes focados cobriram os componentes e três hosts em UMD e ESM, incluindo callbacks, associação de descrição, limites, clamp e progresso. A suíte unitária completa passou com 1.206 testes e nenhum skip; o Playwright local ficou nos skips esperados por ausência de credenciais, não sendo aceito como substituto do CI autenticado.
- O primeiro CI autenticado do PR #166 revelou que recortar o checkbox nativo para `1 × 1 px` preservava teclado, mas impedia o `.check()` real da restauração de backup de manter o estado. O input transparente passou a cobrir toda a linha de `44 px`, ampliando o alvo nativo sem mudar semântica ou aparência. O mesmo run mostrou que o Chromium do runner não expõe `getComputedStyle` do pseudo-elemento interno do range; a asserção foi direcionada às propriedades computadas efetivas de progresso e `accent-color`, mantendo a prova de tema sem depender de API inconsistente.
- Depois dessas correções, o gate autenticado final passou com 93/93 testes e nenhum skip. O PR #166 foi mesclado na `main` em 01/09/2026.

**PRs/commits relacionados:** [PR #166 — mesclado](https://github.com/magnoClovis/nutrition-tracker/pull/166); [commit `9a7194b` — componentes, migrações, testes e documentação inicial](https://github.com/magnoClovis/nutrition-tracker/commit/9a7194b); [commit `597457b` — alvo nativo integral e asserções visuais estáveis](https://github.com/magnoClovis/nutrition-tracker/commit/597457b); [commit `4f59fc0` — documentação final da fatia](https://github.com/magnoClovis/nutrition-tracker/commit/4f59fc0); [run autenticado final `33446146673`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/33446146673); [merge `e68bc20`](https://github.com/magnoClovis/nutrition-tracker/commit/e68bc20).

## GenericDialog para avisos, confirmações e entradas

**Data (se determinável):** 01/09/2026.

**Propósito:** encerrar a fatia S9 substituindo os diálogos nativos do navegador — visualmente inconsistentes no Android/WebView e dependentes da apresentação do sistema — por um serviço único do Trofia. O componente precisava cobrir aviso, confirmação comum, confirmação destrutiva e entrada de texto sem alterar a lógica funcional dos fluxos consumidores; manter PT/EN/ES controlado pelo app; e reconstruir as garantias de foco, teclado, leitor de tela e navegação de retorno que os diálogos nativos forneciam.

**Recursos:**

- React e `createPortal` para renderização do diálogo fora dos stacking contexts das telas consumidoras.
- Elementos HTML nativos `button` e `input`, roles e atributos ARIA para nome, descrição, modalidade, estado inválido e associação de mensagens.
- CSS One UI 8/Glass UI com tokens existentes do Trofia, temas claro/escuro, safe areas, responsividade e `prefers-reduced-motion`.
- SVGs próprios de traço fino para aviso, confirmação, ação destrutiva, entrada e fechamento.
- Dispatcher de Android Back já existente, integrado somente pela interface pública do app.
- Node.js Test Runner, Playwright Chromium autenticado, Firebase Authentication/App Check, runtime legado e build Vite.

**Arquivos:**

- `generic-dialog.js`
- `src/components/generic-dialog.js`
- `app.js`
- `nutrition-tracker.jsx`
- `src/App.jsx`
- `backup-modal.js`
- `nutrition-tracker-controller.js`
- `one-ui.css`
- `tests/fixtures/index.legacy.html`
- `tests/unit/generic-dialog.test.js`
- `tests/unit/backup-modal.test.js`
- `tests/unit/nutrition-tracker-controller.test.js`
- `tests/unit/app-entry.test.js`
- `tests/smoke/generic-dialog.visual.spec.js`

**O que foi feito:**

- Foi criado `GenericDialogModule` com API assíncrona baseada em Promises para `alert`, `confirm` e `prompt`. A fachada ESM reutiliza a implementação UMD, mantendo o mesmo contrato nos entrypoints Vite e legado.
- O diálogo é renderizado por portal, bloqueia o scroll do `body`, torna o conteúdo principal inerte e `aria-hidden` enquanto aberto, captura Tab dentro do overlay e devolve o foco ao elemento acionador no fechamento. Escape e Android Back cancelam; Enter confirma somente quando a ação está habilitada.
- O estado de aviso apresenta uma ação neutra; confirmações comuns usam a cor verde de ação; vermelho fica restrito ao modo destrutivo explícito. No modo de entrada, o botão principal permanece desabilitado enquanto o texto obrigatório está vazio, sem antecipar feedback inválido antes da interação.
- Os textos e rótulos são recebidos dos hosts já internacionalizados, portanto seguem PT/EN/ES escolhido dentro do Trofia em vez do idioma do sistema operacional.
- Foram substituídos os cinco usos ativos de APIs nativas: aviso de falha ao exportar backup, entrada de volume personalizado de água, confirmação de exclusão de refeição salva, confirmação de substituição ao importar um dia e confirmação para abrir o canal externo de feedback.
- A integração preservou callbacks e efeitos existentes. Nenhuma regra de backup, Firestore, autenticação, sincronização ou Worker foi alterada.
- O overlay recebeu `z-index: 100100`, acima do maior nível existente do modal de backup (`100006`). Essa correção evita que um alerta disparado durante a exportação fique visualmente atrás do modal que o originou.
- A camada visual cobre claro/escuro e desktop/mobile, mantém área de toque, foco visível, largura responsiva e redução de movimento. Os símbolos usam SVG fino coerente com os demais campos customizados.
- Os testes unitários cobrem resolução, cancelamento, entrada, foco, teclado, desmontagem e integrações consumidoras. O smoke autenticado cobre os quatro estados aprovados, ação comum/destrutiva, prompt vazio/válido, ARIA, inert, foco, claro/escuro, desktop/mobile e os dois runtimes.
- O gate local final passou com 1.239 testes unitários sem skip; smokes legado e Vite tiveram somente os 57 skips esperados em cada runtime por ausência local de credenciais; a matriz isolada de cutover passou 60/60 sem skip. O resultado autenticado real do PR é registrado quando disponível no mesmo item.
- O primeiro CI autenticado revelou um erro no próprio roteiro visual: depois de cancelar a confirmação de feedback, o teste tentava fechar o menu tocando novamente na engrenagem, embora o backdrop do menu corretamente intercepte esse toque. O roteiro passou a fechar pelo toque externo disponível ao usuário e a verificar que o menu desapareceu. O timeout desse caso também explicava as 68 falhas posteriores por `ERR_CONNECTION_REFUSED`, causadas pelo encerramento ocioso do servidor após quatro minutos sem requisições; não eram 68 regressões do app.

**PRs/commits relacionados:** [PR #172 — S9: diálogo genérico do Trofia](https://github.com/magnoClovis/nutrition-tracker/pull/172); [commit `40795f3` — componente, integrações e testes](https://github.com/magnoClovis/nutrition-tracker/commit/40795f3); [commit `6f531d5` — gesto real de fechamento no smoke](https://github.com/magnoClovis/nutrition-tracker/commit/6f531d5); [run autenticado `33457347380` — diagnóstico do roteiro e das falhas em cascata](https://github.com/magnoClovis/nutrition-tracker/actions/runs/33457347380).

## C07 - Cobertura visual autenticada dos componentes customizados

**Data (se determinável):** 30–31/08/2026.

**Propósito:** preservar o gate C07 durante a substituição de controles nativos. Como esses controles carregam acessibilidade e comportamento do sistema por padrão, os componentes customizados precisavam provar não apenas aparência, mas foco, teclado, idioma, responsividade e integração em sessão autenticada real.

**Recursos:**

- GitHub Actions em runner Windows.
- Firebase Authentication e App Check com conta/fixture descartável do CI.
- Playwright Chromium.
- Node.js Test Runner.
- Vite e servidor legado.
- `getComputedStyle`, snapshots de erro e artifacts do Playwright.

**Arquivos:**

- `tests/smoke/choice-field.visual.spec.js`
- `tests/smoke/profile-choice-field.visual.spec.js`
- `tests/smoke/metrics-choice-field.visual.spec.js`
- `tests/smoke/pantry-choice-field.visual.spec.js`
- `tests/smoke/searchable-choice-field.visual.spec.js`
- `tests/smoke/temporal-field.visual.spec.js`
- `tests/smoke/temporal-field-date.visual.spec.js`
- `tests/smoke/numeric-field.visual.spec.js`
- `tests/smoke/metrics-numeric-field.visual.spec.js`
- `tests/smoke/selection-controls.visual.spec.js`
- `tests/smoke/generic-dialog.visual.spec.js`
- `tests/smoke/cutover-visual-matrix.spec.js`
- `tests/smoke/app-orchestration.spec.js`
- `tests/smoke/authenticated-flows.spec.js`
- `tests/smoke/app.smoke.spec.js`
- `tests/smoke/auth.setup.js`
- `tests/smoke/test-helpers.js`
- Testes unitários dos componentes e hosts citados nos itens anteriores.

**O que foi feito:**

- Cada fatia mesclada adicionou ou atualizou teste focado do componente e teste do host que consome seu valor; o `npm test` completo continuou sendo o gate local antes do push.
- Os smokes visuais não se limitaram a screenshots: verificaram propriedades calculadas de fundo, cor, raio, backdrop, overflow e largura, além do valor/estado dos controles.
- A matriz cobriu desktop e mobile, modo claro e escuro, runtime legado e Vite e os idiomas PT/EN/ES escolhidos dentro do app.
- Os testes autenticados usaram a fixture App Check do CI em vez de considerar skips locais como evidência de sucesso. Skips locais por ausência de credenciais foram tratados como esperados, nunca como substituto do run real.
- Foram validados contratos acessíveis como roles, nomes, foco inicial, devolução de foco, Escape, navegação de opções, live regions e estados selecionados.
- Falhas reais produziram artifacts para diagnóstico. No PR #150, esse mecanismo revelou que um teste aparentemente correto em DOM ainda era inutilizável por interceptação de pointer events, impedindo um merge indevido.
- C07 já constava como concluído antes desta frente; este trabalho não reivindica sua criação original. A contribuição foi ampliar e manter o gate para os novos componentes.

**PRs/commits relacionados:**

- PRs [#126](https://github.com/magnoClovis/nutrition-tracker/pull/126), [#130](https://github.com/magnoClovis/nutrition-tracker/pull/130), [#133](https://github.com/magnoClovis/nutrition-tracker/pull/133), [#136](https://github.com/magnoClovis/nutrition-tracker/pull/136), [#138](https://github.com/magnoClovis/nutrition-tracker/pull/138), [#141](https://github.com/magnoClovis/nutrition-tracker/pull/141), [#144](https://github.com/magnoClovis/nutrition-tracker/pull/144), [#146](https://github.com/magnoClovis/nutrition-tracker/pull/146), [#148](https://github.com/magnoClovis/nutrition-tracker/pull/148), [#150](https://github.com/magnoClovis/nutrition-tracker/pull/150), [#166](https://github.com/magnoClovis/nutrition-tracker/pull/166) e [#172](https://github.com/magnoClovis/nutrition-tracker/pull/172).
- Commits de teste específicos: [`0c9ee63`](https://github.com/magnoClovis/nutrition-tracker/commit/0c9ee63fe82e74dbe0532c62f1992e714c2147e0), [`3602275`](https://github.com/magnoClovis/nutrition-tracker/commit/360227568b1bf87c73cefa482c575c4f34f72c58), [`b5c6237`](https://github.com/magnoClovis/nutrition-tracker/commit/b5c623721fcb90a19d43d5d5036ab376ac1e4d0d), [`4ea5a18`](https://github.com/magnoClovis/nutrition-tracker/commit/4ea5a18f7062617358c41a13492825f4206e19dc) e [`73f24c7`](https://github.com/magnoClovis/nutrition-tracker/commit/73f24c75694e3b9fd83815c8ecd4837a90168342).

## Auditoria dos controles nativos e arquitetura S1–S9

**Data (se determinável):** não determinado.

**Propósito:** identificar todos os controles que delegavam apresentação ao navegador/Android e propor uma migração coerente, reutilizável e fatiada, em vez de substituir campos isoladamente sem padrão comum.

**Recursos:**

- Inspeção estática do código React/HTML/CSS do Trofia.
- Inventário de `<select>`, inputs de data/hora/número, checkboxes, ranges e diálogos.
- Avaliação de acessibilidade WAI-ARIA e comportamento esperado em Android/WebView.
- Memória da conversa como fonte de autoria e decisões; Git como confirmação das fatias efetivamente entregues.

**Arquivos:** nenhum arquivo versionado foi criado ou alterado por esta auditoria. Os módulos examinados incluíram telas de cadastro, perfil obrigatório, Adicionar, Diário, Métricas, Alimentos/Despensa e Configurações, mas leitura não é reivindicada como modificação.

**O que foi feito:**

- Foi levantado o uso de seletores nativos em tipo de refeição, categorias/destinos de refeição, confiança, gênero, atividade, objetivo, unidades, ingredientes/suplementos dinâmicos, data de nascimento e horário.
- Foi separado o problema em componentes reutilizáveis: listas estáticas (`ChoiceField`), listas longas/dinâmicas (`SearchableChoiceField`), data/horário (`TemporalField`), números frequentes (`NumericField`), seleção múltipla/faixas (`CheckboxField`/`SliderField`) e diálogos (`GenericDialog`).
- A substituição de um teclado Android real/IME foi explicitamente excluída. O escopo aprovado limitou-se a keypad renderizado dentro da tela do app, preservando o teclado do sistema fora dos campos específicos.
- A auditoria definiu como requisitos transversais PT/EN/ES controlados pelo app, temas claro/escuro, leitor de tela, foco, teclado, desktop/mobile e validação autenticada em legado/Vite.
- O fatiamento aprovado foi S1–S9. S1–S6, S7a e S8 foram mescladas; S9 foi implementada no PR #172. A S7b continua no PR draft #150 e seus commits não integram `origin/main`, portanto o fechamento integral da sequência permanece pendente desse único ponto.

**PRs/commits relacionados:** não há PR ou commit próprio da auditoria. As decisões materializadas podem ser rastreadas nos PRs #126–#150, #166 e #172 descritos acima.

## Protótipos e critérios visuais aprovados

**Data (se determinável):** não determinado.

**Propósito:** validar visualmente cada novo tipo de controle antes de alterar o app, reduzindo retrabalho e impedindo que uma decisão de gosto fosse embutida em código sem aprovação explícita.

**Recursos:**

- Protótipos HTML/CSS/JavaScript interativos apresentados na conversa.
- Mockups conceituais fornecidos pelo responsável como referência, não como especificação obrigatória.
- Linguagem visual existente do Trofia: One UI 8/Glass UI, cores por categoria, raios, tipografia e temas claro/escuro.
- SVGs desenhados para os componentes, em vez de ícones de prateleira.

**Arquivos:** nenhum protótipo foi versionado no repositório. Os arquivos externos `trofia_numeric_input_keypad_mockup.html` e `trofia_choicefield_temporalfield_mockup.html` foram fornecidos pelo responsável e usados somente como referência; esta frente não reivindica sua autoria nem modificação.

**O que foi feito:**

- Foram prototipados ChoiceField, TemporalField de horário, TemporalField de data, NumericField, SearchableChoiceField, CheckboxField, SliderField e GenericDialog antes das respectivas implementações.
- O ChoiceField recebeu regra objetiva: até cinco opções sem descrição expandem inline; mais de cinco opções ou qualquer descrição abrem bottom sheet.
- Foi aprovado o fechamento imediato ao selecionar, tanto inline quanto em sheet, eliminando confirmação extra.
- Foi aprovada a combinação de steppers com digitação direta para horário e ano, evitando sequências longas de incrementos.
- Check, chevron, mais/menos, busca, fechar e apagar foram tratados como desenhos de traço fino coerentes com o Trofia.
- O keypad foi inicialmente restrito à quantidade e depois ampliado para medidas corporais frequentes; não foi generalizado para todo campo numérico.
- Cada protótipo contemplou claro/escuro. O protótipo pesquisável recebeu correção específica da scrollbar para acompanhar o tema.
- No protótipo S8, uma inconsistência aparente entre círculo, quadrado e switch foi corrigida antes do código. Ficou documentada a semântica: círculo para escolha exclusiva, quadrado arredondado para checkbox múltiplo e switch para preferência persistente.
- O protótipo S9 validou separadamente aviso, confirmação, entrada e modo escuro; hierarquia de cancelar/agir, bloqueio da confirmação com campo vazio e vermelho exclusivo para ação destrutiva foram aprovados antes do código.
- As aprovações ocorreram na conversa e não deixaram PR/commit independente. Somente as partes materializadas nos PRs citados são consideradas implementadas.

**PRs/commits relacionados:** não há PR ou commit exclusivo dos protótipos. As implementações resultantes estão nos PRs #126, #130, #133, #136, #138, #141, #144, #146, #148, no draft #150, no PR #166 e no PR #172.

## Roadmap de UI/UX e auditoria de inspiração concorrente

**Data (se determinável):** não determinado.

**Propósito:** organizar o trabalho visual restante depois dos seletores e avaliar ideias de Foodvisor e Calz sem copiar sua identidade visual, reconstruindo apenas conceitos de fluxo, hierarquia e organização na linguagem One UI 8/Glass UI do Trofia.

**Recursos:**

- Documento externo `Investigação e Análise de Apps.docx`, fornecido pelo responsável, com análise e 114 capturas de tela.
- Observação comparativa de Foodvisor e Calz.
- Roadmap consolidado da conversa para S4–S9 e I1–I7.
- Critérios de acessibilidade, `prefers-reduced-motion`, tema e validação visual autenticada.

**Arquivos:** nenhum arquivo do repositório foi criado ou alterado por essa auditoria/planejamento. O `.docx` externo foi somente lido e não é reivindicado como autoria desta frente.

**O que foi feito:**

- Foram avaliadas como frentes próprias: loading com logo pulsando/expandindo, registro progressivo por campo, FAB estendido, menu “o que criar”, configurações em tela cheia, hierarquia da tela inicial e gamificação de metas.
- Foi decidido concluir toda a sequência de seletores antes de iniciar I1–I7; a auditoria não interferiu nos PRs de UI já abertos.
- A política futura de tema foi registrada como migração única de todos os usuários para claro quando essa mudança específica for lançada, permitindo depois escolha manual por escuro ou acompanhamento do sistema. Essa decisão não foi implementada por esta frente.
- A coleta de alergias, intolerâncias e restrições foi explicitamente adiada por envolver dados de saúde sensíveis, política de privacidade e Data Safety; nenhum campo ou dado foi criado.
- A gamificação foi planejada como ativa por padrão, com opção de desativação em Configurações; não houve implementação.
- Foram definidos marcos sugeridos de AAB após S7b, S9, I3, I5, I6 e I7. Nenhum AAB foi gerado ou publicado por este trabalho.
- A reorganização da tela inicial foi identificada como a fatia mais subjetiva e dependente de nova aprovação visual; nenhum layout concorrente foi copiado para o app.

**PRs/commits relacionados:** não há PR ou commit desta auditoria/roadmap. I1–I7 permaneciam não iniciadas ao final do período registrado.

## Fontes consultadas e limitações

- Conversa desta frente, usada como fonte primária para autoria, escopo e decisões aprovadas.
- Git local em `origin/main`, confirmado no commit `3d776dbe8305a4b1d3732dfd6bb206e2e563ee5a` em 31/08/2026 antes da abertura da branch S8.
- GitHub: PRs #126, #130, #133, #136, #138, #141, #144, #146, #148, #150, #166 e #172; commits e runs autenticados citados nos itens.
- `documentation/README.md`, `documentation/estado-atual/ROADMAP.md` e `documentation/estado-atual/BUG-INVENTORY.md`, consultados antes da redação para convenção, estados e códigos formais.
- Datas dos protótipos, da auditoria S1–S9 e da auditoria de concorrentes são **não determinadas**, pois não existe commit/PR próprio que confirme o instante exato.
- O PR #150 registra implementação parcial e falha confirmada; não deve ser usado como prova de recurso disponível na `main`.
