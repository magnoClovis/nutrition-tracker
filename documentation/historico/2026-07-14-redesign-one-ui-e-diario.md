# Histórico — redesign One UI 8 e evolução do Diário

## Escopo, atribuição e método

Este documento registra exclusivamente o trabalho implementado nesta conversa na frente de redesign One UI 8 e nas correções subsequentes do Diário Nutricional. A atribuição parte da memória da conversa, conforme autorizado pelo responsável, e foi conferida contra a sequência de commits hoje presente em `main`, os arquivos alterados em cada commit e as associações de pull request disponíveis no GitHub.

- **Período confirmado:** 14/07/2026.
- **Commit inicial da frente:** [`6e21f4d`](https://github.com/magnoClovis/nutrition-tracker/commit/6e21f4db043b333d4ef8c630e0e34f39dcc30332).
- **Commit final da frente:** [`985673c`](https://github.com/magnoClovis/nutrition-tracker/commit/985673c52a9cd99cc48d3cb4dfde8b5f828f6c14).
- **Forma de integração:** os 18 commits identificados estão em uma sequência linear e a busca dos respectivos SHAs no GitHub não encontrou PRs associados. Por isso, cada item abaixo cita seus commits diretos e informa explicitamente a ausência de PR encontrado.
- **Códigos formais:** nenhum título recebeu código C01–C28, N01–N09, A01–A12, G01, B05 ou F06. A frente é anterior à criação desse sistema, em 31/07/2026, e não corresponde exatamente às entregas posteriormente catalogadas; atribuir códigos por semelhança temática seria retroativo e impreciso.
- **Caminhos históricos:** `app.js`, `nutrition-tracker.jsx`, `one-ui.css` e `index.html` eram os artefatos centrais no momento das mudanças. O projeto foi modularizado depois; os caminhos listados em cada item representam os arquivos efetivamente alterados nos commits históricos, não necessariamente a organização atual do código.
- **Validação:** a conversa incluiu inspeção do site publicado e automação autenticada com Playwright para confirmar cascata CSS, valores computados, posicionamento e comportamento. Capturas locais usadas durante a validação não foram versionadas e, portanto, não são apresentadas aqui como artefatos permanentes.

---

## Fundação visual One UI 8 e responsividade

**Data (se determinável):** 14/07/2026.

**Propósito:** substituir a apresentação anterior por uma linguagem visual coerente com One UI 8 sem alterar rotas, persistência, APIs, handlers ou estruturas de dados. O trabalho precisava atender celular, tablet e desktop como layouts distintos, preservar os recursos já existentes e tornar o modo escuro uma implementação completa, não uma simples inversão parcial de cores.

**Recursos:** React com `React.createElement`, CSS custom properties, media queries, recursos CSS `color-mix()` e `backdrop-filter`, gráficos já existentes no aplicativo e GitHub Pages.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `one-ui.css` — criado como folha de estilo dedicada da frente.
- `index.html`

**O que foi feito:**

- Foi criada uma camada visual centralizada em `one-ui.css`, com tokens de superfície, texto, categorias nutricionais, raios, duração e easing. A folha passou a ser carregada por `index.html`, evitando dispersar novos valores de cor e raio pelos componentes.
- Foram introduzidos focus blocks sem bordas visíveis, botões e chips em pílula, tipografia em sentence case, navegação flutuante, superfícies temáticas para proteína, calorias e água e tratamentos equivalentes no modo claro e no modo escuro.
- O comportamento responsivo foi separado por breakpoint: raio maior e alvos de toque generosos no mobile; raio menor, densidade mais compacta, hover e grids de múltiplas colunas no desktop. O tablet permaneceu como transição do layout móvel, em vez de receber uma terceira árvore de componentes.
- Diário, Alimentos, Semana e Métricas foram ajustados por classes e atributos de apresentação, mantendo a mesma árvore de dados e os mesmos callbacks. Em particular, o Diário ganhou coluna lateral de resumos no desktop e fluxo vertical no mobile; Semana passou a usar resumos e gráficos em grid; Métricas e Alimentos receberam limites de leitura e agrupamentos coerentes.
- A biblioteca de gráficos, o roteamento, o estado e a persistência não foram substituídos. A decisão central foi aplicar o redesign como camada incremental de CSS e marcação auxiliar, reduzindo o risco de regressão funcional.

**PRs/commits relacionados:**

- Commit direto: [`6e21f4d` — Apply One UI presentation updates](https://github.com/magnoClovis/nutrition-tracker/commit/6e21f4db043b333d4ef8c630e0e34f39dcc30332).
- PR associado: nenhum encontrado para o SHA no GitHub.

---

## Gradiente da página e superfícies glass

**Data (se determinável):** 14/07/2026.

**Propósito:** dar profundidade discreta ao fundo e permitir que os cards parecessem superfícies translúcidas, sem transformar o aplicativo em uma composição de efeitos chamativos. Uma correção adicional foi necessária porque a transparência existia na regra do card, mas uma camada ancestral sólida impedia o gradiente de aparecer na composição final.

**Recursos:** CSS custom properties, gradiente radial fixo, `color-mix()`, `backdrop-filter`, inspeção de DOM e `getComputedStyle()` com Playwright.

**Arquivos:**

- `one-ui.css`
- `app.js`
- `nutrition-tracker.jsx`
- `index.html`

**O que foi feito:**

- Foi definido um gradiente radial verde/teal dessaturado que se dissolve em `--surface-page`, com variantes próprias para os temas claro e escuro e fixação em relação à viewport.
- Os focus blocks comuns passaram a usar variáveis de superfície calculadas por `color-mix()`, acompanhadas de blur leve. Elementos flutuantes conservaram tratamento mais forte, enquanto os dois cards principais de proteína e calorias permaneceram sólidos por decisão visual explícita.
- Como a primeira aplicação parecia não produzir efeito, a versão publicada foi inspecionada com Playwright. O DOM real, os atributos, os valores computados e a cadeia completa de ancestrais foram examinados, em vez de presumir que a regra-fonte bastava.
- A investigação identificou o agrupador `data-diary-content-stack` como camada que ainda apresentava fundo opaco entre os cards e o gradiente. A correção pontual tornou somente esse agrupador transparente, preservando os fundos individuais dos cards e evitando uma reescrita ampla da cascata.
- O cache-busting de `one-ui.css` e de `app.js` foi atualizado ao longo das correções para que o GitHub Pages servisse os artefatos correspondentes à revisão visual validada.

**PRs/commits relacionados:**

- Commit direto: [`6e21f4d` — Apply One UI presentation updates](https://github.com/magnoClovis/nutrition-tracker/commit/6e21f4db043b333d4ef8c630e0e34f39dcc30332).
- Commit direto: [`ffabe33` — Style diary greeting and nutrients blocks](https://github.com/magnoClovis/nutrition-tracker/commit/ffabe33e1d0c6ee67bf1f42c09d7cb5ea74858c8).
- Commit direto: [`d2dd8b2` — Expose page gradient behind diary cards](https://github.com/magnoClovis/nutrition-tracker/commit/d2dd8b2526989ee3a07a773e4229fc67c3fea26c).
- PR associado: nenhum encontrado para esses SHAs no GitHub.

---

## Opacidade definitiva de 50% nos focus blocks

**Data (se determinável):** 14/07/2026.

**Propósito:** resolver a ambiguidade visual causada por superfícies inicialmente definidas com 94% de opacidade. Embora tecnicamente transparentes, elas eram praticamente indistinguíveis de um fundo sólido. O valor de 50% foi primeiro usado como prova visual controlada e, após aprovação explícita, tornou-se o valor definitivo do design.

**Recursos:** CSS `color-mix()`, variáveis `--focus-surface` e `--focus-surface-alt`, blur de fundo e Playwright para leitura de estilos computados no site publicado.

**Arquivos:**

- `one-ui.css`
- `index.html`

**O que foi feito:**

- `--focus-surface` passou a misturar `var(--surface-block)` em 50% com transparência; `--focus-surface-alt` recebeu o mesmo tratamento sobre `var(--surface-block-alt)`.
- O percentual foi aplicado de modo equivalente nos temas claro e escuro. Blur, raio, espaçamento e demais valores permaneceram inalterados para isolar a variável sob teste.
- A exceção dos cards principais de proteína e calorias foi preservada: eles continuaram com superfícies temáticas opacas e sem blur, mantendo o contraste dos indicadores mais importantes do Diário.
- O resultado foi verificado pelo `background-color` computado do card de refeição, incluindo canal alfa de aproximadamente `0.5`. Depois da aprovação, não houve novo ajuste numérico; apesar do título histórico do commit conter “Test”, 50% tornou-se o valor final adotado.
- O parâmetro de versão da folha de estilo foi incrementado para invalidar a versão anterior no deploy.

**PRs/commits relacionados:**

- Commit direto: [`76b99c6` — Test focus surfaces at fifty percent opacity](https://github.com/magnoClovis/nutrition-tracker/commit/76b99c6f684257f834815ec0dcdd118d2bfd4a77).
- PR associado: nenhum encontrado para o SHA no GitHub.

---

## Cards individuais das refeições do Diário

**Data (se determinável):** 14/07/2026.

**Propósito:** eliminar a aparência de “blocão” contínuo nas refeições do Diário. Café da manhã, pré-treino, almoço e demais seções precisavam ser percebidos como unidades independentes, com o gradiente visível entre elas e com raios coerentes em cada breakpoint.

**Recursos:** marcação React por refeição, seletores por `data-*`, CSS Grid/Flexbox, `gap`, `border-radius`, superfícies glass e validação visual com Playwright.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `one-ui.css`
- `index.html`

**O que foi feito:**

- Cada seção de refeição recebeu identificação individual por `data-diary-meal-card="true"`, permitindo aplicar fundo, raio, overflow e espaçamento ao elemento efetivamente repetido, e não apenas ao container pai.
- A separação passou a ser baseada em espaço real entre cards, sem usar divisores retos para simular limites. No mobile, a margem entre cards foi preservada; no desktop, o grid recebeu `row-gap` explícito para evitar dependência de margens anuladas.
- Foi corrigida uma regra desktop excessivamente ampla, `[data-screen="diario"] > * { margin-bottom: 0 !important; }`, que zerava a margem dos cards. A exceção específica dos cards de refeição e o gap do container tornaram a separação robusta na cascata real.
- A camada pai do conteúdo foi deixada transparente para que a área entre cards revelasse o gradiente da página, enquanto cada refeição manteve sua própria superfície translúcida e seus cantos arredondados.
- A versão publicada foi inspecionada no DOM real para confirmar a presença do atributo, o `border-radius`, o fundo computado e o espaçamento em mobile e desktop.

**PRs/commits relacionados:**

- Commit direto: [`6e21f4d` — Apply One UI presentation updates](https://github.com/magnoClovis/nutrition-tracker/commit/6e21f4db043b333d4ef8c630e0e34f39dcc30332).
- Commit direto: [`f662282` — Fix meal card spacing and saved meal access](https://github.com/magnoClovis/nutrition-tracker/commit/f662282eeaa81895686e1f1838ae3ec9714b8bdc).
- Commit direto: [`d2dd8b2` — Expose page gradient behind diary cards](https://github.com/magnoClovis/nutrition-tracker/commit/d2dd8b2526989ee3a07a773e4229fc67c3fea26c).
- PR associado: nenhum encontrado para esses SHAs no GitHub.

---

## Lista compacta e expansível de alimentos salvos

**Data (se determinável):** 14/07/2026.

**Propósito:** reduzir a densidade da biblioteca “Salvos”, que exibia todos os nutrientes de todos os alimentos simultaneamente. A lista precisava oferecer leitura rápida por nome, proteína e calorias, sem perder o acesso aos dados nutricionais completos.

**Recursos:** estado React de expansão, atributos `data-pantry-food` e `data-pantry-expanded-nutrients`, accordion com easing spring, CSS Grid responsivo e focus blocks translúcidos.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `one-ui.css`
- `index.html`

**O que foi feito:**

- O estado padrão de cada alimento foi reduzido a uma linha compacta com nome, proteína e calorias. Carboidratos, açúcares, gorduras, saturadas, fibra, sal, vitaminas e referência de porção passaram a aparecer somente após clique/toque.
- A expansão reutilizou o padrão de accordion do app, com transição de altura/opacidade e easing elástico, sem alterar a estrutura dos alimentos persistidos.
- O padding inicialmente aplicado apenas ao painel de nutrientes não resolvia o cabeçalho colado à borda. A correção foi deslocar o respiro horizontal para o wrapper comum `data-pantry-food`, abrangendo tanto a linha principal quanto o conteúdo expandido.
- Para evitar padding duplicado, a área interna expandida foi ajustada. O antigo `flex-wrap`, que formava uma “nuvem” irregular de valores, foi substituído por grid com colunas adaptáveis e `row-gap` consistente.
- Os cards mantiveram alvos de toque adequados no mobile e estados de hover apenas no desktop.

**PRs/commits relacionados:**

- Commit direto: [`6e21f4d` — Apply One UI presentation updates](https://github.com/magnoClovis/nutrition-tracker/commit/6e21f4db043b333d4ef8c630e0e34f39dcc30332).
- Commit direto: [`f662282` — Fix meal card spacing and saved meal access](https://github.com/magnoClovis/nutrition-tracker/commit/f662282eeaa81895686e1f1838ae3ec9714b8bdc).
- PR associado: nenhum encontrado para esses SHAs no GitHub.

---

## Backup e importação fora da lista de alimentos

**Data (se determinável):** 14/07/2026.

**Propósito:** remover os controles de importar/exportar que haviam se tornado dois ícones circulares sem rótulo junto ao título “Salvos”. Essas ações administrativas não pertenciam ao fluxo cotidiano de consulta de alimentos e precisavam de contexto, rótulos e confirmação visual adequados.

**Recursos:** modal de backup já existente, React, ações globais de importação/exportação já implementadas, botões secundários em pílula e painel de configurações.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `one-ui.css`
- `index.html`

**O que foi feito:**

- Os atalhos soltos foram removidos do cabeçalho da lista “Salvos”, reduzindo ruído e evitando ações de alto impacto sem texto.
- Importação e exportação foram concentradas na área de backup/configurações acessível pela engrenagem do cabeçalho, reutilizando a funcionalidade existente em vez de recriar fluxos de persistência.
- As ações passaram a usar rótulos explícitos — “Importar dados” e “Exportar dados” — e o padrão visual de botão secundário em pílula.
- Nenhuma rotina de serialização, merge, upload ou download foi alterada; a mudança foi de localização, hierarquia e apresentação dos pontos de entrada.

**PRs/commits relacionados:**

- Commit direto: [`6e21f4d` — Apply One UI presentation updates](https://github.com/magnoClovis/nutrition-tracker/commit/6e21f4db043b333d4ef8c630e0e34f39dcc30332).
- PR associado: nenhum encontrado para o SHA no GitHub.

---

## Restauração do acesso a refeições salvas no registro

**Data (se determinável):** 14/07/2026.

**Propósito:** restaurar o ponto de entrada de uma funcionalidade existente: escolher uma refeição salva ao registrar o Diário, reaproveitando seus ingredientes e permitindo ajuste de quantidades. A lógica permanecia no projeto, mas o redesign havia tornado o acesso invisível ou aparentemente inoperante.

**Recursos:** React, estado e handlers de templates existentes, atributo `data-add-saved-meals`, seletor de método do registro e transição de painel.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `one-ui.css`
- `index.html`

**O que foi feito:**

- A busca no código confirmou que a lista de templates, seus dados e a rotina de carregamento ainda existiam; não foi criada uma segunda implementação da funcionalidade.
- A opção “Salvas” foi restaurada ao lado de “Montar refeição” e “Descrever prato”, como terceiro método persistente de entrada.
- O painel `data-add-saved-meals` foi movido no DOM para imediatamente depois do seletor de método. Antes, ele era renderizado acima do controle; ao selecionar “Salvas”, a expansão ocorria fora da área visível e parecia não responder.
- A aba passou a permanecer visível mesmo quando `mealTemplates.length === 0`. Nesse caso, o painel exibe um estado vazio curto, em vez de esconder o acesso ou emitir somente uma notificação.
- O carregamento de um template continuou usando os handlers e a estrutura de itens já existentes, preservando a possibilidade de editar quantidades antes de registrar.

**PRs/commits relacionados:**

- Commit direto: [`6e21f4d` — Apply One UI presentation updates](https://github.com/magnoClovis/nutrition-tracker/commit/6e21f4db043b333d4ef8c630e0e34f39dcc30332).
- Commit direto: [`f662282` — Fix meal card spacing and saved meal access](https://github.com/magnoClovis/nutrition-tracker/commit/f662282eeaa81895686e1f1838ae3ec9714b8bdc).
- PR associado: nenhum encontrado para esses SHAs no GitHub.

---

## Cards temáticos e organização da tela Semana

**Data (se determinável):** 14/07/2026.

**Propósito:** alinhar os resumos semanais com a semântica visual já aprovada no Diário e aproveitar adequadamente a largura desktop. Os cards neutros com apenas o número colorido não comunicavam a categoria com a mesma rapidez dos cards principais.

**Recursos:** React, CSS Grid, variáveis de categoria de proteína e calorias e biblioteca de gráficos já utilizada pelo aplicativo.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `one-ui.css`
- `index.html`

**O que foi feito:**

- “Média proteína” e “Dias meta prot.” passaram a reutilizar o fundo e o texto temáticos de proteína; “Média calorias” e “Banco de calorias” passaram a reutilizar os equivalentes de calorias. Nenhum tom decorativo novo foi criado.
- Os quatro resumos foram organizados em 2 × 2 no mobile e em uma linha de quatro colunas no desktop.
- Os gráficos de proteína e calorias permaneceram empilhados no mobile e foram colocados lado a lado em telas largas, com linhas suaves, preenchimento discreto e grid visual reduzido.
- A tira de dias e a lista de médias por refeição foram mantidas em leitura contínua, sem modificar as funções de agregação ou o formato do histórico.

**PRs/commits relacionados:**

- Commit direto: [`6e21f4d` — Apply One UI presentation updates](https://github.com/magnoClovis/nutrition-tracker/commit/6e21f4db043b333d4ef8c630e0e34f39dcc30332).
- PR associado: nenhum encontrado para o SHA no GitHub.

---

## Reestruturação das métricas e do histórico corporal

**Data (se determinável):** 14/07/2026.

**Propósito:** reduzir cards órfãos, placeholders sem valor e a densidade da tabela de histórico corporal. A tela precisava apresentar primeiro os dados realmente existentes, reservar detalhes para expansão e fechar seus grids sem linhas visualmente incompletas.

**Recursos:** React, CSS Grid, estado de accordion, modelo de métricas existente, Recharts já presente e variáveis One UI.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `one-ui.css`
- `index.html`

**O que foi feito:**

- Cards cujo único conteúdo seria “—” passaram a ser omitidos na apresentação. O caso explícito foi “Peso alvo estimado” em Composição corporal quando não havia peso-alvo disponível.
- Grids passaram a escolher duas ou três colunas conforme a quantidade de cards reais, evitando TMB, Tendência ou outra métrica isolada em uma linha final.
- A classificação do IMC foi movida para dentro do card de IMC como segunda linha discreta, removendo a frase duplicada que ficava solta abaixo do grupo.
- O histórico deixou de ser uma tabela larga com colunas inteiras de travessões. Cada registro passou a aparecer como linha compacta colapsada — data e peso — e a expansão passou a mostrar somente IMC, gordura, músculo e cintura que possuíssem valor naquele registro.
- Campos ausentes em todo o conjunto histórico foram eliminados da apresentação. A mudança foi de leitura e renderização; registros persistidos e fórmulas do modelo não foram reformatados.
- No desktop, formulário e resumos/gráficos foram distribuídos em duas colunas; no mobile, a hierarquia permaneceu vertical e os cards correntes usaram grids compactos.

**PRs/commits relacionados:**

- Commit direto: [`6e21f4d` — Apply One UI presentation updates](https://github.com/magnoClovis/nutrition-tracker/commit/6e21f4db043b333d4ef8c630e0e34f39dcc30332).
- PR associado: nenhum encontrado para o SHA no GitHub.

---

## Correção de “Progresso e previsão”

**Data (se determinável):** 14/07/2026.

**Propósito:** corrigir uma regressão de layout na qual o texto descritivo e os cards de Déficit/Tendência disputavam duas colunas estreitas. Os rótulos eram cortados e a seção não seguia o padrão de “Composição corporal” existente na mesma tela.

**Recursos:** React, CSS Grid, atributos específicos da seção, Playwright autenticado e inspeção de `grid-template-columns`, largura e overflow computados.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `one-ui.css`
- `index.html`

**O que foi feito:**

- O cabeçalho da seção ganhou uma linha própria de largura total: título à esquerda e “Mais info” à direita, sem sobreposição.
- O texto “Visão rolante dos dias concluídos, sem contar hoje.” foi colocado abaixo do título também em largura total, retirando-o da coluna estreita.
- Os cards de Déficit e Tendência foram movidos para um grid independente abaixo da descrição, ocupando toda a largura disponível e seguindo altura, padding e raio equivalentes aos cards de Composição corporal.
- No mobile, o grid usa duas colunas suficientemente largas para preservar “Déficit”, “Tendência” e “kg/sem”; em larguras menores, a regra permite quebra sem abreviar os rótulos. No desktop, a mesma estrutura aproveita a largura maior sem reposicionar a descrição ao lado dos cards.
- As cores de dados que já distinguiam Déficit e Tendência foram preservadas; o ajuste não reaproveitou indevidamente as cores semânticas de proteína e calorias.

**PRs/commits relacionados:**

- Commit direto: [`b5e2da9` — Fix metrics progress grid structure](https://github.com/magnoClovis/nutrition-tracker/commit/b5e2da9e22729559fee4b7f286165744bb7accfc).
- PR associado: nenhum encontrado para o SHA no GitHub.

---

## Persistência inicial da escolha de tema

**Data (se determinável):** 14/07/2026.

**Propósito:** corrigir o retorno recorrente ao tema claro após recarregar a página. A escolha feita no menu interno não era controlada pelo mesmo estado do componente `App`, o que permitia divergência entre o tema visível, o tema armazenado e o tema aplicado no reload.

**Recursos:** React state/props, `localStorage`, atributo `data-theme` no elemento `html` e Playwright smoke tests.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `index.html`
- `tests/smoke/app.smoke.spec.js`

**O que foi feito:**

- O controle de tema do cabeçalho passou a receber `onDarkModeChange` do `App`, estabelecendo um único owner para a preferência.
- O fallback local do cabeçalho também foi tornado persistente: ao alternar, calcula o próximo valor, grava `appDarkMode` e só então atualiza o estado.
- A inicialização passou a distinguir explicitamente as strings `"true"` e `"false"`, aplicando `data-theme="dark"` ou `data-theme="light"` em vez de tratar apenas o caso escuro.
- Foi acrescentado smoke test que grava cada preferência no armazenamento, recarrega a aplicação, aguarda o fim do loading e verifica o atributo efetivo do `html`.
- Essa etapa preservava o padrão claro então vigente; a migração posterior para padrão escuro foi uma decisão separada e está registrada em item próprio.

**PRs/commits relacionados:**

- Commit direto: [`31bfdfd` — Persist theme preference across reloads](https://github.com/magnoClovis/nutrition-tracker/commit/31bfdfd36454f5bc4224c8090a18e92d8eb3c113).
- PR associado: nenhum encontrado para o SHA no GitHub.

---

## Tema correto antes da montagem do React

**Data (se determinável):** 14/07/2026.

**Propósito:** eliminar o flash claro da tela estática “Carregando...” quando a preferência salva era escura. Como essa tela é pintada antes de React e Firebase terminarem a inicialização, corrigir apenas o estado do `App` não poderia evitar o quadro inicial incorreto.

**Recursos:** script inline síncrono no `<head>`, `localStorage`, atributo `data-theme`, CSS variables e tela de loading do HTML estático.

**Arquivos:**

- `index.html`

**O que foi feito:**

- Um script pequeno foi movido para antes dos estilos e do conteúdo do `body`, de forma que a preferência fosse lida antes do primeiro paint.
- O script aplica imediatamente `document.documentElement.dataset.theme` e a classe auxiliar do loading, com `try/catch` para ambientes em que o acesso ao armazenamento falhe.
- O fundo e o texto do `#loading` deixaram de usar cores claras fixas e passaram a consumir `--surface-page` e `--text-secondary`, com fallbacks compatíveis.
- A variante escura do spinner também passou a usar borda e accent do tema, evitando que apenas o fundo mudasse.
- A antiga segunda inicialização de tema, executada mais tarde no documento, foi removida para evitar duas fontes de verdade e mudança de tema depois do primeiro paint.

**PRs/commits relacionados:**

- Commit direto: [`023691a` — Apply saved theme before loading screen paints](https://github.com/magnoClovis/nutrition-tracker/commit/023691ad05b13192a8fda4b3e7801c4ce21b92a5).
- PR associado: nenhum encontrado para o SHA no GitHub.

---

## Migração única para tema escuro como novo padrão

**Data (se determinável):** 14/07/2026.

**Propósito:** alterar o padrão do produto para tema escuro inclusive para instalações já existentes, sem apagar escolhas futuras. O requisito era uma migração única: no primeiro acesso após a mudança, todos receberiam escuro; depois disso, qualquer escolha explícita de claro ou escuro deveria permanecer autoritativa.

**Recursos:** `localStorage`, React, script de bootstrap em `index.html` e Playwright smoke tests.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `index.html`
- `tests/smoke/app.smoke.spec.js`

**O que foi feito:**

- Foi introduzida a chave de migração versionada `appThemeDefaultDarkV1`, separada da preferência `appDarkMode`.
- `readPreferredDarkMode()` aplica escuro e grava o marcador quando a migração ainda não ocorreu. Em execuções posteriores, a função respeita `appDarkMode`; se a preferência não existir, escuro continua sendo o fallback.
- Login e `App` passaram a inicializar pelo mesmo helper, evitando que a tela de autenticação e a aplicação principal adotassem defaults diferentes.
- O script pré-paint de `index.html` reproduz a mesma regra antes de React: executa a migração uma vez, escolhe claro somente quando o valor salvo é explicitamente `"false"` e usa escuro como fallback se o armazenamento lançar erro.
- O teste foi ampliado para provar três fases: preferência antiga clara sem marcador migra para escuro; escolha clara feita depois da migração sobrevive ao reload; escolha escura posterior também sobrevive.

**PRs/commits relacionados:**

- Commit direto: [`e027918` — Make dark theme the new default](https://github.com/magnoClovis/nutrition-tracker/commit/e02791854cbea75aa9c02defde11d7a51dce13c2).
- PR associado: nenhum encontrado para o SHA no GitHub.

---

## Cabeçalho do Diário com ticker ao vivo

**Data (se determinável):** 14/07/2026.

**Propósito:** reorganizar o cabeçalho do Diário e substituir a saudação estática por informação útil e rotativa. O componente precisava conservar a saudação diária existente, incluir progresso de nutrientes configurados e permitir navegação automática e manual sem modificar os dados nutricionais.

**Recursos:** React hooks, timers, eventos pointer/touch, `localStorage`, metas e consumo diário já calculados, CSS transforms/transitions, Playwright autenticado e teste unitário dedicado.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `one-ui.css`
- `index.html`
- `tests/unit/diary-ticker.test.js`

**O que foi feito:**

- O título foi separado visualmente da área funcional; refresh foi removido e engrenagem mantida. Ticker, toggle Treino/Descanso e peso/IMC foram agrupados em uma única região de cabeçalho.
- O primeiro slide continua sendo a saudação escolhida uma vez por dia e por período, com nome do usuário e emoji de manhã, tarde ou noite.
- Slides adicionais são construídos somente para nutrientes com meta configurada e consumo relevante: proteína, calorias, carboidratos, gorduras, gordura saturada, fibra, sal e água. Açúcar foi deliberadamente excluído por não ter meta configurável.
- As mensagens são calculadas dinamicamente. Proteína, fibra e água permanecem positivas quando atingem ou superam a meta e informam quanto excederam; calorias, gorduras, gordura saturada e sal ficam neutras abaixo, verdes no alvo e em alerta quando excedem o teto.
- O ticker autoavança a cada cinco segundos, oferece dots de posição e aceita swipe no touch e drag com mouse. Interação manual reinicia a janela de avanço automático.
- A animação utiliza deslocamento horizontal e fade, com sinal determinado pela direção: avançar entra pela direita; voltar entra pela esquerda. Foi criado teste unitário para as regras de construção e estado dos slides.

**PRs/commits relacionados:**

- Commit direto: [`cf9a470` — Redesign diary header with live ticker](https://github.com/magnoClovis/nutrition-tracker/commit/cf9a470ca553126e7a49a08a7ad4a85be2c1fd53).
- PR associado: nenhum encontrado para o SHA no GitHub.

---

## Correções de temporização e direção do ticker

**Data (se determinável):** 14/07/2026.

**Propósito:** estabilizar o avanço automático e impedir que renders ou mudanças internas reiniciassem o relógio de cinco segundos de modo imprevisível. A interação manual também precisava resetar o timer sem inverter a semântica visual do gesto.

**Recursos:** React hooks e refs, `setTimeout`/cleanup, eventos pointer e transições CSS com easing spring.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `index.html`

**O que foi feito:**

- A programação do próximo avanço foi desacoplada de mudanças transitórias do slide, reduzindo rearmamentos involuntários a cada render.
- A interação manual passou a atualizar um sinal explícito de reset do timer, garantindo uma nova janela completa de cinco segundos após swipe, drag ou navegação pelos dots.
- Cleanup de timeout foi mantido na troca de estado e no unmount, impedindo callbacks antigos de avançarem o ticker fora de ordem.
- A direção lógica permaneceu vinculada ao gesto: arrastar para a esquerda avança e prepara entrada pela direita; arrastar para a direita volta e prepara entrada pela esquerda. O avanço automático reutiliza sempre a direção de avanço.
- O bundle de `app.js` recebeu nova chave de cache para que a correção de timing fosse observável no GitHub Pages.

**PRs/commits relacionados:**

- Commit direto: [`b325ab5` — Fix diary ticker auto advance timing](https://github.com/magnoClovis/nutrition-tracker/commit/b325ab53cdd71939c093137080b9a9fe9df5aefe).
- PR associado: nenhum encontrado para o SHA no GitHub.

---

## Card unificado do cabeçalho e texto sem truncamento

**Data (se determinável):** 14/07/2026.

**Propósito:** corrigir a aplicação apenas funcional do ticker: os textos rotacionavam, mas ticker, toggle e peso ainda pareciam elementos soltos, e mensagens longas eram truncadas com reticências. A meta era formar um card único e permitir leitura integral em uma ou mais linhas.

**Recursos:** marcação React, flexbox, superfícies glass, `white-space`, overflow, word wrapping e Playwright com screenshots de slides longos.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `one-ui.css`
- `index.html`

**O que foi feito:**

- A região do ticker e a linha de Treino/Descanso com peso/IMC foram envolvidas em um único chip/card de cabeçalho, com superfície translúcida, blur, borda discreta, padding e raio responsivo.
- O ícone do slide foi impedido de encolher, e o conteúdo textual passou a alinhar pelo topo, permitindo que a altura do card se adapte ao número de linhas.
- Foram removidos `white-space: nowrap`, `overflow: hidden` e `text-overflow: ellipsis` do texto. A regra final usa quebra normal, overflow visível e quebra de palavras quando necessário.
- Os dots foram posicionados abaixo da mensagem, sem disputar largura com o texto, e a linha do toggle permaneceu dentro do mesmo card.
- A lógica de slides, metas, timer, swipe e drag foi preservada; a alteração se limitou à estrutura de apresentação e ao CSS.

**PRs/commits relacionados:**

- Commit direto: [`1eb3bc8` — Make diary ticker chip visible and wrap text](https://github.com/magnoClovis/nutrition-tracker/commit/1eb3bc83159c91d720faf7611ea075011da05e87).
- PR associado: nenhum encontrado para o SHA no GitHub.

---

## Acabamento visual do cabeçalho

**Data (se determinável):** 14/07/2026.

**Propósito:** aproximar o cabeçalho do mockup aprovado depois que a estrutura funcional estava correta. Restavam quatro divergências visíveis: título excessivamente grande, superfície do chip sem destaque suficiente, dot ativo sem cor e bloco de Nutrientes/Sugestão com tratamento inconsistente.

**Recursos:** CSS variables, `color-mix()`, `backdrop-filter`, seletores `data-*`, Playwright, `getComputedStyle()` e cache-busting no GitHub Pages.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `one-ui.css`
- `index.html`

**O que foi feito:**

- “Diário Nutricional” foi reduzido para aproximadamente 17 px e peso 600, mantendo a data abaixo em tamanho menor e cor secundária. O título ficou deliberadamente mais discreto que o card funcional.
- A superfície do chip foi alinhada às variáveis de focus block, produzindo um leve tingimento próprio mesmo sobre regiões quase pretas do gradiente; a solução não depende apenas de “ver através” do card.
- O dot ativo passou a usar o teal de destaque do aplicativo, enquanto os dots inativos permaneceram cinza translúcido.
- O bloco que continha “Sugerir o que comer” e “Nutrientes” recebeu raio, superfície translúcida e blur equivalentes aos demais focus blocks como etapa intermediária antes de sua separação definitiva.
- `getComputedStyle()` foi usado para comparar background, raio e backdrop-filter do cabeçalho e do bloco de nutrientes com um focus block de referência. Em seguida, `index.html` recebeu novas chaves de versão para `one-ui.css` e `app.js`, garantindo que o acabamento publicado correspondesse ao código validado.

**PRs/commits relacionados:**

- Commit direto: [`ffabe33` — Style diary greeting and nutrients blocks](https://github.com/magnoClovis/nutrition-tracker/commit/ffabe33e1d0c6ee67bf1f42c09d7cb5ea74858c8).
- Commit direto: [`a0d0b13` — Polish diary header and nutrients block](https://github.com/magnoClovis/nutrition-tracker/commit/a0d0b13205b68fc3a4adbb6ba7f751d3886a3d73).
- Commit direto: [`efec4e5` — Bump diary UI bundle cache key](https://github.com/magnoClovis/nutrition-tracker/commit/efec4e53a855992dfe48996e44a076116c7a7550).
- PR associado: nenhum encontrado para esses SHAs no GitHub.

---

## Separação e ordenação de “Nutrientes” e “Sugerir o que comer”

**Data (se determinável):** 14/07/2026.

**Propósito:** desfazer o agrupamento indevido entre o painel informativo e a ação de sugestão. O requisito final era uma sequência inequívoca: cards principais, pill de progresso, Nutrientes e, somente depois, Sugerir o que comer.

**Recursos:** marcação React, ordem de layout por atributos `data-*`, flex/grid order, focus blocks independentes e cache-busting.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `one-ui.css`
- `index.html`

**O que foi feito:**

- O wrapper visual único foi desfeito. `data-diary-nutrients` e a área de sugestão passaram a ser elementos independentes, cada um com raio, superfície, blur e espaçamento próprios.
- O painel “Nutrientes” foi posicionado imediatamente depois da pill compacta de percentual de proteína/calorias.
- “Sugerir o que comer” foi movido para depois do painel, fora dele, preservando o handler e o fluxo de geração existentes.
- Regras de `order` e a estrutura React foram ajustadas em conjunto. Isso evitou uma correção apenas cosmética na qual o DOM continuaria com um elemento dentro do outro ou com a ordem semântica antiga.
- O bundle foi versionado novamente para confirmar no deploy a ordem `% → Nutrientes → Sugerir`, com espaço de gradiente visível entre os dois blocos.

**PRs/commits relacionados:**

- Commit direto: [`ebc413d` — Separate diary nutrients and suggestion blocks](https://github.com/magnoClovis/nutrition-tracker/commit/ebc413d99eea857e7270b4c396ca821a9891ccba).
- Commit direto: [`161fe67` — Apply diary visual order](https://github.com/magnoClovis/nutrition-tracker/commit/161fe67fffbb321b5a1b5c46f8fc80eee30c1555).
- PR associado: nenhum encontrado para esses SHAs no GitHub.

---

## Carregamento do histórico no calendário mensal

**Data (se determinável):** 14/07/2026.

**Propósito:** corrigir uma falha funcional no calendário expandido do Diário. A tela permanecia em “Carregando...”, todos os agregados apareciam zerados e nenhum dia recebia os marcadores de proteína, calorias na faixa ou excesso, apesar de o histórico existir no armazenamento.

**Recursos:** React effects/state, adaptador `window.storage`/Firestore existente, `Promise.all`, normalização de chaves de refeição, logging de erro, `try/catch/finally` e Playwright autenticado.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `index.html`

**O que foi feito:**

- A causa raiz foi localizada em `dayGoalForDate()`: a função montava `computedGoal`, mas não o retornava. Como `calendarMarkerFor()` recebia meta `undefined`, o cálculo de marcadores lançava erro dentro do `Promise.all` do mês.
- O loader não envolvia a promessa em `try/finally`; por isso, a rejeição interrompia o efeito antes de `setCalendarLoading(false)`. O erro simultaneamente impedia a gravação de `calendarData`, mantinha “Carregando...” e deixava os agregados em zero.
- Foi acrescentado `return computedGoal`, restabelecendo a meta correta para cada data e preservando o uso de `trainingByDate` e das metas customizadas já existentes.
- O carregamento mensal foi envolvido em `try/catch/finally`. Erros agora são registrados com o mês correspondente, e o estado de loading é encerrado no `finally` quando o efeito não foi cancelado.
- O fluxo continuou buscando `log_v2_<data>`, normalizando as chaves de refeição e calculando `calendarMarkerFor()` para cada dia até hoje. Não houve mudança de path, schema persistido ou fórmula dos status.
- A validação autenticada confirmou o desaparecimento do loading, agregados não zerados e dots nos dias com dados. O parâmetro de versão de `app.js` foi atualizado para publicar a correção.

**PRs/commits relacionados:**

- Commit direto: [`95a29cc` — Fix monthly calendar history loading](https://github.com/magnoClovis/nutrition-tracker/commit/95a29cc3230c92efac3031ad7dec99576c6fe696).
- PR associado: nenhum encontrado para o SHA no GitHub.

---

## Unificação de macros e micronutrientes

**Data (se determinável):** 14/07/2026.

**Propósito:** tornar “Nutrientes” um único painel coerente e eliminar o espaço vazio no estado recolhido. Micronutrientes apareciam como seção separada, com toggle próprio, depois do botão de sugestão; a estrutura quebrava a relação entre macros e micros e podia renderizar um bloco vazio.

**Recursos:** React, agregação de dados do Diário, `MICRO_FIELDS`, renderização condicional, atributos `data-diary-nutrients`/`data-diary-micros`, CSS e cache-busting.

**Arquivos:**

- `app.js`
- `nutrition-tracker.jsx`
- `one-ui.css`
- `index.html`

**O que foi feito:**

- Os micronutrientes do dia passaram a ser agregados uma única vez em `dailyMicros`, convertendo valores para número e somando cada campo sobre todas as entradas do Diário.
- `hasMicros` passou a verificar valores agregados diferentes de zero. Quando todos são zero, `renderDailyMicros()` retorna `null` e a subseção inteira desaparece, sem título, toggle ou espaço reservado.
- Quando existem valores, Micronutrientes é renderizado dentro do conteúdo expandido de `data-diary-nutrients`, depois dos macronutrientes. Campos individuais com total zero também são omitidos.
- O controle independente de Micronutrientes foi removido. O único estado de expansão passou a ser o do painel Nutrientes, que abre e fecha macros e micros em conjunto.
- O painel recebeu `data-expanded`; no estado `false`, padding vertical extra é zerado para que a altura fique justa ao cabeçalho e à seta, sem o espaço em branco observado anteriormente.
- “Sugerir o que comer” permaneceu depois e fora do painel, conservando a ordem visual estabelecida nos commits anteriores.

**PRs/commits relacionados:**

- Commit direto: [`985673c` — Unify diary nutrient details](https://github.com/magnoClovis/nutrition-tracker/commit/985673c52a9cd99cc48d3cb4dfde8b5f828f6c14).
- PR associado: nenhum encontrado para o SHA no GitHub.

---

## Fontes consultadas e limitações

- Memória desta conversa, usada como fonte primária de atribuição conforme orientação do responsável.
- [`documentation/README.md`](../README.md), para finalidade, convenção de nomes e disciplina de evidência da pasta.
- [`documentation/estado-atual/ROADMAP.md`](../estado-atual/ROADMAP.md), para conferir C01–C28 e N01–N09 e evitar códigos retroativos.
- [`documentation/estado-atual/BUG-INVENTORY.md`](../estado-atual/BUG-INVENTORY.md), para conferir o inventário formal e evitar reivindicar resolução de bugs apenas semelhantes.
- Metadados e diffs dos 18 commits citados, todos datados de 14/07/2026 na sequência atual de `main`.
- Busca de pull requests no GitHub pelo SHA completo de cada commit; nenhuma associação foi encontrada.
- As capturas de Playwright e os relatórios de `getComputedStyle()` produzidos durante a conversa não foram adicionados ao repositório. O uso dessa validação é confirmado pela conversa, mas caminhos ou arquivos de screenshot permanentes são **não determinados**.
- Não são atribuídos a esta frente itens apenas solicitados ou discutidos sem commit correspondente. Também não são incluídas alterações posteriores de modularização, arquitetura, Android, IA, compliance ou manutenção realizadas por outras conversas.
