# Histórico da frente — modularização incremental do monólito e contratos Firebase

## Escopo, atribuição e método

Este registro cobre exclusivamente o trabalho implementado nesta conversa entre 16 e 25/07/2026, mais as investigações e decisões técnicas subsequentes que não geraram código nesta mesma conversa. A atribuição foi confirmada pelo responsável depois da comparação com os índices de outras sete conversas do projeto. Por isso, o documento não reivindica PRs anteriores ao #5, o PR #49, a migração Vite efetivamente implementada a partir do PR #53, nem correções posteriores que resolveram parte dos riscos aqui apenas preservados e documentados.

As datas de implementação e os commits de merge foram confirmados no histórico Git reescrito e publicado. A classificação **C15 — Refatoração, modularização e limpeza do legado** é retrospectiva: o código C15 só foi criado em 31/07/2026, mas corresponde diretamente à maior parte desta frente. Isso não significa que C15 esteja concluído; `documentation/estado-atual/ROADMAP.md` ainda o classifica como **Parcial**. Quando um trabalho corresponde mais diretamente a C22, C23 ou C07, o código específico é usado no título.

Os bugs citados pelos códigos atuais de `documentation/estado-atual/BUG-INVENTORY.md` foram, salvo indicação explícita em contrário, **preservados e transformados em contratos de regressão**, não corrigidos. A resolução posterior de A01–A03 por C23 e de A09 por C28 pertence a outras frentes e não é atribuída a esta conversa.

---

## Fundação de domínio e documentação retroativa

## C15 - Extração do modelo de entradas alimentares

**Data (se determinável):** 16/07/2026.

**Propósito:** retirar do monólito a construção de entradas alimentares sem alterar IDs, horários, quantidades, nutrientes ou a dependência da despensa. A factory precisava continuar recebendo explicitamente o getter da despensa para que o módulo permanecesse testável e não capturasse estado React obsoleto.

**Recursos:** JavaScript UMD/CommonJS; React como consumidor indireto; injeção de dependência; Node.js test runner.

**Arquivos:** `food-entry.js`; `tests/unit/food-entry.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** foi criada uma factory UMD para `createEntryId`, `getEntryTime` e `buildEntry`, com o acesso à despensa fornecido por callback. O controlador passou a consumir a mesma implementação nos dois espelhos do monólito, e a ordem de scripts foi ajustada sem build. Os testes congelaram construção de nutrientes, unidade, peso e metadados. A mudança preservou a semântica histórica de IDs e horários em vez de introduzir uma normalização oportunista.

**PRs/commits relacionados:** [PR #5](https://github.com/magnoClovis/nutrition-tracker/pull/5); merge [`eaf6a14`](https://github.com/magnoClovis/nutrition-tracker/commit/eaf6a146f5aa049bb1d07906489aeeed78971d5d).

---

## C15 - Documentação retroativa dos primeiros módulos extraídos

**Data (se determinável):** 16/07/2026.

**Propósito:** tornar explícitos os contratos e comportamentos dos módulos que já tinham sido separados antes de a migração adotar um padrão documental consistente.

**Recursos:** JSDoc; contratos UMD/CommonJS; documentação inline de JavaScript.

**Arquivos:** `date-utils.js`; `diary-ticker.js`; `goal-calculator.js`; `meal-score.js`.

**O que foi feito:** foram adicionados cabeçalhos e comentários JSDoc às APIs públicas e às factories existentes, descrevendo dependências, formatos de entrada/saída e limitações preservadas. O PR foi deliberadamente documental: não alterou algoritmos nem expectativas de teste. Essa disciplina passou a ser aplicada nas extrações seguintes e mais tarde serviu de fonte para o inventário consolidado de bugs.

**PRs/commits relacionados:** [PR #6](https://github.com/magnoClovis/nutrition-tracker/pull/6); merge [`1536d07`](https://github.com/magnoClovis/nutrition-tracker/commit/1536d072be72e68b5e8da12f8c3adc2cb591fe63).

---

## C15 - Extração do contrato de internacionalização

**Data (se determinável):** 16/07/2026.

**Propósito:** centralizar idiomas, textos e normalização sem duplicar traduções no monólito e, ao mesmo tempo, proteger o schema persistido de refeições, cuja ordem e cujos identificadores têm impacto em dados reais.

**Recursos:** JavaScript UMD/CommonJS; PT/EN/ES; normalização de locale; testes de contrato de schema.

**Arquivos:** `i18n.js`; `tests/unit/i18n.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** foram extraídos `normalizeLanguage`, `pickLang`, `localeForLang`, `LANGUAGE_OPTIONS`, `MEAL_KEYS`, textos e helpers associados. Os testes congelaram ordem e valores posicionais, hoje catalogados em F05, para impedir que uma alteração aparentemente visual quebrasse chaves Firestore. `app.js` e `nutrition-tracker.jsx` passaram a consumir a factory UMD mantendo igualdade byte a byte.

**PRs/commits relacionados:** [PR #7](https://github.com/magnoClovis/nutrition-tracker/pull/7); merge [`bd24d40`](https://github.com/magnoClovis/nutrition-tracker/commit/bd24d409724ac3e9aaf1ef03709eebb37fbe8860).

---

## C15 - Extração da validação de perfil obrigatório

**Data (se determinável):** 16/07/2026.

**Propósito:** concentrar as regras que determinam se o perfil pós-login está completo, evitando que telas e gate de acesso reimplementassem validações de nascimento, gênero e objetivo.

**Recursos:** JavaScript UMD/CommonJS; validação pura; testes unitários.

**Arquivos:** `profile-validation.js`; `tests/unit/profile-validation.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** foram extraídos `isValidBirthDate`, `isValidGender`, `isValidGoalProfile`, `getRequiredProfileData` e `hasRequiredProfileData`. As regras permaneceram puras e sem acesso a storage. O gate do `App` continuou responsável por decidir quando montar o modal, enquanto os consumidores passaram a compartilhar exatamente o mesmo contrato de dados.

**PRs/commits relacionados:** [PR #8](https://github.com/magnoClovis/nutrition-tracker/pull/8); merge [`560a834`](https://github.com/magnoClovis/nutrition-tracker/commit/560a83480585b9484119a476e84a13e97728e787).

---

## Componentes React extraídos do monólito

## C15 - Primitivos de UI Ring, Bar e ErrorBoundary

**Data (se determinável):** 16/07/2026.

**Propósito:** iniciar a extração de componentes React reais por elementos pequenos, estáveis e sem Firebase, validando o padrão UMD com React recebido explicitamente pela factory.

**Recursos:** React 18; `React.createElement`; UMD/CommonJS; testes de renderização e error boundary.

**Arquivos:** `ui-primitives.js`; `tests/unit/ui-primitives.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** `Ring`, `Bar` e `ErrorBoundary` foram movidos sem JSX compilado. O caso limítrofe de `Bar` com `max === 0` retornando `null` foi transformado em teste explícito. `ErrorBoundary` manteve captura e fallback sem propagar a exceção do filho. React deixou de ser um global implícito dentro do módulo e passou a ser argumento da factory.

**PRs/commits relacionados:** [PR #9](https://github.com/magnoClovis/nutrition-tracker/pull/9); merge [`7922dfd`](https://github.com/magnoClovis/nutrition-tracker/commit/7922dfd9eefbaeaf8db0280929cc7c8a0b0102e3).

---

## C15 - Modal de aviso de versão

**Data (se determinável):** 16/07/2026.

**Propósito:** separar `ReleaseNoticeModal`, componente puramente apresentacional, sem arrastar o componente distinto `VisualUpdateNotice` nem criar dependência desnecessária dos primitivos de UI.

**Recursos:** React; UMD/CommonJS; i18n por `normalizeLanguage`; testes PT/EN/ES.

**Arquivos:** `release-notice.js`; `tests/unit/release-notice.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** o modal passou a receber React e `normalizeLanguage` pela factory e `lang`/`onStartTutorial` por props. O markup e as três versões de texto foram preservados, incluindo a mesma sequência do callback de início do tutorial. Não houve dependência real de `ui-primitives.js`.

**PRs/commits relacionados:** [PR #10](https://github.com/magnoClovis/nutrition-tracker/pull/10); merge [`b8c84c4`](https://github.com/magnoClovis/nutrition-tracker/commit/b8c84c48b5bdddb3c43cf7671d8eddd72cf352f6).

---

## C15 - Overlay imperativo do tutorial

**Data (se determinável):** 16/07/2026.

**Propósito:** extrair o componente de onboarding sem alterar sua coordenação delicada com DOM, navegação, scroll e seletores `data-tutorial`.

**Recursos:** React; DOM (`querySelector`, `click`, `scrollIntoView`, `getBoundingClientRect`); timers; `window.__tutorialNavigating`; UMD/CommonJS.

**Arquivos:** `tutorial-overlay.js`; `tests/unit/tutorial-overlay.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** o overlay foi movido com React e i18n injetados, preservando literalmente os quatro tempos de 0, 80, 120 e 180 ms, o bloqueio de `document.body.style.overflow`, os cliques programáticos e o comportamento de `setRect(null)` sem retry. A flag `window.__tutorialNavigating` permaneceu global por depender da integração externa à fatia. Foram documentados B12 e D05: alvos ausentes/condicionais, race de montagem e ausência de retry, sem correção incidental.

**PRs/commits relacionados:** [PR #11](https://github.com/magnoClovis/nutrition-tracker/pull/11); merge [`4be4990`](https://github.com/magnoClovis/nutrition-tracker/commit/4be49909c7dce8bbb3169e528de6f71019c4d01f).

---

## C15 - Modal de perfil obrigatório

**Data (se determinável):** 16/07/2026.

**Propósito:** separar a UI que bloqueia o uso até o perfil estar válido sem modificar o gate pós-login nem os nomes de persistência.

**Recursos:** React; UMD/CommonJS; `i18n.js`; `goal-calculator.js`; `profile-validation.js`; storage injetado.

**Arquivos:** `required-profile-modal.js`; `tests/unit/required-profile-modal.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** o componente passou a compor validação e constantes já extraídas, sem duplicar regra. Foram preservadas as seis chaves `birthDate`, `gender`, `activityLevel`, `goalType`, `goalKg` e `goalWeeks`, inclusive o comportamento especial de manutenção. `onComplete` continua sendo chamado somente após validação e escrita. O limite de nascimento continua usando `toISOString()`, comportamento catalogado em C04.

**PRs/commits relacionados:** [PR #12](https://github.com/magnoClovis/nutrition-tracker/pull/12); merge [`7736d11`](https://github.com/magnoClovis/nutrition-tracker/commit/7736d11e9e6b213d31df2e09562698c77d41860c).

---

## C15 - Painel de configurações com serviços ambientais injetados

**Data (se determinável):** 16/07/2026.

**Propósito:** retirar o painel do ambiente léxico compartilhado e tornar explícitos os acessos a preferências locais, logout e abertura de URL externa.

**Recursos:** React; UMD/CommonJS; `localStorage`; Firebase Auth; `window.open`; i18n.

**Arquivos:** `settings-panel.js`; `tests/unit/settings-panel.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** storage local, `signOut` e `openUrl` passaram a ser serviços nomeados. Foram preservadas leitura/escrita de `groq_key` e `cors_proxy`, callbacks de idioma/tema e a sequência `fbSignOut` → `onLogout` → `onClose`. A chamada dupla de logout entre painel e `App.handleLogout` permaneceu propositalmente como D04, com tolerância a erro intacta.

**PRs/commits relacionados:** [PR #13](https://github.com/magnoClovis/nutrition-tracker/pull/13); merge [`0db00eb`](https://github.com/magnoClovis/nutrition-tracker/commit/0db00eb840505b579928fd93e320e7f697c5c215).

---

## C15 - Modal de backup com contexto avaliado no momento da ação

**Data (se determinável):** 16/07/2026.

**Propósito:** separar a UI de exportação/importação sem capturar um snapshot obsoleto do diário e sem alterar formatos ou estratégias destrutivas existentes.

**Recursos:** React; File API; JSON; downloads; bridge de backup; UMD/CommonJS; testes unitários e round-trip Playwright autenticado.

**Arquivos:** `backup-modal.js`; `tests/unit/backup-modal.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** as pontes `window._exportData`, `window._exportFullBackup`, `window.previewFullAccountBackupImport` e `window.importFullAccountBackup` foram consumidas por um getter explícito no momento de exportar, pré-visualizar ou importar. O formato permaneceu idêntico e `normalizeMealKeys` continuou não sendo chamado na escrita, apenas em reloads posteriores. Foram documentados A07, B08, D08 e D09: ausência de transação/rollback, fechamento sem cancelamento, rótulo “hoje” em data histórica e divergência `existing`/`existingItems`.

**PRs/commits relacionados:** [PR #14](https://github.com/magnoClovis/nutrition-tracker/pull/14); merge [`1c55340`](https://github.com/magnoClovis/nutrition-tracker/commit/1c5534080ebe607f156be9189aae3b5cdce88c20).

---

## C15 - Tela de verificação de e-mail

**Data (se determinável):** 16/07/2026.

**Propósito:** substituir identificadores Firebase nus por um serviço de autenticação injetado, mantendo o polling e o comportamento de idioma existente.

**Recursos:** React; Firebase Auth; `setInterval`/`clearInterval`; `localStorage`; UMD/CommonJS.

**Arquivos:** `verify-email-screen.js`; `tests/unit/verify-email-screen.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** `checkEmailVerified` e `sendVerificationEmail` foram injetados com nomes estáveis. O polling preservou a flag `active`, a ordem de cleanup e o intervalo original; ao confirmar, encerra o interval e chama `onVerified`. A prop `lang` continua vencendo `localStorage.appLang`, espanhol continua caindo no caminho português (D01) e o estado `checking` sem uso permaneceu como E06.

**PRs/commits relacionados:** [PR #15](https://github.com/magnoClovis/nutrition-tracker/pull/15); merge [`7ddf414`](https://github.com/magnoClovis/nutrition-tracker/commit/7ddf414ac75949ce04127877050ca7f0ec5437a1).

---

## C15 - Tela completa de login, cadastro e recuperação

**Data (se determinável):** 16/07/2026.

**Propósito:** modularizar a porta de entrada do produto sem mudar autenticação, onboarding, preferências, validação ou tratamento de erros.

**Recursos:** React; Firebase Auth/Firestore REST; `localStorage`; i18n; validação de perfil; UMD/CommonJS.

**Arquivos:** `login-screen.js`; `tests/unit/login-screen.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** sete operações foram reunidas em serviço injetado: sign-in, verificação, sign-up, atualização de perfil, escrita Firebase, envio de verificação e reset de senha. `readPreferredDarkMode` permaneceu no monólito e foi injetado. Foram preservadas persistências de `appLang`, `appDarkMode`, `fb_email`, perfil e histórico inicial, além de A08, B14, C04 e D03: ausência de rollback, duplo clique possível, divergência de tema/idioma, loading preso no retorno de verificação pendente e sobrescrita potencial do idioma local.

**PRs/commits relacionados:** [PR #16](https://github.com/magnoClovis/nutrition-tracker/pull/16); merge [`16aec58`](https://github.com/magnoClovis/nutrition-tracker/commit/16aec5834fb9592c954d18077fd48e8577c45951).

---

## C22 - Painel de privacidade e operações destrutivas

**Data (se determinável):** 16/07/2026.

**Propósito:** retirar do monólito a tela mais sensível do grupo, preservando a sequência de reautenticação, troca de senha, limpeza Firestore e exclusão Auth sem alterar a lógica destrutiva.

**Recursos:** React; Firebase Auth REST; Firestore; `fetch`; i18n; UMD/CommonJS.

**Arquivos:** `privacy-panel.js`; `tests/unit/privacy-panel.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** reautenticação, token, sessão, sign-out, limpeza Firestore e exclusão Auth passaram a formar um serviço de conta explicitamente injetado. Confirmações, timeout, mensagens e ordem foram congelados. A extração documentou A04–A06: listagem tratada como vazia, limpeza Firestore opcional e ausência de coordenação/rollback. Este PR foi um precursor de C22; não implementou a saga idempotente concluída posteriormente nos PRs #99–#106.

**PRs/commits relacionados:** [PR #17](https://github.com/magnoClovis/nutrition-tracker/pull/17); merge [`d2dffb7`](https://github.com/magnoClovis/nutrition-tracker/commit/d2dffb7d34db6927d93a28bef9906c700b3a770c).

---

## C22 - Validação HTTP na exclusão da conta Auth

**Data (se determinável):** 16/07/2026.

**Propósito:** corrigir isoladamente a falsa confirmação de exclusão: o fluxo tratava HTTP 400/401/500 de `accounts:delete` como sucesso e desconectava o usuário mesmo com a conta ainda existente.

**Recursos:** Firebase Auth REST; `fetch`; React; i18n; testes com mocks.

**Arquivos:** `privacy-panel.js`; `tests/unit/privacy-panel.test.js`.

**O que foi feito:** a resposta passou a exigir `response.ok` antes de `fbSignOut` e `onLogout`. Em erro HTTP, a tela permanece aberta e informa em PT/EN/ES que os dados Firestore podem já ter sido removidos, mas a conta Auth não. Erro de rede manteve o comportamento de não deslogar. Nenhum rollback, listagem ou obrigatoriedade da limpeza Firestore foi alterado. Foi uma correção cirúrgica e precursora, não a conclusão posterior de C22.

**PRs/commits relacionados:** [PR #18](https://github.com/magnoClovis/nutrition-tracker/pull/18); merge [`620fb5c`](https://github.com/magnoClovis/nutrition-tracker/commit/620fb5c36d4faff994527ab4bfc292be773e1de3).

---

## Algoritmo e integrações externas

## C15 - Extração do algoritmo genético de sugestões

**Data (se determinável):** 18/07/2026.

**Propósito:** separar o GA real de produção do estado React e do benchmark independente em `tests/ga/algorithms.js`, sem confundir as duas implementações.

**Recursos:** algoritmo genético; `Math.random` injetável; `MealScore`; `food-entry.js`; callbacks de progresso; UMD/CommonJS.

**Arquivos:** `meal-ga.js`; `tests/unit/meal-ga.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** limites, geração, fitness, seleção, cruzamento, mutação, progresso e adição ao diário foram extraídos com `MealScore`, `buildEntry`, `updateActiveLog` e `random` injetados. Testes usam seed determinística; produção preserva `Math.random`. A camada de abertura/fechamento e notificações ficou no controlador. Permaneceram B07, E05 e a parte histórica de A09: sem cancelamento, TypeErrors para entradas ausentes, `proteinTolerance` ignorado e possibilidade de sobrescrita ao adicionar múltiplos itens em dia histórico.

**PRs/commits relacionados:** [PR #19](https://github.com/magnoClovis/nutrition-tracker/pull/19); merge [`52f8c39`](https://github.com/magnoClovis/nutrition-tracker/commit/52f8c393bff3368229301790c4512e7d7835e1db).

---

## C15 - Cliente e mapeador Open Food Facts

**Data (se determinável):** 18/07/2026.

**Propósito:** isolar rede e transformação de produtos sem mover scanner, estado React ou mensagens localizadas para o cliente.

**Recursos:** Open Food Facts API; `fetch` injetado; UMD/CommonJS; testes com mocks.

**Arquivos:** `open-food-facts.js`; `tests/unit/open-food-facts.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** busca textual, lookup por código e `applyFoodDbProduct` viraram funções de dados. O mapeamento preserva unidade `g`, porção 100, limpeza de `unitWeightG`, conversão de energia acima de 1000 por 4,184 e campos atuais quando a API retorna ausência. Erros HTTP/rede retornam resultado neutro e produto ausente retorna `null`. A aplicação automática do primeiro resultado permaneceu na camada React, assim como B03: requisições concorrentes podem chegar fora de ordem.

**PRs/commits relacionados:** [PR #20](https://github.com/magnoClovis/nutrition-tracker/pull/20); merge [`50abe50`](https://github.com/magnoClovis/nutrition-tracker/commit/50abe50b88da75910dfd6baf4c7acef786eb140e).

---

## C15 - Cliente Groq

**Data (se determinável):** 18/07/2026.

**Propósito:** centralizar `callAI` sem extrair consumidores, traduções ou estado de UI.

**Recursos:** Groq Chat Completions API; modelo `llama-3.3-70b-versatile`; `fetch`; `localStorage` por getter injetado.

**Arquivos:** `groq-client.js`; `tests/unit/groq-client.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** a factory recebe `fetch` e `getApiKey`; o payload mantém mensagem user, temperatura 0 e `maxTokens || 800` literalmente. A ordem histórica `response.json()` antes de `response.ok` foi congelada, assim como conteúdo ausente retornando string vazia. O erro de chave tornou-se neutro para localização no host. F04 — sem timeout, retry ou cancelamento e JSON inválido podendo mascarar status HTTP — foi documentado, não corrigido.

**PRs/commits relacionados:** [PR #21](https://github.com/magnoClovis/nutrition-tracker/pull/21); merge [`1595b9c`](https://github.com/magnoClovis/nutrition-tracker/commit/1595b9cee258e2e96af4aaf8b474e2d94a903991).

---

## B05 - Explicação de avaliação por IA

**Data (se determinável):** 18/07/2026.

**Propósito:** separar a montagem do prompt de avaliação e a chamada `callAI(prompt, 350)` sem mover ownership de loading ou alterar o score já calculado.

**Recursos:** Groq via cliente injetado; UMD/CommonJS; testes de prompt.

**Arquivos:** `meal-review-ai.js`; `tests/unit/meal-review-ai.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** o módulo stateless recebe `review`, monta o mesmo prompt e devolve texto/erro neutro. A camada React continua zerando texto em erro e encerrando loading em `finally`. Preservou-se a separação problemática entre montagem síncrona fora do `try` assíncrono e chamada dentro dele, além da race de resposta antiga sobre avaliação nova; ambos formam B05.

**PRs/commits relacionados:** [PR #22](https://github.com/magnoClovis/nutrition-tracker/pull/22); merge [`d51d193`](https://github.com/magnoClovis/nutrition-tracker/commit/d51d193e58acc1ac3b313c6f31cdcd9589cf2697).

---

## C15 - Autofill de alimento por IA

**Data (se determinável):** 18/07/2026.

**Propósito:** retirar prompts, parsing e cálculos proporcionais do formulário React, mantendo a aplicação final sob controle do host.

**Recursos:** Groq; i18n; JSON; UMD/CommonJS.

**Arquivos:** `food-autofill-ai.js`; `tests/unit/food-autofill-ai.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** prompts PT/EN/ES e variantes para unidade comum/`un` foram congelados. Cercas Markdown são removidas antes de `JSON.parse`; para `un`, `per100` é escalado por `unitWeightG / 100`; para outras unidades, `null` preserva campo atual. Nome vazio não chama IA. `getAiLanguageInstruction`, `pickLang` e `normalizeLanguage` são injetados. B03 — edição durante request e resultados concorrentes fora de ordem — permaneceu intacto.

**PRs/commits relacionados:** [PR #23](https://github.com/magnoClovis/nutrition-tracker/pull/23); merge [`d1cd1f4`](https://github.com/magnoClovis/nutrition-tracker/commit/d1cd1f41199faa1fa755ac3cde158a7252c6ec8b).

---

## C15 - Descrição de prato por IA

**Data (se determinável):** 18/07/2026.

**Propósito:** separar estimativa nutricional por texto livre e construção da entrada, sem alterar o formato histórico usado pelo diário.

**Recursos:** Groq; JSON; i18n por instrução injetada; UMD/CommonJS.

**Arquivos:** `dish-description-ai.js`; `tests/unit/dish-description-ai.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** o prompt e `callAI(prompt, 600)` foram preservados. A entrada mantém `qty: 1`, `unit: "un"`, nutrientes ausentes como zero, `_estimated: true`, `_description` e ID produzido pela expressão literal baseada em `Date.now()` e `Math.random`. A duplicação conceitual com `food-entry.js` foi conscientemente mantida porque usar `getEntryTime` mudaria o resultado. B04 — descrição atual podendo divergir da que gerou a estimativa e respostas concorrentes — foi documentado.

**PRs/commits relacionados:** [PR #24](https://github.com/magnoClovis/nutrition-tracker/pull/24); merge [`505456b`](https://github.com/magnoClovis/nutrition-tracker/commit/505456b877c0feb889e9dade717ee276bc236ff1).

---

## C15 - Feedback nutricional por snapshot explícito

**Data (se determinável):** 18/07/2026.

**Propósito:** substituir uma closure extensa sobre estado React por um contrato de entrada auditável, sem mover leitura assíncrona de `userName` ou salvamento em notas.

**Recursos:** Groq; i18n; `goal-calculator.js`; snapshot de domínio; UMD/CommonJS.

**Arquivos:** `nutrition-feedback-ai.js`; `tests/unit/nutrition-feedback-ai.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** o módulo recebe snapshot com dia/semana, metas, perfil, peso/altura, preferências, ajustes e nome já resolvido. A camada React continua lendo `storage.get("userName")`, omitindo silenciosamente em erro, e salvando feedback. O corte de semana sem dados ocorre antes de `callAI(prompt, 1000)`. B06 e D02 foram preservados: concorrência pode sobrescrever período/texto e espanhol usa campos ingleses de atividade; o fallback de `activityInfo.factor` permaneceu igual.

**PRs/commits relacionados:** [PR #25](https://github.com/magnoClovis/nutrition-tracker/pull/25); merge [`631b134`](https://github.com/magnoClovis/nutrition-tracker/commit/631b134392a2444e8e4933d48b93066214c4cfd1).

---

## C15 - Padrões alimentares por snapshot de 30 dias

**Data (se determinável):** 18/07/2026.

**Propósito:** separar prompt e análise depois que o controlador resolve até 30 leituras sequenciais de storage, evitando I/O escondido dentro do módulo.

**Recursos:** Groq; i18n; `computeGoals`; `getWeightForDate`; snapshots; UMD/CommonJS.

**Arquivos:** `eating-patterns-ai.js`; `tests/unit/eating-patterns-ai.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** o host preservou a geração de datas por `Date` local + `toISOString`, as leituras sequenciais e falha individual como dia ausente. O módulo recebe dias já parseados, treino, peso, perfil, preferências, metas e refeições, monta o prompt e chama `callAI(prompt, 1200)`. Nenhum dia válido corta antes da IA. Permaneceram B06, C02, D13 e E04: sem cancelamento, bug de timezone, ausência de `normalizeMealKeys` e variável `acc` preenchida mas não usada.

**PRs/commits relacionados:** [PR #26](https://github.com/magnoClovis/nutrition-tracker/pull/26); merge [`a332c69`](https://github.com/magnoClovis/nutrition-tracker/commit/a332c69eccad34c35f2b4dcbbbc54d8471172528).

---

## C15 - Controlador de scanner nativo e ZXing

**Data (se determinável):** 18/07/2026.

**Propósito:** reunir os dois scanners que compartilham vídeo, stream, refs e lookup, sem reimplementar Open Food Facts e sem “melhorar” bugs de ciclo de vida durante a extração.

**Recursos:** `BarcodeDetector`; `mediaDevices.getUserMedia`; `requestAnimationFrame`; ZXingBrowser/ZXing; carregamento de scripts CDN; DOM; UMD/CommonJS.

**Arquivos:** `barcode-scanner.js`; `tests/unit/barcode-scanner.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** APIs ambientais e `lookupBarcode(code)` foram injetados. O fluxo nativo mantém formatos EAN/UPC/Code 128, `setTimeout(0)` e loop de frames. O fallback preserva a ordem dos quatro CDNs e avança em `onerror` ou API ausente. B09–B11 foram congelados: stream pode ficar aberto sem vídeo, API nativa existente que falha não cai no ZXing, lookup falho pode deixar stream, promise de biblioteca é instável por render, script pode pendurar e `ZXingBrowser` pode ocultar `ZXing` válido.

**PRs/commits relacionados:** [PR #27](https://github.com/magnoClovis/nutrition-tracker/pull/27); merge [`3e50602`](https://github.com/magnoClovis/nutrition-tracker/commit/3e50602628aa9d39a3a3c9024ef2146efc593a4d).

---

## Modularização interna do Firebase

## C15 - Suíte contratual de firebase-storage.js

**Data (se determinável):** 18/07/2026.

**Propósito:** criar uma rede de segurança antes de dividir o arquivo que publicava os contratos mais usados do aplicativo.

**Recursos:** Node.js; `vm`; mocks de `fetch`/`localStorage`; Firebase Auth/Firestore REST; testes contratuais.

**Arquivos:** `tests/unit/firebase-storage.contract.test.js`.

**O que foi feito:** a suíte passou a carregar o facade clássico em ambiente controlado e congelou funções `fb*`, `window.storage`, aliases, formatos `null`/vazio, erros e side effects. O objetivo não era validar uma implementação ideal, mas garantir equivalência observável durante as seis extrações seguintes. Os contratos hoje relacionados a F01–F03 foram mantidos deliberadamente.

**PRs/commits relacionados:** [PR #28](https://github.com/magnoClovis/nutrition-tracker/pull/28); merge [`683ae98`](https://github.com/magnoClovis/nutrition-tracker/commit/683ae98e012e23d49a1acb3fea76e993c57ae62d).

---

## C15 - Configuração interna do Firebase

**Data (se determinável):** 18/07/2026.

**Propósito:** iniciar pela parte mais isolada, preservando o facade e os identificadores léxicos consumidos pelo restante do app.

**Recursos:** UMD/CommonJS; `window.NUTRITION_TRACKER_CONFIG`; validação de URL HTTPS.

**Arquivos:** `firebase-config-internal.js`; `tests/unit/firebase-config-internal.test.js`; `firebase-storage.js`; `tests/unit/firebase-storage.contract.test.js`; `index.html`.

**O que foi feito:** `FB_PROJECT`, `FB_KEY`, `FB_BASE`, `AUTH_BASE`, `TOKEN_BASE`, `REPORT_SERVER_URL` e `REPORTS_ENABLED` passaram a ser resolvidos por `FirebaseConfigInternal`. URL vazia, inválida ou HTTP desabilita relatórios; HTTPS válida perde barra final; enabled continua `Boolean(serverUrl)`. O facade redeclara os mesmos nomes nus. Apenas o bootstrap contratual foi ajustado para carregar o novo script antes do facade, sem mudar expectativas.

**PRs/commits relacionados:** [PR #29](https://github.com/magnoClovis/nutrition-tracker/pull/29); merge [`6727eea`](https://github.com/magnoClovis/nutrition-tracker/commit/6727eea4fe461947fa49bb33cf99856b327932e1).

---

## C15 - Autenticação e sessão internas do Firebase

**Data (se determinável):** 18/07/2026.

**Propósito:** encapsular tokens e sessão sem tocar na persistência Firestore ainda inline e sem quebrar consumidores já injetados.

**Recursos:** Firebase Auth REST; `fetch`; `localStorage`; UMD/CommonJS; callback de reset de caches.

**Arquivos:** `firebase-auth-internal.js`; `tests/unit/firebase-auth-internal.test.js`; `tests/unit/firebase-storage.contract.test.js`; `firebase-storage.js`; `index.html`.

**O que foi feito:** `_idToken`, `_uid`, `_refreshToken` e `_tokenExpiry` foram encapsulados; o facade passou a compor as mesmas funções públicas. `resetStorageCaches` foi injetado para preservar o ciclo com Firestore, e uma ponte temporária de UID foi documentada para a fatia seguinte. F01 foi congelado: login aparente por refresh token, refresh concorrente sem single-flight, cleanup incompleto, expiry ausente problemática, JSON sem fallback e ausência de timeout/retry.

**PRs/commits relacionados:** [PR #30](https://github.com/magnoClovis/nutrition-tracker/pull/30); merge [`14f2479`](https://github.com/magnoClovis/nutrition-tracker/commit/14f2479dcd3111fd2f76625e9baa956d051ea548).

---

## C15 - Núcleo de persistência Firestore

**Data (se determinável):** 18/07/2026.

**Propósito:** modularizar `window.storage` e os aliases `fbGet`/`fbSet`/`fbDel`/`fbList`, resolvendo definitivamente o ownership de UID sem alterar prioridades, caches ou compatibilidade v2/v3.

**Recursos:** Firestore REST; `fetch`; UMD/CommonJS; codecs Firestore; cache; fallback `localStorage`.

**Arquivos:** `firebase-firestore-internal.js`; `tests/unit/firebase-firestore-internal.test.js`; `firebase-auth-internal.js`; `tests/unit/firebase-auth-internal.test.js`; `tests/unit/firebase-storage.contract.test.js`; `firebase-storage.js`; `index.html`.

**O que foi feito:** o módulo recebe `getUid`, `getAuthHeaders`, `fetchRequest` e configuração. Codecs, URLs, root, subcoleção `data`, documentos legados, fallback local, caches, seleção de candidato e normalização de perfil foram encapsulados. A ponte solta de `_uid` foi removida. A infraestrutura v2 foi mantida por ser base viva da v3. F02/F03 foram preservados: falhas viram ausência, caches incompletos, promoções fire-and-forget, no-op sem UID e divergência de propagação v2/v3.

**PRs/commits relacionados:** [PR #31](https://github.com/magnoClovis/nutrition-tracker/pull/31); merge [`4f44329`](https://github.com/magnoClovis/nutrition-tracker/commit/4f44329edb8643098f17798e4cccd9ee74c3593f).

---

## C15 - Backup interno do Firebase

**Data (se determinável):** 18/07/2026.

**Propósito:** separar exportação, preview e importação de conta do facade, preservando formatos, merges e falhas parciais.

**Recursos:** Firestore REST; UMD/CommonJS; JSON; merge append/replace; porta interna do Firestore.

**Arquivos:** `firebase-backup-internal.js`; `tests/unit/firebase-backup-internal.test.js`; `tests/unit/firebase-storage.contract.test.js`; `firebase-storage.js`; `index.html`.

**O que foi feito:** o módulo passou a usar uma porta estreita para root/data/legado e três callbacks temporários de merge vindos do facade. Formato completo, categorização, preview e importação foram mantidos. A07 foi explicitamente congelado: lotes não são transacionais, falha posterior não desfaz escrita anterior e chaves de refeição não são normalizadas na escrita.

**PRs/commits relacionados:** [PR #32](https://github.com/magnoClovis/nutrition-tracker/pull/32); merge [`6f084db`](https://github.com/magnoClovis/nutrition-tracker/commit/6f084dbe73e326df5961a9e5935413812ba46df6).

---

## C23 - Migração de schema legado e helpers de merge

**Data (se determinável):** 18/07/2026.

**Propósito:** retirar a migração mais perigosa do facade sem alterar um algoritmo que podia excluir dados reais, deixando o risco inequívoco para investigação posterior.

**Recursos:** Firestore REST; UMD/CommonJS; heurísticas de identidade/riqueza; datas; porta interna do Firestore/Auth.

**Arquivos:** `firebase-migration-internal.js`; `tests/unit/firebase-migration-internal.test.js`; `tests/unit/firebase-storage.contract.test.js`; `firebase-storage.js`; `index.html`.

**O que foi feito:** APIs v2/v3 de migração, normalização e cleanup foram compostas no novo módulo. Os cinco helpers `_normalizedIdentity3`, `_richnessScore3`, `_mergeArrayValues3`, `_mergeObjectValues3` e `_mergeStoredValues3` saíram do facade; os callbacks do backup foram religados sem alterar `firebase-backup-internal.js`. Testes demonstraram A01–A03: janela de 120 dias, limpeza de documentos não promovidos, paginação mascarada, marca de verificação sem retry, ausência de transação e reordenação por heurística. O PR apenas preservou/documentou; C23 resolveu esses riscos depois, em outra frente.

**PRs/commits relacionados:** [PR #33](https://github.com/magnoClovis/nutrition-tracker/pull/33); merge [`cd9d2b4`](https://github.com/magnoClovis/nutrition-tracker/commit/cd9d2b42b991440f02afddb83e6e10d38391c299).

---

## C22 - Exclusão interna de dados da conta

**Data (se determinável):** 19/07/2026.

**Propósito:** concluir a modularização do facade com a operação Firestore destrutiva, mantendo separação explícita da exclusão Auth feita pelo painel de privacidade.

**Recursos:** Firestore REST; `Promise.allSettled`; UMD/CommonJS; Auth headers; caches.

**Arquivos:** `firebase-account-data-internal.js`; `tests/unit/firebase-account-data-internal.test.js`; `tests/unit/firebase-storage.contract.test.js`; `firebase-storage.js`; `index.html`.

**O que foi feito:** `window.deleteCurrentUserFirestoreData` passou a delegar ao módulo composto com UID, headers, reset e porta Firestore injetados. Lotes de 20 e `allSettled` foram mantidos. A04/A05 foram documentados e testados: falha de listagem vira vazio, root ainda pode ser apagado, filhos podem falhar sem rollback, reset precede erro agregado e não há coordenação com migração. A operação continua removendo apenas Firestore. A saga completa de C22 veio posteriormente.

**PRs/commits relacionados:** [PR #34](https://github.com/magnoClovis/nutrition-tracker/pull/34); merge [`45f3c11`](https://github.com/magnoClovis/nutrition-tracker/commit/45f3c11e1bf73313bac0f4bc65efa9bd8e940cba).

---

## Histórico, métricas, hidratação e autosave

## C15 - Modelo puro de calendário

**Data (se determinável):** 22/07/2026.

**Propósito:** iniciar a decomposição do grande bloco de histórico por decisões puras de calendário, deixando I/O, setters e efeitos no controlador.

**Recursos:** JavaScript de datas; UMD/CommonJS; testes unitários.

**Arquivos:** `calendar-model.js`; `tests/unit/calendar-model.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** geração de grade mensal, navegação e marcações foram extraídas por snapshot, sem converter novamente datas ISO dentro do módulo. Comparações e semântica existentes foram mantidas. O cabeçalho documentou a interação com A10 e a família C01/C02, incluindo o vazamento de metas históricas para a chave `TODAY`, sem corrigi-lo.

**PRs/commits relacionados:** [PR #35](https://github.com/magnoClovis/nutrition-tracker/pull/35); merge [`eb3af84`](https://github.com/magnoClovis/nutrition-tracker/commit/eb3af84ec084176d5e911304eed7a5fc0a12809f).

---

## C15 - Modelo de peso e composição corporal

**Data (se determinável):** 22/07/2026.

**Propósito:** concentrar regras de medição, séries e tendências sem mover formulários, backfill de BMR ou setters React.

**Recursos:** `goal-calculator.js`; `date-utils.js`; UMD/CommonJS; snapshots de métricas.

**Arquivos:** `body-metrics-model.js`; `tests/unit/body-metrics-model.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** foram extraídos normalização/deduplicação, upsert, BMR, disponibilidade de campos, médias, banco calórico, tendência, composição e séries. `createMeasurementId` é injetado, inclusive na normalização repetida. D11 e C03 foram congelados: janelas 7/14 contam registros, tendência usa até 14, composição usa 6 e exige 3, zeros somem por truthiness, datas são lexicais e diferença usa meio-dia local dividido por 86.400.000.

**PRs/commits relacionados:** [PR #36](https://github.com/magnoClovis/nutrition-tracker/pull/36); merge [`b1d10d1`](https://github.com/magnoClovis/nutrition-tracker/commit/b1d10d1f3b7094d4a0f9e9a2afd3be423ee0d6a9).

---

## C15 - Resolução pura de metas históricas

**Data (se determinável):** 22/07/2026.

**Propósito:** separar “qual meta vale para esta data” da persistência, permitindo testar a decisão sem esconder o grave bug do efeito hospedeiro.

**Recursos:** `goal-calculator.js`; `body-metrics-model.js`; UMD/CommonJS; snapshots históricos.

**Arquivos:** `historical-goals-model.js`; `tests/unit/historical-goals-model.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** o módulo escolhe medição mais recente, treino/descanso, metas calculadas, overrides truthy e snapshot congelado fora de `TODAY`. Ele retorna `rawGoal`, `computedGoal`, `effectiveGoal` e `weightEntry`; não grava. A10 permaneceu no efeito que usa metas de `viewDate` e escreve `goalHistory[TODAY]`. Também foram documentados C05, D12 e D14: idade atual em data histórica, zero incapaz de sobrescrever e dois formatos de snapshot com metadados parcialmente atuais.

**PRs/commits relacionados:** [PR #37](https://github.com/magnoClovis/nutrition-tracker/pull/37); merge [`7a36098`](https://github.com/magnoClovis/nutrition-tracker/commit/7a36098059f6ed5b0298e8073e13ff0bfd5c0080).

---

## C15 - Agregadores puros de semana e refeições

**Data (se determinável):** 22/07/2026.

**Propósito:** separar transformação de logs já lidos da camada assíncrona e dos setters.

**Recursos:** `historical-goals-model.js`; `date-utils.js`; UMD/CommonJS; agregação nutricional.

**Arquivos:** `week-aggregator.js`; `tests/unit/week-aggregator.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** a semana continua produzindo oito linhas — sete concluídas mais `TODAY` — com macros, peso, tipo de dia, metas e segmentos de conexão ontem/hoje. A análise de 30 dias agrega contagem e médias por `MEAL_KEYS`. Não se reconstrói `day` a partir da ISO e dependências de metas/peso chegam pela resolução histórica. B02 e D13 foram preservados: closures incompletas/races continuam no loader e não há `normalizeMealKeys`, portanto refeições traduzidas/legadas podem ser ignoradas.

**PRs/commits relacionados:** [PR #38](https://github.com/magnoClovis/nutrition-tracker/pull/38); merge [`8cde41f`](https://github.com/magnoClovis/nutrition-tracker/commit/8cde41f05bacb94761a69864dcca0b38515fb126).

---

## C15 - Loaders assíncronos de histórico e calendário

**Data (se determinável):** 22/07/2026.

**Propósito:** organizar leituras por data, semana, 30 dias e mês em funções setter-free sem mascarar races existentes.

**Recursos:** facade `storage`; `week-aggregator.js`; `historical-goals-model.js`; `calendar-model.js`; `date-utils.js`; Promises.

**Arquivos:** `history-loaders.js`; `tests/unit/history-loaders.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** os loaders recebem datas, storage e `createDate` injetado e devolvem Promises com dados resolvidos. O controlador continua atualizando `viewDate` antes da leitura e aplicando setters depois. Foram evitadas oito mudanças de timing identificadas na auditoria. B01/B02 e C02 permanecem: A pode terminar depois de B, nota pode ir à chave errada, mensal só bloqueia setter final, falha/JSON inválido podem parecer ausência e datas locais serializadas em UTC podem deslocar o dia.

**PRs/commits relacionados:** [PR #39](https://github.com/magnoClovis/nutrition-tracker/pull/39); merge [`783e417`](https://github.com/magnoClovis/nutrition-tracker/commit/783e4172a8553bdfa2960011ff61bd69c9b4dd04).

---

## C15 - Guard de hidratação e scheduler de autosave

**Data (se determinável):** 22/07/2026.

**Propósito:** extrair somente as duas peças comprovadamente isoláveis de um protocolo temporal de alto risco, mantendo `loadAll`, aplicação de snapshot, efeitos e timeout de 12 s no controlador.

**Recursos:** storage; `setTimeout`/`clearTimeout` injetados; UMD/CommonJS; testes com timers.

**Arquivos:** `hydration-guard.js`; `autosave-scheduler.js`; `tests/unit/hydration-guard.test.js`; `tests/unit/autosave-scheduler.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** `canPersistHydratedKey(key, value, hydratedSet)` virou função pura; o scheduler ganhou timer por chave, cancelamento do anterior, debounce padrão de 800 ms, 1.500 ms para notas e `onPersisted` apenas em sucesso. A fronteira recusou separar leitura/aplicação de `loadAll` porque isso poderia corrigir incidentalmente comportamento. A11/B13 foram preservados: `waterGoal` não vazio pode passar cedo, cinco caminhos não usam guard, marca ocorre antes de parse, timeout não cancela leitura, timers sobrevivem ao unmount e falhas são engolidas.

**PRs/commits relacionados:** [PR #40](https://github.com/magnoClovis/nutrition-tracker/pull/40); merge [`5221311`](https://github.com/magnoClovis/nutrition-tracker/commit/5221311df69398f8dbc19493faa4c59d7678b2a4).

---

## C07 - Alinhamento do timeout Playwright com o fallback de hidratação

**Data (se determinável):** 22/07/2026.

**Propósito:** eliminar uma flakiness do teste, não uma regressão do app: o helper esperava 10 s pelo overlay, enquanto o fallback legítimo de produção liberava loading em até 12 s.

**Recursos:** Playwright; smoke tests; protocolo de hidratação.

**Arquivos:** `tests/smoke/test-helpers.js`.

**O que foi feito:** depois de reproduzir o teste específico isoladamente em múltiplas execuções, o timeout de `toHaveCount(0)` foi elevado para 15.000 ms. A busca por esperas equivalentes evitou ajustes indiscriminados. Nenhum timeout ou código de produção foi alterado; a espera normal continua terminando assim que o overlay some.

**PRs/commits relacionados:** [PR #41](https://github.com/magnoClovis/nutrition-tracker/pull/41); merge [`b4638e4`](https://github.com/magnoClovis/nutrition-tracker/commit/b4638e4e8b7bf0d2b0bfabee114aafeeb01b9da9).

---

## Decomposição final de NutritionTracker

## C15 - Modelos residuais de nutrição diária e refeições recentes

**Data (se determinável):** 23/07/2026.

**Propósito:** retirar decisões puras ainda escondidas no controlador antes de extrair telas inteiras.

**Recursos:** UMD/CommonJS; modelos por snapshot; testes unitários.

**Arquivos:** `daily-nutrition-model.js`; `recent-meals-model.js`; `tests/unit/daily-nutrition-model.test.js`; `tests/unit/recent-meals-model.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** cálculo diário residual, códigos de guardrail, projeções e derivação de refeições recentes foram isolados. As factories recebem dependências e o controlador mantém ownership do estado. D12 continuou usando fallback por truthiness, e os guardrails calculados mas ainda sem consumidor útil permaneceram parte de E06, sem conexão incidental à futura `MetricsScreen`.

**PRs/commits relacionados:** [PR #42](https://github.com/magnoClovis/nutrition-tracker/pull/42); merge [`a301162`](https://github.com/magnoClovis/nutrition-tracker/commit/a30116270765e9e3d0a31d6d4578a195b2f94863).

---

## C15 - Cinco componentes apresentacionais isolados

**Data (se determinável):** 23/07/2026.

**Propósito:** retirar blocos visuais autônomos antes das telas completas, mantendo cálculos e ownership no controlador.

**Recursos:** React; UMD/CommonJS; Recharts; i18n; `ui-primitives.js`.

**Arquivos:** `visual-update-notice.js`; `meal-review-modal.js`; `ga-result-card.js`; `saved-meal-card.js`; `body-metrics-charts.js`; cinco testes correspondentes em `tests/unit/`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** cada componente recebeu React e dependências explicitamente, sem storage/Firebase/DOM imperativo. `VisualUpdateNotice` permaneceu distinto de `ReleaseNoticeModal`. O card GA recebeu cálculos já prontos e preservou B07; o modal preservou B05. Os gráficos mantiveram condições exatas de `target = 0`, série vazia e número mínimo de pontos, além das janelas/ausência de zero de D11.

**PRs/commits relacionados:** [PR #43](https://github.com/magnoClovis/nutrition-tracker/pull/43); merge [`b5f35cb`](https://github.com/magnoClovis/nutrition-tracker/commit/b5f35cbd6d73652d014943d60b9de7417f459bab).

---

## C15 - WeekScreen apresentacional

**Data (se determinável):** 23/07/2026.

**Propósito:** extrair a aba mais próxima de uma view somente leitura sem mover loaders, IA ou estado compartilhado.

**Recursos:** React; UMD/CommonJS; agregadores semanais; feedback/padrões por IA; exportação.

**Arquivos:** `week-screen.js`; `tests/unit/week-screen.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** resumo, gráficos, médias, padrões, feedback e exportação passaram a receber dados/loading/callbacks por props. `feedbackText`/`feedbackPeriod` continuam compartilhados com Diário; `showExportPanel`/`exportResult`, com Adicionar. B02, B06 e D13 continuam no controlador/loaders: tela não inicia requests, não ordena respostas e não normaliza chaves legadas.

**PRs/commits relacionados:** [PR #44](https://github.com/magnoClovis/nutrition-tracker/pull/44); merge [`bd02739`](https://github.com/magnoClovis/nutrition-tracker/commit/bd02739af09ce027012b2f9fd69a3278c666292b).

---

## C15 - MetricsScreen apresentacional

**Data (se determinável):** 23/07/2026.

**Propósito:** separar a aba de perfil, metas e composição corporal mantendo formulários e decisões de objetivo no controlador.

**Recursos:** React; UMD/CommonJS; modelos de métricas/metas; Recharts; componentes de gráficos.

**Arquivos:** `metrics-screen.js`; `tests/unit/metrics-screen.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** a tela passou a receber formulários, resultados e callbacks. IMC, sugestão de semanas, conversão de gordura, treino/descanso ocultos e `healthGuardrailCodes` continuaram no controlador. O card de relatórios avançados foi movido junto com o callback inerte, preservando E02: altera `reportModalOpen`, mas não há modal ativo. D11/D12/D14 e o acoplamento por `viewDate` não foram corrigidos.

**PRs/commits relacionados:** [PR #45](https://github.com/magnoClovis/nutrition-tracker/pull/45); merge [`e7413ec`](https://github.com/magnoClovis/nutrition-tracker/commit/e7413eccee5844cdafcb3e97a7a05b5b7ffd12dc).

---

## C15 - PantryScreen apresentacional

**Data (se determinável):** 23/07/2026.

**Propósito:** extrair cadastro, busca, templates e suplementos sem transferir scanner, refs ou serviços externos para a tela.

**Recursos:** React; UMD/CommonJS; Open Food Facts; IA de autofill; barcode scanner; modelos de alimento/template.

**Arquivos:** `pantry-screen.js`; `tests/unit/pantry-screen.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** `pantry` e `mealTemplates` permaneceram no controlador e foram passados por props. O elemento de vídeo foi pré-construído pelo controlador para conservar `videoRef` e streams; a tela recebe o nó opaco e callbacks. Scanner e bugs B09–B11 permaneceram intocados. D10 foi preservado literalmente: `foodDbResults` armazenado mas não renderizado, dose oculta porém exigida e bloco órfão de composição corporal.

**PRs/commits relacionados:** [PR #46](https://github.com/magnoClovis/nutrition-tracker/pull/46); merge [`fc76035`](https://github.com/magnoClovis/nutrition-tracker/commit/fc76035422d930fb67089f6a7245443e1f3c60c3).

---

## C15 - AddScreen e pseudoaba Adicionar

**Data (se determinável):** 23/07/2026.

**Propósito:** extrair em uma única fronteira a pseudoaba de montagem de refeição sem duplicar ownership compartilhado com Diário e Despensa.

**Recursos:** React; UMD/CommonJS; `food-entry.js`; descrição por IA; MealScore/review; templates e recentes.

**Arquivos:** `add-screen.js`; `tests/unit/add-screen.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** seleção, staged, templates, recentes, descrição, review e exportação foram organizados em componente com subcomponentes privados. O GA ativo não foi conectado: o painel legado foi passado como `legacyTransferPanel` opaco, preservando E01. IA, storage e mutações continuam callbacks. A divergência entre writes por snapshot e atualização funcional, hoje A09, foi documentada; races B04/B05 não foram resolvidas.

**PRs/commits relacionados:** [PR #47](https://github.com/magnoClovis/nutrition-tracker/pull/47); merge [`503703e`](https://github.com/magnoClovis/nutrition-tracker/commit/503703ebcc83a8f7c1d346fbbfbabc800697f9af).

---

## C15 - DiaryScreen e integração ativa do GA

**Data (se determinável):** 24/07/2026.

**Propósito:** extrair a tela mais acoplada do grupo sem mover persistência, GA, navegação histórica ou ownership de `activeLog`.

**Recursos:** React; UMD/CommonJS; ticker; GA; feedback; água; suplementos; notas; refeições.

**Arquivos:** `diary-screen.js`; `tests/unit/diary-screen.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** status, refeições, água, suplementos, notas, feedback, navegação histórica e bloco GA passaram a receber props/callbacks. `runGA` e escrita continuam no controlador; `ga-result-card.js` apenas apresenta. Não foi inventada conexão dos cards com `MealReviewModal`. Painel de backup e nó Add inalcançável permaneceram opacos e na mesma posição. Foram preservados A09, B01, B07, C01, D07, E03 e uma nova instância de timezone no ticker; água continua today-only e suplementos mostram estado atual em data histórica.

**PRs/commits relacionados:** [PR #48](https://github.com/magnoClovis/nutrition-tracker/pull/48); merge [`8ede748`](https://github.com/magnoClovis/nutrition-tracker/commit/8ede74881e0b5e6b5d1cf0748980033b6297dba3).

---

## C15 - Cabeçalho e navegação

**Data (se determinável):** 25/07/2026.

**Propósito:** retirar a última apresentação comum antes do controlador, mantendo estado efêmero dos menus e decisões de navegação no host.

**Recursos:** React; UMD/CommonJS; textos já resolvidos por props.

**Arquivos:** `app-header-navigation.js`; `tests/unit/app-header-navigation.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** título, seletor de aba, idioma, tema e menu passaram para componente sem resolver i18n internamente. `menuOpen` e submenu de idioma continuam no controlador. Foram preservados B12 e D06: gate de tutorial sem token/cancelamento, submenu que pode reabrir expandido e pseudoaba Adicionar ausente da navegação principal.

**PRs/commits relacionados:** [PR #50](https://github.com/magnoClovis/nutrition-tracker/pull/50); merge [`a184f72`](https://github.com/magnoClovis/nutrition-tracker/commit/a184f7241ed96dea8dab257b96f70d9b3ff6a1bd).

---

## C15 - Extração mecânica do NutritionTrackerController

**Data (se determinável):** 25/07/2026.

**Propósito:** concluir a modularização obrigatória retirando o controlador inteiro do composition root sem simplificar, reorganizar hooks ou mudar closures.

**Recursos:** React 18; UMD/CommonJS; aproximadamente 48 módulos compostos; 145 estados, 35 efeitos, 14 refs e cerca de 138 funções locais.

**Arquivos:** `nutrition-tracker-controller.js`; `tests/unit/nutrition-tracker-controller.test.js`; `app.js`; `nutrition-tracker.jsx`; `index.html`.

**O que foi feito:** o componente foi movido para `createNutritionTrackerController({React, services, domain, screens, browser, constants})`. `app.js` permaneceu composition root com `App`, bootstrap e factories de topo. Ordem de hooks/efeitos e dependências foram mantidas; as 11 factories internas continuaram instanciadas por render nos mesmos pontos, recebendo closures atuais de despensa, `updateActiveLog`, normalização, scanner e autosave. Os espelhos mantiveram hash SHA-256 idêntico. B15 e os bugs de integração restantes foram documentados; bridges globais não ganharam cleanup e nenhum comportamento foi corrigido.

**PRs/commits relacionados:** [PR #51](https://github.com/magnoClovis/nutrition-tracker/pull/51); merge [`0431748`](https://github.com/magnoClovis/nutrition-tracker/commit/04317486535394d79c760734f2c3ca8571807c83).

---

## Investigações, inventário e decisões sem implementação atribuída a este chat

## Investigação histórica das sugestões LLM desconectadas

**Data (se determinável):** não determinado; realizada entre os merges dos PRs #24 e #25.

**Propósito:** decidir se `generateMealSuggestions`/`loadSuggestionToStaged` deveriam ser extraídas ou deixadas no monólito.

**Recursos:** Git; `git log --follow -p`; busca pickaxe `git log -S`.

**Arquivos:** nenhum arquivo modificado.

**O que foi feito:** o histórico foi inspecionado para identificar criação, uso e desconexão. A conclusão apresentada foi que o fluxo LLM era resíduo desconectado de uma substituição pelo GA ativo. Por decisão de produto, a subfatia foi pulada e o bloco permaneceu intacto, hoje catalogado em E01. Nenhuma remoção ou reativação foi reivindicada.

**PRs/commits relacionados:** não aplicável; investigação de leitura sem commit deste chat.

---

## Decisão de não extrair relatórios avançados

**Data (se determinável):** não determinado; posterior ao PR #27.

**Propósito:** evitar modularizar e aparentar suporte a um recurso sem chamador ativo e sem servidor de produção.

**Recursos:** análise estática do cliente de relatórios, configuração runtime e UI.

**Arquivos:** nenhum arquivo modificado.

**O que foi feito:** payload, endpoints, riscos de dados pessoais e comportamento de erro foram auditados. O responsável decidiu pausar a extração e retomar somente junto da restauração consciente do modal/serviço. O card permaneceu desconectado e mais tarde foi apenas movido mecanicamente em `metrics-screen.js`, condição catalogada em E02.

**PRs/commits relacionados:** não aplicável; decisão de produto sem commit deste chat.

---

## Inventário consolidado de bugs preservados

**Data (se determinável):** 26/07/2026 para a versão produzida nesta conversa.

**Propósito:** reunir em um único documento os alertas, races, bugs e limitações espalhados pelos módulos e testes antes de iniciar o planejamento do bundler.

**Recursos:** `rg`; leitura de JSDoc; testes unitários/Playwright; análise manual por severidade.

**Arquivos:** `bug-inventory.txt` foi gerado localmente nesta conversa; nenhum commit desse arquivo é atribuído a este chat.

**O que foi feito:** cabeçalhos, TODO/FIXME/KNOWN/PRESERVED/BACKLOG e nomes de testes foram varridos e deduplicados. A versão entregue ao responsável consolidou 56 itens, classificou perda/corrupção, races, timezone, UX, código morto e infraestrutura e destacou os riscos mais críticos. O inventário canônico atual registra 60 itens porque recebeu ampliações posteriores por outras frentes; essas ampliações e commits não são reivindicados aqui.

**PRs/commits relacionados:** não determinado para integração ao repositório; a criação local nesta conversa não foi confirmada como commit próprio.

---

## C15 - Mapeamento da migração Vite em dez subfatias

**Data (se determinável):** 26/07/2026.

**Propósito:** planejar a substituição segura da cadeia UMD por Vite/ESM sem fazer cutover parcial e sem alterar expectativas que congelavam os bugs inventariados.

**Recursos:** Vite; ESM; npm; React/ReactDOM 18.3.1; PropTypes 15.8.1; Recharts 2.10.4; GitHub Pages; GitHub Actions.

**Arquivos:** nenhum arquivo modificado por este chat nesta etapa.

**O que foi feito:** foi proposta uma árvore paralela `src/`, `base: "./"`, allowlist de build, conversão por camadas de dependência, entrada JSX, cutover e deploy de `dist`. `window.NUTRITION_TRACKER_CONFIG` permaneceria igual e os UMDs só seriam removidos após tag e período estável. A implementação concreta dos PRs #53–#68 pertence a outra conversa e está documentada separadamente em `documentation/historico/2026-07-28-vite-esm-cutover-pages.md`.

**PRs/commits relacionados:** nenhum PR implementado por este chat; somente planejamento aprovado.

---

## Auditoria de arquivos locais com dados pessoais

**Data (se determinável):** não determinado; posterior ao planejamento do Vite.

**Propósito:** impedir que backups, exports, credenciais e documentação interna fossem copiados para `dist` e avaliar quatro JSONs suspeitos antes de construir a allowlist.

**Recursos:** leitura local de JSON; análise de dados pessoais; Git.

**Arquivos:** `nutrition-full-raw.json`; `nutrition-audit-summary.json`; `nutrition-orphan-cleanup-report.json`; `backup.json` foram somente lidos e descritos; nenhum foi modificado nesta conversa.

**O que foi feito:** foi relatada, sem expor conteúdo bruto, a quantidade de usuários e os tipos de dados presentes, incluindo nutrição, nomes, e-mails e UIDs quando encontrados. Os números exatos dessa leitura não são mais determináveis a partir do checkout higienizado e não são reconstruídos por inferência neste registro. A descoberta interrompeu corretamente a implementação Vite e levou à decisão de limpar todo o histórico público antes de continuar.

**PRs/commits relacionados:** não aplicável; auditoria local sem commit.

---

## Orientação para limpeza destrutiva do histórico Git

**Data (se determinável):** não determinado.

**Propósito:** remover os quatro JSONs pessoais de todos os commits, branches e tags sem executar uma reescrita irreversível em nome do responsável.

**Recursos:** Git; `git-filter-repo`; GitHub; force-push manual.

**Arquivos:** `.gitignore` foi verificado/proposto para prevenção; nenhum arquivo nem histórico foi alterado por este chat durante a orientação.

**O que foi feito:** foram fornecidos passos para confirmar/instalar `git-filter-repo`, criar clone de salvaguarda, executar uma única passagem com quatro `--path` e `--invert-paths`, revisar o resultado e somente então forçar branches/tags. Também foram explicadas as limitações de caches/clones externos. O responsável confirmou posteriormente ter executado a limpeza e criado clone novo; a execução e o force-push não são reivindicados por este chat.

**PRs/commits relacionados:** não aplicável; procedimento executado manualmente pelo responsável.

---

## Investigações de flakiness Playwright

**Data (se determinável):** entre 22 e 23/07/2026.

**Propósito:** distinguir regressões de timing introduzidas pelas extrações de falhas ambientais antes de mesclar PRs de alto risco.

**Recursos:** Playwright; projeto `mobile-chromium`; execuções repetidas isoladas; smoke autenticado.

**Arquivos:** nenhum arquivo modificado nas investigações; a única correção decorrente foi `tests/smoke/test-helpers.js` no PR #41.

**O que foi feito:** o teste de loading foi repetido isoladamente e comparado ao fallback de 12 s, resultando no ajuste cirúrgico do PR #41. O backup round-trip em `mobile-chromium` também foi executado repetidamente antes do avanço do PR #42; a orientação foi interromper se houvesse nova falha. Essas verificações não alteraram código de produção nem expectativas funcionais.

**PRs/commits relacionados:** [PR #41](https://github.com/magnoClovis/nutrition-tracker/pull/41) apenas para o ajuste confirmado; demais execuções sem commit.

---

## Síntese quantitativa da contribuição

- **46 PRs implementados e atribuídos a esta conversa:** #5–#48, mais #50 e #51; o PR #49 não é reivindicado.
- **Período confirmado dos merges:** 16/07/2026 a 25/07/2026.
- **Frentes entregues:** domínio inicial; nove componentes React; correção destrutiva isolada; GA; oito integrações ativas; suíte e seis módulos internos Firebase; seis fatias de histórico/hidratação; decomposição final das telas e controlador.
- **Princípio técnico dominante:** factories UMD/CommonJS com dependências explícitas, sem build, preservação de `app.js`/`nutrition-tracker.jsx` idênticos e manutenção deliberada de comportamento observável, inclusive bugs conhecidos.
- **Trabalho conscientemente não implementado:** sugestões LLM desconectadas, relatórios avançados, correções dos riscos catalogados, execução do `git-filter-repo` e migração Vite efetiva.
