# Histórico da frente — migração Vite, ESM, JSX e GitHub Pages

## Escopo, atribuição e método

Este registro cobre exclusivamente a frente executada nesta conversa entre 26 e 28/07/2026: introdução paralela do Vite, migração progressiva dos módulos UMD para fachadas ESM, nova entrada JSX, cutover de produção, publicação pelo GitHub Pages e correção do smoke pós-deploy. A atribuição conversacional foi confirmada pelo responsável após comparação com os índices de outras sete conversas do projeto.

As datas abaixo são datas de merge confirmadas pelo histórico Git. Cada entrega cita seu PR, o commit de implementação e o commit de merge. A classificação **C15 — Refatoração, modularização e limpeza do legado** é retrospectiva: o código C15 foi criado depois desta frente, mas o trabalho corresponde diretamente à fundação de modularização descrita hoje no roadmap. Isso não significa que C15 esteja concluído; `documentation/estado-atual/ROADMAP.md` ainda o classifica como **Parcial** porque a remoção definitiva das pontes, loaders e compatibilidades legadas permanece futura.

O `bug-inventory.txt` era o contrato de preservação comportamental durante toda a migração. Os bugs citados neste documento foram mantidos deliberadamente, não corrigidos. Eventuais resoluções posteriores registradas em `documentation/estado-atual/BUG-INVENTORY.md` pertencem a outras frentes e não são reivindicadas aqui.

---

## C15 - Baseline Vite paralelo e build com allowlist

**Data (se determinável):** 26/07/2026.

**Propósito:** introduzir o Vite sem colocar a produção existente em um estado parcialmente migrado. O site publicado ainda dependia de dezenas de scripts UMD carregados diretamente pelo `index.html`; por isso, a nova ferramenta precisava nascer em uma árvore paralela, produzir um artefato auditável e permitir comparação com o caminho legado antes de qualquer cutover.

**Recursos:** Vite 7.3.6 com versão exata; Node.js/npm; Rollup/esbuild internos ao Vite; scripts Node de verificação; GitHub Pages como destino futuro, ainda sem mudança operacional nesta etapa.

**Arquivos:**

- `index.vite.html` — entrada HTML paralela inicial;
- `src/vite-baseline.js` — bootstrap mínimo do caminho Vite;
- `vite.config.js` — configuração com `base: "./"`, saída isolada e cópia explícita de runtimes autorizados;
- `scripts/verify-vite-build.js` — verificador de allowlist e padrões sensíveis;
- `tests/unit/vite-build-verifier.test.js` — contrato unitário do verificador;
- `package.json` e `package-lock.json` — scripts e dependência exata `vite@7.3.6`;
- `.gitignore` — exclusão do diretório de build temporário.

**O que foi feito:**

- Criou-se uma segunda entrada completamente separada da produção UMD, sem alterar `index.html`, `app.js`, `nutrition-tracker.jsx` ou módulos já extraídos.
- A configuração adotou base relativa (`./`) para não fixar domínio nem o subcaminho do GitHub Pages.
- O build passou a copiar somente runtimes UMD explicitamente necessários. Não houve cópia irrestrita da raiz.
- O verificador passou a falhar diante de arquivos fora da allowlist, nomes associados a backup/dados pessoais, credenciais, service accounts ou documentação interna.
- Foram adicionados os comandos `dev:vite`, `build:vite` e `preview:vite`; `build:vite` obrigatoriamente executava a verificação de segurança após gerar o artefato.
- O Vite foi fixado literalmente em `7.3.6`, sem `^` ou `~`, para manter uma linha anterior à mudança de bundler do Vite 8.

**PRs/commits relacionados:** [PR #53](https://github.com/magnoClovis/nutrition-tracker/pull/53); implementação [`0d4c820`](https://github.com/magnoClovis/nutrition-tracker/commit/0d4c8204c79849815f1e2e47c56cffdc76e202bd); merge [`370afab`](https://github.com/magnoClovis/nutrition-tracker/commit/370afab40dc96b081c95bf7e871a73bc2020bfd7).

---

## C15 - Runtimes React e Recharts via npm no caminho Vite

**Data (se determinável):** 26/07/2026.

**Propósito:** substituir, somente na aplicação paralela, os bundles React/Recharts mantidos em `vendor/` por dependências npm reais. A mudança precisava manter o `index.html` legado carregando exatamente os mesmos arquivos vendorizados e evitar diferenças causadas por versão, ordem de execução ou `StrictMode`.

**Recursos:** React 18.3.1; ReactDOM 18.3.1; PropTypes 15.8.1; Recharts 2.10.4; `@vitejs/plugin-react` 5.1.4; Vite 7.3.6; npm; Playwright e testes unitários.

**Arquivos:**

- `package.json` e `package-lock.json` — cinco dependências com versões exatas;
- `vite.config.js` — integração do plugin React com runtime JSX clássico;
- `src/vite-baseline.js` — imports npm e ponte explícita para os scripts UMD restantes;
- `index.vite.html` — remoção dos runtimes vendorizados do caminho paralelo;
- `scripts/verify-vite-build.js` e `tests/unit/vite-build-verifier.test.js` — proibição dos bundles React vendorizados no artefato Vite.

**O que foi feito:**

- React, ReactDOM, PropTypes e as APIs efetivamente utilizadas de Recharts passaram a vir do npm apenas no caminho Vite.
- A ponte instalou os runtimes importados nos bindings globais esperados pelos módulos UMD, preservando a ordem histórica de carregamento dos 54 scripts da aplicação.
- Não foi introduzido `React.StrictMode`, evitando dupla execução de efeitos em desenvolvimento e qualquer divergência observável com o legado.
- A compatibilidade de `ResponsiveContainer`, `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip` e `ReferenceLine` foi verificada antes da troca.
- Foram comparados comportamento de hooks, estrutura renderizada, tamanho do bundle e tempo de carregamento. A regra adotada foi interromper diante de diferenças, nunca “normalizá-las” alterando expectativas.
- O caminho legado continuou usando `vendor/` sem nenhuma modificação.

**PRs/commits relacionados:** [PR #54](https://github.com/magnoClovis/nutrition-tracker/pull/54); implementação [`1d10ac2`](https://github.com/magnoClovis/nutrition-tracker/commit/1d10ac2020b6a27614fea400fa3260a803ad20c3); merge [`f1b274a`](https://github.com/magnoClovis/nutrition-tracker/commit/f1b274abeedb741852c18b2a09ddae5000106d8c).

---

## C15 - Fachadas ESM dos módulos folha

**Data (se determinável):** 26/07/2026.

**Propósito:** iniciar a redução da ponte UMD pelos módulos sem dependências internas coordenadas, sem duplicar lógica de domínio e sem converter a produção legada para módulos ES antes do momento seguro.

**Recursos:** módulos ES nativos; side-effect imports; namespaces UMD; Node `vm` nos testes; Vite; testes parametrizados UMD/ESM.

**Arquivos:**

- `src/leaf/read-legacy-namespace.js` — helper compartilhado de validação do namespace legado;
- `src/leaf/i18n.js`, `meal-score.js`, `goal-calculator.js`, `hydration-guard.js`, `calendar-model.js`, `recent-meals-model.js`, `open-food-facts.js`, `groq-client.js`, `autosave-scheduler.js` e `firebase-config-internal.js`;
- `src/leaf/package.json` — escopo local de `type: "module"`;
- `src/vite-baseline.js` — substituição de dez scripts clássicos por imports ESM;
- os dez testes correspondentes em `tests/unit/` e o contrato de `tests/unit/vite-build-verifier.test.js`;
- `vite.config.js` e `scripts/verify-vite-build.js` — retirada desses UMDs da cópia temporária.

**O que foi feito:**

- Cada fachada faz side-effect import do UMD canônico, valida o namespace publicado e expõe exports ES nomeados que apontam para as mesmas referências, sem copiar funções ou algoritmos.
- O escopo `type: "module"` foi limitado a `src/leaf/`, evitando alterar a interpretação CommonJS dos testes e scripts existentes.
- A lógica UMD continuou sendo a fonte única usada pela produção, enquanto o Vite ganhou uma interface ESM real.
- Os casos unitários foram parametrizados para executar as mesmas expectativas contra dois loaders, evitando duplicação da lógica de teste.
- Foram congelados comportamentos conhecidos como A10 em metas históricas, A11 no guard de hidratação/autosave, F04 no cliente Groq e F05 no schema posicional de i18n. A migração não corrigiu nenhum deles.
- Os cinco módulos Firebase coordenados foram deliberadamente excluídos desta fatia e reservados para uma ordem própria de alto risco.

**PRs/commits relacionados:** [PR #55](https://github.com/magnoClovis/nutrition-tracker/pull/55); implementação [`c724e4d`](https://github.com/magnoClovis/nutrition-tracker/commit/c724e4d9ffae1d8c7663469e90faac1e8b1f51d9); merge [`b0f2556`](https://github.com/magnoClovis/nutrition-tracker/commit/b0f2556ad8a2d1994d5931a71461ab510a3b17a3).

---

## C15 - Fachadas ESM do domínio composto, loaders e integrações

**Data (se determinável):** 26/07/2026.

**Propósito:** migrar módulos que coordenavam funções de outros módulos já extraídos, preservando a injeção explícita de dependência. A existência de imports ESM não poderia transformar argumentos de factory em dependências ocultas.

**Recursos:** módulos ES; factories UMD; injeção de dependência; APIs Groq/Open Food Facts; APIs de câmera/BarcodeDetector/ZXing; Vite; testes UMD/ESM parametrizados.

**Arquivos:**

- `src/composite/date-utils.js`, `diary-ticker.js`, `food-entry.js`, `daily-nutrition-model.js`, `body-metrics-model.js`, `historical-goals-model.js`, `week-aggregator.js`, `history-loaders.js`, `profile-validation.js` e `meal-ga.js`;
- `src/composite/meal-review-ai.js`, `food-autofill-ai.js`, `dish-description-ai.js`, `nutrition-feedback-ai.js` e `eating-patterns-ai.js`;
- `src/composite/barcode-scanner.js` e `src/composite/package.json`;
- `src/vite-baseline.js`, `vite.config.js`, `scripts/verify-vite-build.js` e `tests/unit/vite-build-verifier.test.js`;
- os dezesseis testes correspondentes em `tests/unit/`.

**O que foi feito:**

- Foram criadas dezesseis fachadas finas que reutilizam `read-legacy-namespace.js` e exportam as factories originais.
- Dependências como `resolveHistoricalGoals`, `formatDateDM`, loaders de histórico, modelos de calendário e callbacks de IA continuaram chegando pelos parâmetros já existentes.
- No `week-aggregator`, `mealKeys` permaneceu argumento explícito da operação, não dependência automática da factory.
- `history-loaders` continuou recebendo os agregadores/modelos necessários, sem resolvê-los por import direto.
- O scanner preservou os contratos problemáticos conhecidos: stream aberto sem vídeo montado, ausência de fallback automático quando o construtor nativo falha, cache instável de `barcodeLibPromise` e curto-circuito `ZXingBrowser || ZXing`.
- Permaneceram congelados, entre outros, A09, B05, D11–D14, E04–E05 e as diferenças intencionais entre leitura, análise, GA e IA. O objetivo foi equivalência estrutural, não limpeza de dívida.

**PRs/commits relacionados:** [PR #56](https://github.com/magnoClovis/nutrition-tracker/pull/56); implementação [`afb43ae`](https://github.com/magnoClovis/nutrition-tracker/commit/afb43ae9921359b0b1993d7e6a7555eed6c3b001); merge [`dbccfb0`](https://github.com/magnoClovis/nutrition-tracker/commit/dbccfb064c6fffe1e32aab78222ec7614e066681).

---

## C15 - Fachadas ESM dos módulos internos do Firebase

**Data (se determinável):** 26/07/2026.

**Propósito:** retirar da ponte clássica os cinco módulos Firebase internos sem tocar ainda na facade pública `firebase-storage.js`. A divisão 5A/5B reduziu o risco de alterar simultaneamente a composição interna e o contrato global consumido por toda a aplicação.

**Recursos:** Firebase Auth REST API; Firestore REST API; módulos ES; factories UMD; algoritmos de migração/merge; testes contratuais e unitários; Vite.

**Arquivos:**

- `src/firebase/firebase-auth-internal.js`;
- `src/firebase/firebase-firestore-internal.js`;
- `src/firebase/firebase-migration-internal.js`;
- `src/firebase/firebase-backup-internal.js`;
- `src/firebase/firebase-account-data-internal.js`;
- `src/firebase/package.json`, `src/vite-baseline.js`, `vite.config.js`, `scripts/verify-vite-build.js` e `tests/unit/vite-build-verifier.test.js`;
- cinco testes Firebase correspondentes em `tests/unit/`.

**O que foi feito:**

- A conversão seguiu a ordem real de dependências: autenticação; Firestore dependente de UID/headers; migração dona dos helpers compartilhados; backup dependente de Firestore e merge; account-data dependente de auth e Firestore.
- Cada fachada importou o UMD, validou seu namespace e expôs os bindings originais; nenhuma lógica de callback, merge ou persistência foi reescrita.
- `firebase-storage.js` permaneceu integralmente como script clássico nesta fatia, evitando decidir prematuramente como reconstruir seus globais.
- Os testes passaram a executar as mesmas expectativas UMD/ESM.
- A01/A02 (janela e paginação da migração), A03 (ausência de rollback), A04/A05 (exclusão parcial/root), A07 (backup não atômico) e F01–F03 (contratos de auth/Firestore/facade) foram mantidos exatamente como estavam. As correções posteriores desses riscos não pertencem a esta entrega.

**PRs/commits relacionados:** [PR #57](https://github.com/magnoClovis/nutrition-tracker/pull/57); implementação [`1c8ae5e`](https://github.com/magnoClovis/nutrition-tracker/commit/1c8ae5e1a4d8293f49aa856634f9526c5e0791d8); merge [`110f3cb`](https://github.com/magnoClovis/nutrition-tracker/commit/110f3cb217d464a1455b4b9466ab6448559cd003).

---

## C15 - Namespace público e facade ESM do Firebase Storage

**Data (se determinável):** 26/07/2026.

**Propósito:** tornar a facade Firebase consumível por ESM sem remover nem substituir nenhum global legado. Era o ponto mais sensível da migração porque todos os demais módulos dependiam de `fb*`, `window.storage`, constantes de configuração e funções de backup/migração.

**Recursos:** Firebase Auth/Firestore REST; JavaScript global namespace; módulos ES; `Object.assign`; suíte contratual em `vm.Context`; Vite smoke test.

**Arquivos:**

- `firebase-storage.js` — adição do namespace público após todas as atribuições existentes;
- `src/firebase/firebase-storage.js` — facade ESM e restauração dos bindings globais;
- `src/vite-baseline.js` — troca do último script Firebase clássico pela facade;
- `tests/unit/firebase-storage.contract.test.js` — identidade estrita e preservação das 16 expectativas existentes;
- `tests/unit/vite-build-verifier.test.js`, `scripts/verify-vite-build.js` e `vite.config.js`.

**O que foi feito:**

- `window.FirebaseStorage` passou a reunir 42 propriedades: 35 referências públicas existentes e sete constantes produzidas pela mesma chamada de configuração.
- O namespace foi atribuído somente depois de todos os globais finais já existirem, garantindo identidade por referência (`===`), não cópias ou reimplementações.
- A facade ESM fez side-effect import da composição legada, validou o namespace, exportou bindings nomeados e executou `Object.assign(globalThis, FirebaseStorage)` para restaurar o contrato interno esperado no bundle Vite.
- Um smoke específico confirmou a existência de `window.fbSignIn`, operações `fbGet/fbSet/fbDel/fbList`, variantes v3, `window.storage`, constantes e demais aliases após o carregamento.
- O smoke detectou inicialmente a ausência das sete constantes no namespace; elas foram acrescentadas sem recalcular a configuração.
- Nenhuma das atribuições globais anteriores foi removida ou movida. A01–A08 e F01–F03 permaneceram congelados.

**PRs/commits relacionados:** [PR #58](https://github.com/magnoClovis/nutrition-tracker/pull/58); implementação [`d2f7370`](https://github.com/magnoClovis/nutrition-tracker/commit/d2f7370c73f247dde101d1336d99b8eed2782207); merge [`d0f41c5`](https://github.com/magnoClovis/nutrition-tracker/commit/d0f41c54c4715df6a549112c9c62f960e46cfba4).

---

## C15 - Componentes React ESM, lote 6A

**Data (se determinável):** 26/07/2026.

**Propósito:** iniciar a migração dos componentes React pelos elementos mais isolados, comprovando que o padrão de fachada fina também preservava componentes que retornavam árvores `React.createElement`.

**Recursos:** React 18.3.1; módulos ES; factories/componentes UMD; Vite; testes de renderização parametrizados.

**Arquivos:** `src/components/ui-primitives.js`, `release-notice.js`, `visual-update-notice.js`, `meal-review-modal.js`, `ga-result-card.js`, `src/components/package.json`, `src/vite-baseline.js`, os cinco testes unitários correspondentes e os verificadores/configuração de build.

**O que foi feito:**

- Foram criadas fachadas ESM para os primitivos `Ring`/`Bar`, avisos globais, modal de revisão e cartão do algoritmo genético.
- Os componentes continuaram usando a implementação UMD e `React.createElement`; não houve conversão antecipada para JSX.
- Props, callbacks e dependências React continuaram explícitos.
- Os testes reutilizaram os mesmos casos contra os loaders UMD e ESM.
- B05, relativo à explicação de avaliação stale/loading preso, foi preservado no modal/cliente em vez de corrigido incidentalmente.

**PRs/commits relacionados:** [PR #59](https://github.com/magnoClovis/nutrition-tracker/pull/59); implementação [`bdd3fee`](https://github.com/magnoClovis/nutrition-tracker/commit/bdd3fee670e844e3f251eec57e04da66d9f5d8c2); merge [`a3e05ff`](https://github.com/magnoClovis/nutrition-tracker/commit/a3e05ff20d7c8b386f2cd68d68a1388d29755690).

---

## C15 - Componentes React ESM, lote 6B

**Data (se determinável):** 26/07/2026.

**Propósito:** migrar dois componentes visuais com contratos de dados e gráficos mais ricos, mantendo Recharts npm no caminho Vite e os mesmos componentes vendorizados no legado.

**Recursos:** React; Recharts 2.10.4; módulos ES; Vite; testes UMD/ESM.

**Arquivos:** `src/components/saved-meal-card.js`, `src/components/body-metrics-charts.js`, `src/vite-baseline.js`, `tests/unit/saved-meal-card.test.js`, `tests/unit/body-metrics-charts.test.js`, `tests/unit/vite-build-verifier.test.js`, `vite.config.js` e `scripts/verify-vite-build.js`.

**O que foi feito:**

- As fachadas exportaram as mesmas referências finais dos dois namespaces UMD.
- O cartão de refeição salva continuou recebendo estado, template e callbacks controlados.
- Os gráficos mantiveram gates de quantidade mínima de pontos, chaves de série, targets e comportamento de zero já testados.
- A migração não reinterpretou as janelas “7/14”, zeros ausentes ou normalizações descritas em D11; apenas mudou a forma de consumo pelo Vite.

**PRs/commits relacionados:** [PR #60](https://github.com/magnoClovis/nutrition-tracker/pull/60); implementação [`274f561`](https://github.com/magnoClovis/nutrition-tracker/commit/274f56120ab523d5358a63238e669c350eff7aab); merge [`b5b5cfd`](https://github.com/magnoClovis/nutrition-tracker/commit/b5b5cfdb07d3f74bd56b3c68ab29296b47522f75).

---

## C15 - Componentes React ESM, lote 6C

**Data (se determinável):** 26/07/2026.

**Propósito:** migrar modais e painéis que coordenavam configurações, backup e obrigatoriedade de perfil, sem internalizar callbacks fornecidos pelo App/controlador.

**Recursos:** React; Firebase Storage facade; APIs de arquivo do navegador; módulos ES; Vite; testes parametrizados.

**Arquivos:** `src/components/settings-panel.js`, `backup-modal.js`, `required-profile-modal.js`, `src/vite-baseline.js`, seus três testes unitários e os arquivos de verificação/configuração do build.

**O que foi feito:**

- As três fachadas mantiveram props e callbacks de exportação/importação, perfil e configuração como dependências do chamador.
- O modal de backup não ganhou normalização, atomicidade nem alteração de schema durante a migração.
- Foram preservados A07, D08 e D09: importação em lotes sem rollback, possível divergência entre “hoje” e data visualizada e incompatibilidade de nomes no preview.
- A ponte Vite foi reduzida em mais três scripts clássicos sem modificar seus UMDs.

**PRs/commits relacionados:** [PR #61](https://github.com/magnoClovis/nutrition-tracker/pull/61); implementação [`d47bba5`](https://github.com/magnoClovis/nutrition-tracker/commit/d47bba54827acc71d60f55545c32863634821554); merge [`d1c5ba7`](https://github.com/magnoClovis/nutrition-tracker/commit/d1c5ba7e27302d432efab5730b8c3c78c8218c2d).

---

## C15 - Componentes React ESM, lote 6D

**Data (se determinável):** 26/07/2026.

**Propósito:** migrar as superfícies de autenticação, verificação e privacidade sem alterar fluxos destrutivos nem gates de sessão.

**Recursos:** React; Firebase Auth REST; facade Firebase; módulos ES; Vite; testes unitários UMD/ESM.

**Arquivos:** `src/components/verify-email-screen.js`, `login-screen.js`, `privacy-panel.js`, `src/vite-baseline.js`, seus três testes unitários e os verificadores/configuração de build.

**O que foi feito:**

- As fachadas mantiveram login, cadastro, envio de verificação, limpeza Firestore e exclusão Auth como callbacks explícitos.
- A ordem e a separação entre exclusão de dados e exclusão da conta Auth não foram alteradas.
- A06 foi preservado: quando a ponte de limpeza Firestore está ausente, o fluxo histórico ainda pode prosseguir para Auth.
- A08 também permaneceu: cadastro e persistência de perfil continuaram em múltiplas etapas sem transação/rollback.
- Estados sem consumidor útil, como `checking` do VerifyEmail, não foram removidos como “limpeza de brinde”.

**PRs/commits relacionados:** [PR #62](https://github.com/magnoClovis/nutrition-tracker/pull/62); implementação [`d7a0ffa`](https://github.com/magnoClovis/nutrition-tracker/commit/d7a0ffa4d7af39930a1f50246012212eadd69bec); merge [`ce1785a`](https://github.com/magnoClovis/nutrition-tracker/commit/ce1785a3ed7806e1ba4d573995f6149eea144c04).

---

## C15 - Telas React ESM, lote 6E

**Data (se determinável):** 26/07/2026.

**Propósito:** migrar telas completas de histórico, métricas e despensa depois que seus componentes menores e modelos já possuíam fachadas ESM.

**Recursos:** React; Recharts; módulos ES; dados injetados pelo NutritionTracker Controller; Vite; testes UMD/ESM.

**Arquivos:** `src/components/week-screen.js`, `metrics-screen.js`, `pantry-screen.js`, `src/vite-baseline.js`, seus três testes unitários e os arquivos de build/verificação.

**O que foi feito:**

- Week, Metrics e Pantry passaram a ser importáveis por ESM sem importar diretamente modelos ou serviços que continuavam fornecidos por props.
- A árvore `React.createElement`, a hierarquia visual e os callbacks do controlador permaneceram canônicos no UMD.
- Foram mantidas as peculiaridades de D10 na Despensa, os cálculos/zeros de D11 e o card de relatório avançado desconectado de E02.
- Não houve reorganização de telas nem correção de UX incidental.

**PRs/commits relacionados:** [PR #63](https://github.com/magnoClovis/nutrition-tracker/pull/63); implementação [`f2ea92a`](https://github.com/magnoClovis/nutrition-tracker/commit/f2ea92a496a820422ae41d14221f03326198e79b); merge [`aa6cbb9`](https://github.com/magnoClovis/nutrition-tracker/commit/aa6cbb9e611712377090fcfbddaefe3b15cb759c).

---

## C15 - Telas e navegação React ESM, lote 6F

**Data (se determinável):** 26/07/2026.

**Propósito:** concluir a migração dos vinte módulos React com o lote visualmente mais acoplado, incluindo Diário, Adicionar, tutorial e navegação principal.

**Recursos:** React; módulos ES; contratos `data-tutorial`; estado global temporário `window.__tutorialNavigating`; componentes Ring/Bar/GaResultCard; Vite; testes UMD/ESM.

**Arquivos:** `src/components/add-screen.js`, `diary-screen.js`, `tutorial-overlay.js`, `app-header-navigation.js`, `src/vite-baseline.js`, seus quatro testes unitários e os arquivos de build/verificação.

**O que foi feito:**

- `DiaryScreen` continuou recebendo Ring, Bar, GaResultCard, dados e handlers explicitamente; as fachadas não passaram a resolver essas dependências por import oculto.
- Tutorial e navegação mantiveram o contrato cruzado de `data-tutorial` e `window.__tutorialNavigating`.
- A estrutura de navegação, incluindo a posição alternativa em telas não-Diário e a ausência de Add como aba primária, permaneceu congelada pelos testes.
- A09 e B01, relativos a atualizações concorrentes e navegação histórica, não foram alterados.
- O nó estruturalmente inalcançável descrito em E03 foi mantido no Diário.

**PRs/commits relacionados:** [PR #64](https://github.com/magnoClovis/nutrition-tracker/pull/64); implementação [`a397eb8`](https://github.com/magnoClovis/nutrition-tracker/commit/a397eb8f2b09b901ad1fa5334125847e5c9d83e8); merge [`85e7b81`](https://github.com/magnoClovis/nutrition-tracker/commit/85e7b8127352749effef57a29d1d66e908251a8e).

---

## C15 - Facade ESM do NutritionTracker Controller

**Data (se determinável):** 26/07/2026.

**Propósito:** retirar da ponte o controlador central sem reorganizar seu corpo, sua ordem de hooks ou as factories instanciadas durante cada render. Esse era o maior risco técnico anterior à nova entrada App.

**Recursos:** React 18; módulos ES; namespace UMD do controlador; Vite; testes estruturais/contratuais de código-fonte.

**Arquivos:**

- `src/controller/nutrition-tracker-controller.js` e `src/controller/package.json`;
- `src/vite-baseline.js`;
- `tests/unit/nutrition-tracker-controller.test.js`;
- `tests/unit/vite-build-verifier.test.js`, `scripts/verify-vite-build.js` e `vite.config.js`.

**O que foi feito:**

- Criou-se uma fachada fina para o namespace/factory já publicado pelo controlador; não foi necessário `Object.assign` adicional.
- O arquivo UMD original não foi reorganizado. Permaneceram 145 estados, 35 efeitos com arrays de dependência inalterados e 14 refs.
- O contrato de teste foi ampliado sem mudar as três expectativas existentes e passou a travar os onze blocos de factories render-scoped, seus argumentos e closures do render corrente.
- Factories como MealGA e BarcodeScanner continuaram sendo instanciadas nos pontos originais para receber `updateActiveLog`, refs, setters e mensagens do render atual.
- `app.js` permaneceu como o único script clássico e composition root, reservado para a fatia seguinte.
- Os riscos A09–A11, B01 e demais comportamentos de hooks/autosave foram preservados.

**PRs/commits relacionados:** [PR #65](https://github.com/magnoClovis/nutrition-tracker/pull/65); implementação [`ce94b58`](https://github.com/magnoClovis/nutrition-tracker/commit/ce94b58103faad3a5ae0cbbca6545ce5dea65813); merge [`fa584ba`](https://github.com/magnoClovis/nutrition-tracker/commit/fa584ba553ade242d022711f82730f83a34e7d09).

---

## C15 - Entrada única JSX paralela

**Data (se determinável):** 26/07/2026.

**Propósito:** criar uma composition root ESM/JSX completa e acabar, no caminho Vite, com a necessidade de carregar `app.js`, sem ainda remover ou alterar os dois arquivos gigantes usados pelo legado.

**Recursos:** React 18.3.1; ReactDOM `createRoot`; JSX transform clássico do `@vitejs/plugin-react`; módulos ES; Firebase Auth; Playwright.

**Arquivos:**

- `src/App.jsx` — componente App em JSX;
- `src/main.jsx` — bootstrap por `ReactDOM.createRoot`;
- `index.vite.html`, `vite.config.js`, `package.json` e `scripts/verify-vite-build.js`;
- `playwright.vite.config.js` e `tests/smoke/serve-static.js`;
- `tests/smoke/app-orchestration.spec.js`;
- `tests/unit/app-entry.test.js` e `tests/unit/vite-build-verifier.test.js`.

**O que foi feito:**

- A lógica menor de App foi transposta de `React.createElement` para JSX real sem mudar estados, efeitos, funções ou ordem de orquestração.
- O fluxo permaneceu: login; verificação de e-mail; perfil obrigatório; aplicação autenticada; overlays globais.
- O `ErrorBoundary` continuou envolvendo exatamente a mesma fronteira.
- O plugin foi configurado com `jsxRuntime: "classic"`, reduzindo divergência em relação ao Babel standalone legado.
- Antes de montar o Controller, App instalou explicitamente os doze namespaces `window.*` que seu contrato interno ainda resolvia globalmente.
- Não foi usado `StrictMode`.
- Foram criados smoke tests determinísticos de desktop/mobile para login, verificação, gate de perfil e app autenticado; `test:smoke` passou a executar legado e Vite.
- Corridas e limitações existentes do App — gate de perfil, timeout de autenticação parcial, ausência de cancelamento pós-timeout e diferença entre login novo/sessão restaurada — permaneceram sem correção incidental.
- `app.js` e `nutrition-tracker.jsx` permaneceram byte a byte idênticos e ativos somente no caminho legado.

**PRs/commits relacionados:** [PR #66](https://github.com/magnoClovis/nutrition-tracker/pull/66); implementação [`bf05dd8`](https://github.com/magnoClovis/nutrition-tracker/commit/bf05dd83379a9970030868a19c2e458f51d85f7a); merge [`d22abf1`](https://github.com/magnoClovis/nutrition-tracker/commit/d22abf11759105aba85e2c282774937dbab9fb1b).

---

## C15 - Cutover do index e publicação de `dist/` pelo GitHub Pages

**Data (se determinável):** 27/07/2026.

**Propósito:** tornar a entrada Vite o caminho de produção e mudar o Pages para publicar o artefato compilado, evitando o estado inseguro em que um `index.html` Vite seria servido cru sem build. Cutover e deploy foram fundidos em uma única entrega atômica.

**Recursos:** Vite 7.3.6; GitHub Actions; GitHub Pages; Playwright; Chromium; Node.js; Actions oficiais fixadas por SHA; runners Windows e Ubuntu.

**Arquivos:**

- `index.html` — entrada de produção com um único `<script type="module">`;
- `tests/fixtures/index.legacy.html` — loader clássico congelado para comparação;
- `.github/workflows/pages.yml` e `.github/workflows/ci.yml`;
- `vite.config.js`, `package.json`, `.gitignore` e `scripts/verify-vite-build.js`;
- `scripts/verify-pages-deployment.js`;
- `playwright.cutover.config.js`, `playwright.pages.config.js`, `playwright.config.js` e `playwright.vite.config.js`;
- `tests/smoke/cutover-visual-matrix.spec.js` e `tests/smoke/serve-static.js`;
- `tests/unit/app-entry.test.js`, `pages-deployment-verifier.test.js` e `vite-build-verifier.test.js`.

**O que foi feito:**

- As mais de 58 tags de scripts legados foram removidas do `index.html` de produção e substituídas por `/src/main.jsx` como entrada de desenvolvimento/build.
- O script antecipado de tema e o helper de loading foram preservados para evitar flash de tema e manter o startup observável.
- `index.vite.html` deixou de ser necessário; seu loader legado foi preservado como fixture de teste, não como segunda entrada de produção.
- A saída final passou a ser `dist/`, com base relativa, bundles hashados e allowlist de sete arquivos/recursos autorizados.
- O workflow executava verificação completa em Windows, build em Ubuntu para capturar problemas de case-sensitivity, upload do artefato Pages, deploy apenas em `main` e verificação pós-publicação de HTML, hashes e MIME types.
- A configuração externa do Pages não foi alterada durante o PR; a troca para GitHub Actions ficou reservada ao momento autorizado do merge.

**PRs/commits relacionados:** [PR #67](https://github.com/magnoClovis/nutrition-tracker/pull/67); implementação principal [`a923910`](https://github.com/magnoClovis/nutrition-tracker/commit/a9239108f3ae74a98450dbf72834dc597f7f6cfe); merge [`1dbe954`](https://github.com/magnoClovis/nutrition-tracker/commit/1dbe9544225942f6ff94d1a7a87a411f6bc4cd5c).

---

## C15 - Robustez operacional do pipeline de validação e Pages

**Data (se determinável):** 27/07/2026.

**Propósito:** estabilizar o novo workflow em runners reais depois que o draft PR expôs três problemas de orquestração que não apareciam na validação local: uma referência de Action incompleta, diferença entre Windows PowerShell e PowerShell 7 e concorrência destrutiva entre duas suítes autenticadas que compartilhavam a mesma conta Firebase.

**Recursos:** GitHub Actions; runners `windows-2022` e Ubuntu; PowerShell 7 (`pwsh`); Windows PowerShell; `actions/upload-artifact`; Firebase Auth/Firestore usados pela conta descartável de smoke; grupos de `concurrency` do GitHub Actions.

**Arquivos:**

- `.github/workflows/pages.yml` — correção de SHA, execução explícita dos gates e grupo compartilhado de concorrência;
- `.github/workflows/ci.yml` — adoção do mesmo grupo de concorrência usado pelo workflow Pages.

**O que foi feito:**

- A primeira execução do workflow falhou antes de iniciar os testes porque `actions/upload-artifact@v7.0.1` estava fixada em um SHA de 39 caracteres. O caractere final `a` foi acrescentado, produzindo o SHA completo `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` (`af1e3b6`).
- Depois que a Action foi resolvida, o runner Windows revelou que `npm test` chamava `powershell -File` e essa sessão não disponibilizava `Get-FileHash`. O step passou a usar `pwsh -NoProfile` para o preflight e a executar, com verificação de exit code após cada comando, `test:unit`, `test:smoke` e `test:cutover` (`66094e1`). A composição dos gates não foi reduzida.
- O CI antigo e o workflow Pages começaram simultaneamente e usaram a mesma conta Firebase descartável. Um run alterou idioma e dados de backup enquanto o outro validava esses valores, causando expectativas como “Tracking” versus “Seguimiento” e marcador de backup ausente.
- Os dois workflows receberam o grupo `nutrition-validation-${{ github.ref }}` com `cancel-in-progress: false`. Para uma mesma branch/PR, uma suíte aguarda a outra; refs diferentes continuam independentes (`a01fa6b`).
- A execução serializada comprovou a correção: Full Windows verification passou em 16m54s, o build Ubuntu passou e somente então o CI autenticado iniciou e passou em 8m25s.
- Deploy e pós-deploy permaneceram corretamente ignorados em eventos `pull_request`; nenhuma configuração externa do Pages foi alterada durante essas correções.

**PRs/commits relacionados:** [PR #67](https://github.com/magnoClovis/nutrition-tracker/pull/67); SHA completo [`af1e3b6`](https://github.com/magnoClovis/nutrition-tracker/commit/af1e3b6a7cda4e47a668906416806f4aa8106181); PowerShell/gates [`66094e1`](https://github.com/magnoClovis/nutrition-tracker/commit/66094e1b2b5ea71d44fba69748cd25074d2776e9); serialização [`a01fa6b`](https://github.com/magnoClovis/nutrition-tracker/commit/a01fa6b208625f3a97bb4071902a41dd0fa46d29); merge [`1dbe954`](https://github.com/magnoClovis/nutrition-tracker/commit/1dbe9544225942f6ff94d1a7a87a411f6bc4cd5c).

---

## C15 - Matriz de equivalência visual e estabilização das capturas

**Data (se determinável):** 27/07/2026.

**Propósito:** provar que o cutover preservava comportamento e pixels nas telas principais antes de substituir a produção, sem aceitar thresholds que mascarassem diferenças reais.

**Recursos:** Playwright 1.61.1; Chromium; screenshots PNG; SHA-256; DOM serializado; `getComputedStyle`; Vite preview/build; servidor estático legado.

**Arquivos:** `tests/smoke/cutover-visual-matrix.spec.js`, `playwright.cutover.config.js`, `tests/fixtures/index.legacy.html`, `tests/smoke/serve-static.js`, `vite.config.js`, `package.json` e verificadores relacionados.

**O que foi feito:**

- Foi criada uma matriz de 60 casos: cinco telas (Diário, Adicionar, Despensa, Semana e Métricas), três idiomas, desktop/mobile e temas claro/escuro.
- Cada caso comparava loader legado e Vite por igualdade de DOM, estilos computados e hash integral do screenshot; não havia tolerância percentual ou de pixels.
- A ordem do CSS gerado pelo Vite foi reposicionada antes do `<style>` inline para reproduzir a cascata legada sem alterar regras.
- `cssMinify: false` foi adotado porque a minificação alterava rasterização de backdrop em um nível de RGB; o CSS gerado permaneceu semanticamente/literalmente equivalente à origem.
- A intermitência inicial de Semana/ES/desktop/claro foi atribuída a animações Recharts via `requestAnimationFrame`, hover/foco residual e composição gráfica. A captura passou a esperar quiescência de mutações, ausência de animações em execução, mover o ponteiro e desfocar o elemento ativo.
- O Chromium da matriz usou `--disable-gpu`, página fresca por origem e neutralização de `backdrop-filter` somente na captura PNG, depois de comparar seu estilo computado real.
- O gate final passou 60/60; casos críticos foram repetidos 40/40. Uma flakiness residual posterior em cantos de antialiasing mobile foi registrada separadamente no PR #68, sem introduzir tolerância.

**PRs/commits relacionados:** [PR #67](https://github.com/magnoClovis/nutrition-tracker/pull/67); implementação [`a923910`](https://github.com/magnoClovis/nutrition-tracker/commit/a9239108f3ae74a98450dbf72834dc597f7f6cfe); merge [`1dbe954`](https://github.com/magnoClovis/nutrition-tracker/commit/1dbe9544225942f6ff94d1a7a87a411f6bc4cd5c).

---

## Correção da navegação do smoke no subcaminho do GitHub Pages

**Data (se determinável):** 28/07/2026.

**Propósito:** corrigir o smoke pós-deploy que falhava embora o site publicado funcionasse manualmente. O teste recebia a URL correta do projeto, mas navegava para a raiz do domínio e procurava `#root` em uma página 404.

**Recursos:** Playwright 1.61.1; GitHub Pages project site; semântica padrão de `new URL()`; Chromium desktop e mobile.

**Arquivos:** `tests/smoke/test-helpers.js` — única linha funcional alterada.

**O que foi feito:**

- Confirmou-se que `PAGES_BASE_URL` era `https://magnoclovis.github.io/nutrition-tracker/`.
- `page.goto('/index.html')` era resolvido como `https://magnoclovis.github.io/index.html`, pois a barra inicial substitui o pathname do base URL. Essa URL retornava 404 e não continha `#root`.
- A chamada foi alterada para `page.goto('index.html')`, resolvendo corretamente `https://magnoclovis.github.io/nutrition-tracker/index.html`.
- Smokes legado e Vite passaram; o smoke real do Pages passou em desktop e Pixel 5, e uma verificação explícita confirmou pathname `/nutrition-tracker/index.html` e um único `#root`.
- Nenhum arquivo de aplicação, build ou deploy foi alterado.
- `tests/smoke/auth.setup.js` mantinha o mesmo padrão absoluto, mas não participava do smoke Pages e foi registrado apenas para revisão futura.
- Durante a validação, uma diferença intermitente independente de 17 pixels apareceu nos cantos da navegação inferior em Métricas/PT/mobile/claro. DOM e estilos eram idênticos e o caso passou quatro de cinco repetições; o problema foi declarado fora do escopo, sem relaxar a comparação.

**PRs/commits relacionados:** [PR #68](https://github.com/magnoClovis/nutrition-tracker/pull/68); implementação [`f972ce4`](https://github.com/magnoClovis/nutrition-tracker/commit/f972ce4b6723e9493eb027bbb2d9e42b18297353); merge [`e2f4234`](https://github.com/magnoClovis/nutrition-tracker/commit/e2f42343f15dffc9d405508dcf09531824efd32c).

---

## C15 - Preservação comportamental e gates transversais

**Data (se determinável):** 26–28/07/2026.

**Propósito:** garantir que uma migração de ferramenta, formato de módulo e mecanismo de publicação não se transformasse em uma correção funcional ampla e não revisada. A equivalência observável era requisito de aceitação, especialmente em persistência, autenticação, exclusão de conta, hooks e navegação histórica.

**Recursos:** `bug-inventory.txt`; SHA-256; Node test runner; Playwright; `vm.Context`; GitHub Actions; Windows/Ubuntu; smoke legado/Vite/Pages; testes contratuais Firebase.

**Arquivos:**

- `tests/unit/*.test.js` dos módulos migrados, parametrizados para loaders UMD/ESM;
- `tests/unit/firebase-storage.contract.test.js`;
- `tests/unit/nutrition-tracker-controller.test.js`;
- `tests/unit/app-entry.test.js`;
- `tests/unit/vite-build-verifier.test.js` e `pages-deployment-verifier.test.js`;
- `tests/smoke/app-orchestration.spec.js` e `cutover-visual-matrix.spec.js`;
- `scripts/verify-vite-build.js`, `verify-pages-deployment.js` e `.github/workflows/pages.yml`;
- `app.js` e `nutrition-tracker.jsx` foram apenas verificados, não alterados.

**O que foi feito:**

- Toda fachada ESM foi validada contra a mesma lógica UMD, normalmente pelo mesmo conjunto de casos parametrizado com dois loaders.
- A suíte contratual da facade Firebase manteve suas 16 expectativas e acrescentou verificações de namespace/identidade sem reescrever as anteriores.
- A ordem de hooks e os onze blocos render-scoped do Controller ganharam contratos estruturais específicos.
- O smoke duplo comprovou o fluxo de autenticação e orquestração no loader legado e na entrada Vite.
- O build falhava diante de arquivos não autorizados ou sensíveis; o pós-deploy verificava HTML, hashes, MIME e ausência de runtimes/source entries legados.
- Ao fim de cada fatia relevante, `app.js` e `nutrition-tracker.jsx` foram comparados por SHA-256 e permaneceram idênticos. No encerramento, ambos tinham `8C88EEBCB12AC815BC6429EC93B17BB58A02AEA706449FB7E6EDD85A44DF9486`.
- A01–A11, B01, B05, F01–F05 e demais itens aplicáveis do inventário foram tratados como contratos de preservação. Nenhuma expectativa foi alterada para “fazer a migração passar”.
- Arquivos UMD e `vendor/` permaneceram no repositório após o cutover, conforme decisão explícita; sua remoção sempre ficou reservada a trabalho futuro próprio dentro de C15.

**PRs/commits relacionados:** PRs [#53](https://github.com/magnoClovis/nutrition-tracker/pull/53) a [#68](https://github.com/magnoClovis/nutrition-tracker/pull/68), com commits individuais citados em cada item acima.

## Estado ao encerrar esta cronologia

- Último merge atribuível a esta conversa: PR #68, merge `e2f4234`, em 28/07/2026.
- A aplicação de produção passou a ser construída por Vite e publicada como `dist/` pelo GitHub Pages Actions.
- Todos os módulos de domínio, Firebase, componentes/telas, Controller e App tinham caminho ESM; o legado permaneceu no repositório para compatibilidade e comparação.
- A remoção definitiva dos UMDs, da fixture clássica e das compatibilidades restantes não foi realizada nesta conversa.
- C15 permanece parcial no roadmap atual; trabalhos posteriores de C15 não devem ser inferidos nem atribuídos a esta frente.

## Fontes consultadas e limitações

- Memória integral desta conversa, usada para atribuir autoria e decisões técnicas.
- Histórico Git da `main`, incluindo commits de implementação e merges dos PRs #53–#68.
- `documentation/README.md`, `documentation/estado-atual/ROADMAP.md` e `documentation/estado-atual/BUG-INVENTORY.md`, consultados em 31/08/2026.
- Repositório `magnoClovis/nutrition-tracker`; links de PR e commit incluídos em cada item.
- Decisões posteriores, correções posteriores dos bugs preservados e outras frentes de modularização não são atribuídas a este chat.
