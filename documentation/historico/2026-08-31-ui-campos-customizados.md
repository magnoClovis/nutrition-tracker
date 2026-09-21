# Histórico da frente de UI — campos customizados e seletores do Trofia

## Escopo, autoria e método

Este arquivo registra exclusivamente a frente de UI/UX desenvolvida nesta conversa: substituição de controles nativos do navegador/Android por componentes próprios do Trofia, integração desses componentes nas telas autorizadas e validação visual correspondente. A atribuição foi determinada pela memória integral da conversa e confirmada pelos branches `codex/ui-*`, pelos commits e pelos pull requests citados em cada item.

O registro não reivindica trabalhos intercalados de App Check, arquitetura de dados, score, avaliação nutricional ou IA. Esses PRs aparecem na mesma cronologia da `main`, mas pertencem a outras conversas. Também não apresenta protótipos ou decisões aprovadas como se fossem código entregue: itens sem arquivo versionado são identificados explicitamente como auditoria, prototipação ou planejamento.

As datas dos itens implementados são as datas de merge ou dos commits confirmadas no Git/GitHub. Todos os horários observados foram normalizados pelo histórico Git local para `Europe/Madrid`; como o formato solicitado usa data civil, os horários não são reproduzidos abaixo.

### Relação com os códigos formais do projeto

- Os componentes `ChoiceField`, `SearchableChoiceField`, `TemporalField` e `NumericField` não correspondem diretamente a nenhum item C01–C28, N01–N09 ou bug formal A01–A12, G01, B05 ou F06. Por isso, seus títulos não recebem códigos artificiais.
- A cobertura transversal de CI e Playwright corresponde à manutenção e ampliação de **C07 — Testes autenticados e CI verde**; essa associação aparece somente no item específico de validação.
- O trabalho não resolveu C01, C11 nem qualquer bug formal do inventário. Semelhanças de tela ou tecnologia não foram tratadas como equivalência de escopo.

## Estado resumido da frente

| Entrega | Estado confirmado em 10/09/2026 |
|---|---|
| PRs #126, #130, #133, #136, #138, #141, #144, #146 e #148 | Mesclados na `main` |
| PR #150 — S7b | Mesclado na `main` no merge `d3fdab0`, após correção final e CI autenticado verde |
| S8 — checkboxes e sliders | Mesclada na `main` pelo PR #166, com CI autenticado integralmente verde |
| S9 — diálogo genérico | Implementada, validada e mesclada na `main` pelo PR #172 |
| Fechamento S1–S9 | Concluído: todas as fatias S1–S9 integram a `main` |
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

**Data (se determinável):** implementação inicial em 31/08/2026; correção final e merge em 10/09/2026.

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
- O primeiro teste autenticado expirou; as falhas seguintes foram cascata de `ERR_CONNECTION_REFUSED` após o servidor encerrar. O PR permaneceu draft até que a causa visual e a concorrência de portas fossem isoladas, sem usar cliques forçados para mascarar o defeito.
- Na reconciliação final, a branch foi atualizada sobre a `origin/main`. A investigação confirmou um segundo containing/stacking context no próprio cartão Glass `[data-tutorial="metrics-measures"]`: `backdrop-filter: blur(6px)` e `overflow: hidden` mantinham o overlay preso mesmo depois da neutralização do container principal.
- A correção final desativa `backdrop-filter` e clipping **somente** nesse cartão e **somente** enquanto ele contém um overlay temporal/numérico aberto. Ao fechar o `NumericField`, o vidro e o recorte normais voltam a valer; não houve mudança visual permanente no cartão.
- O smoke autenticado passou a verificar por `getComputedStyle` a ausência temporária de animação/transform no app main, a ausência temporária de backdrop e o `overflow: visible` no cartão, além de clicar normalmente no keypad em desktop/mobile e claro/escuro.
- O primeiro CI após essa correção apontou que o seletor CSS ainda mirava o ancestral direto da tela, não o cartão real aninhado. O seletor foi estreitado para `[data-screen="metricas"] [data-tutorial="metrics-measures"]:has(...)`, e o teste impediu que esse falso positivo fosse aceito.
- O gate local final passou preflight, 1.258/1.258 unitários, smoke legado e Vite e cutover 60/60. Uma diferença intermitente de 15 pixels (0,00449% do frame, delta máximo 9) no canto inferior do caso Métricas ES/mobile/claro foi diagnosticada como antialiasing subpixel: DOM e estilos eram idênticos, os frames eram visualmente indistinguíveis e o caso passou 3/3 isolado antes da repetição integral 60/60.
- O CI autenticado final `34412674372` passou com 93 testes no legado e somente os oito skips exclusivos/documentados do Vite, 101/101 no Vite e nenhuma falha. O PR #150 foi então mesclado, tornando as medidas corporais customizadas disponíveis na `main` e concluindo a sequência S1–S9.

**PRs/commits relacionados:**

- [PR #150 — S7b: teclado numérico nas métricas corporais — mesclado](https://github.com/magnoClovis/nutrition-tracker/pull/150).
- [Commit `0059a8d` — NumericField nas medidas corporais](https://github.com/magnoClovis/nutrition-tracker/commit/0059a8dff11e3dad97e68fb0c0a831f65cdbd871).
- [Commit `73f24c7` — escopo dos asserts na seção de acompanhamento](https://github.com/magnoClovis/nutrition-tracker/commit/73f24c75694e3b9fd83815c8ecd4837a90168342).
- [Commit `ac6dc45` — tentativa de neutralizar a animação do container](https://github.com/magnoClovis/nutrition-tracker/commit/ac6dc453383540cedf521907485198ef4deb57a5).
- [CI autenticado `33374098903` — falha que bloqueou o merge](https://github.com/magnoClovis/nutrition-tracker/actions/runs/33374098903).
- [Commit `bb7665c` — neutralização e prova computada do contexto adicional](https://github.com/magnoClovis/nutrition-tracker/commit/bb7665c).
- [Commit `8202eb6` — seletor final direcionado ao cartão Glass real](https://github.com/magnoClovis/nutrition-tracker/commit/8202eb6).
- [CI autenticado final `34412674372`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/34412674372).
- [Merge `d3fdab0`](https://github.com/magnoClovis/nutrition-tracker/commit/d3fdab09eac2f9801861d6a1692a07942d356796).

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
- O CI seguinte avançou além desse ponto e revelou uma segunda precondição ausente no roteiro: a ação de configurar uma medida personalizada de água fica dentro do disclosure de água, fechado por padrão. O teste passou a expandir esse painel quando necessário e a exigir que o botão esteja visível antes do clique; novamente, as 68 falhas posteriores eram somente a cascata do timeout inicial.
- O terceiro CI autenticado expôs uma sobreposição real exclusiva do layout desktop: o contêiner visual não interativo `[data-diary-metrics]`, posicionado acima do cartão de água por seu stacking context, interceptava o clique em `[data-water-configure]` depois que o disclosure era expandido. A correção mínima definiu `pointer-events: none` nesse contêiner, preservando integralmente seu desenho e permitindo que o controle visível receba o clique real. O smoke passou a verificar também o valor computado de `pointer-events` em desktop, sem recorrer a `force: true` ou mascarar a interação.
- Depois da correção, o gate local completo confirmou 1.239 testes unitários, 38 casos de smoke legado, 38 casos de smoke Vite e 60/60 casos da matriz de cutover. A primeira tentativa isolada do cutover foi interrompida por queda pontual do servidor estático Vite na porta 8776; uma repetição limpa, com as portas previamente verificadas e o timeout ocioso local ampliado, completou toda a matriz em PT/EN/ES, desktop/mobile e claro/escuro, sem skip ou falha.
- O CI autenticado seguinte confirmou que a fixture de refeição salva e o cartão visual eram renderizados, mas revelou que o botão de exclusão expunha ao leitor de tela apenas o caractere visual `×`: o `title` localizado não substituía esse conteúdo como nome acessível. O botão manteve o `×` visual e recebeu `aria-label` igualmente localizado como `Apagar`, `Delete` ou `Eliminar`; testes de contrato UMD/ESM passaram a verificar os três idiomas e a preservação do símbolo. O timeout inicial desse caso encerrou o servidor ocioso e causou 69 falhas posteriores por conexão recusada, tratadas como cascata e não como regressões independentes. Após a correção, o gate local completo passou com 1.241 testes unitários sem skip, 38 casos de smoke legado e 38 de Vite com apenas os 57 skips autenticados locais esperados em cada runtime, além de 60/60 casos de cutover sem skip.
- O CI posterior avançou por todos os fluxos anteriores e revelou uma fixture de falha de exportação desatualizada, não uma regressão do app: o exportador web passou a usar uma URL `data:` como caminho primário e `URL.createObjectURL` somente como fallback, enquanto o teste simulava erro apenas no fallback. A fixture passou a lançar a mesma falha controlada no clique de âncoras com atributo `download` e a manter a falha em `createObjectURL`, cobrindo os dois caminhos reais sem alterar o exportador nem qualquer lógica do aplicativo. O gate local repetido após esse ajuste passou com preflight limpo, 1.241 testes unitários sem skip, 38 casos de smoke legado e 38 de Vite com somente os 57 skips autenticados locais esperados em cada runtime, além de 60/60 casos de cutover sem skip em PT/EN/ES, desktop/mobile e claro/escuro.
- O run autenticado `33488032008`, executado sobre o merge de teste do PR com a `main` em `e39f6bd`, confirmou preflight, unitários, Worker e Functions, mas terminou com 87 casos Playwright aprovados, os mesmos 8 skips autenticados documentados e duas falhas. A falha pertencente à S9 era uma expectativa visual incorreta do próprio smoke: o CSS aprovado mantém `28px` no diálogo desktop e reduz intencionalmente o raio para `25px` no breakpoint móvel de até 420px, enquanto a asserção exigia `28px` nos dois projetos. O teste passou a derivar a expectativa da largura real do viewport (`28px` desktop; `25px` mobile), sem alterar CSS ou comportamento do app. O gate local completo repetido após essa correção passou com preflight limpo, 1.241 testes unitários sem skip, 38 casos legado e 38 Vite com somente os 57 skips autenticados locais esperados por runtime e cutover 60/60 sem skip em toda a matriz PT/EN/ES, desktop/mobile e claro/escuro. Antes do novo push, a branch foi reconciliada com a `main` em `141da41`; o único conflito real era documental em `RESUMO-STATUS.md` e foi resolvido preservando tanto o estado da S9 quanto o incidente App Check/C14-A. Nenhuma lógica concorrente foi editada manualmente. O gate completo sobre essa base final passou novamente: preflight limpo, 1.252 unitários sem skip, 40 smokes legado e 40 Vite com apenas os 57 skips autenticados locais esperados por runtime e cutover 60/60 sem skip.
- A segunda falha do run `33488032008` não pertencia à S9 e foi preservada como evidência para investigação externa: no caso `takes unit labels and controls from the PT, EN, and ES app language`, de `pantry-choice-field.visual.spec.js`, o projeto desktop abriu o app autenticado, executou sequencialmente `setAppLanguage` e o fluxo completo da unidade de alimento/suplemento em PT e EN, então chamou `setAppLanguage('es')`. Esse helper grava `appLang=es` no `localStorage`, persiste `language=es` em `window.storage`, recarrega a página, aguarda o fim de `#loading` e fecha tutorial/aviso se presente. Na tentativa seguinte de abrir `[data-tutorial="tab-despensa"]`, o alvo não existia; o fallback também não encontrou botão `Alimentos`. O snapshot anexado mostrou que o reload havia retornado à tela pública de login já traduzida para espanhol (`Iniciar sesión`, `Crear cuenta`, `Contraseña`), isto é, a preferência de idioma persistiu, mas a sessão autenticada não. A falha ocorreu uma vez no projeto desktop; o mesmo caso, com o mesmo ciclo PT/EN/ES, passou integralmente no projeto mobile durante o próprio run. Ela não apareceu nos gates locais porque esses casos exigem credenciais reais e permanecem entre os skips locais esperados. Portanto, com a evidência disponível nesse ponto, a ocorrência é **intermitente ou específica do projeto desktop no CI, ainda não reproduzida de forma determinística**; nenhuma lógica de autenticação, persistência ou App Check foi alterada neste chat.
- O run autenticado seguinte, `33497924576`, trouxe evidência adicional e impediu o merge condicional. No runtime legado, os 97 casos terminaram com **89 aprovados e os mesmos 8 skips esperados**; tanto o GenericDialog quanto o caso de Alimentos/Despensa com o ciclo PT/EN/ES passaram em desktop e mobile. No Vite, o GenericDialog também passou em desktop e mobile, e o caso de Alimentos/Despensa passou nos dois projetos, mostrando que a queda anterior não é determinística. Porém, no projeto Vite mobile, o caso `uses PT, EN, and ES app-language copy and exposes an accessible empty state`, de `searchable-choice-field.visual.spec.js`, ficou em `#loading` após o reload feito por `setAppLanguage`: o helper esperou 15 segundos pela remoção do elemento, que permaneceu presente nas seis sondagens registradas. O job alcançou então o limite global de **30 minutos** do GitHub Actions e foi cancelado; ficaram 87 casos Vite aprovados e 9 não executados, sem um resumo final de skips para esse segundo runtime. Assim, esta execução não é um gate verde e não autoriza o merge. A recorrência em outro teste autenticado que alterna PT/EN/ES, agora no Vite mobile e presa no loading em vez de retornar explicitamente à tela pública, reforça a hipótese de persistência/restauração de sessão inconsistente após reload, mas não permite determinar a causa. Esta frente não alterou nem tentou corrigir autenticação, App Check, Firestore ou sincronização.
- Para medir a reprodutibilidade sem tocar na causa raiz, o mesmo caso de `SearchableChoiceField` foi executado isoladamente **três vezes** no projeto Vite mobile autenticado, no run `33502189291`. Cada repetição percorreu sequencialmente PT, EN e ES, recarregou o app em cada idioma, abriu o ingrediente de refeição salva e o suplemento no Diário e validou o estado vazio localizado; as três passaram em 15,4 s, 14,6 s e 15,4 s. Contando o auth setup, o Playwright terminou com 4/4 casos aprovados em 58 s e `SMOKE_OUTCOME: success`. A instrumentação temporária registrou 438 chamadas `storage.get`: todas as 438 terminaram, nenhuma lançou erro e nenhuma listagem `storage.list` foi necessária nesse fluxo. A leitura mais lenta observada foi `language`, em aproximadamente 1,0 s; a operação mais lenta foi a gravação assíncrona de `lastLoginAt`, em 1,484 s. Não houve `pageerror`, mensagem de console do tipo erro, `requestfailed` nem requisição Firestore pendente. O único aviso repetido foi o warning conhecido do Firebase de que `127.0.0.1` não está autorizado para operações OAuth por popup/redirect; o caso usa a sessão email/senha já preparada e esse aviso não impediu nenhuma das nove trocas de idioma. Cinco das 96 gravações assíncronas iniciadas ainda não tinham emitido o marcador de conclusão quando o último teste encerrou, mas não eram leituras, não produziram erro e não bloquearam `#loading`. A conclusão é que o travamento observado no run anterior é **intermitente e não foi reproduzido em 3/3 tentativas isoladas**; portanto não foi possível atribuí-lo a uma leitura específica. Nenhuma correção foi tentada. A instrumentação e o comando isolado foram removidos integralmente logo após a coleta; o run aparece globalmente vermelho apenas porque o teste unitário que protege o comando canônico do workflow detectou, como esperado, a substituição diagnóstica temporária de `npm run test:smoke`, enquanto o passo Playwright isolado ficou verde.
- Depois de a intermitência ser aceita para monitoramento, o gate canônico foi repetido no attempt 2 do run `33504751303`. Preflight, 1.252 testes unitários, Worker e Functions passaram sem skip; o runtime legado completou os 97 casos com **89 aprovados e os 8 skips esperados**. No Vite, 96 casos passaram e um falhou no projeto desktop, deixando o gate vermelho e impedindo o merge. A falha ocorreu dentro do roteiro do GenericDialog, mas antes de abrir o diálogo destrutivo: após validar feedback e quantidade personalizada de água, a página permaneceu rolada na parte baixa do Diário, com o disclosure de Água expandido e uma refeição de nove itens. O helper resolveu corretamente `<button data-tutorial="tab-despensa">Alimentos</button>`, porém o botão estava fora do viewport; `locator.click({ force: true })` tentou rolar e terminou com `Element is outside of the viewport`. O screenshot e o snapshot semântico confirmam que o conteúdo do Diário estava visível, enquanto a navegação existia na árvore mas não na área capturada. Não houve falha de aparência, ARIA ou comportamento do `GenericDialog`; o mesmo roteiro passou no legado e no projeto Vite mobile. Mesmo assim, o incidente é **não resolvido**, pode refletir estado de scroll/fixture acumulada ou comportamento da navegação, e não foi mascarado com clique por JavaScript nem novo `force`. Nenhuma correção foi aplicada sem aprovação.
- A navegação do smoke foi estabilizada sem `force: true` e sem exigir o estado frágil `window.scrollY === 0`: o roteiro localiza a aba Alimentos, executa `scrollIntoViewIfNeeded()`, comprova `toBeInViewport()` e somente então realiza o clique normal. A mesma regra passou a valer em desktop e mobile. Isso testa o caminho interativo real e evita confundir a posição residual do scroll do Diário com uma falha do diálogo.
- Uma execução posterior encontrou oito falhas reproduzíveis nos fluxos de refeição, todas também presentes na `main` e fora do escopo do `GenericDialog`. A investigação isolada confirmou que não eram flakiness do servidor nem mudança da S9. O chat principal diagnosticou o incidente como efeito das rules C14-B2 e realizou a reversão/correção separada; esta frente não modificou `firestore.rules`, Firestore, autenticação ou sincronização. Depois de incorporar a `main` corrigida no commit `8e3738c`, o gate local integral da S9 voltou a passar.
- O gate local final sobre a base corrigida concluiu preflight, **1.254/1.254 testes unitários**, 40 casos disponíveis no legado e 40 no Vite, com apenas os 57 skips locais esperados por runtime por ausência de credenciais; a matriz de cutover passou **60/60** em PT/EN/ES, desktop/mobile e claro/escuro. O Worker passou 29 testes Node e 5 de runtime, sem skip; Functions e rules passaram 72/72 testes nos emuladores, também sem skip. Como outro worktree disputava intermitentemente a porta padrão 8080, a suíte de emuladores foi executada em portas temporárias isoladas e a configuração transitória foi removida ao terminar, sem alteração versionada.

**PRs/commits relacionados:** [PR #172 — S9: diálogo genérico do Trofia](https://github.com/magnoClovis/nutrition-tracker/pull/172); [commit `40795f3` — componente, integrações e testes](https://github.com/magnoClovis/nutrition-tracker/commit/40795f3); [commit `6f531d5` — gesto real de fechamento no smoke](https://github.com/magnoClovis/nutrition-tracker/commit/6f531d5); [commit `7d79c71` — precondição do disclosure de água](https://github.com/magnoClovis/nutrition-tracker/commit/7d79c71); [commit `00a51f3` — correção da sobreposição do contêiner de métricas](https://github.com/magnoClovis/nutrition-tracker/commit/00a51f3); [commit `84a28a7` — nome acessível localizado da exclusão](https://github.com/magnoClovis/nutrition-tracker/commit/84a28a7); [commit `58d8e56` — fixture dos caminhos primário e fallback da exportação web](https://github.com/magnoClovis/nutrition-tracker/commit/58d8e56); [commit `cc9cbe5` — instrumentação isolada temporária](https://github.com/magnoClovis/nutrition-tracker/commit/cc9cbe5); [commit `9e2950f` — remoção integral da instrumentação](https://github.com/magnoClovis/nutrition-tracker/commit/9e2950f); [commit `51fe5fd` — navegação responsiva da aba Alimentos no smoke](https://github.com/magnoClovis/nutrition-tracker/commit/51fe5fd); [commit `8e3738c` — reconciliação com a correção externa do incidente C14-B2](https://github.com/magnoClovis/nutrition-tracker/commit/8e3738c); [run autenticado `33457347380` — diagnóstico do gesto de fechamento](https://github.com/magnoClovis/nutrition-tracker/actions/runs/33457347380); [run autenticado `33460811991` — diagnóstico da precondição do disclosure de água](https://github.com/magnoClovis/nutrition-tracker/actions/runs/33460811991); [run autenticado `33461785140` — diagnóstico da sobreposição do contêiner de métricas](https://github.com/magnoClovis/nutrition-tracker/actions/runs/33461785140); [run autenticado `33478313769` — diagnóstico do nome acessível do botão de exclusão](https://github.com/magnoClovis/nutrition-tracker/actions/runs/33478313769); [run autenticado `33483115991` — diagnóstico da fixture do caminho primário de exportação](https://github.com/magnoClovis/nutrition-tracker/actions/runs/33483115991); [run autenticado `33488032008` — raio responsivo e queda de sessão no ciclo ES desktop](https://github.com/magnoClovis/nutrition-tracker/actions/runs/33488032008); [run autenticado `33497924576` — legado verde, recorrência no reload PT/EN/ES do Vite mobile e timeout global](https://github.com/magnoClovis/nutrition-tracker/actions/runs/33497924576); [run isolado `33502189291` — três repetições Vite mobile sem reprodução do travamento](https://github.com/magnoClovis/nutrition-tracker/actions/runs/33502189291); [run canônico `33504751303`, attempt 2 — navegação fora do viewport no Vite desktop](https://github.com/magnoClovis/nutrition-tracker/actions/runs/33504751303/attempts/2).

## D1 - Shell desktop, cabeçalho e navegação em largura total

**Data (se determinável):** 10/09/2026.

**Propósito:** eliminar a sobreposição histórica entre a navegação principal e o conteúdo do cabeçalho em telas web largas. O layout anterior puxava a barra Diário/Alimentos/Semana/Métricas `42px` para cima no breakpoint desktop; dependendo da aba, essa mesma faixa já continha peso/IMC ou indicadores compactos de proteína e calorias. A D1 também materializa a escolha visual aprovada de usar toda a largura útil do shell, em vez da alternativa compacta alinhada à direita.

**Recursos:**

- React 18 e o componente apresentacional UMD/ESM compartilhado do cabeçalho.
- CSS responsivo One UI 8/Glass UI no breakpoint desktop de `1024px`.
- Node Test para contratos estruturais UMD/ESM e proteção do CSS.
- Playwright para medição de `getBoundingClientRect`, viewport, overflow e estilos computados.
- Build Vite e carregador legado comparados pela matriz de cutover.

**Arquivos:**

- `app-header-navigation.js`
- `one-ui.css`
- `tests/unit/app-header-navigation.test.js`
- `tests/unit/desktop-shell-layout.test.js`
- `tests/smoke/desktop-shell.visual.spec.js`
- `CHANGELOG_DESIGN.md`
- `documentation/estado-atual/CHANGELOG_DESIGN.md`
- `documentation/estado-atual/RESUMO-STATUS.md`
- `documentation/historico/2026-08-31-ui-campos-customizados.md`

**O que foi feito:**

- A margem negativa `margin-top: -42px`, causa direta da colisão, foi removida do contrato desktop. A navegação agora começa com margem positiva de `14px`, depois do conteúdo anterior no fluxo.
- A barra passou a usar `width: 100%`, `max-width: 1080px`, `box-sizing: border-box` e `align-self: stretch`, acompanhando a largura útil já usada pelo cabeçalho e pelo conteúdo principal.
- Os dois hosts históricos da navegação foram identificados por `data-app-nav-placement`: `standalone` no Diário e `header` nas demais abas. O host standalone usa `min(1080px, calc(100% - 64px))` e margens automáticas, alinhando suas bordas às do status em 1280, 1440 e 1920px sem deslocar a navegação móvel fixa.
- Nenhum conteúdo, callback, estado, idioma, regra de navegação ou layout interno das telas foi alterado. Em particular, os cards de macros do Diário permanecem reservados para a D2; a D1 não tentou corrigir esse problema adjacente no mesmo PR.
- O contrato unitário verifica a classificação dos dois hosts e protege largura, alinhamento, margem positiva e ausência de margem negativa. O smoke autenticado percorre as quatro abas em 1280/1440/1920, claro/escuro, mede status, navegação e botão de peso/IMC, reprova qualquer interseção e exige alinhamento lateral e ausência de overflow horizontal.
- O teste focado unitário passou em 9/9. A comparação determinística focada de Diário, Alimentos, Semana e Métricas em claro/escuro passou em 8/8, com DOM, estilos e pixels equivalentes entre legado e Vite.
- O gate local passou com preflight limpo, 1.275 testes unitários sem skip, 40 smokes legado e 40 Vite; os 63 skips de cada runtime são exclusivamente os testes autenticados esperados quando as credenciais locais não estão configuradas. A matriz completa de cutover passou 60/60 sem skip em PT/EN/ES, desktop/mobile e claro/escuro.
- A primeira tentativa do cutover completo não chegou a executar porque os servidores da comparação focada permaneceram órfãos nas portas 8775/8776 no Windows. Os processos foram confirmados como `tests/smoke/serve-static.js` iniciados pela própria D1, encerrados de forma direcionada, e a repetição integral passou 60/60; não houve alteração de infraestrutura nem uso de `force: true`.
- O primeiro CI autenticado do PR (`34457136315`) executou 93 smokes, manteve apenas os 8 skips canônicos, mas reprovou os dois projetos Playwright no novo contrato geométrico. O artifact mostrou que, ao sair do Diário para Alimentos em 1280px, o status estava centralizado entre `left: 100px` e `right: 1180px`, enquanto a navegação interna preservava 1080px de largura ancorados em `left: 0`; portanto, não havia mais sobreposição, mas a escolha aprovada de largura total do shell ainda não estava realmente alinhada.
- A correção adicional foi restrita ao mesmo contrato desktop: `margin-left/right: auto` passou da regra exclusiva do host standalone para a regra base de `[data-app-nav]`. Assim, tanto o Diário quanto Alimentos/Semana/Métricas centralizam a barra de 1080px no shell, sem alterar dimensões, callbacks ou o breakpoint móvel. O teste unitário foi reforçado para exigir a centralização na regra compartilhada.

**PRs/commits relacionados:** [PR #187](https://github.com/magnoClovis/nutrition-tracker/pull/187), mesclado em `3ccb852`; commits [`80f9056`](https://github.com/magnoClovis/nutrition-tracker/commit/80f9056), [`72fca87`](https://github.com/magnoClovis/nutrition-tracker/commit/72fca87) e [`09ce928`](https://github.com/magnoClovis/nutrition-tracker/commit/09ce928); [run autenticado `34457136315` — diagnóstico do desalinhamento do host interno](https://github.com/magnoClovis/nutrition-tracker/actions/runs/34457136315); [run autenticado final `34464670583`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/34464670583), verde em legado/Vite, desktop/mobile e claro/escuro.

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
- O fatiamento aprovado foi S1–S9. Todas as fatias foram implementadas, validadas em CI autenticado e mescladas; o fechamento integral ocorreu com o merge da S7b no PR #150 em 10/09/2026.

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

## Câmera embutida — protótipo visual C1

**Data de conclusão:** não determinada.

**Tempo decorrido:** não aplicável; C1 foi um protótipo externo sem commit ou merge próprio que permita medir o intervalo exigido.

**Minutos de CI:** não aplicável; C1 não alterou código versionado e não abriu PR.

**Propósito:** validar, antes de qualquer integração nativa, uma câmera para reconhecimento de refeição que ocupe uma seção dedicada da tela em vez de cobrir o Trofia inteiro. O protótipo precisava demonstrar que o restante da interface continuaria reconhecível, que abrir/capturar não produziria mudanças abruptas e que estados de permissão e movimento reduzido teriam tratamento explícito.

**Recursos:**

- Protótipo interativo em HTML, CSS e JavaScript apresentado fora do código de produção.
- Linguagem One UI 8/Glass UI já aprovada no Trofia.
- Temas claro e escuro, layouts desktop e mobile e media query `prefers-reduced-motion`.
- Área visual simulada de câmera; nenhuma API de câmera, foto real ou permissão Android foi acionada pelo protótipo.

**Arquivos:** nenhum arquivo do protótipo C1 foi versionado no repositório. A prova visual permaneceu externa ao app e não alterou runtime, Android ou fluxo de reconhecimento por foto.

**O que se planeja fazer:** construir, antes de qualquer código real, um protótipo interativo que mostrasse a câmera como seção dedicada do fluxo de foto nos estados fechado, abrindo, ativo, capturado e permissão negada. O desenho aprovado deveria contemplar desktop/mobile, claro/escuro, expansão na abertura, contração na captura e alternativa sem animação para `prefers-reduced-motion`, sem assumir que a superfície nativa aceitaria o mesmo acabamento do HTML.

**O que foi feito:**

- Foram apresentados os estados fechado, abrindo, câmera ativa, capturado e permissão negada, nos temas claro e escuro e em dimensões desktop/mobile.
- A abertura expande a área dedicada até o enquadramento ativo; após a captura, a mesma área contrai e preserva a fotografia no espaço reservado, sem substituir a tela inteira.
- A variante mobile recebeu uma correção específica para que a contração não causasse salto ou recorte inadequado do conteúdo.
- Em `prefers-reduced-motion: reduce`, a troca de estado permanece funcional, mas a pulsação/interpolação visual é removida.
- O responsável revisou o arquivo interativo, confirmou a animação em movimento e aprovou definitivamente a direção antes da C2.

**Alinhamento:** 100%. Todos os estados, temas, larguras e variantes de movimento aprovados foram apresentados antes da prova técnica; como era uma etapa exclusivamente visual, não houve desvio de escopo nem impacto sobre o runtime. O impacto final foi positivo para o projeto porque isolou decisões de aparência antes de assumir dependências Android.

**PRs/commits relacionados:** não há PR ou commit; C1 foi exclusivamente uma etapa de prototipação e aprovação visual.

## Câmera embutida — prova técnica Android C2

**Data de conclusão:** 10/09/2026.

**Tempo decorrido:** 9 h 24 min 54 s, do primeiro commit da fatia (`1cd1d18`, 10/09/2026 às 03:31:24 UTC) ao merge (`a20a492`, 10/09/2026 às 12:56:18 UTC).

**Minutos de CI:** 37 min 53 s no total — leve: 35 s (`Documentation preflight`, run `34473574053`); pesado: 37 min 18 s (`CI`, run `34473574033`).

**Propósito:** comprovar que o app Capacitor Android pode hospedar uma vista nativa de câmera limitada a um retângulo medido da interface, sem abrir o picker de câmera em tela cheia e sem antecipar a integração visual/funcional da C3. A prova também precisava preservar integralmente o fluxo atual enquanto o risco técnico de geometria, compatibilidade do plugin e compilação Android era isolado.

**Recursos:**

- Capacitor 8.4.2 e `@capacitor-community/camera-preview` 8.0.1.
- API nativa Android do plugin Camera Preview, configurada com câmera traseira e limites `x`, `y`, `width` e `height` em DIP.
- React/Vite apenas como composição do runtime; o fluxo visual de reconhecimento existente não foi substituído.
- Node.js Test Runner, Vite, Capacitor CLI, Gradle, Android SDK e JDK 21 do Android Studio.
- Playwright para regressão completa dos runtimes legado/Vite e da matriz PT/EN/ES, desktop/mobile e claro/escuro.

**Arquivos:**

- `package.json`
- `package-lock.json`
- `android/capacitor.settings.gradle`
- `android/app/capacitor.build.gradle`
- `src/App.jsx`
- `src/composite/embedded-camera-preview.js`
- `src/composite/embedded-camera-preview-runtime.js`
- `tests/unit/embedded-camera-preview.test.js`

**O que se planeja fazer:** instalar e isolar o Camera Preview compatível com Capacitor 8, medir uma superfície DOM em coordenadas aceitas pelo Android, provar abertura/captura/parada e compilar o projeto nativo sem substituir ainda o callback de produção. A validação deveria separar o risco geométrico e de plugin da futura composição visual, conservar o fallback web e não publicar APK/AAB.

**O que foi feito:**

- O plugin Camera Preview foi fixado em 8.0.1, cuja dependência de `@capacitor/core >= 8.0.2` é compatível com a versão 8.4.2 do Trofia, e sincronizado como módulo Gradle do Android.
- Foi criado um serviço isolado, disponível somente no runtime Capacitor Android, sem trocar o callback `captureFromCamera` atual e sem alterar a tela de reconhecimento; a integração com os estados e transições aprovados permanece responsabilidade da C3.
- `measureEmbeddedPreview` converte o `getBoundingClientRect()` da superfície dedicada em inteiros compatíveis com DIP e rejeita elementos ausentes, medidas não finitas ou áreas menores que 48 × 48.
- `start()` exige Android nativo, impede sessões duplicadas e inicia a câmera traseira com `toBack: false`, `storeToFile: false`, zoom habilitado e o retângulo explícito. Nesta prova, a vista nativa fica acima do WebView somente dentro dos limites informados, evitando tornar todo o fundo do app transparente.
- `capture()` exige sessão ativa, solicita JPEG de até 1280 × 1280 com qualidade máxima para posterior pré-processamento pelo contrato C24 existente e rejeita retorno nativo vazio. `stop()` é idempotente quando a câmera já está inativa e sempre restaura o estado interno mesmo se o plugin falhar ao encerrar.
- Seis testes focados cobrem medição, opções nativas exatas, captura, parada, plataforma web, geometria inválida, duplicidade e normalização de falhas, sem skips.
- O build Vite foi verificado, `npx cap sync android` reconheceu os sete plugins e `gradlew assembleDebug` terminou com `BUILD SUCCESSFUL` usando Android SDK local e JDK 21. O APK gerado foi somente artefato local de debug e não foi publicado.
- O gate local passou com 1270/1270 testes unitários, smoke legado/Vite sem falhas funcionais e cutover 60/60. Os smokes locais omitiram 61 cenários autenticados por runtime por ausência deliberada de credenciais locais; esses cenários permanecem obrigatórios no CI autenticado do PR.
- Uma primeira execução do cutover foi interrompida em 44/60 por `ERR_CONNECTION_REFUSED`. A investigação comprovou que a worktree `.codex-diary-menu-b` iniciou simultaneamente servidores nas mesmas portas fixas 8775/8776. Nenhuma correção de app/teste foi feita na C2; após a suíte concorrente terminar, a repetição isolada passou 60/60.
- A validação física foi concluída em um Galaxy S25 Ultra SM-S938B (Android, 1440 × 3120 px físicos, densidade 600) conectado por USB. Como a C2 não expõe ainda um gatilho de produção, foi usado um harness visual temporário somente no build debug; ele não foi versionado.
- Para preservar integralmente a instalação real versionCode 12 e seus dados, a tentativa de substituição foi abandonada diante dos bloqueios Android `INSTALL_FAILED_VERSION_DOWNGRADE` e `INSTALL_FAILED_UPDATE_INCOMPATIBLE`. O harness foi instalado como pacote paralelo temporário `com.hermegas.trofia.c2proof`, com assinatura debug, e removido ao fim da prova.
- Com a permissão inicialmente revogada, tocar em abrir apresentou o pedido nativo real de câmera do Android; a opção de uso em primeiro plano foi concedida e `dumpsys package` confirmou `android.permission.CAMERA: granted=true`.
- O preview traseiro abriu dentro do retângulo DOM medido de `348 × 420` CSS px, na origem `18,113`, sem ocupar a tela inteira. Título, status e botões externos permaneceram visíveis e acionáveis; a imagem nativa não vazou para fora dos limites retangulares informados.
- A captura física retornou JPEG Base64 não vazio com 690.208 caracteres, a fotografia foi renderizada de volta no espaço dedicado e o serviço executou `stop()`. O log de câmera registrou `DISCONNECT device 0` para o pacote da prova, confirmando a liberação da sessão nativa.
- A prova confirmou o risco visual que fica deliberadamente para C3: com `toBack: false`, a superfície nativa respeita o retângulo, mas se sobrepõe ao acabamento WebView e portanto não herda automaticamente cantos arredondados/borda CSS. A integração deverá desenhar o enquadramento de forma compatível com essa limitação, sem confundir a comprovação geométrica da C2 com o polimento visual da C3.

**Alinhamento:** 100%. A fatia entregou exatamente a prova técnica isolada, compilação, testes e validação física aprovados, mantendo a integração visual fora do escopo. O bloqueio de instalação sobre o pacote oficial levou ao uso seguro de um pacote paralelo temporário, sem alterar o objetivo nem a aplicação distribuída; o impacto foi positivo por preservar dados do usuário e ainda produzir evidência física equivalente para a geometria nativa.

**PRs/commits relacionados:**

- [PR #185 — Android: prova técnica da câmera embutida (C2)](https://github.com/magnoClovis/nutrition-tracker/pull/185), mesclado na `main`.
- [Commit `1cd1d18` — serviço e integração técnica Android](https://github.com/magnoClovis/nutrition-tracker/commit/1cd1d1847f313b683a553ea2a0c8f2c5286ab7e4).

## Câmera embutida — integração visual e funcional C3

**Data de conclusão:** 12/09/2026.

**Tempo decorrido:** 1 h 32 min 37 s, do primeiro commit da fatia (`02805cd`, 12/09/2026 às 10:33:57 UTC) ao merge (`c6a4e4f`, 12/09/2026 às 12:06:34 UTC).

**Minutos de CI:** 28 min 28 s no total — leve: 26 s (`Documentation preflight`, run `34688905498`); pesado: 28 min 02 s (`CI`, run `34688905479`).

**Propósito:** substituir, no Android, a abertura de câmera em tela cheia do fluxo C24 por uma captura realmente embutida na tela de reconhecimento de refeição, sem perder o pré-processamento seguro já existente. A integração precisava reproduzir o protótipo aprovado — área expansível, preview limitado ao card, moldura Glass UI arredondada, controles sobre a imagem e contração após capturar — e resolver a limitação técnica observada na C2, em que `toBack: false` colocava a superfície nativa acima de qualquer acabamento HTML.

**Recursos:**

- Capacitor 8.4.2 e `@capacitor-community/camera-preview` 8.0.1.
- React e máquina de estados controlada do reconhecimento por foto.
- WebView Android transparente de forma condicionada e Camera Preview traseiro com `toBack: true`.
- Pipeline C24 já existente para decodificação, correção de orientação, redesenho em JPEG, remoção de metadados, redução para até 1280 px e limite de 1,5 MB.
- CSS One UI 8/Glass UI, tokens de tema claro/escuro, `clip-path`, máscaras radiais de canto, `backdrop-filter` e `prefers-reduced-motion`.
- Node.js Test Runner, Vite, Playwright e Galaxy S25 Ultra físico para a prova curta da composição nativa.

**Arquivos:**

- `src/composite/embedded-camera-preview.js`
- `src/App.jsx`
- `image-meal-flow.js`
- `image-meal-screen.js`
- `nutrition-tracker-controller.js`
- `one-ui.css`
- `tests/unit/embedded-camera-preview.test.js`
- `tests/unit/embedded-camera-integration.test.js`
- `tests/unit/image-meal-flow.test.js`
- `tests/unit/image-meal-screen.test.js`
- `documentation/historico/2026-08-31-ui-campos-customizados.md`
- `documentation/estado-atual/RESUMO-STATUS.md`

**O que se planeja fazer:** conectar a prova C2 ao fluxo real C24 usando `toBack:true`, transparência localizada da WebView, card arredondado com controles HTML acima do preview, estados explícitos de abertura/atividade/captura, contração após a foto e fallback intacto fora do Android. A viabilidade da moldura sobre a superfície nativa deveria ser comprovada fisicamente antes da implementação definitiva.

**O que foi feito:**

- Antes da integração, foi executado um harness temporário e não versionado no Galaxy S25 Ultra, sob o pacote paralelo `com.hermegas.trofia.c3proof`, para validar especificamente `toBack: true` sem tocar na instalação real do Trofia. O preview traseiro ficou restrito a `348 × 420` CSS px na origem `18,162`; a área local do WebView tornou-se transparente, enquanto o restante da tela permaneceu protegido.
- A prova física confirmou os três critérios condicionantes: imagem nativa visível somente no viewport; indicador “Câmera ativa”, foco, Cancelar e captura HTML clicáveis acima dela; e moldura arredondada sem vazamento nos cantos ou fora do retângulo. Cancelar gerou `CANCEL_OK` e desconexão da câmera; a captura gerou `CAPTURE_OK`, JPEG Base64 não vazio com 112.300 caracteres e desconexão. O pacote, arquivos e capturas temporários foram removidos após a prova.
- O serviço C2 passou a iniciar a superfície com `toBack: true`. A câmera continua recebendo somente `x`, `y`, `width` e `height` medidos do elemento real, portanto não produz pixels fora do card mesmo quando a cadeia do WebView fica transparente durante a sessão.
- A máquina de estados ganhou `camera-opening`, `camera-active` e `camera-capturing`. Em Android nativo, “Tirar foto” abre o viewport dentro da própria tela; em web ou plataforma não compatível, o callback anterior continua acionando o seletor/captura do navegador, preservando o fallback.
- O resultado Base64 do preview é convertido em `Blob` JPEG e entregue a `preprocessMealImage`; nenhuma segunda implementação de tratamento de imagem foi criada. Orientação, descarte de metadados, dimensões, compressão, URL transitória, descarte e payload da análise continuam sob o contrato C24.
- A interface usa botões HTML semânticos para Cancelar e Capturar, `role=status` com `aria-live=polite` para abertura/atividade/captura e rótulos localizados em PT/EN/ES. Falta de permissão reutiliza o erro específico existente; indisponibilidade de abertura recebe mensagem própria com recuperação pela galeria.
- Quatro máscaras radiais HTML cobrem os cantos do retângulo nativo e mantêm raio de 26 px no desktop e 24 px no mobile. Indicador, quadro de foco e barra de ações permanecem acima da câmera com contraste independente do tema; cores externas vêm dos tokens ativos do Trofia.
- A abertura usa expansão por `clip-path`; ao capturar, o mesmo card contrai antes de mostrar a foto processada. Em `prefers-reduced-motion: reduce`, as animações são eliminadas sem remover estados ou ações.
- O encerramento é acionado ao cancelar, fechar/desmontar a tela, descartar ou concluir a captura. Foi coberta também a corrida em que o usuário cancela antes de `CameraPreview.start()` terminar: o serviço tenta parar imediatamente e repete a limpeza após o `start` atrasado, impedindo uma sessão nativa órfã.
- Os testes focados terminaram com 107/107 casos e nenhum skip. O gate local completo passou com preflight limpo, 1.328/1.328 testes unitários sem skip, smokes legado e Vite sem falhas no perfil local e cutover 60/60 sem skip em PT/EN/ES, desktop/mobile e claro/escuro. Os 63 skips por runtime nos smokes locais são exclusivamente os testes autenticados já documentados, ausentes por falta deliberada de credenciais locais; o CI autenticado do PR permanece o gate externo obrigatório.
- O PR passou pelo CI autenticado, foi retirado do modo draft por autorização explícita e mesclado na `main`. Nenhum APK/AAB foi publicado.

**Alinhamento:** 100%. A composição final reproduziu o protótipo aprovado e resolveu a limitação `toBack:false` descoberta na C2 por meio de `toBack:true`, transparência localizada e máscaras HTML, sem duplicar o pipeline de imagem nem ampliar funções fotográficas. A adaptação técnica foi parte prevista da prova condicionante e teve impacto positivo ao manter controles acessíveis e o acabamento Glass UI sobre a câmera real.

**PRs/commits relacionados:**

- [PR #190 — Android: integrar câmera embutida no reconhecimento (C3)](https://github.com/magnoClovis/nutrition-tracker/pull/190), mesclado na `main`.
- [Commit `02805cd` — integração visual e funcional da câmera embutida](https://github.com/magnoClovis/nutrition-tracker/commit/02805cd).
- [Merge `c6a4e4f` — incorporação do PR #190 na `main`](https://github.com/magnoClovis/nutrition-tracker/commit/c6a4e4f9aaccf768d1fbd85f25ed9bb49a4bb72f).

## Câmera embutida — robustez nativa e ciclo de vida C4a

**Data de conclusão:** 12/09/2026.

**Tempo decorrido:** 1 h 01 min 30 s, do primeiro commit da fatia (`ad84f4f`, 12/09/2026 às 14:06:14 UTC) ao merge (`e6f8bef`, 12/09/2026 às 15:07:44 UTC).

**Minutos de CI:** 30 min 43 s no total — leve: 23 s (`Documentation preflight`, run `34699425320`); pesado: 30 min 20 s (`CI`, run `34699425213`).

**Propósito:** tornar a câmera embutida da C3 resiliente aos eventos e falhas reais do Android sem ampliar seu conjunto de funções. A subfatia precisava impedir sessões nativas órfãs quando o usuário cancela, usa Voltar, envia o app ao background ou abandona uma operação ainda pendente; limitar esperas indefinidas do plugin; estabilizar a geometria entre WebView e superfície nativa; e tratar permissão, captura vazia e indisponibilidade de maneira previsível. Zoom, troca de câmera, flash, gestos e edição fotográfica permaneceram explicitamente fora do escopo.

**Recursos:**

- Capacitor 8.4.2, `@capacitor-community/camera-preview` 8.0.1, `@capacitor/app` 8.1.1 e `@capacitor/camera` 8.2.1.
- Eventos Android `appStateChange` e `backButton`, Camera Preview traseiro com `toBack:true` e API de permissão real do Capacitor Camera.
- React e máquina de estados do fluxo C24 para coordenar abertura, captura, interrupção, descarte e recuperação.
- CSS One UI 8/Glass UI para congelamento temporário de scroll/overscroll somente durante a sessão nativa.
- Node.js Test Runner, Vite, Playwright, Capacitor CLI, Gradle, Android SDK, JDK 21 e inspeção ADB com `dumpsys media.camera`/`dumpsys window`.
- Galaxy S25 Ultra SM-S938B físico, conectado por USB, para validação de permissão, geometria, orientação, captura e ciclo de vida reais.

**Arquivos:**

- `src/composite/embedded-camera-preview.js`
- `src/composite/embedded-camera-preview-runtime.js`
- `src/composite/android-app-runtime.js`
- `src/composite/android-back-navigation.js`
- `src/App.jsx`
- `image-meal-flow.js`
- `nutrition-tracker-controller.js`
- `one-ui.css`
- `tests/unit/embedded-camera-preview.test.js`
- `tests/unit/embedded-camera-integration.test.js`
- `tests/unit/image-meal-flow.test.js`
- `tests/unit/android-app-runtime.test.js`
- `tests/unit/android-back-navigation.test.js`
- `tests/unit/nutrition-tracker-controller.test.js`
- `documentation/historico/2026-08-31-ui-campos-customizados.md`
- `documentation/estado-atual/RESUMO-STATUS.md`

**O que se planeja fazer:** endurecer exclusivamente a operação nativa já aprovada contra permissão negada, timeouts, falhas de parada, resultados assíncronos tardios, background, Voltar e mudança de orientação; comprovar repetição, captura e liberação da câmera no Galaxy; e manter zoom, flash, troca de câmera, gestos e edição explicitamente fora do escopo.

**O que foi feito:**

- O runtime da câmera passou a receber o plugin Capacitor Camera exclusivamente para consultar e solicitar `CAMERA`; estados `granted`/`limited` permitem a abertura, `prompt` aciona a solicitação nativa e negativa explícita retorna `camera-permission-denied` antes de iniciar o preview.
- `start`, `capture` e cada tentativa de `stop` receberam limite de 12 segundos. A parada nativa tenta novamente uma única vez após falha transitória e sempre devolve o serviço ao estado `idle`, evitando bloqueio permanente da interface.
- A janela assíncrona de abertura foi fechada em dois caminhos: cancelamento enquanto `start()` está pendente e resolução do plugin depois de um timeout. Em ambos, uma limpeza tardia adicional impede que a superfície nativa reapareça após a UI já ter abandonado a câmera.
- Uma captura que termina depois de cancelamento é rejeitada como `preview-capture-cancelled` e não pode restaurar a fase ativa. Retorno nativo sem Base64 é classificado como foto inválida; falhas/timeouts de abertura, captura ou encerramento reutilizam a recuperação existente de câmera indisponível, mantendo a galeria acessível.
- O Camera Preview passou a usar `lockAndroidOrientation:true` para impedir que uma rotação invalide as coordenadas DOM já enviadas à superfície nativa. `enableZoom:false` registra tecnicamente o escopo aprovado de captura simples, sem introduzir gesto ou recurso novo.
- O runtime Android ganhou inscrição removível em `appStateChange`. Ao perder o foreground, o controlador interrompe apenas uma câmera embutida ativa, preservando a fotografia anterior quando existente. A limpeza também ocorre no teardown do listener.
- O resolvedor central de Voltar recebeu `imageMealCameraActive` no nível das superfícies do fluxo de adição. O primeiro Voltar cancela a câmera e permanece na tela; só um Voltar posterior continua a hierarquia normal de navegação.
- Enquanto `[data-camera-native-active="true"]` existe, o `body` bloqueia scroll e overscroll, estabilizando o retângulo passado ao Android sem alterar a rolagem normal antes/depois da sessão.
- A prova física usou um APK debug temporário e isolado no pacote `com.hermegas.trofia.c4proof`, construído com os serviços reais da branch. O pacote não substituiu a instalação oficial, não foi publicado e foi desinstalado ao fim; os fontes temporários do harness não foram versionados.
- No Galaxy, o Android apresentou a permissão real (interface do sistema em espanhol) e a concessão “durante o uso” abriu a câmera traseira como cliente `com.hermegas.trofia.c4proof`. O preview permaneceu confinado ao card arredondado, com indicador e botões HTML visíveis/clicáveis sobre a imagem.
- Uma solicitação temporária de rotação para 90° manteve a Activity e o viewport em `ROTATION_0`/`portrait-primary`; as configurações originais de autorrotação foram restauradas imediatamente depois.
- Home liberou o cliente da câmera antes do retorno; Voltar produziu `BACK_STOPPED`, manteve a Activity aberta e removeu o cliente nativo. Três ciclos consecutivos abrir/cancelar tiveram câmera ativa ao abrir e liberação confirmada após cada cancelamento.
- A captura física retornou JPEG Base64 não vazio com 664.996 caracteres, exibiu a fotografia no espaço dedicado, retornou a fase a `idle` e deixou `dumpsys media.camera` sem cliente do pacote. A negativa real de permissão retornou `START_ERROR camera-permission-denied` sem abrir ou prender a câmera.
- Depois da prova, o bundle Vite de produção foi restaurado no projeto Android, `npx cap sync android` reconheceu os sete plugins e `gradlew assembleDebug` concluiu com `BUILD SUCCESSFUL` usando o JDK 21 do Android Studio.
- O gate focado final passou com 105/105 casos sem skip, cobrindo permissões, timeouts, segunda limpeza tardia, retry de parada, captura após cancelamento, background, Voltar e integração UMD/ESM. O gate local completo terminou com preflight limpo, 1.337/1.337 unitários sem skip, smokes legado e Vite com 40 aprovações e somente os 63 skips autenticados esperados em cada runtime, e cutover 60/60 sem skip em PT/EN/ES, desktop/mobile e claro/escuro. O CI autenticado `34699425213` passou com todos os cenários reais habilitados; o PR foi mesclado na `main` em 12/09/2026.

**Alinhamento:** 100%. Todos os cenários de robustez aprovados foram implementados e fisicamente verificados sem introduzir qualquer função fotográfica excluída. Os mecanismos adicionais de segunda limpeza tardia e retry único de `stop()` materializaram riscos identificados durante a auditoria, permaneceram dentro do escopo de robustez e tiveram impacto positivo ao reduzir a possibilidade de sessão nativa órfã.

**PRs/commits relacionados:**

- [PR #192 — Android: robustecer ciclo de vida da câmera embutida (C4a)](https://github.com/magnoClovis/nutrition-tracker/pull/192), mesclado na `main`.
- [Commit `ad84f4f` — robustez nativa, ciclo de vida, testes e registro documental](https://github.com/magnoClovis/nutrition-tracker/commit/ad84f4f50ee80230822a93d41a8a0076f773a26e).
- [Merge `e6f8bef` — incorporação do PR #192 na `main`](https://github.com/magnoClovis/nutrition-tracker/commit/e6f8bef74c89d6beb30670e0303bfc8ef6a49013).

## Câmera embutida — acessibilidade e acabamento resiliente C4b

**Data de conclusão:** 12/09/2026.

**Tempo decorrido:** 48 min 33 s, do primeiro commit da fatia (`d6b7066`, 12/09/2026 às 18:01:15 UTC) ao merge (`050182d`, 12/09/2026 às 18:49:48 UTC).

**Minutos de CI:** 30 min 17 s no total — leve: 25 s (`Documentation preflight`, run `34710539830`); pesado: 29 min 52 s (`CI`, run `34710539851`).

**Propósito:** concluir a câmera embutida sem ampliar suas funções fotográficas, cobrindo as garantias que uma superfície nativa costuma oferecer e que precisam ser reconstruídas na composição híbrida WebView/Android. A subfatia deve permitir uso previsível com TalkBack, teclado e fonte ampliada; anunciar mudanças de fase sem duplicidade; manter foco e ações em ordem lógica; oferecer recuperação real após negação de permissão; conservar contraste e alvos de toque nos dois temas; localizar toda a recuperação em PT/EN/ES; e garantir que fotos temporárias não sobrevivam ao descarte, teardown ou resolução assíncrona tardia.

**Recursos:**

- React e máquina de estados controlada do reconhecimento por foto C24.
- Capacitor Android, Camera Preview e a API `openSettings()` já fornecida por `@capacitor-mlkit/barcode-scanning`, reutilizada apenas para abrir os detalhes do aplicativo no sistema.
- Semântica web nativa (`button`, foco programático, `role=status`, `aria-live=polite`, `aria-atomic=true` e `role=alert`) exposta pelo WebView ao serviço de acessibilidade Android.
- CSS One UI 8/Glass UI com tokens de tema, foco persistente, contraste reforçado, layout flexível e alvos mínimos de 48 px.
- Node.js Test Runner, Vite, Playwright, Capacitor CLI, Gradle, Android SDK, JDK 21, Chrome DevTools Protocol e inspeção ADB de acessibilidade/câmera.
- Galaxy S25 Ultra SM-S938B físico com Samsung TalkBack e escala de fonte Android em 200% para comprovação em aparelho real.

**Arquivos:**

- `src/composite/android-app-runtime.js`
- `src/App.jsx`
- `nutrition-tracker-controller.js`
- `image-meal-screen.js`
- `one-ui.css`
- `tests/unit/android-app-runtime.test.js`
- `tests/unit/embedded-camera-integration.test.js`
- `tests/unit/image-meal-flow.test.js`
- `tests/unit/image-meal-screen.test.js`
- `tests/unit/nutrition-tracker-controller.test.js`
- `documentation/historico/2026-08-31-ui-campos-customizados.md`
- `documentation/estado-atual/RESUMO-STATUS.md`

**O que se planeja fazer:** preservar o desenho C3 aprovado e implementar exclusivamente robustez acessível: foco claramente visível e restaurado em cada transição; anúncios localizados de abertura, câmera pronta e foto capturada; ordem Cancelar/Capturar coerente; recuperação de permissão por Configurações ou galeria; resistência a fonte 200%; contraste e alvos de toque suficientes; e descarte comprovado de blobs/Base64 temporários. Zoom, flash, troca de câmera, gestos e edição fotográfica permanecem fora do escopo.

**O que foi feito:**

- O runtime Android ganhou `canOpenSettings()` e `openSettings()` com comportamento inerte fora do Capacitor Android. A composição reutiliza a implementação nativa já instalada do ML Kit somente para abrir a página real de detalhes/permissões do Trofia, sem introduzir plugin ou permissão novos.
- O controlador registra a fase anterior e move o foco, sem alterar o scroll, para o próximo alvo lógico: Cancelar durante a abertura, Abrir configurações/galeria após negação, Analisar foto após captura e o gatilho da câmera depois de cancelar. A regra de foco usa seletores estáveis e não depende do texto traduzido.
- O contorno de foco da câmera passou a ser explícito e persistente enquanto o elemento está focado: anel interno de 3 px baseado na superfície e anel externo de 6 px azul, perceptíveis por teclado, foco programático e navegação assistiva, sem timer.
- Um único live region oculto anuncia, em PT/EN/ES, abertura, câmera pronta e captura concluída. O indicador visual “Câmera ativa” permanece na tela, mas é ocultado da árvore acessível para impedir fala duplicada; erros de permissão continuam como alerta imediato.
- O estado de permissão negada ganhou título e instrução localizados, botão primário para abrir as configurações reais e recuperação secundária por galeria. A ordem física e semântica mantém Cancelar antes de Capturar durante o preview e Configurações antes das alternativas no erro.
- Os controles da câmera podem quebrar linha e crescer, têm altura mínima de 48 px e mantêm espaçamento mesmo com fonte ampliada. A ação de captura recebeu preenchimento verde mais escuro para preservar contraste de texto branco nos temas claro e escuro; o botão de configurações no modo escuro apresentou contraste calculado de aproximadamente 7,92:1.
- A máquina de fluxo ganhou testes para descartar uma captura pré-processada que resolve depois do teardown e para liberar uma foto retida quando a tela é destruída durante sessão nativa, sem persistir a imagem reconhecida.
- A validação física foi feita com APK debug isolado `com.hermegas.trofia.c4bproof`, composto pelos mesmos screen, CSS e runtimes de produção; nenhum AAB/APK foi publicado e o pacote/harness foram removidos ao fim.
- No Galaxy, TalkBack foi habilitado temporariamente e a árvore Android registrou foco real na ação localizada “Abrir ajustes”. A câmera traseira abriu, capturou JPEG Base64 não vazio, anunciou “Câmera ativa. Pronta para capturar.” e “Foto capturada. Confira a imagem antes de analisar.”, transferiu foco para “Analisar foto” com os dois anéis visíveis e liberou o cliente nativo após capturar.
- Com fonte do sistema em 200%, Cancelar e Capturar empilharam sem corte ou sobreposição e mediram aproximadamente 58,9 px de altura cada; o preview permaneceu confinado ao card. A recuperação PT/EN/ES foi conferida no aparelho, e “Abrir configurações” levou efetivamente a `com.android.settings/.applications.InstalledAppDetails`.
- As preferências temporárias do dispositivo foram restauradas ao final: TalkBack desligado, fonte em 100%, APK paralelo desinstalado, forward ADB removido e nenhuma sessão ativa da câmera mantida.
- O gate focado final passou com 114/114 casos sem skip. O primeiro `npm test` revelou somente dependências locais ausentes do Worker e contagens estruturais desatualizadas após a adição intencional de um efeito/ref; as dependências foram instaladas pelo lockfile e a expectativa foi alinhada de 41/26 para 42/27, sem mudança funcional fora da C4b. A repetição integral terminou com preflight limpo, 1.360/1.360 unitários sem skip, 40 aprovações e apenas os 63 skips autenticados esperados em cada smoke local legado/Vite, e cutover 60/60 sem skip em PT/EN/ES, desktop/mobile e claro/escuro. O CI autenticado pesado `34710539851` e o preflight documental `34710539830` passaram integralmente, sem skip adicional; o PR foi retirado do draft e mesclado na `main`.

**Alinhamento:** 100%: todos os cenários aprovados foram implementados e comprovados por testes locais, CI autenticado e validação física, sem adicionar zoom, flash, troca de câmera, gestos ou edição fotográfica. O impacto final foi positivo: a câmera embutida preserva o desenho C3 e agora oferece recuperação de permissão, foco, anúncios, contraste, alvos e descarte temporário compatíveis com o escopo resiliente aprovado.

**PRs/commits relacionados:**

- [PR #194 — Android: concluir acessibilidade da câmera embutida (C4b)](https://github.com/magnoClovis/nutrition-tracker/pull/194), mesclado na `main`.
- [Commit `d6b7066` — acessibilidade, recuperação, testes e documentação da C4b](https://github.com/magnoClovis/nutrition-tracker/commit/d6b70665b72aee330704c85ff07e515ea91efda4).
- [Merge `050182d` — incorporação do PR #194 na `main`](https://github.com/magnoClovis/nutrition-tracker/commit/050182d8094b22c72f1e79fcc893fd37bd6069c5).
- [CI autenticado `34710539851`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/34710539851) e [preflight documental `34710539830`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/34710539830), ambos concluídos com sucesso.

## Incidente crítico da câmera embutida na build publicada — CAM-INC-1

**Data de conclusão:** 13/09/2026.

**Tempo decorrido:** 3 h 18 min 59 s, do primeiro commit `d10305f` em 13/09/2026 09:44:32 UTC ao merge `13bd540` em 13/09/2026 13:03:31 UTC.

**Minutos de CI:** 121 min 02 s no total — 4 min 54 s de CI leve (`Documentation preflight`) e 116 min 08 s de CI pesado (`CI`). O total inclui todos os seis pares de runs disparados pelo PR: execuções substituídas/canceladas, o diagnóstico vermelho `34753921127` e o gate final verde, sem descartar consumo real intermediário.

**Propósito:** restaurar com urgência a câmera embutida que ficou inutilizável na build distribuída pela Play. No aparelho do usuário, ao selecionar “Foto”, a tela chegava ao estado “Câmera ativa”, mas o preview permanecia preto e as ações Cancelar/Capturar ficavam fora da área alcançável; o modal aparentava estar preso porque a mesma regra que estabilizava a geometria nativa bloqueava a rolagem antes de posicionar o card. Esta primeira fatia preserva deliberadamente o desenho C1–C4 e corrige somente a cadeia de transparência e a ordem entre reposicionamento, medição e bloqueio. O incidente continuará aberto até a CAM-INC-2 comprovar a correção instalada a partir do artefato real da Play Store.

**Recursos:**

- CSS One UI 8/Glass UI, cascade/especificidade de `:has()` e inspeção real com `getComputedStyle` em Chromium.
- React e a máquina de estados da câmera (`camera-opening`, `camera-active`, `camera-capturing`).
- `@capacitor-community/camera-preview` com `toBack:true`, medição DOM em CSS pixels e sincronização por `requestAnimationFrame` antes do início nativo.
- Node.js Test Runner, Playwright, Vite, Capacitor CLI, Gradle/Android SDK e Galaxy físico para a prova do release candidato.

**Arquivos:**

- `one-ui.css`
- `image-meal-screen.js`
- `src/composite/embedded-camera-preview.js`
- `tests/unit/embedded-camera-preview.test.js`
- `tests/unit/embedded-camera-integration.test.js`
- `tests/unit/image-meal-screen.test.js`
- `tests/smoke/embedded-camera-hotfix.visual.spec.js`
- `documentation/historico/2026-08-31-ui-campos-customizados.md`
- `documentation/estado-atual/RESUMO-STATUS.md`

**O que se planeja fazer:** tornar toda a cadeia WebView transparente em claro e escuro enquanto o preview nativo estiver ativo; permitir que o modal role automaticamente até o card completo durante a abertura; medir a superfície somente depois de dois frames de estabilização; travar o scroll apenas após o preview atingir a fase ativa; comprovar a cascade por `getComputedStyle` e a presença das ações no viewport em desktop/mobile, legado/Vite; executar o gate completo, gerar um release candidato e validar preview, captura e saída no Galaxy sem adicionar flash, X dedicado ou qualquer elemento do redesenho futuro.

**O que foi feito:** a investigação confirmou que o plugin estava incluído no Android e que o estado “Câmera ativa” provava a resolução do runtime nativo; a ausência de imagem no tema escuro vinha da regra `body:has([data-one-ui-root][data-theme="dark"])`, mais específica que a transparência da câmera, enquanto as ações inacessíveis vinham do bloqueio de `overflow` aplicado ainda em `camera-opening`. O hotfix elevou explicitamente a especificidade da transparência escura, separou “câmera visível” de “geometria travada” e passou a rolar o card completo para dentro do viewport antes de medir a superfície nativa. O serviço aguarda dois frames após o scroll, marca a geometria como pronta, espera a aplicação do lock e só então envia `x`, `y`, `width` e `height` ao plugin, eliminando a janela em que usuário e preview poderiam divergir. Testes unitários cobrem o delta de scroll, a ordem de medição e os novos estados; um teste Playwright usa `getComputedStyle` real para comprovar fundo transparente e controles no viewport em claro/escuro, desktop/mobile, legado/Vite. O gate local passou com preflight limpo, 1.362/1.362 unitários sem skip, smokes legado/Vite sem falhas e somente os skips autenticados esperados pela ausência de credenciais locais, e cutover 60/60 sem skip. O CI autenticado final `34757379713` passou com 1.362 unitários e 107/107 Playwright, zero skip; o preflight documental final `34757379696` também ficou verde.

A prova física foi executada no Galaxy SM-S938B com um pacote `release` isolado `com.hermegas.trofia.hotfixproof`, construído com o mesmo bundle web corrigido, a mesma configuração Capacitor e o mesmo plugin nativo do candidato CAM-INC-1. O AAB upload-signed real também foi gerado (`SHA-256 AD7D9FA1F7B4C7B3983C5ED2EA87C0E2FDD368C6CBC80143A8296114325F28DB`), mas seu APK local não podia substituir de modo não destrutivo o app oficial versionCode 13: a assinatura local é a chave de upload, enquanto o APK instalado pela Play usa a chave de app-signing da Play. Para não desinstalar o app oficial nem apagar seus dados, a prova pré-Play recebeu apenas um `applicationIdSuffix` temporário e um harness estático; ambos ficaram fora do Git e foram removidos depois do teste. No aparelho, o preview traseiro real apareceu localizado dentro do card arredondado, sem vazamento sobre o restante da WebView, com “Câmera ativa”, “Cancelar” e “Capturar foto” visíveis e alcançáveis nos temas escuro e claro. A captura retornou `CAPTURA OK` com 1.157.148 caracteres Base64, e o caminho Cancelar retornou “Câmera encerrada”, comprovando abertura, captura e liberação funcional. O primeiro harness de prova continha por engano um fundo adicional em `[data-image-meal-screen]`, ausente no app real, e produziu uma falsa oclusão; essa diferença foi removida somente do harness, sem alterar o hotfix, antes de repetir a prova válida. O pacote temporário foi desinstalado, o app oficial permaneceu intacto em `0.11.0-beta`/versionCode 13 e todas as configurações modificadas no Galaxy foram restauradas. A limitação entre chave de upload e chave de distribuição reforça por que esta evidência fecha apenas CAM-INC-1: o incidente continuará aberto até CAM-INC-2 publicar o AAB no canal interno e repetir a validação a partir do APK assinado e instalado pela própria Play Store.

O primeiro CI disparado depois do registro físico (`34753921127`) executou 106 testes Playwright Vite com zero skips e falhou exclusivamente na asserção histórica de altura do `ChoiceField`: o alvo CSS continuava sendo 48 px, mas `getBoundingClientRect()` devolveu `47.99998474121094` px por arredondamento subpixel do Chromium. A mesma asserção havia passado no SHA anterior e não havia alteração do componente. Com aprovação explícita, o teste passou a declarar separadamente o alvo de 48 px e uma tolerância máxima de 0,5 px somente na comparação geométrica; nenhum CSS ou código do app foi alterado. O gate local completo posterior passou com 1.362 unitários, 44 smokes públicos e 63 skips autenticados esperados em cada runtime, além de cutover 60/60. O CI autenticado final exerceu a asserção corrigida e passou com todos os 107 Playwright, confirmando que a tolerância cobre somente a representação subpixel observada.

**Alinhamento:** 100%. O hotfix entregue permaneceu estritamente dentro do escopo aprovado: transparência, ordenação de scroll/medição/lock, cobertura computada e prova física em release candidato, sem introduzir flash, X dedicado ou redesenho. A adaptação não destrutiva do identificador do pacote foi restrita ao harness de prova por causa da separação obrigatória entre chave de upload e chave de app-signing da Play; o impacto foi positivo, pois preservou o app oficial e os dados do aparelho sem reduzir a exigência posterior de validação do artefato distribuído em CAM-INC-2.

**PRs/commits relacionados:**

- [PR #196 — Hotfix: restaurar câmera embutida na build publicada (CAM-INC-1)](https://github.com/magnoClovis/nutrition-tracker/pull/196), mesclado na `main`.
- [Commit `d10305f` — correção da transparência e geometria](https://github.com/magnoClovis/nutrition-tracker/commit/d10305f53fbe4c5cefca022ab008f59705667301).
- [Commit `879d183` — tolerância de 0,5 px para arredondamento subpixel do teste](https://github.com/magnoClovis/nutrition-tracker/commit/879d18306e53e2a04ace13be80caba1bb725c9f9).
- [Merge `13bd540` — incorporação do PR #196 na `main`](https://github.com/magnoClovis/nutrition-tracker/commit/13bd540f1e52f5af86cf0af7bb71795e9f2a6ff5).
- [CI autenticado final `34757379713`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/34757379713) e [preflight documental final `34757379696`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/34757379696), ambos concluídos com sucesso e sem skip no SHA mesclado.

## CAM-INC-2 — validação final do hotfix pelo artefato real da Play Store

**Status:** em andamento — **Chat:** Trofia-UIUX.

**Data de início:** 14/09/2026.

**Data de conclusão:** não concluído.

**Tempo decorrido:** pendente de merge.

**Minutos de CI:** parcial do PR documental obsoleto #200: 31m22s no total — 1m12s em checks leves e 30m10s no gate pesado autenticado `34757379713`. Esses minutos pertencem à preparação do AAB versionCode 14 e não serão confundidos com os runs da CAM-RED-4; o total definitivo desta validação será consolidado somente após a prova Play efetiva.

**Propósito:** fechar a lacuna que permitiu que a primeira implementação da câmera funcionasse em release candidato local, mas falhasse no pacote efetivamente distribuído. A comprovação precisa usar o APK gerado e assinado pela Play, com App Check/Play Integrity e o mesmo caminho de instalação recebido pelos usuários.

**Recursos/arquivos principais envolvidos:** Vite, Capacitor, Gradle/Android SDK, chave local de upload, `google-services.json` ignorado pelo Git e verificado de modo fail-closed, `jarsigner`, SHA-256, Play Console/faixa interna, Play App Signing, App Check/Play Integrity, Galaxy físico e os registros `documentation/estado-atual/RESUMO-STATUS.md` e `documentation/historico/2026-08-31-ui-campos-customizados.md`.

**O que se planeja fazer:** gerar um AAB assinado a partir da main atual, publicá-lo na faixa interna, confirmar instalação por `com.android.vending` e validar no Galaxy preview visível, controles alcançáveis e encerramento correto em claro/escuro. A prova atual também deve respeitar o gate transversal de bootstrap autenticado e, no mesmo artefato, validar a CAM-RED-4 sem transformar uma falha anterior em sucesso por inferência.

**O que foi feito:** o PR draft #200 preparou, em 14/09/2026, o AAB `versionCode 14`, `versionName 0.11.0-beta`, pacote `com.hermegas.trofia`, com plugins de App Check e Camera Preview, assinatura de upload verificada e SHA-256 `022C8FEEEFCB8DA10151ED4FD774F85C54E82AB56115C40F80EA4834768E8F38`. O build comprovou o fail-closed sem `google-services.json` e o gate autenticado ficou verde, mas o artefato não recebeu a prova física final da câmera pela Play; portanto a fatia nunca foi concluída. Como a base evoluiu e o AAB versionCode 14 deixou de ser publicável/representativo, o PR #200 foi fechado sem merge como obsoleto depois que seus fatos úteis foram reconciliados neste histórico.

Em 20/09/2026, a prova substituta avançou no PR draft #227. A branch incorporou explicitamente a `origin/main` `2cd5338`, que contém D1/D2, e o HEAD `a7d2920a46af70d8eefe1d4ad5b327018ac344e0` passou no check leve `35532248281` (24 s) e no CI autenticado pesado `35532248273` (34m46s), incluindo toda a matriz Playwright autenticada com `SMOKE_OUTCOME: success`, sem recorrência de `profile-incomplete-existing-account` ou `firestore-profile-auth-unavailable`. Foi então produzido um único AAB com pacote `com.hermegas.trofia`, `versionName 0.11.0-beta`, `versionCode 23`, plugins Camera Preview 8.0.1 e App Check 8.4.0, `google-services.json` real validado de forma fail-closed e assinatura de upload confirmada pelo Gradle e por `jarsigner`. O verificador release confirmou novamente a segurança do bundle e calculou SHA-256 `A1DBD0A362AEB75FD3994A5208793F3AF0FDE71B81B261EDD098204834AAC835`; a cópia estável foi preservada fora do Git em `.artifacts/releases/trofia-0.11.0-beta-v23-cam-red-4.aab`, e o `versionCode` rastreado voltou a `2` após o build. CAM-INC-2 permanece aberta: ainda é obrigatório publicar na faixa interna, instalar por `com.android.vending` e executar no Galaxy a prova do bootstrap e da câmera em claro/escuro antes de declarar o incidente encerrado.

**Alinhamento:** pendente. A preparação original cumpriu os gates e a segurança do build, mas não produziu a prova Play que define a conclusão; substituir o artefato obsoleto por um único candidato atual tem impacto positivo por evitar publicar uma base antiga sem reduzir o critério de aceitação.

**PRs/commits relacionados:** [PR draft #200](https://github.com/magnoClovis/nutrition-tracker/pull/200), commits `d8a508a`, `173d5ee`, `f4f8f0a` e `2bee843`, gate autenticado `34757379713`, hotfix base PR #196/merge `13bd540`; a prova substituta será rastreada no PR draft #227 e no AAB Play versionCode 23 ou superior. — **Chat-Origin:** Trofia-UIUX.

## Encerramento determinístico do servidor de smoke legado no Windows

**Status:** concluído — **Chat:** Trofia-UIUX.

**Data de início:** 15/09/2026.

**Data de conclusão:** 15/09/2026.

**Tempo decorrido:** 6h06m33s, do primeiro commit (`3165e91`, 15/09/2026 00:36:29 UTC) ao merge (`a16ba79`, 15/09/2026 06:43:02 UTC).

**Minutos de CI:** 65m59s no total (leve: 0m28s; pesado: 65m31s), somando as duas tentativas do run autenticado `34913949788`.

**Propósito:** remover um bloqueio de infraestrutura descoberto durante o gate exclusivamente documental do CAM-RED-1. Todos os casos do smoke legado terminavam, mas o comando não devolvia controle ao `npm test`, impedindo o Vite e o cutover de começar e tornando impossível declarar o gate completo. A correção deve permanecer separada do runtime da câmera e não pode reduzir cobertura, tolerâncias ou tempos funcionais da matriz.

**Recursos:** Node.js HTTP server, Playwright `webServer`, cmd.exe/PowerShell no Windows, inspeção de portas TCP e árvore de processos.

**Arquivos:** `tests/smoke/serve-static.js`, `tests/smoke/server-global-teardown.js`, `tests/unit/smoke-server-shutdown.test.js`, `playwright.config.js`, `documentation/estado-atual/RESUMO-STATUS.md` e `documentation/historico/2026-08-31-ui-campos-customizados.md`.

**O que se planeja fazer:** reproduzir primeiro na `origin/main` limpa; registrar a quantidade e o resultado dos testes, a porta e os processos remanescentes; isolar a relação com o watchdog sem editar requisitos; aplicar somente uma correção determinística de shutdown; repetir a execução integral; abrir PR técnico draft próprio com `Chat-Origin: Trofia-UIUX`; e somente depois retomar CAM-RED-2.

**O que foi feito:** a baseline `31bc44d` executou os 107 casos do smoke legado até o último teste, liberou a porta 8765 e fechou os navegadores, mas manteve vivos `npm`, Playwright, o wrapper `cmd.exe` e o processo Node iniciado por `serve-static.js`. A execução isolada do servidor repetiu o sintoma: `Ctrl+C` fechou imediatamente a porta 8767 sem encerrar o Node. Ao reduzir apenas por variável de ambiente o watchdog ocioso de 30 minutos para 10 segundos, um roteiro focado concluiu exatamente após esse intervalo, provando que o processo só estava saindo pelo watchdog. O aumento do watchdog para 30 minutos no PR #171 tornou visível uma limitação anterior: no Windows, o Playwright encerra o wrapper `cmd.exe`, mas o descendente Node pode sobreviver e manter aberto o pipe do reporter. A correção adicionou ao servidor estático um endpoint estritamente local `POST /__smoke_shutdown__`, acionado por um `globalTeardown` comum ao legado e ao Vite; o teardown tolera servidor já encerrado e não mascara o resultado funcional do teste. Um teste unitário inicia o servidor real em porta dinâmica, solicita o shutdown, exige HTTP 204 e comprova saída limpa com código zero. O gate local passou em 1.363/1.363 unitários, smoke legado com 44 casos executados e 63 skips autenticados esperados, smoke Vite com a mesma cobertura e matriz cutover 60/60; os três comandos devolveram controle normalmente, sem aguardar o watchdog e sem alteração de requisitos ou código do app. No CI autenticado `34913949788`, a primeira tentativa comprovou que o shutdown já funcionava, mas terminou em 106/107 porque o caso Vite mobile `profile-incomplete-existing-account` recebeu inesperadamente a tela de perfil obrigatório. O caso não se repetiu na segunda tentativa: o job pesado passou em 29m33s com 1.363/1.363 unitários, 36/36 testes do Worker, 74/74 de Functions, legado com 99 casos e os oito skips estruturais esperados e Vite com 107/107 sem skip. Nenhum código de autenticação ou perfil foi alterado. A ocorrência permanece classificada como intermitente e passa a ser monitorada explicitamente em todos os gates CAM-RED; se reaparecer localmente ou no CI, a sequência deve parar para apresentação do padrão antes de prosseguir.

**Alinhamento:** 100%. A entrega correspondeu ao diagnóstico e à correção técnica isolada aprovados, sem alterar requisitos, tolerâncias ou runtime do app. A ocorrência única de `profile-incomplete-existing-account` foi externa ao escopo, não foi mascarada e não motivou mudança indevida; seu impacto foi neutro para esta correção, mas criou um critério de parada explícito para os gates CAM-RED seguintes.

**PRs/commits relacionados:** [PR #201](https://github.com/magnoClovis/nutrition-tracker/pull/201), commit [`3165e91`](https://github.com/magnoClovis/nutrition-tracker/commit/3165e91e53b643634d7fe928a6b52b3b3943f3f4), merge [`a16ba79`](https://github.com/magnoClovis/nutrition-tracker/commit/a16ba7970baf6cd151ddbe6797cc9e99644cd53d) e [CI autenticado `34913949788`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/34913949788), cuja segunda tentativa concluiu totalmente verde.

## CAM-RED-1 — protótipo externo do redesenho centralizado da câmera

**Status:** concluído — **Chat:** Trofia-UIUX.

**Data de início:** não determinado.

**Data de conclusão:** 15/09/2026.

**Tempo decorrido:** não aplicável ao protótipo externo; seu registro documental no PR #202 levou 23m27s, do primeiro commit (`7a3addd`, 15/09/2026 06:49:54 UTC) ao merge (`daa2140`, 15/09/2026 07:13:21 UTC).

**Minutos de CI:** 0m26s no total para o registro documental do PR #202 (leve: 0m26s; pesado: 0m00s); a aprovação visual não modificou o runtime, não gerou artefato Android e não exigiu CI pesado.

**Propósito:** escolher, antes de alterar novamente a integração híbrida WebView/Android, uma direção visual completa para o reconhecimento de refeição por câmera. O protótipo precisava separar o acionamento da câmera do card de registro atual, preservar a linguagem One UI 8/Glass UI, mostrar uma progressão contínua entre enquadramento, captura, análise e resultado e permitir comparar a mesma composição nos temas claro e escuro. A validação antecipada também evita que decisões de aparência sejam tomadas durante as fatias técnicas que precisam preservar as garantias de ciclo de vida, permissão e acessibilidade já entregues em CAM-C3, CAM-C4a e CAM-C4b.

**Recursos:**

- Protótipo externo criado no Claude Design, composto por HTML, CSS e JavaScript estáticos e por exports visuais dos estados aprovados.
- Referências de linguagem One UI 8/Glass UI, temas claro e escuro e textos demonstrativos em português e inglês.
- Estado real do Trofia usado como referência conceitual: fluxo C24 de reconhecimento por foto, editor de estimativa nutricional, busca de alimentos salvos, ChoiceField e NumericField.
- Nenhuma API nativa, chamada ao Worker/Gemini, captura real, permissão Android, persistência ou código de produção foi executado pelo protótipo.

**Arquivos:** nenhum arquivo de runtime ou teste do repositório foi criado ou alterado por CAM-RED-1. Os materiais externos revisados foram `CameraScreen.dc.html`, `FlowScreen.dc.html`, `ResultCard.dc.html`, `SearchScreen.dc.html`, `Trofia - Flow demo.dc.html` e os exports `00-current-state.png`, `01-camera-idle.png`, `02-camera-flash.png`, `03-camera-capturing.png`, `04-A-analyzing.png`, `05-A-result.png`, `10-search-list.png`, `11-search-portion.png` e `12-search-keypad.png`, todos fornecidos como referência visual e não incorporados ao repositório.

**O que se planeja fazer:** validar visualmente uma câmera em retângulo centralizado, sobre backdrop escurecido/borrado, com flash, X dedicado à câmera, X separado para todo o reconhecimento e expansão/contração sem cortes abruptos; transformar a foto capturada em fundo da análise de tela cheia, com overlay escuro translúcido, progresso e cancelamento; apresentar o resultado em sheet cobrindo aproximadamente 68% da tela, mantendo a foto visível, com porção, macros, nutrientes secundários, ingredientes editáveis, refeição-alvo e ação final; e explorar o mesmo componente de resultado na busca manual sem implementar silenciosamente essa ampliação de escopo.

**O que foi feito:**

- A Proposta A, denominada “Continuidade total”, foi escolhida e aprovada visualmente antes da fatia técnica seguinte. A distinção aprovada em relação à Proposta C é a ausência de um corte de tela perceptível entre captura e análise.
- Nos estados de câmera parada e flash ativo, o preview ocupa um retângulo centralizado; o restante do app permanece reconhecível sob escurecimento/desfoque; há controles separados para fechar apenas a câmera e para encerrar todo o reconhecimento; o estado do flash muda de forma legível nos dois temas.
- Na captura, o retângulo contrai levemente e o texto muda para “Segure firme”/“Hold still”, mantendo continuidade espacial em vez de inserir uma tela intermediária abrupta.
- Na análise, a fotografia capturada passa a ocupar toda a área disponível e recebe um overlay escuro translúcido — sem aplicar blur à própria foto —, textos de etapa, indicador de três pontos e Cancelar fixo na região inferior.
- No resultado, um bottom sheet abre encaixado em aproximadamente 68% da altura útil e conserva a foto visível acima. Uma clarificação posterior aprovada tornou obrigatórios dois pontos de encaixe: o inicial de aproximadamente 68% e o expandido até a altura total útil, respeitando safe areas. O usuário poderá expandir e recolher por arraste, com alternativa acessível por controle explícito/teclado/leitor de tela; o gesto será coordenado com a rolagem interna para não deslocar o sheet acidentalmente durante a leitura de listas extensas. O desenho reúne miniatura, nome com quebra de linha, origem/confiança, ajuste de porção, quatro macros, nutrientes secundários expansíveis, ingredientes adicionáveis/removíveis, escolha da refeição e CTA de registro. A edição de quantidade deverá reutilizar o cálculo proporcional já existente, atualizando imediatamente kcal, macros e demais nutrientes sem perder a distinção entre valor zero e dado ausente.
- A busca manual demonstra resultados com nome, porção de referência e calorias antes da abertura e reaplica a mesma estrutura visual do sheet ao alimento escolhido, inclusive o NumericField aprovado para digitação de quantidade. A unificação foi reconhecida como ampliação de escopo e deverá ser implementada em fatia própria, não escondida na câmera.
- O protótipo cobriu apenas o caminho feliz. Ficou registrado que permissão negada, recuperação por Configurações/galeria, TalkBack, foco, fonte 200%, contraste, alvos de 48 px, PT/EN/ES, movimento reduzido, baixa confiança, nutrientes incompletos, listas longas, nomes extensos e ausência de ingredientes continuam requisitos obrigatórios das fatias de runtime.
- A aprovação visual não comprova a continuidade do preview nativo com `toBack:true`, o momento seguro de encerrar a sessão Android, o suporte real do flash ou a classificação de falhas de rede/Worker. Esses pontos permanecem deliberadamente para a prova técnica e para fatias funcionais subsequentes.

**Alinhamento:** 100%. O objetivo desta fatia era decidir a direção visual antes de código real, e a Proposta A foi revisada e aprovada com os estados necessários para orientar a implementação. O ganho adicional do card compartilhado não foi absorvido silenciosamente pelo escopo existente: foi explicitamente separado para novo fatiamento. O impacto final foi positivo, pois amplia a referência de UX sem enfraquecer as validações técnicas ainda obrigatórias.

**PRs/commits relacionados:** não há PR ou commit de runtime do protótipo externo. A aprovação e o roadmap foram versionados no [PR #202](https://github.com/magnoClovis/nutrition-tracker/pull/202), commit [`7a3addd`](https://github.com/magnoClovis/nutrition-tracker/commit/7a3adddc050b21f6451c91c72bc0ee1033dbd957), merge [`daa2140`](https://github.com/magnoClovis/nutrition-tracker/commit/daa2140a81ad55bf55c1c630f02815bde203c8a9) e [preflight documental `34938793687`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/34938793687). As implementações futuras deverão apontar seus próprios PRs, commits, gates e provas físicas.

## CAM-RED-2 — prova técnica da continuidade entre câmera nativa e fotografia congelada

**Status:** concluído — **Chat:** Trofia-UIUX.

**Data de início:** 15/09/2026.

**Data de conclusão:** 15/09/2026.

**Tempo decorrido:** 8h57m18s, do primeiro commit da fatia (`50f9d8d`, 15/09/2026 08:29:53 UTC) ao merge (`caeb515`, 15/09/2026 17:27:11 UTC).

**Minutos de CI:** 67m01s no total (leve: 0m54s — runs `34985381035` em 0m29s e `34996010051` em 0m25s; pesado: 66m07s — runs autenticados `34985380991` em 36m22s e `34996010049` em 29m45s). Os gates remotos passaram integralmente; no gate funcional, o Playwright legado fechou com 103 casos aprovados e 8 skips já esperados/documentados, o Vite com 111 casos aprovados e nenhum skip, e `profile-incomplete-existing-account` não reapareceu.

**Propósito:** eliminar o principal risco técnico da Proposta A antes de construir o novo palco visual: comprovar no Android real que a captura pode substituir o preview nativo por uma fotografia congelada já efetivamente pintada pela WebView e somente então encerrar a sessão da câmera, sem quadro preto, relâmpago visual ou câmera ligada durante a chamada de IA. A mesma prova precisa preservar as garantias de permissão, timeout, cancelamento tardio, background, botão Voltar, orientação bloqueada e descarte de dados temporários já validadas em CAM-C4a/C4b.

**Recursos:** React/WebView, Capacitor Android, `@capacitor-community/camera-preview` 8.0.1 com `toBack:true`, `requestAnimationFrame`, ciclo de vida do app, build Android `release`, ADB/logcat e Galaxy físico.

**Arquivos:** `image-meal-flow.js`, `image-meal-screen.js`, `src/composite/embedded-camera-preview.js`, `nutrition-tracker-controller.js`, `scripts/patch-camera-preview-android.js`, `package.json`, `tests/unit/camera-preview-native-patch.test.js`, testes unitários de fluxo/preview/tela, `documentation/estado-atual/RESUMO-STATUS.md` e este histórico. Nenhum arquivo de `worker/`, `functions/`, Firestore ou autenticação integra o escopo.

**O que se planeja fazer:** acrescentar um estado técnico intermediário de fotografia congelada; pré-processar a captura mantendo a sessão nativa ativa; renderizar a fotografia opaca sobre a área do preview; confirmar a primeira pintura por evento de carga seguido de frames reais da WebView; chamar `stop()` somente após essa confirmação; manter cancelamento, interrupção e descarte seguros durante toda a janela; consultar sem ativar o flash os modos declarados pelo plugin para a câmera traseira; cobrir ordem de eventos, respostas tardias, falhas e limpeza por testes; e repetir fisicamente no Galaxy em build `release`, sem harness ou emulador. A fatia não implementará o palco centralizado, backdrop, controles visuais ou botão funcional de flash de CAM-RED-3/4.

**O que foi feito:** em andamento; branch isolada `codex/cam-red-2-android-proof` criada diretamente do merge `daa2140` da `origin/main`. O fluxo ganhou a fase intermediária `camera-frozen`: `capture()` retorna a imagem sem chamar `stop()`, o pré-processamento cria a URL local, a tela cobre a superfície nativa com a fotografia opaca e o `onLoad` aguarda dois `requestAnimationFrame` antes de confirmar a primeira pintura e encerrar o plugin. Um timeout de 2,5 segundos fecha a câmera e falha de modo recuperável se a imagem nunca pintar; cancelamento, ida ao background, descarte e respostas tardias invalidam a operação, fecham a sessão e liberam somente os blobs correspondentes. A prova também consulta `getSupportedFlashModes()` apenas depois do preview ativo, normaliza os valores conhecidos sem ligar o flash e registra o resultado para coleta física.

Os testes focados passaram em 76/76 casos unitários e em 8/8 células visuais por runtime (claro/escuro, desktop/mobile). O gate local completo passou com preflight limpo, 1372/1372 testes unitários, 48/48 smokes públicos no legado, 48/48 no Vite e matriz cutover 60/60; os 63 skips em cada smoke foram exclusivamente os autenticados esperados sem credenciais locais. O caso monitorado `profile-incomplete-existing-account` não executa localmente e permanece obrigatório no CI autenticado.

Um APK `release` assinado foi compilado somente para preparar a prova e confirmou pacote `com.hermegas.trofia`, versionName `0.11.0-beta`, inclusão dos sete plugins e presença dos marcadores da nova fase no bundle. Antes de instalar, a assinatura desse candidato foi comparada com a do app versionCode 14 instalado pela Play no Galaxy SM-S938B e não coincidiu: o release local usa a chave de upload, enquanto a instalação pública usa a chave de app-signing da Play. Nenhum pacote foi instalado, rebaixado ou removido e nenhum dado do aparelho foi tocado. Como a fatia proíbe harness/debug e a desinstalação do app oficial seria destrutiva, a prova visual e a leitura dos modos retornados pelo plugin foram corretamente adiadas para um AAB rastreável distribuído pela faixa interna. A inspeção somente leitura das características Camera2 confirmou flash físico disponível na câmera traseira, mas não foi tratada como substituta da consulta real do plugin.

O AAB seguinte foi distribuído pela faixa interna e instalado pela própria Play como versionCode 15. A prova física confirmou que o preview traseiro real permaneceu limitado ao card, a fotografia congelada foi efetivamente pintada sobre a superfície nativa sem quadro preto antes de `stop()`, e o serviço da câmera deixou de listar o app depois da transição. A consulta do plugin devolveu exatamente `off`, `auto`, `on` e `torch`. Permissão negada apresentou a recuperação PT com Configurações/galeria sem manter cliente ativo; Voltar em estado ativo liberou a câmera; a orientação ficou bloqueada somente durante a sessão e retornou a `SCREEN_ORIENTATION_UNSPECIFIED` depois dela.

A mesma validação revelou dois defeitos nativos reproduzíveis que impedem o fechamento da fatia. Ao enviar o app ao background, o listener JavaScript solicitava `stop()` depois de `Activity.onSaveInstanceState`; o plugin removia o fragmento com `FragmentTransaction.commit()` e encerrava o processo com `IllegalStateException: Can not perform this action after onSaveInstanceState` em `CameraPreview.java:135`. Ao tocar em Capturar e enviar Voltar 50 ms depois, `CameraActivity` liberava a câmera enquanto a thread de captura ainda alcançava `Camera.takePicture()`, produzindo `RuntimeException: takePicture failed` em `CameraActivity.java:843`. Os logs, screenshots e vídeo ficaram preservados como evidência local fora do Git; nenhum teste foi forçado e CAM-RED-3 permaneceu bloqueada.

Após aprovação explícita, foi preparada uma correção corretiva dentro da própria CAM-RED-2. Um patch versionado e fail-closed para `@capacitor-community/camera-preview` 8.0.1 troca apenas o commit de teardown por `commitAllowingStateLoss()`, adequado ao fragmento transitório sem estado restaurável, e serializa acesso/liberação da câmera com tratamento explícito de captura interrompida. O adaptador aguarda a promessa de captura já iniciada antes de chamar o `stop()` nativo no caminho normal. `npm ci` aplica automaticamente o patch por `postinstall`, recusa versões ou trechos upstream não revisados e foi validado por instalação limpa. Antes da repetição física, 55/55 testes focados passaram, o plugin e o APK debug recompilaram com JDK 21/SDK Android e o gate local passou em 1.375/1.375 unitários, smoke legado e Vite com 48 casos públicos e 63 skips autenticados esperados por runtime, além de cutover 60/60.

O candidato corrigido foi recompilado como AAB assinado, distribuído pela faixa interna e atualizado no Galaxy pela própria Play como versionCode 16; a instalação foi confirmada por `installerPackageName=com.android.vending`, portanto a prova não usou APK local, harness nem emulador. O cenário de corrida entre captura e Voltar foi repetido diretamente três vezes, com atrasos de 0 ms, 50 ms e 100 ms depois do comando de captura. Em todas as repetições o mesmo PID do app permaneceu vivo, a captura foi encerrada de forma controlada e não houve `FATAL EXCEPTION`, `takePicture failed` ou encerramento do processo. O cenário de teardown depois de `onSaveInstanceState` também foi repetido três vezes, enviando o app para o background enquanto a câmera estava ativa ou em encerramento; o PID permaneceu vivo e não reapareceu `Can not perform this action after onSaveInstanceState`.

A regressão funcional foi verificada no mesmo artefato: uma captura normal pintou a fotografia congelada antes de desconectar o cliente de câmera, sem quadro preto; Cancelar liberou a câmera; revogar temporariamente a permissão exibiu o estado localizado com “Abrir configurações” e a permissão foi restaurada; o bloqueio de orientação foi mantido durante a sessão e restaurado ao final. Os modos `off`, `auto`, `on` e `torch` já haviam sido retornados pelo próprio plugin na prova física da versão 15 e permaneceram protegidos pela cobertura automatizada; a correção nativa da versão 16 não alterou a API nem o caminho de flash. O log contínuo final registrou zero ocorrências de `FATAL EXCEPTION`, encerramento do processo do Trofia, `takePicture failed` e erro de transação após `onSaveInstanceState`.

O gate remoto do PR #203 passou integralmente, inclusive a repetição disparada pelo fechamento documental. O Playwright legado aprovou 103 casos com apenas 8 skips já esperados/documentados; o Vite aprovou 111 casos sem skip; o caso monitorado `profile-incomplete-existing-account` não reapareceu. Ao terminar a prova, os arquivos temporários do aparelho foram removidos, a permissão ficou restaurada, rotação e permanência de tela voltaram ao estado inicial, Não Perturbar foi desativado, a sincronização permaneceu ativa, o timeout foi restabelecido para 30 segundos por último e todos os processos/encaminhamentos ADB foram encerrados. O PR foi aprovado e mesclado; CAM-RED-3 não foi iniciada antes desse fechamento.

**Alinhamento:** 100%. A entrega correspondeu à prova aprovada: estabeleceu o handoff contínuo do preview para a fotografia congelada antes de `stop()`, mediu os modos reais de flash e preservou o ciclo de vida no Galaxy. Os dois crashes encontrados durante a validação ampliaram o trabalho técnico, mas eram defeitos diretamente pertencentes à robustez exigida pela própria fatia; corrigi-los antes do redesenho teve impacto positivo, porque impediu que CAM-RED-3 fosse construída sobre uma base nativa instável.

**PRs/commits relacionados:** [PR #203](https://github.com/magnoClovis/nutrition-tracker/pull/203), commits [`50f9d8d`](https://github.com/magnoClovis/nutrition-tracker/commit/50f9d8d) (prova de handoff), [`d31132c`](https://github.com/magnoClovis/nutrition-tracker/commit/d31132c) (correção segura de lifecycle/captura), [`b5169fd`](https://github.com/magnoClovis/nutrition-tracker/commit/b5169fd) (evidência física) e merge [`caeb515`](https://github.com/magnoClovis/nutrition-tracker/commit/caeb5150536fa835e6378d93cab6ec1c428f25e2); CI leve [`34985381035`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/34985381035) e [`34996010051`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/34996010051); CI pesado autenticado [`34985380991`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/34985380991) e [`34996010049`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/34996010049).

## CAM-RED-3 — palco centralizado da câmera

**Status:** concluído — **Chat:** Trofia-UIUX.

**Data de início:** 15/09/2026.

**Data de conclusão:** 16/09/2026.

**Tempo decorrido:** 22 h 40 min 53 s, do primeiro commit da fatia (`da9922d`, 15/09/2026 às 19:38:26 UTC) ao merge (`449ab9a`, 16/09/2026 às 18:19:19 UTC).

**Minutos de CI:** 176 min 06 s no total — leve: 2 min 49 s em cinco execuções de `Documentation preflight`; pesado: 173 min 17 s em cinco execuções de `CI`. O total inclui os gates dos commits inicial, corretivo, documental, diagnóstico e final, inclusive o run pesado vermelho `35100318258`, sem descartar consumo intermediário.

**Propósito:** tornar visível no aparelho a primeira parte do redesenho Proposta A, substituindo o preview embutido no card por um palco de captura centralizado e modal, sem alterar a base nativa comprovada pela CAM-RED-2 nem antecipar flash, análise em tela cheia ou resultado compartilhado.

**Recursos:** React, CSS Glass UI/One UI 8, Camera Preview nativo com `toBack:true`, `camera-frozen`, `prefers-reduced-motion`, Playwright legado/Vite e Galaxy físico.

**Arquivos:** `image-meal-screen.js`, `nutrition-tracker-controller.js`, `one-ui.css`, testes unitários e visuais da câmera, `documentation/estado-atual/RESUMO-STATUS.md` e este histórico.

**O que se planeja fazer:** renderizar um retângulo de câmera centralizado; escurecer e desfocar somente o app ao redor sem aplicar blur à superfície nativa; bloquear scroll; manter dois fechamentos semanticamente distintos — câmera e reconhecimento —; animar expansão na abertura e contração no fechamento/captura; preservar redução de movimento, temas claro/escuro e textos/nomes acessíveis em PT/EN/ES; executar gates completos e apresentar prints ou vídeo do comportamento real no Galaxy antes de qualquer CAM-RED-4.

**O que foi feito:** o PR draft #207 introduziu um overlay fixo de captura com quatro painéis periféricos independentes, de modo que o escurecimento e o `backdrop-filter` de 18 px atinjam somente o app ao redor e nunca a superfície nativa `toBack:true`. O palco usa retângulo centralizado e responsivo, X dedicado da câmera à direita, X do reconhecimento à esquerda, indicador localizado, moldura de foco e obturador próprio. A abertura reaproveita a expansão aprovada; captura e fechamento contraem o retângulo; `prefers-reduced-motion` remove essas animações. O controlador mede a nova superfície, mantém o bloqueio de scroll e direciona o foco inicial ao fechamento específico da câmera sem mudar o contrato `camera-frozen` da CAM-RED-2.

O gate anterior à primeira prova física passou integralmente: preflight sem avisos, 1.379/1.379 testes unitários, smoke público legado e Vite com 48 aprovações e 63 skips autenticados esperados por runtime, cutover 60/60 e matriz visual focada com 8/8 células executáveis por runtime (claro/escuro, desktop/mobile; um único skip de setup autenticado esperado). O CI autenticado do commit `da9922d` também ficou verde: run leve `35014899826`; run pesado `35014899866` com 103 casos legado aprovados e 8 skips documentados, 111 casos Vite sem skip e nenhuma recorrência de `profile-incomplete-existing-account`.

A primeira prova no Galaxy SM-S938B usou a versão 17 instalada pela faixa interna da Play, confirmou os dois fechamentos separados, o palco centralizado, backdrop, controles e bloqueio de scroll, mas encontrou uma lacuna real: apesar da cadeia de backgrounds estar transparente, os elementos normais do WebView continuavam sendo pintados dentro do recorte destinado ao preview nativo. A câmera não podia ser aprovada porque o centro mostrava a composição antiga do app. A causa não era o plugin nem a geometria, e sim a diferença entre tornar fundos transparentes e impedir a pintura dos descendentes subjacentes.

A correção mínima preserva toda a árvore e suas dimensões para que a medição nativa permaneça estável, aplica `visibility:hidden` somente à árvore inativa enquanto a câmera possui o viewport e torna novamente visíveis o overlay e seus descendentes. A fixture visual passou a reproduzir conteúdo real atrás do palco e comprova por `getComputedStyle` que esse conteúdo fica oculto enquanto overlay, X e obturador permanecem visíveis. Depois da correção, as matrizes focadas legado/Vite passaram em 8/8 células executáveis cada. O gate local completo confirmou 1.379/1.379 unitários, 48 testes públicos aprovados e 63 skips autenticados esperados tanto no legado quanto no Vite, e cutover 60/60. O build Vite precisou ser repetido fora da restrição de leitura do sandbox do Windows/esbuild, sem alterar código, teste ou requisito. `android/keystore.properties` foi afastado temporariamente apenas durante os unitários que auditam a ausência de material local de assinatura e restaurado imediatamente depois.

Foi gerado um APK `release` local versionCode 18 para a repetição iterativa, SHA-256 `6B14F780F1E3301B10CE72BF77E6357CE368D96FFE07F7E341716D9F6E84F939`, assinado pela chave de upload. A assinatura do app distribuído pela Play foi verificada separadamente e é diferente, como esperado pelo Play App Signing; por isso a build local não pode atualizar a instalação Play por cima. A hipótese de usar esse APK para a iteração visual foi testada sem expor credenciais: o login leu `tests/test-user.local.json`, ignorado pelo Git, mas o perfil falhou fechado com `app-check-token-unavailable` antes de o fluxo da câmera ficar acessível. A causa é a integração correta entre App Check e Play Integrity: a chave de upload do APK local não corresponde ao certificado final com que a Play assina o app distribuído. Nenhuma configuração de segurança foi enfraquecida, nenhum token debug foi introduzido e a build local foi removida do Galaxy após a coleta da evidência. A repetição física do layout corrigido precisa, portanto, usar o AAB versionCode 18 pela faixa interna da Play.

O gate do commit corretivo `bb35e09` também ficou totalmente verde. Localmente: 1.379/1.379 unitários; smoke legado com 48 casos públicos aprovados e 63 skips autenticados esperados; smoke Vite com os mesmos 48/63; cutover 60/60. No GitHub, o run leve `35094659750` passou em 22 segundos e o pesado autenticado `35094659731` passou em 36 minutos e 5 segundos, com 103 casos legado aprovados e 8 skips documentados e 111 casos Vite aprovados sem skip. O caso monitorado `profile-incomplete-existing-account` não reapareceu.

A repetição física final usou a versão 18 efetivamente instalada pela faixa interna da Play, preservando Play App Signing e App Check reais. No Galaxy SM-S938B, em tema escuro e PT, o preview nativo apareceu corretamente no retângulo centralizado, sem vazamento da composição antiga; backdrop, indicador, obturador e os dois fechamentos tinham alvos distintos e alcançáveis. O X interno encerrou somente a câmera e retornou ao reconhecimento, mantendo o modal principal aberto, o que comprovou essa parte do contrato. Screenshot e vídeo reais, além da árvore de acessibilidade, foram guardados fora do Git em `.artifacts/cam-red-3-galaxy/`.

A captura, porém, revelou um novo bloqueio real. Depois do toque no obturador, a imagem ficou congelada no palco, mas o handoff não avançou para a próxima interface nem liberou a câmera, mesmo após vários minutos. A árvore de acessibilidade continuou expondo os controles da câmera e `dumpsys media.camera` confirmou `com.hermegas.trofia` como cliente ativo da câmera traseira; o histórico do serviço registrou o `CONNECT` da segunda abertura às 15:33:51 sem `DISCONNECT` correspondente até o encerramento forçado do app. Não houve crash Android nem erro JavaScript conclusivo no log coletado. A evidência delimita o defeito ao caminho assíncrono entre captura, fotografia congelada e encerramento da sessão nativa, mas ainda não permite afirmar se a promessa de captura não conclui ou se o `stop()` fica bloqueado; qualquer correção exige instrumentação e autorização próprias. Nenhum requisito foi relaxado, CAM-RED-3 permanece em andamento, o PR #207 continua draft e CAM-RED-4 não foi iniciada.

Com autorização específica, foi acrescentada instrumentação diagnóstica sem alterar temporização, estados ou tratamento de erro. O fluxo agora registra somente identificadores constantes — nunca imagem, credencial ou dado do usuário — nas fronteiras `capture()` iniciada/concluída, pré-processamento concluído, emissão do estado congelado, carregamento e dois frames da fotografia, confirmação de pintura, início/conclusão/falha de `stop()` e emissão do estado de foto. Testes unitários verificam a ordem exata desses marcos e protegem a instrumentação contra interferência na máquina de estados. O gate local da alteração passou com 1.379/1.379 unitários, 48 casos públicos legado e 48 Vite com 63 skips autenticados esperados em cada ambiente, além do cutover visual completo 60/60. A próxima reprodução deve usar build interna assinada pela Play para localizar precisamente a fronteira que não conclui.

O commit diagnóstico `9ed3d95` foi validado pelo CI autenticado `35110531673`, concluído em 34m18s: 1.379 unitários sem skip, Worker 5/5, Functions sem skip, legado 103 aprovados com os 8 skips documentados e Vite 111/111 sem skip; `profile-incomplete-existing-account` não reapareceu. Um AAB assinado `versionCode 19`, `versionName 0.11.0-beta`, foi gerado com `google-services.json`, recursos Firebase, App Check e variáveis equivalentes às do CI, verificado com SHA-256 `80AAB96C864A5446F8FAD56A89912BC20E6F628509E08BE844931B8E0D18DA3F` e instalado pela faixa interna da Play.

Na repetição física da versão 19 no mesmo Galaxy SM-S938B, a falha não foi reproduzida. Foram concluídas seis capturas: quatro ciclos consecutivos, o ciclo específico abrir → fechar pelo X dedicado → reabrir → capturar e uma captura no tema claro. Em todos, a fotografia congelada avançou para a revisão com “Analisar foto”, os controles da câmera desapareceram e o serviço nativo registrou `DISCONNECT`; não houve crash, exceção ou erro de câmera. A validação também reconfirmou palco, recorte, backdrop, scroll bloqueado e fechamentos distintos em tema escuro e claro. Os identificadores `console.info` não apareceram no `logcat` da WebView de release e não havia endpoint DevTools exposto, portanto a instrumentação não conseguiu apontar uma fronteira quando o defeito não ocorreu. O bloqueio da versão 18 deve permanecer registrado como intermitente, sem causa confirmada e não “resolvido”; não há evidência para uma correção comportamental adicional ou para relaxar o timeout.

Ao final, o tema escuro original foi restaurado, o app foi encerrado e o cliente da câmera desconectado. Não Perturbar voltou a desligado, sincronização ficou ativa, rotação, economia de energia e permanência acordada via USB retornaram aos valores iniciais, o timeout foi restabelecido para 30 segundos por último e todos os processos ADB/logcat foram encerrados antes de liberar a desconexão.

Ao encerrar a prova, o app foi forçado a parar e a câmera deixou de ter cliente ativo. O Galaxy voltou ao estado anterior: Não Perturbar desligado, sincronização ativa, permanência acordada via USB desativada, rotação e economia de energia restauradas e timeout de tela em 30 segundos; os arquivos temporários remotos e todos os processos ADB foram encerrados antes de liberar a desconexão. Durante futuras provas que não dependam de notificações do aplicativo, o modo correto é Não Perturbar em `alarms`/somente alarmes, não o modo de prioridade, para impedir interferência visual de outros apps.

O gate final do estado documentado passou no CI pesado `35129175422` em 36 minutos, com 1.379 unitários sem skip, Worker 5/5, Functions sem skip, legado 103 aprovados com os oito skips documentados e Vite 111/111 sem skip; o preflight leve `35129175428` também passou. `profile-incomplete-existing-account` não reapareceu. A evidência visual mais recente consiste nos screenshots, árvores de UI e logs da versão 19, somados ao acompanhamento ao vivo pelo responsável; nenhum vídeo novo foi gravado nessa rodada, e os vídeos preservados pertencem a execuções anteriores.

**Alinhamento:** ~95%. O escopo visual aprovado foi entregue integralmente: palco centralizado, backdrop restrito ao app, scroll bloqueado, fechamentos separados, transições, redução de movimento, temas e localização. O desvio em relação ao plano foi a investigação adicional provocada por um bloqueio pós-captura observado uma vez na versão 18. A versão diagnóstica 19 não reproduziu o problema em 6/6 ciclos e não forneceu evidência suficiente para uma alteração comportamental segura; por isso o incidente foi mantido explicitamente como intermitente, sem causa confirmada e sujeito a monitoramento. O impacto final foi **neutro** para o produto: não houve redução funcional nem visual, mas permanece um risco residual documentado em vez de uma alegação indevida de correção.

**PRs/commits relacionados:** [PR #207](https://github.com/magnoClovis/nutrition-tracker/pull/207), merge [`449ab9a`](https://github.com/magnoClovis/nutrition-tracker/commit/449ab9ae65a256e8423531f8124c935b34f468bd), commit inicial [`da9922d`](https://github.com/magnoClovis/nutrition-tracker/commit/da9922d), correção do recorte [`bb35e09`](https://github.com/magnoClovis/nutrition-tracker/commit/bb35e09), registro do bloqueio local [`9fcacd3`](https://github.com/magnoClovis/nutrition-tracker/commit/9fcacd3), instrumentação diagnóstica [`9ed3d95`](https://github.com/magnoClovis/nutrition-tracker/commit/9ed3d95), documentação física final [`eff716e`](https://github.com/magnoClovis/nutrition-tracker/commit/eff716e), CI inicial leve [`35014899826`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35014899826) e pesado [`35014899866`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35014899866), CI corretivo leve [`35094659750`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35094659750) e pesado autenticado [`35094659731`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35094659731), CI diagnóstico leve [`35110531531`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35110531531) e pesado autenticado [`35110531673`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35110531673), CI final leve [`35129175428`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35129175428) e pesado autenticado [`35129175422`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35129175422).

## Correção técnica do App Check e da paridade visual do cutover

- **Status:** concluído.
- **Data de início:** 16/09/2026.
- **Data de conclusão:** 17/09/2026.
- **Tempo decorrido:** 2h15m42s, do primeiro commit `ff8c587` em 17/09/2026 às 13:54:37 UTC ao merge `9f252d6` em 17/09/2026 às 16:10:19 UTC.
- **Minutos de CI:** 70m29s no total — leve: 0m49s (`35230168154`, 0m25s; `35235634192`, 0m24s); pesado: 69m40s (`35230168161`, 32m18s; `35235634115`, 37m22s).
- **Propósito:** corrigir duas limitações do próprio gate visual que impediam a CAM-RED-4 de receber uma avaliação confiável. Os contextos de navegador criados diretamente pela matriz de cutover não herdavam a injeção do token de App Check aplicada pela fixture somente à `page` predefinida, e a paridade entre legado e Vite dependia de igualdade binária de PNG, classificando pequenas diferenças de rasterização como divergência funcional mesmo quando DOM e estilos computados eram idênticos.
- **O que se planeja fazer:** extrair uma instalação reutilizável de App Check por `BrowserContext`, aplicá-la imediatamente após cada `browser.newContext()` e manter o global setup fail-closed; substituir a comparação baseada apenas no hash por decodificação RGBA; aceitar exclusivamente a margem de antialiasing subpixel aprovada; e adicionar testes negativos que façam o gate falhar quando a quantidade de pixels ou o delta cromático excederem essa margem. A correção deve permanecer isolada dos arquivos de runtime da CAM-RED-4 e não pode relaxar requisitos visuais do produto.
- **Recursos/arquivos principais envolvidos:** Playwright; `playwright.cutover.config.js`; `tests/smoke/app-check-fixture.js`; `tests/smoke/cutover-visual-matrix.spec.js`; novo `tests/smoke/png-pixel-comparison.js`; `tests/unit/app-check-ci.test.js`; novo `tests/unit/cutover-pixel-comparison.test.js`; `package.json`; `package-lock.json`; biblioteca `pngjs`; CI autenticado do GitHub Actions.
- **O que foi feito:** a instalação do token foi transformada em `installCiAppCheckForContext(context)` e chamada para cada contexto manual da matriz, preservando a configuração global e deixando de gerar traces quando há token real. O comparador agora decodifica os dois PNGs e mede dimensões, quantidade de pixels diferentes e maior delta por canal. A primeira margem de 1 pixel/delta 1 revelou uma diferença determinística no caso Diário ES/mobile/claro: 18 pixels, delta máximo 5/255, confinados às coordenadas x=19–23 e y=790–833 no antialiasing do canto arredondado da navegação inferior. O DOM, os estilos computados e a aparência eram idênticos, e o padrão se repetiu 3/3. Com aprovação explícita, a tolerância foi fixada em no máximo 20 pixels e delta por canal até 5; testes unitários comprovam que 20/5 passa, enquanto 21 pixels ou delta 6 falham.

  A branch foi atualizada para `f494895`, que contém a correção externa dos falsos incidentes de persistência pelo Chat Principal; nenhum runtime, Firestore, rules, App Check do produto ou dado foi alterado nesta frente. O gate local final passou com preflight limpo, 1.402/1.402 unitários, 103 casos legado aprovados com somente os 8 skips autenticados documentados, 111/111 no Vite e cutover 60/60. `profile-incomplete-existing-account` não reapareceu. Duas expectativas de idioma falharam transitoriamente antes da repetição final — uma tela de Métricas permaneceu em inglês quando o roteiro esperava português e um keypad abriu com rótulo inglês —, mas cada caso passou 3/3 isoladamente e ambos passaram na repetição integral sem alteração de app ou teste; permanecem como ocorrências intermitentes a monitorar, não como problemas corrigidos.

  O primeiro CI do PR #224 confirmou preflight, 1.402 unitários, Worker, Functions e smoke legado com 103 aprovações e somente os 8 skips documentados. O Vite chegou a 110/111: no último caso desktop de `SearchableChoiceField`, depois de `setAppLanguage()` recarregar a página, o app autenticado e os dados do Diário já estavam renderizados, mas `#loading` continuou presente com “Entrando...” durante os 15 segundos da asserção. A captura também mostrava o aviso de versão aguardando “Continuar”. Essa ocorrência corresponde à investigação já existente `INV-RELOAD-SESSAO`, não aos arquivos modificados pelo PR. O mesmo caso Vite desktop foi repetido isoladamente três vezes, usando o mesmo App Check autenticado, e passou 3/3 em 7,4 s por execução; o auth setup também passou em 9,9 s. Nenhuma mudança de app, teste, timeout ou retry foi feita. A ocorrência permanece intermitente, sem causa confirmada, e exige atenção na única repetição do gate canônico.

  A repetição canônica passou sem nova mudança funcional: preflight, 1.402 unitários, Worker e Functions ficaram verdes; o legado concluiu 103 casos com somente os 8 skips exclusivos/documentados; o Vite concluiu 111/111; e a matriz de cutover concluiu 60/60. O caso `SearchableChoiceField` que havia falhado no primeiro CI também passou. O PR foi retirado do draft e mesclado na `main` em `9f252d6`; a worktree técnica foi desregistrada e a pasta remanescente por limite de caminho do Windows foi removida após confirmação de que não havia alteração ou processo ativo.

- **Alinhamento:** 100%. O escopo aprovado foi entregue integralmente: App Check passou a alcançar todos os contextos manuais do cutover, a comparação PNG ganhou tolerância estrita e testada para antialiasing subpixel e diferenças acima do limite continuam falhando. A ocorrência intermitente externa de reload foi preservada e monitorada sem ser mascarada; ela não alterou a solução nem o resultado final.
- **PRs/commits relacionados:** [PR #224](https://github.com/magnoClovis/nutrition-tracker/pull/224), commits [`ff8c587`](https://github.com/magnoClovis/nutrition-tracker/commit/ff8c587) e [`7c4b736`](https://github.com/magnoClovis/nutrition-tracker/commit/7c4b736), merge [`9f252d6`](https://github.com/magnoClovis/nutrition-tracker/commit/9f252d64247553812c6b9e8bc08ed16ca90c5675), primeiro CI leve verde [`35230168154`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35230168154), primeiro CI pesado vermelho pela ocorrência intermitente [`35230168161`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35230168161), rerun leve verde [`35235634192`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35235634192) e rerun pesado autenticado verde [`35235634115`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35235634115).
## CAM-RED-4 — flash visual e funcional

**Status:** em andamento — **Chat:** Trofia-UIUX.

**Data de início:** 16/09/2026.

**Data de conclusão:** não concluído.

**Tempo decorrido:** pendente de merge.

**Minutos de CI:** 2h53m53s acumulados até o candidato Play versionCode 24 — leve: 1m57s (`35252508909`, 0m45s; `35464423717`, 0m25s; `35532248281`, 0m24s; `35543490098`, 0m23s); pesado: 2h51m56s (`35252508927`, 37m27s; `35464423719`, 30m14s; `35532248273`, 34m46s; `35539767485`, 34m49s; `35543490132`, 34m40s). O PR técnico separado #224 possui runs próprios e não é contabilizado nesta fatia; novos runs eventualmente necessários antes do merge deverão ser somados ao fechamento.

**Propósito:** transformar o controle de flash já aprovado no protótipo em uma função nativa real, evitando um botão meramente decorativo e preservando a segurança de ciclo de vida comprovada nas CAM-RED-2 e CAM-RED-3.

**O que se planeja fazer:** reutilizar a consulta dos modos reais da câmera traseira; expor `setFlashMode()` no adaptador; apresentar o pill de flash OFF/ON aprovado apenas quando houver suporte; localizar estado, nome e anúncios em PT/EN/ES; serializar mudança de modo com captura e encerramento; e restaurar `off` em captura, cancelamento, Voltar, background, timeout ou desmontagem. A validação deverá provar no Galaxy o efeito luminoso real e a ausência de sessão/torch órfão, sem introduzir zoom, troca de câmera, código de barras ou mudanças na análise/resultado.

**Recursos/arquivos principais envolvidos:** `src/composite/embedded-camera-preview.js`, `src/composite/embedded-camera-preview-runtime.js`, `image-meal-flow.js`, `image-meal-screen.js`, `nutrition-tracker-controller.js`, `one-ui.css`, `i18n.js`, APIs `getSupportedFlashModes()`/`setFlashMode()` do Camera Preview, testes unitários e visuais legado/Vite, CI autenticado e Galaxy físico.

**O que foi feito:** branch isolada `codex/cam-red-4-flash` criada a partir do merge `d99f465` da `origin/main`. A auditoria inicial confirmou que o fluxo já consulta e normaliza modos suportados e que a prova física da CAM-RED-2 obteve `off`, `auto`, `on` e `torch` no Galaxy. A implementação acrescentou `setFlashMode()` ao adaptador nativo, serializou alterações de iluminação com captura e encerramento, priorizou `torch` com fallback para `on`, restaurou `off` antes do teardown e manteve o último estado realmente confirmado quando uma troca falha. O fluxo expõe estado transitório/erro não fatal; o palco apresenta o pill aprovado somente com suporte real, com SVG fino próprio, `aria-pressed`, `aria-busy`, alvo mínimo de 48 px, foco, claro/escuro e rótulos/anúncios PT/EN/ES. O controlador liga esse controle ao mesmo estado da câmera sem tocar em análise, resultado, Worker, Firestore ou autenticação.

Os testes focados do adaptador, integração, fluxo e tela passaram em 91/91 casos. O preflight passou sem avisos e a suíte unitária completa da branch passou em 1.410/1.410, sem skip. Antes de executar o gate integral, a correção técnica separada do cutover foi isolada no PR draft #224: ela injeta App Check nos `BrowserContext` criados manualmente e limita a tolerância de PNG à margem aprovada de 20 pixels com delta máximo 5; o check leve está verde e o pesado ainda estava em andamento no momento deste registro.

Na tentativa seguinte de executar a matriz visual focada autenticada do legado (`embedded-camera-hotfix.visual.spec.js`), o próprio projeto de setup falhou antes de qualquer uma das oito células da câmera. Depois do preenchimento e envio do login, a página permaneceu na tela pública com o botão “Processando...” desabilitado; durante mais de 20 segundos não apareceu navegação principal, modal de perfil obrigatório nem o texto `profile-incomplete-existing-account`. O Playwright encerrou o setup em 21,7 s com uma falha e marcou os oito testes visuais como não executados. A captura e o snapshot semântico foram preservados localmente em `test-results/auth.setup.js-authenticate-disposable-test-account-auth-setup/`, sem serem adicionados ao Git por conterem dados da conta de teste.

Essa ocorrência acionou a regra transversal de parada criada após o run `34913949788`. Ela não comprova que a causa seja a mesma intermitência anterior: desta vez o fluxo não chegou a nenhum estado pós-login conhecido. A branch da CAM-RED-4 e a `origin/main` não apresentam diferença em `tests/smoke/auth.setup.js`, `tests/smoke/app-check-fixture.js`, `tests/smoke/app-check-global-setup.js` ou `tests/smoke/test-helpers.js`, e nenhum código de autenticação foi alterado ou contornado. Não houve segunda tentativa, aumento de timeout, clique forçado ou relaxamento de requisito. A investigação/correção da causa raiz foi encaminhada ao Chat Principal; esta frente permanece responsável por preservar a evidência e repetir o gate após o desbloqueio.

O Chat Principal investigou a ocorrência na `origin/main` `f494895` sob o identificador `INC-AUTH-BOOTSTRAP-20260917` e no PR documental draft #225. Foram executados seis logins autenticados, todos aprovados; três receberam instrumentação sanitizada e concluíram a navegação em aproximadamente 1,49 s, com sign-in, verificação de e-mail e Firestore respondendo HTTP 200, nenhuma requisição pendente e nenhum erro de página. A evidência original continua válida, mas não preservou rede suficiente para distinguir se a espera ocorreu no sign-in ou na verificação de e-mail, ambos anteriores a `afterAuthenticated()`. Não surgiu relação com câmera, flash, CAM-RED-4 ou App Check e, corretamente, nenhuma mudança especulativa de autenticação, timeout ou retry foi feita.

A retomada foi liberada com critério explícito: se o login voltar a permanecer em “Processando...” sem chegar à navegação, perfil obrigatório ou erro recuperável, o gate deve parar novamente, sem repetição automática, timeout ampliado, clique forçado ou aceitação de outra tela. A nova coleta deverá preservar somente marcadores sanitizados de início/fim de sign-in e verificação de e-mail, requests pendentes, console/page/request failures e duração, nunca credenciais, UID, tokens, headers ou corpos sensíveis.

Na retomada local, o recorte autenticado do legado concluiu o login em 2,1 s e aprovou as nove execuções previstas (setup mais oito combinações visuais de desktop/mobile e claro/escuro). A primeira invocação equivalente do Vite não reproduziu a espera em “Processando...”: alcançou a mensagem recuperável `app-check-initialization-failed`. A inspeção confirmou uma preparação local incompleta — o build recebeu o App ID e o token debug, mas não a variável pública do reCAPTCHA Enterprise usada pelo CI. Portanto, essa tentativa não foi classificada como nova ocorrência de `INC-AUTH-BOOTSTRAP-20260917` e não motivou alteração de runtime/teste. Após autorização explícita, o mesmo recorte foi reconstruído com o conjunto completo de variáveis: o login terminou em 14,1 s e as nove execuções Vite passaram em 21,2 s, sem nova espera indefinida.

O primeiro gate local integral confirmou o preflight e 1.412/1.412 unitários, mas o legado terminou com 100 aprovações, os 8 skips estruturais esperados e três divergências de idioma: o `ChoiceField` de objetivo em Métricas exibia `Manutenção` quando o roteiro já esperava `Mantenimiento`; o `NumericField` de quantidade exibia `Indicar cantidad` quando a etapa esperava `Informar quantidade`; e o `TemporalField` de horário exibia `Choose time` quando a etapa esperava `Escolher horário`. Os três snapshots mostraram os componentes corretos já abertos, porém ainda no idioma da etapa anterior. A execução foi interrompida antes do Vite e do cutover pelo próprio contrato do `npm test`; nenhum arquivo do app ou do teste foi alterado em resposta.

Para distinguir regressão de ocorrência transitória, os três casos exatos foram executados no legado desktop com `--repeat-each=3`: as nove repetições funcionais, além do setup autenticado, passaram em 1,8 min. Uma única repetição canônica integral então passou sem modificação adicional: preflight verde, 1.412/1.412 unitários, legado com 103 aprovações e somente os 8 skips documentados, Vite 111/111 sem skip e cutover 60/60. O login não voltou a permanecer em “Processando...”, `profile-incomplete-existing-account` não reapareceu e as três divergências de idioma também não se repetiram. Os artefatos da primeira execução foram preservados fora do Git em `C:\Users\clovi\AppData\Local\Temp\trofia-cam-red-4-full-gate-legacy-20260917`; a ocorrência permanece classificada como intermitente e monitorável, não como defeito corrigido pela CAM-RED-4.

O commit funcional `5bc3313` foi publicado no PR draft #227. O CI autenticado próprio ficou verde nos runs leve `35252508909` (45 s) e pesado `35252508927` (37m27s): 1.412/1.412 unitários sem skip, Worker com 36 testes Node e 5 de runtime, Functions sem skip, legado com 103 aprovações e somente os 8 skips estruturais documentados e Vite 111/111. O `SMOKE_OUTCOME` foi `success`; nem o login preso em “Processando...” nem `profile-incomplete-existing-account` reapareceram no CI.

Para a prova física, foi gerado um AAB assinado e verificado de forma fail-closed com pacote `com.hermegas.trofia`, `versionName 0.11.0-beta`, `versionCode 20`, configuração Firebase completa e SHA-256 `9B4988983718DF1EA132C978F9F51565F7C121F7EBA07D96F43DC87146DCB59D`. O artefato foi distribuído pela faixa interna e o Galaxy confirmou `installerPackageName=com.android.vending`, portanto a execução não usou APK local, harness nem emulador.

Essa prova física foi interrompida antes de abrir a câmera pelo critério transversal já aprovado. O login com a conta descartável concluiu, mas o bootstrap exibiu a tela recuperável espanhola “No se pudo cargar tu perfil”, com detalhe técnico exato `profile-incomplete-existing-account`, em vez da navegação principal. Não houve toque em “Intentar de nuevo”, segunda tentativa, aumento de timeout, clique forçado ou aceitação de outra tela como sucesso. Screenshot, árvore acessível e logcat filtrado/sanitizado foram preservados fora do Git em `C:\Users\clovi\AppData\Local\Temp\trofia-cam-red-4-galaxy`; o log filtrado confirmou a inicialização do Firebase, mas não trouxe informação suficiente para atribuir a falha a App Check, Firestore ou rede. A validação de efeito luminoso, restauração para `off` e ausência de torch/sessão órfã permanece **não executada** e a CAM-RED-4 continua em andamento.

Ao encerrar a tentativa, o app foi finalizado e os arquivos temporários no aparelho foram removidos. Não Perturbe voltou a `0`, sincronização ficou ativa, `stay_on_while_plugged_in` voltou a `0`, economia de energia e rotação permaneceram nos valores originais e o timeout da tela foi restaurado para 30 segundos por último. O servidor e todos os processos ADB foram encerrados antes de liberar a desconexão.

O Chat Principal concluiu a investigação física no PR #229 e confirmou que o documento remoto da conta descartável já estava completo. A causa era a leitura protegida `fbGetProfileFromServer3()` devolver silenciosamente `{}` quando o UID autenticado ficava momentaneamente indisponível; o bootstrap interpretava esse objeto vazio como um perfil existente sem campos obrigatórios. O hotfix mesclado na `main` em `1e9ef55` passa a lançar `firestore-profile-auth-unavailable`, captura o UID uma única vez e impede qualquer consulta a Firestore ou cache sem contexto autenticado. Não foram adicionados retry, timeout artificial ou fallback, e a correção possui teste determinístico que comprova o erro explícito e zero leituras sem UID.

A branch `codex/cam-red-4-flash` preservou o commit funcional `5bc3313` e incorporou explicitamente a `origin/main` `1e9ef55` pelo merge `a33734f`; o único conflito ocorreu em `documentation/estado-atual/BUG-INVENTORY.md` e foi resolvido mantendo integralmente o diagnóstico confirmado mais completo vindo da `main`. Nenhum arquivo funcional de Auth, Firestore, App Check, rules ou persistência foi editado pela frente UIUX durante a incorporação. A validação física permanece pendente: após um novo gate integral verde, será produzido um único AAB assinado com versionCode maior que 20; a mesma instalação da faixa interna deverá ser validada primeiro pelo Chat Principal no login/bootstrap/leitura de perfil e somente depois, mediante liberação explícita, pela UIUX na câmera e no flash.

O recorte focado após o merge passou em 153/153, incluindo a regressão `firestore-profile-auth-unavailable` nos adaptadores UMD/ESM e todos os contratos de preview, lifecycle, fluxo, tela e flash. O gate local confirmou novamente 1.414/1.414 unitários sem skip; a primeira tentativa válida do smoke legado autenticado completou o login e os oito casos visuais da câmera, e `profile-incomplete-existing-account` não reapareceu. O gate, contudo, terminou em 97 aprovações, os 8 skips estruturais já documentados e 6 falhas externas ao flash. O primeiro caso relevante, “accepts and reopens the contextual meal assessment in PT, EN, and ES”, excedeu 120 s em desktop e mobile enquanto o bloco `finally` aguardava `replaceDailyAggregate()` para restaurar o log diário. As quatro falhas visuais posteriores exibiram o idioma da etapa anterior e são compatíveis com contaminação de estado depois do cleanup interrompido; uma execução de sugestão GA também excedeu o timeout no mesmo caminho de restauração.

Os artefatos integrais foram preservados fora do Git em `C:\Users\clovi\AppData\Local\Temp\trofia-cam-red-4-post-hotfix-gate-20260918`. O caso primário passou numa primeira execução isolada em 21 s; na confirmação `--repeat-each=3`, desktop passou 3/3, enquanto mobile passou 1/3 e falhou 2/3 por dois modos distintos: uma execução abriu o modal ainda em português quando o roteiro já esperava inglês, e outra voltou a exceder 120 s no cleanup `replaceDailyAggregate()`. Os artefatos dessa repetição ficaram em `C:\Users\clovi\AppData\Local\Temp\trofia-cam-red-4-assessment-repeat-20260918`. Isso confirma intermitência real e reproduzível no gate compartilhado, mas não estabelece causa em runtime, Firestore, autenticação ou harness; nenhum timeout, retry, requisito, código do app ou teste foi alterado. Pela regra de parada, o AAB com versionCode maior que 20 não foi gerado e a prova física de câmera não começou.

Em 19/09/2026, após o Chat Principal concluir a correção da data civil dos smokes, o hotfix de perfil e o lease distribuído entre suítes locais e GitHub Actions, a branch preservou integralmente o commit funcional `5bc3313` e incorporou a `origin/main` em duas etapas seguras: `725672e` trouxe a base mínima `3ab47a2`, incluindo o merge funcional `d56480e`, e `3eed516` trouxe a `main` posterior `53e8fd9`. Nenhum arquivo funcional de Auth, Firestore, App Check, rules ou persistência foi alterado pela frente UIUX. O primeiro disparo local após a atualização recusou corretamente iniciar o smoke enquanto o CI `35458919766` possuía o grupo compartilhado. Depois que esse run terminou, uma tentativa seguinte criou o lease `35460810792`, mas o merge simultâneo do PR #235 iniciou o CI de `main` `35460807918` três segundos antes; o lease permaneceu enfileirado e foi cancelado pelo coordenador ao atingir o prazo de aquisição, antes de qualquer login ou teste funcional. A ocorrência foi diagnosticada como contenção legítima do grupo, sem repetir às cegas e sem alterar timeout, retry ou requisito.

Com o CI de `main` concluído e a `origin/main` novamente incorporada, o gate local canônico passou integralmente: preflight sem avisos, 1.428/1.428 unitários sem skips, legado com 103 aprovações e apenas os 8 skips estruturais documentados, Vite com 111/111 e cutover com 60/60. Os três blocos autenticados foram protegidos pelos leases remotos `35462461612`, `35463114620` e `35463856714`, adquiridos e liberados pelo coordenador oficial. Não reapareceram `profile-incomplete-existing-account`, divergência PT→EN, timeout em `replaceDailyAggregate()` nem qualquer falha de câmera/flash. O resultado remove o bloqueio local sem reclassificar as ocorrências antigas: elas permanecem documentadas como incidentes reais já diagnosticados pelas respectivas frentes. A fatia continua em andamento até CI autenticado do PR, geração do único AAB assinado e prova física sequencial na mesma instalação Play — primeiro login/bootstrap/perfil pelo Chat Principal e, após liberação explícita, câmera/flash pela UIUX.

O HEAD `ddebe4722ee23437bba253c4930d5ade7a8e713c` passou no check leve `35464423717` em 25 s e no CI autenticado pesado `35464423719` em 30m14s. O job pesado concluiu preflight, 1.428 unitários, Worker, Functions e toda a matriz Playwright; o passo de upload de diagnósticos foi corretamente omitido porque não houve falha, e nenhum skip adicional apareceu além dos oito estruturais do legado. Um único AAB release foi então gerado com a configuração Firebase real ignorada pelo Git, verificação fail-closed do `google-services.json`, pacote `com.hermegas.trofia`, plugin `@capacitor-firebase/app-check` 8.4.0, `versionName 0.11.0-beta`, `versionCode 21` e assinatura de upload válida. O verificador release confirmou a configuração e a assinatura, e calculou SHA-256 `6FEB0F26BD604F05D339C4784F56B505675C2630679742BFB77153E5BFBCEF85`. O `versionCode` rastreado foi restaurado após o build, os arquivos locais permaneceram ignorados e o worktree voltou a não ter alteração funcional. O artefato ainda precisa ser publicado na faixa interna e instalado pela Play; por isso CAM-RED-4 permanece em andamento e nenhuma validação física foi antecipada.

Em 20/09/2026, a retomada monitorada incorporou por merge explícito a `origin/main` `2cd5338`, incluindo a observabilidade D1 e a prova Play D2 do perfil, sem rebase, reset ou edição de Auth/Firestore/App Check. O recorte focado passou em 91/91 unitários de preview/fluxo/tela e em 16/16 células visuais efetivas nos runtimes legado e Vite, cobrindo desktop/mobile e claro/escuro. O `npm test` local passou com preflight limpo, 1.431/1.431 unitários, 48 casos públicos aprovados e 63 skips autenticados esperados em cada runtime, além de cutover 60/60. As credenciais descartáveis e `android/keystore.properties` foram apenas afastados localmente durante os recortes que exigem sua ausência e restaurados no `finally`; nenhum segredo foi exposto ou versionado. O CI autenticado real, o AAB versionCode 23 ou superior e a prova física pela Play continuam obrigatórios antes da conclusão.

O HEAD `a7d2920a46af70d8eefe1d4ad5b327018ac344e0` passou no check leve `35532248281` em 24 s e no CI autenticado pesado `35532248273` em 34m46s. O pesado concluiu a suíte completa, Worker, Functions e Playwright autenticado com `SMOKE_OUTCOME: success`; nenhum incidente de perfil/autenticação reapareceu. O AAB release versionCode 23 foi gerado somente após confirmar pacote `com.hermegas.trofia`, App Check 8.4.0, Camera Preview 8.0.1, `google-services.json` real e chave de upload. As tarefas `verifyReleaseSecurityConfig` e `verifyReleaseBundleSecurity` passaram, a assinatura foi confirmada independentemente por `jarsigner` e o SHA-256 da origem e da cópia estável coincidiu em `A1DBD0A362AEB75FD3994A5208793F3AF0FDE71B81B261EDD098204834AAC835`. O artefato foi disponibilizado para upload manual na faixa interna em `C:\Users\clovi\OneDrive\GitHub\nutrition-tracker-new\.artifacts\releases\trofia-0.11.0-beta-v23-cam-red-4.aab`.

O mesmo AAB versionCode 23 foi instalado pela faixa interna da Play no Galaxy SM-S938B, com `installerPackageName=com.android.vending`, e iniciou uma prova física monitorada no tema escuro. O primeiro login da conta descartável concluiu o bootstrap, leu o perfil e abriu a navegação principal sem `profile-incomplete-existing-account`, `firestore-profile-auth-unavailable` ou espera indefinida em “Processando...”. O preview traseiro apareceu no palco centralizado sem quadro preto; o pill foi exibido somente após a consulta de suporte; alternar para “Flash ligado” iluminou fisicamente a cena; a captura com iluminação ativa produziu fotografia congelada visível e avançou para a revisão. “Tirar outra” reabriu a câmera com flash desligado, confirmando o reset. Em reproduções limpas, o X dedicado da câmera retornou ao estado inicial do reconhecimento, Voltar com flash ativo não encerrou o processo e enviar o app ao background liberou a sessão sem crash ou torch órfão.

A matriz foi interrompida por um novo defeito funcional real. Com câmera ativa e flash ligado, tocar no X superior esquerdo — “Fechar reconhecimento”, semanticamente distinto do X da câmera — congelou e escureceu a imagem, mas manteve sozinho o palco fixo sem flash, obturador, fechamento ou conteúdo do modal. O estado permaneceu preso por mais de dez segundos; o processo continuou vivo e o `logcat` filtrado não registrou `FATAL EXCEPTION`, `AndroidRuntime`, `IllegalStateException` nem `RuntimeException`. Portanto, trata-se de um deadlock visual/de ciclo de vida, não de crash nativo. O cenário impediu validar o tema claro e o restante da matriz; CAM-RED-4 e CAM-INC-2 permanecem em andamento e o PR #227 continua draft.

A inspeção posterior encontrou uma hipótese técnica forte, ainda não confirmada por correção: `closeCameraWithMotion(event, onClose)` aguarda somente a animação de 220 ms e então `closeImageMealMode()` desmonta o fluxo imediatamente; `flow.destroy()` chama `discard()`, que dispara `embeddedCameraPreview.stop()` sem aguardar sua promessa e já limpa estado, foto e assinatura. Isso permite uma corrida entre fotografia congelada/handoff, teardown nativo e remoção da interface quando o fechamento global ocorre com a câmera ativa. O X específico da câmera usa `cancelEmbeddedCamera()`, que aguarda o `stop()`, coerente com ele ter passado na prova limpa. Nenhuma mudança funcional foi aplicada sem aprovação; a correção mínima deverá serializar o fechamento global com o teardown da câmera, invalidar callbacks tardios e acrescentar regressão específica para fechar o reconhecimento com flash ativo.

Após aprovação explícita, a correção mínima do D19 foi implementada sem alterar Auth, Firestore, App Check, rules, Worker ou Functions. `imageMealFlow.destroy()` agora invalida a operação e aborta a análise imediatamente, cancela o timeout de pintura congelada, aguarda `embeddedCameraPreview.stop()` e somente então descarta fotografias temporárias e publica o estado inicial. `closeImageMealMode()` passou a deduplicar fechamentos concorrentes com uma promessa única, desconectar o listener antes do teardown e manter a interface montada até o encerramento nativo terminar; um `finally` garante que a tela feche mesmo se o plugin rejeitar. Essa ordem elimina a janela em que o X global removia o fluxo enquanto o preview/flash ainda encerrava, sem introduzir espera artificial, retry ou `force:true`.

Os quatro ajustes visuais aprovados foram incorporados no mesmo palco da CAM-RED-4: o rótulo visual “Câmera ativa” foi removido para deixar de disputar espaço com o pill, mas o anúncio localizado continua no `aria-live`; o raio do flash usa preenchimento sólido em `currentColor`; pill e X específico compartilham altura de 52 px; e quatro máscaras radiais acompanham o raio responsivo do palco — 38 px em telas amplas e 32 px no mobile — para cobrir os pixels quadrados da superfície nativa `toBack:true`, sem depender de `border-radius` do HTML para recortar uma camada Android inferior.

A regressão automatizada comprova que o estado permanece `camera-active` enquanto a promessa nativa de `stop()` está pendente e só é limpo depois da resolução; também cobre deduplicação do fechamento, preservação do anúncio acessível, remoção do indicador visível, SVG preenchido, proporção 52 px/52 px e máscaras dos quatro cantos. Passaram 136/136 testes focados, preflight sem avisos, 1.435/1.435 unitários sem skip, matriz visual focada 8/8 no legado e 8/8 no Vite, legado completo com 103 aprovações e somente os 8 skips estruturais documentados, Vite 111/111 e cutover 60/60. O arquivo local de assinatura foi restaurado no `finally` e nenhum segredo ou artefato temporário foi versionado. A causa técnica está confirmada por código e regressão, mas o D19 permanece aberto até repetir fisicamente no AAB instalado pela Play o fechamento global com câmera e flash ativos, além de concluir claro/escuro e os demais cenários da matriz interrompida.

O commit `19b8c16` passou no check leve `35543490098` em 23 s e no CI autenticado pesado `35543490132` em 34m40s. O pesado concluiu preflight, unitários, Worker, Functions e Playwright autenticado sem skip adicional ou recorrência dos incidentes de login/perfil. Após o verde, foi produzido o AAB release `versionCode 24`, mantendo `versionName 0.11.0-beta`, pacote `com.hermegas.trofia`, Camera Preview 8.0.1, App Check 8.4.0, `google-services.json` real e as duas configurações públicas incorporadas ao bundle. `verifyReleaseSecurityConfig` e `verifyReleaseBundleSecurity` passaram, a assinatura foi confirmada novamente por `jarsigner` e a origem/cópia estável coincidiram no SHA-256 `1006C3A0EA158505AE1C9A8A05884F4E2EDB0A0371BEA7D920FD7020B348292F`. O `versionCode` rastreado foi restaurado após o build; o candidato aguarda upload manual na faixa interna e prova física, portanto CAM-RED-4 permanece em andamento.

O AAB `versionCode 24` foi posteriormente instalado pela faixa interna da Play e confirmado no Galaxy SM-S938B com `installerPackageName=com.android.vending`. O login descartável concluiu o bootstrap sem erro de perfil. Nos temas escuro e claro, o preview apareceu sem quadro preto; o rótulo visual “Câmera ativa” não reapareceu; o raio preenchido e a escala comum de 52 px entre pill e X foram observados; o flash iluminou fisicamente a cena; e a captura com iluminação ativa produziu fotografia congelada visível. O cenário exato D19 também passou: com preview e flash ativos, “Fechar reconhecimento” encerrou a sessão, desconectou o cliente nativo e retornou ao formulário sem palco congelado, torch órfão ou exceção do processo.

A mesma prova encontrou uma divergência visual objetiva: embora as curvas fossem desenhadas, a máscara usa `rgba(6, 16, 13, .94)` e ainda deixa a imagem nativa aparecer nos quatro triângulos externos aos arcos. Assim, o palco permanece perceptivelmente quadrado nos dois temas. Uma correção local não commitada chegou a tornar a porção externa do gradiente totalmente opaca, mas exigiria novo gate, AAB Play e prova física. Em 21/09/2026, o usuário decidiu explicitamente transferir esse acabamento mínimo para o início da CAM-RED-5, que já voltará a alterar e validar o palco; a mudança não validada foi retirada da branch da CAM-RED-4. O impacto é neutro para flash, captura, teardown e D19, e a limitação visual conhecida fica registrada sem ser apresentada como resolvida.

Ao final da prova, os arquivos temporários e capturas foram removidos, o logout ficou visível, o app foi forçado a parar e não restou cliente de câmera. Não Perturbar foi desligado, sincronização ficou ativa, permanência acordada via USB voltou a `0`, rotação e economia de energia foram preservadas e o timeout retornou a 30 segundos por último. Todos os processos ADB foram encerrados antes de liberar a desconexão. Nenhuma credencial, UID, token, foto ou dado pessoal integra este registro.

**PRs/commits relacionados:** [PR draft #227](https://github.com/magnoClovis/nutrition-tracker/pull/227), commits funcionais `5bc3313` e `19b8c16`, registro do D19 `714e4f3`, HEADs de AAB `ddebe47` (v21), `a7d2920` (v23) e `19b8c16` (v24), merges de atualização da `main` `a33734f`, `725672e`, `3eed516` e `00f111e`, CIs leves [`35252508909`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35252508909)/[`35464423717`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35464423717)/[`35532248281`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35532248281)/[`35543490098`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35543490098) e pesados [`35252508927`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35252508927)/[`35464423719`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35464423719)/[`35532248273`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35532248273)/[`35539767485`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35539767485)/[`35543490132`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35543490132); leases do gate local retomado [`35462461612`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35462461612), [`35463114620`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35463114620) e [`35463856714`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35463856714); contenção esperada com os CIs [`35458919766`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35458919766) e [`35460807918`](https://github.com/magnoClovis/nutrition-tracker/actions/runs/35460807918); registros preparatórios nos commits `0c00746`, `f7f2e55`, `2c48cd3`, `c9cd0dd`, `0fdc28e`, `0c7226d`, `2b54538` e `a7d2920`; investigação externa no PR documental draft #225, `INC-AUTH-BOOTSTRAP-20260917`; correção de perfil do Chat Principal no [PR #229](https://github.com/magnoClovis/nutrition-tracker/pull/229), mesclado em `1e9ef55`; correção técnica separada no [PR #224](https://github.com/magnoClovis/nutrition-tracker/pull/224), mesclado em `9f252d6`. — **Chat-Origin:** Trofia-UIUX.

## Encerramento administrativo do PR documental obsoleto #170

### [DOC-PR170-CLOSEOUT] - Fechamento sem merge do registro duplicado da S8

- **Status:** concluído — **Chat:** Trofia-Principal.
- **Data de início:** 31/08/2026, data do único commit do PR original.
- **Data de conclusão:** 16/09/2026.
- **Tempo decorrido:** 15 dias 19 h 49 min 52 s, do commit `39abd3d` ao fechamento sem merge do PR.
- **Minutos de CI:** 22 s leves, correspondentes ao `Documentation preflight` `33448649654`; nenhuma suíte pesada foi executada porque o PR alterava somente Markdown.
- **Propósito:** encerrar com evidência um PR documental antigo que continuava aberto apesar de a S8 já estar concluída e documentada na `main`, evitando merge regressivo e removendo resíduos de branch/worktree.
- **O que se planeja fazer:** auditar o conteúdo e a linha do tempo do PR #170, comparar sua branch com a `main`, confirmar ausência de trabalho exclusivo, fechar sem merge se estivesse superado e remover com segurança apenas o worktree e as branches correspondentes.
- **Recursos/arquivos principais envolvidos:** GitHub PR #170 e sua timeline, `git merge-tree`, `git blame`, `documentation/estado-atual/RESUMO-STATUS.md`, este histórico, branch `codex/docs-s8-completion` e worktree `.codex-ui-s8-status`.
- **O que foi feito:** a auditoria comprovou que o PR #170 continha somente o commit documental `39abd3d`, criado após o merge da S8 no PR #166 para mover a fatia a “concluída”, registrar o gate 93/93 e ainda manter S9 como planejada. Não havia comentário, revisão, check pendente ou alteração local no worktree; o PR apenas fora retirado do draft em 09/09 sem receber ação posterior. A `main` já possuía o registro equivalente ou mais completo por meio dos PRs #169, #172 e #196, inclusive S9 concluída, merge `e68bc20` e run `33446146673`. A simulação mostrava conflitos nos dois documentos e o texto antigo sobre S9 seria regressivo. O PR foi fechado sem merge com justificativa pública; o worktree limpo foi removido pelo Git e a branch local/remota apagada. Nenhum código ou estado funcional do produto mudou.
- **Alinhamento:** 100%; a limpeza seguiu integralmente o plano auditado, preservou a documentação vigente e teve impacto positivo de higiene e rastreabilidade, sem perda de trabalho exclusivo.
- **PRs/commits relacionados:** [PR #170 — fechado sem merge](https://github.com/magnoClovis/nutrition-tracker/pull/170), commit obsoleto `39abd3d`, preflight `33448649654`; conteúdo vigente rastreado nos PRs #169, #172 e #196. — **Chat:** Trofia-Principal.

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
- O PR #150 registra a implementação, o diagnóstico do stacking context residual, a correção final e o gate autenticado que concluiu S1–S9 na `main`.

## Métricas retroativas

| PR | Tempo decorrido | Minutos de CI | Chat-Origin |
|---:|---:|---:|---|
| [#126](https://github.com/magnoClovis/nutrition-tracker/pull/126) | 58 min | 19 min (0 leve + 19 pesado) | Trofia-UIUX |
| [#130](https://github.com/magnoClovis/nutrition-tracker/pull/130) | 3 h 2 min | 14 min (0 leve + 14 pesado) | Trofia-UIUX |
| [#133](https://github.com/magnoClovis/nutrition-tracker/pull/133) | 1 h 13 min | 25 min (0 leve + 25 pesado) | Trofia-UIUX |
| [#136](https://github.com/magnoClovis/nutrition-tracker/pull/136) | 28 min | 24 min (0 leve + 24 pesado) | Trofia-UIUX |
| [#138](https://github.com/magnoClovis/nutrition-tracker/pull/138) | 1 h 3 min | 19 min (0 leve + 19 pesado) | Trofia-UIUX |
| [#141](https://github.com/magnoClovis/nutrition-tracker/pull/141) | 2 h 16 min | 18 min (0 leve + 18 pesado) | Trofia-UIUX |
| [#144](https://github.com/magnoClovis/nutrition-tracker/pull/144) | 46 min | 36 min (0 leve + 36 pesado) | Trofia-UIUX |
| [#146](https://github.com/magnoClovis/nutrition-tracker/pull/146) | 47 min | 46 min (0 leve + 46 pesado) | Trofia-UIUX |
| [#148](https://github.com/magnoClovis/nutrition-tracker/pull/148) | 1 h 22 min | 27 min (0 leve + 27 pesado) | Trofia-UIUX |
| [#150](https://github.com/magnoClovis/nutrition-tracker/pull/150) | 9 d 23 h 31 min | 27 min (0 leve + 27 pesado) | Trofia-UIUX |
| [#166](https://github.com/magnoClovis/nutrition-tracker/pull/166) | 3 h 40 min | 31 min (1 leve + 30 pesado) | Trofia-UIUX |
| [#172](https://github.com/magnoClovis/nutrition-tracker/pull/172) | 1 d 1 h 36 min | 32 min (1 leve + 31 pesado) | Trofia-UIUX |
| [#185](https://github.com/magnoClovis/nutrition-tracker/pull/185) | 9 h 24 min | 45 min (1 leve + 44 pesado) | Trofia-UIUX |
| [#187](https://github.com/magnoClovis/nutrition-tracker/pull/187) | 2 h 23 min | 44 min (1 leve + 43 pesado) | Trofia-UIUX |
| [#190](https://github.com/magnoClovis/nutrition-tracker/pull/190) | 1 h 32 min | 62 min (1 leve + 61 pesado) | Trofia-UIUX |
| [#192](https://github.com/magnoClovis/nutrition-tracker/pull/192) | 1 h 1 min | 33 min (1 leve + 32 pesado) | Trofia-UIUX |
