# Histórico da frente principal — arquitetura de IA e dados

## Escopo e método

Este arquivo registra a frente de trabalho retomada para a migração da IA gerenciada e continuada em segurança de dados, releases, critérios nutricionais e infraestrutura. A evidência primária é o histórico de PRs mesclados do repositório `magnoClovis/nutrition-tracker`, complementado pelos documentos versionados citados.

O primeiro PR atribuível com segurança a esta frente é o #79, mesclado em 30/07/2026. PRs #1–#78 formam o contexto técnico anterior (extrações, Vite e Capacitor), mas o Git não prova que pertencem a este mesmo chat; sua autoria conversacional é **não determinada** e eles não são reivindicados aqui.

Datas são datas de merge retornadas pelo GitHub. Os hashes são commits de merge. Motivações são descritas apenas quando aparecem no título, no código ou em documentos versionados; motivações conversacionais não preservadas nessas fontes são **não determinadas**.

## 30–31/07/2026 — IA gerenciada, UX e roadmap

- **PR #79**, 30/07 — `Migrate Trofia AI to managed Gemini proxy`; merge `a4f398e`. Introduziu o proxy gerenciado Gemini/Cloudflare e retirou do fluxo ativo a dependência de chave configurada pelo usuário.
- **PR #80**, 31/07 — `Refine diary UX and add Trofia AI status`; merge `74b3c0e`. Reuniu a primeira rodada de ajustes de Diário/UX e o estado local da IA.
- **PR #81**, 31/07 — `docs: add consolidated Trofia roadmap`; merge `918d114`. Consolidou o planejamento que passou a orientar as fatias seguintes.

## 01/08/2026 — integridade, datas, privacidade e início do C24

- **PR #82** — correção G01 da corrida entre restauração de backup e autosave; merge `13e16b8`.
- **PRs #83–#85** — C01-A/B/C: encoding/textos (`49813c8`), domínio de datas civis (`da4b905`) e virada reativa da meia-noite (`f88d5f9`).
- **PR #86** — retenção máxima dos metadados do rate limiter (P04); merge `4acc8af`.
- **PR #87** — política de privacidade trilíngue publicada; merge `425d57c`.
- **PR #88** — estabilização do round-trip autenticado de backup; merge `d853899`.
- **PRs #89–#90** — C24 iniciou com contrato/editor compartilhado (`8520085`) e Worker multimodal (`661d232`).

## 02–17/08/2026 — reconhecimento de refeição por foto

- **PR #91**, 02/08 — captura e pré-processamento; merge `7776fb4`.
- **PR #92**, 02/08 — tela dedicada de reconhecimento; merge `eb0c162`.
- **PR #93**, 08/08 — isolamento da fixture histórica do backup; merge `4acaae0`. Foi uma estabilização de teste entre as fatias do C24.
- **PR #94**, 09/08 — persistência das estimativas revisadas; merge `a9ca72e`.
- **PR #95**, 09/08 — divulgação do processamento de fotos nas políticas/compliance; merge `904f5f9`.
- **PR #96**, 17/08 — validação dos gates técnicos e de implantação; merge `2fb3aeb`.
- **PR #97**, 17/08 — liberação do fluxo na navegação real; merge `abc00c7`.

O documento `/C24_FATIA_7_VALIDACAO.md` conserva a matriz técnica. A sequência dos PRs comprova contrato, transporte, captura, tela, persistência, compliance, validação e exposição; detalhes de testes físicos que não estejam nesse documento ou nos commits são **não determinados** por esta auditoria.

## 18–21/08/2026 — roadmap, versão 0.9 e exclusão administrativa

- **PR #98**, 18/08 — reavaliação do roadmap; merge `36c49d5`.
- **PRs #99–#100**, 18/08 — infraestrutura de emuladores (`0e033ea`) e motor idempotente de exclusão (`c3b7f52`).
- **PR #102**, 20/08 — checkpoint `0.9.0-beta`; merge `a68bb5a`. Não há PR #101 mesclado; o #101 permaneceu draft e depois foi sobreposto por trabalho posterior de C28.
- **PRs #103–#106**, 21/08 — lock de escrita/exclusão recursiva (`f233fb4`), Cloud Tasks/reconciliação (`836cead`), integração protegida no painel (`4583eac`) e validação final do rollout (`b15a47d`).

O desenho final de C22 usa saga administrativa idempotente, App Check, filas e verificação. A matriz operacional está em `/C22_ROLLOUT.md`. A confirmação de produção mencionada no roadmap é fonte versionada; dados de contas descartáveis não são registrados aqui.

## 21–28/08/2026 — encerramento do armazenamento legado (C23)

- **PR #107**, 21/08 — inventário administrativo somente leitura; merge `4cd7805`.
- **PRs #108–#109**, 23/08 — cópia/verificação dos documentos (`36bf24b`) e rules transitórias somente leitura (`4338629`).
- **PRs #110–#111**, 27/08 — corte do cliente (`5c6b337`) e fechamento definitivo do legado (`b8935be`).
- **PR #112**, 28/08 — documentação da conclusão e compatibilidades preservadas; merge `b7e0785`.

O `ROADMAP.md` registra 54 documentos migrados/verificados, export gerenciado anterior à exclusão e contagem final zero. O propósito exato de cada documento legado individual não está enumerado nas fontes consultadas e é **não determinado** aqui.

## 28–29/08/2026 — arquitetura offline-first e 0.10.0-beta

- **PR #113** — redução de leituras redundantes e CI; merge `c9c5662`.
- **PR #114** — Firebase Auth compartilhado e App Check; merge `cffec94`.
- **PR #115** — adaptador modular do Firestore; merge `ef19822`.
- **PR #116** — lifecycle do cache persistente; merge `04e8137`.
- **PR #117** — loaders históricos cache-first; merge `c8c2ac6`.
- **PRs #118–#122** — IDs idempotentes (`3677181`), esquema granular (`3178f3d`), leitura retrocompatível (`8983ee4`), estados/retries (`b472acf`) e corte dos autosaves agregados (`0378cb9`).
- **PR #123** — coordenação de backup e encerramento do SDK; merge `52033be`.
- **PR #124** — validação e rollout do C28; merge `9e19575`.
- **PR #125** — preparação da versão `0.10.0-beta`; merge `dc0852c`.

C22, C23 e C28 compõem o checkpoint `0.10.0-beta` segundo `ROADMAP.md` e `VERSIONING.md`. O código Git preserva `versionName`, mas o `versionCode` distribuído foi administrado fora dos commits e é **não determinado** pelo repositório.

## 30/08/2026 — App Check, score e avaliação de refeições

- **PR #127** — adaptação do CI autenticado ao enforcement do App Check; merge `e95686b`.
- **PR #128** — atualização da linha de lançamento/pós-lançamento no roadmap; merge `cf042d5`.
- **PRs #129, #131, #132, #134 e #135** — contrato/calibração (`68d5e62`), algoritmo v2 (`2af6cb4`), integração (`e34a6f6`), apresentação (`aaf4b16`) e validação final (`24432cf`) do C20.
- **PRs #137, #139, #140, #142 e #145** — integridade dos snapshots (`16233c8`), ciclo opcional de explicação/retry (`34d3a1f`), integração com foto (`7d15f1d`), badge no Diário (`2d6be5b`) e validação final (`623f63f`) do C19.

PRs intercalados de ChoiceField/TemporalField/NumericField pertencem a outra frente de UI e não são atribuídos a este chat. O contrato vigente do score está em `/NUTRITION_SCORE.md`.

## 30–31/08/2026 — política nutricional e contratos de IA (C08)

- **PR #147**, 30/08 — política/matriz canônica das sete superfícies; merge `67514dd`.
- **PR #149**, 30/08 — preservação de “ausente” como diferente de zero; merge `dd27571`.
- **PR #151**, 31/08 — estimativas estruturadas para preenchimento e descrição; merge `d0914b1`. O Worker foi implantado antes do cliente segundo a política versionada.
- **PR #152**, 31/08 — feedback e padrões com todos os nutrientes disponíveis, cobertura real, linguagem não diagnóstica e minimização de perfil; merge `5c51fa5`.

C08-A a C08-D foram concluídas nesses PRs. O modelo permanece `gemini-3.5-flash-lite`; comparação de modelo foi adiada em `PENDENCIAS.md`.

## 31/08/2026 — organização documental e retomada da C08

- **PR #153** — criou o índice documental, o resumo de estado e este histórico comprovável; merge incluído na base `3d776db`.
- **PR #155** — passou a reservar a suíte pesada para PRs que também alterem código, sem abrir exceção para PR misto de código e documentação; merge incluído na base `3d776db`.

### C08-E — despensa e explicação da avaliação

- **Código:** `C08-E`.
- **Data:** 31/08/2026.
- **Propósito:** retirar do controlador o prompt livre de sugestões pela despensa, impedir correspondência aproximada de alimentos e alinhar a explicação narrativa do C19 ao score contextual definitivo.
- **Recursos:** contrato `pantry-suggestions-v2`; endpoint autenticado `POST /v1/ai/pantry-suggestions`; contrato narrativo `meal-explanation-v1`; modelo mantido em `gemini-3.5-flash-lite`.
- **Arquivos principais:** `/pantry-suggestions-ai.js`, `/worker/src/pantry-suggestions.js`, `/worker/src/ai-worker.js`, `/ai-client.js`, `/nutrition-tracker-controller.js`, `/meal-review-ai.js`, composições UMD/ESM, testes e `/AI_NUTRITION_POLICY.md`.
- **O que foi feito:** a IA passou a receber uma projeção limitada da despensa com IDs exatos; Worker e cliente validam resposta integralmente em modo fail-closed; IDs desconhecidos/repetidos, quantidades inválidas e campos extras são recusados; todos os totais são recalculados a partir do snapshot canônico local. O GA visível continua local e não foi substituído silenciosamente. A explicação da avaliação agora recebe versão do algoritmo, nota 0–5 definitiva, cobertura, confiança, provisoriedade e seus motivos específicos, sem recalcular nota, diagnosticar ou transformar ausência em zero. O Worker foi implantado primeiro, na versão `11f11b83-fb2d-413e-a133-3818f52ddf66`. Como o ambiente local reproduziu o bloqueio F06 ao domínio `workers.dev`, o smoke real foi executado uma única vez em runner externo: cadastro descartável 200, endpoint 200, contrato `pantry-suggestions-v2` válido com três sugestões e limpeza da conta 200.
- **PRs/commits relacionados:** PR #165, branch `codex/c08-pantry-score-explanation`, commits `be8534d`, `4fd4b02` e `2e99ee3`; smoke de produção runs `33432122955` e `33432381264`; merge `e12b464`.

### C08-F — validação final

- **Código:** `C08-F`.
- **Data:** 31/08/2026.
- **Propósito:** fechar o alinhamento das sete superfícies de IA com evidência determinística e uma avaliação pequena e controlada contra o provedor real.
- **Recursos:** matriz PT/EN/ES; dados ausentes preservados como `null`; respostas malformadas rejeitadas em modo fail-closed; entradas adversariais tratadas como dados; quatro chamadas reais limitadas e conta descartável.
- **Arquivos principais:** `/tests/fixtures/ai-nutrition-policy.json`, `/tests/unit/ai-nutrition-policy.test.js`, `/scripts/validate-c08-production.mjs`, `/.github/workflows/c08-production-validation.yml`, `/worker/src/structured-estimates.js`, `/meal-review-ai.js`, `/nutrition-feedback-ai.js`, testes, `/AI_NUTRITION_POLICY.md`, `/ROADMAP.md` e documentação sincronizada.
- **O que foi feito:** nomes e descrições não confiáveis passaram a ser serializados como dados JSON ou escapados antes de entrar nos prompts; a validação final cobre todas as superfícies e classes de falha aprovadas. O Worker compatível foi implantado antes da prova real na versão `ca5e65d9-2eeb-4a86-9364-5eb2d0b2b2e1`, sem alterar endpoint, modelo, limite ou contrato público. A prova real verifica preenchimento em português, descrição em inglês, sugestões em espanhol e explicação narrativa em português, apenas por invariantes de contrato, sem registrar conteúdo. A evidência de imagem permanece a validação física e de produção do C24, sem copiar fotos privadas para o repositório. Workflows de prova real verificam apenas o commit mais recente para não repetir chamadas após alterações exclusivamente documentais.
- **PRs/commits relacionados:** PR #167, branch `codex/c08-final-validation`, commit `2490f91`, merge `2547a19`; CI e validação de produção totalmente verdes antes do merge.

## 01/09/2026 — checkpoint 0.11.0-beta

- **Código:** `0.11.0-beta`.
- **Data:** 01/09/2026.
- **Propósito:** reunir C20, C19 e C08 numa versão nomeada coerente para distribuição no teste interno.
- **Recursos:** aviso cumulativo em PT/EN/ES com o texto aprovado em `VERSIONING.md`; tutorial pontual sobre nota contextual, cobertura/confiança, revisão de estimativas e critérios nutricionais compartilhados; referências de versão sincronizadas.
- **Arquivos principais:** `/package.json`, `/package-lock.json`, `/android/app/build.gradle`, `/index.html`, `/release-notice.js`, `/tutorial-overlay.js`, testes e documentação de estado.
- **O que foi feito:** o identificador de release passou a `0.11.0-beta`; usuários existentes recebem aviso e tutorial pontual, enquanto usuários novos recebem o mesmo aviso seguido do tutorial completo. O `versionCode` do AAB é incrementado somente na preparação local do artefato assinado, conforme a prática do projeto.
- **PRs/commits relacionados:** PR #169, branch `codex/version-0.11.0-beta`, commit de preparação `1514ace`; merge `0187c90`.

## 01/09/2026 — hotfix de App Check e leitura do perfil (encerrado)

- **Código:** `hotfix-v11-appcheck-profile`.
- **Data:** 01/09/2026.
- **Propósito:** impedir que um AAB Android release seja empacotado sem a configuração nativa do Firebase e impedir que falhas de leitura do Firestore sejam interpretadas como perfil nutricional incompleto.
- **Recursos:** verificação fail-closed de `google-services.json` no build release; inicialização observável do App Check; erro recuperável de leitura do perfil em PT/EN/ES; retry sem cachear documento raiz vazio.
- **Arquivos principais:** `/android/app/build.gradle`, `/firebase-firestore-sdk.js`, `/profile-validation.js`, `/required-profile-modal.js`, composições UMD/ESM e testes.
- **O que foi feito:** a distribuição do AAB `0.11.0-beta` versionCode 11 foi pausada/revertida após a confirmação de que o artefato saiu de um worktree sem `android/app/google-services.json`. A conta real foi auditada somente por leitura e seu documento canônico continha os campos obrigatórios válidos; nenhum dado foi alterado. O build release passa a falhar explicitamente quando a configuração nativa estiver ausente. Falhas de App Check ou leitura do documento raiz deixam de virar `{}` e agora bloqueiam a abertura do app com um estado de erro distinto, sanitizado e repetível, sem mostrar o formulário de perfil incompleto. O incidente foi encerrado após a build `0.11.0-beta` versionCode 12 ser instalada pela Play Store e validada na conta real: login normal, perfil carregado, alteração de perfil salva, sincronização funcional e App Check inicializado corretamente.
- **PRs/commits relacionados:** PR #173, branch `codex/fix-v11-appcheck-profile-read`, commit `8721c35`, merge `e39f6bd`; build Play versionCode 12 validada fisicamente em 01/09/2026.

## C14 — divisão completa da revisão geral de segurança

### [C14-A] - Integridade fail-closed e encerramento documental

- **Status:** concluído.
- **Data de conclusão:** 01/09/2026.
- **Propósito:** estender a correção fail-closed do documento raiz aos documentos canônicos de dados e à enumeração usada pelo backup completo, impedindo que falhas sejam interpretadas como ausência.
- **Recursos/arquivos principais envolvidos:** `/firebase-firestore-sdk.js`, `/firebase-backup-internal.js`, testes unitários UMD/ESM, `/documentation/estado-atual/RESUMO-STATUS.md` e este histórico.
- **O que foi feito:** `fetchDataDoc()` e `listDataKeys()` deixaram de converter falha de rede, permissão ou App Check em `null`/`[]`; falhas não são cacheadas como ausência. O backup só é produzido depois de todas as leituras canônicas concluírem e aborta explicitamente se raiz, listagem, documento ou agregado diário não puder ser comprovado. O incidente da build 11 foi encerrado documentalmente após a build Play versionCode 12 validar App Check, leitura, escrita e sincronização com a conta real.
- **PRs/commits relacionados:** PR #174, commit de implementação `bd62a32`, merge `141da412`; incidente original corrigido no PR #173.

### [C14-B] - Rules do Firestore e schema canônico

- **Status:** em andamento.
- **Data de conclusão:** não concluída; B1 concluída em 01/09/2026 e B2 iniciada em 01/09/2026.
- **Propósito:** impedir exclusão client-side do documento raiz e restringir os envelopes, campos, chaves, tipos e tamanhos aceitos pelas rules sem bloquear dados legítimos já existentes.
- **Recursos/arquivos principais envolvidos:** `/firestore.rules`, testes de rules/emuladores, ferramenta administrativa Admin SDK de inventário somente leitura e documentação de rollback/deploy.
- **O que foi feito:** B1 nega `delete` da raiz para qualquer cliente e preserva exclusivamente o Admin SDK do C22 para exclusão completa. A raiz recebe um teto conservador de 128 campos; documentos `/data/{key}` exigem o envelope exato `{value: string}` com máximo de 900.000 caracteres. As rules B1 foram publicadas em produção em 01/09/2026 e validadas pelo CI autenticado pós-deploy no run `33512725510` (tentativa 2), totalmente verde. Na B2, uma ferramenta Admin SDK somente leitura passou a enumerar Auth, raízes, `data` e collection groups granulares com paginação completa e saída sanitizada. As rules completas foram mescladas no PR #177 e publicadas, mas as duas tentativas do run pós-deploy `33529042502` e uma reprodução ampliada no emulador confirmaram que a validação exaustiva ultrapassava o limite de 1.000 expressões em batches granulares reais. A primeira versão do hotfix ainda falhou na tentativa 2 do run `33548758342` com snapshots reais de seis componentes e exigiu novo rollback B1, confirmado verde na tentativa 3. A correção revisada valida creates integralmente, somente campos alterados em updates, entrada/nutrientes e envelope superior do score nas rules; o interior dos componentes passa pelo contrato fail-closed C20/C19. Um teste integrado injeta componente inválido via Admin SDK, lê como usuário e confirma que a avaliação é rejeitada/ocultada. A investigação administrativa separou 2 raízes sem Auth de 114 descendentes em 26 UIDs e encontrou padrão fortemente compatível com contas descartáveis automatizadas; nada foi excluído. O C22 não os descobre sem job conhecido, logo uma limpeza futura requer janitor dedicado e fail-closed.
- **PRs/commits relacionados:** PR #175, branch `codex/c14-b-rules-hardening`, commit B1 `9a0b228`, merge `8d2ddae`; PR #177, merge B2 `9d16e60`; hotfix B2 em validação.

### Incidente de produção — rules C14-B2 rejeitando escrita granular legítima

- **Status:** mitigado por rollback confirmado; correção B2 permanece em revisão e não foi republicada.
- **Data:** 01/09/2026.
- **Propósito do registro:** preservar a causa, o impacto e o procedimento de recuperação do segundo incidente real em que uma regra/configuração nova rejeitou uma escrita legítima em produção.
- **Recursos/arquivos principais envolvidos:** `/firestore.rules`, `/firebase-firestore-sdk.js`, `/daily-entry-persistence.js`, testes autenticados em `/tests/smoke/authenticated-flows.spec.js` e inventário [`C14_B2_FIRESTORE_SCHEMA_INVENTORY.md`](../estado-atual/C14_B2_FIRESTORE_SCHEMA_INVENTORY.md).
- **Causa:** o CI do PR #177 executou antes do deploy e, portanto, ainda testava contra B1. Depois que B2 foi publicada, a combinação de validação integral da raiz com verificações individuais de todos os nutrientes da entrada e do `foodSnapshot` ultrapassou o limite de 1.000 expressões das Security Rules. O Firestore rejeitava atomicamente o batch que criava a refeição/GA e atualizava `_dailyDates`.
- **Impacto:** oito falhas reproduzíveis, quatro fluxos em desktop e mobile; refeição retroativa ausente na Semana, modal que não fechava porque o save falhava, avaliação aceita não persistida e sugestão GA ausente. O legado passou. A atomicidade evitou escrita parcial, mas usuários poderiam perder uma ação recém-realizada.
- **Timeline e resposta:** PR #177 mesclado no merge `9d16e60`; deploy B2 concluído; tentativas 1 e 2 do run `33529042502` falharam após o deploy; diagnóstico isolado confirmou que não era concorrência de portas; B1 do merge `8d2ddae` foi restaurada em 01/09/2026 com hash verificado `bd1398b58bfa618797f6819a51c393b885af298a`. A tentativa 3 do mesmo run ficou totalmente verde, com 95/95 cenários Playwright e os oito fluxos Vite antes bloqueados restaurados.
- **Correção definitiva proposta, ainda não publicada:** manter validação integral em creates; em updates, permitir alterar somente a allowlist canônica e validar estritamente o tipo de cada campo efetivamente modificado. Campos históricos podem sobreviver apenas inalterados. A entrada mantém allowlist, identidade, tipos centrais e nutrientes; `foodSnapshot` não duplica as 18 verificações. Para o score, as rules validam o envelope superior e os nomes `protein`/`kcal`/`fiber`/`salt`/`carbs`/`fat`; o cliente valida profundamente cada componente e oculta o grupo inteiro ao encontrar campo/tipo malformado. O emulador cobre o snapshot completo e uma injeção administrativa malformada lida pelo cliente.

### [C14-C] - App Check no Worker de IA

- **Status:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** proteger a cota e os endpoints de IA contra clientes automatizados que possuam apenas uma conta Firebase válida, sem repetir uma quebra de clientes durante o rollout.
- **Recursos/arquivos principais envolvidos:** `/worker/src/`, `/worker/wrangler.jsonc`, adaptadores de IA do cliente, inicialização App Check web/Android, CI autenticado e testes Worker/Pages/AAB.
- **O que foi feito:** nenhuma implementação iniciada. Está aprovado o rollout observação → clientes enviam token → debug provider no CI → validação Pages/AAB real → enforcement obrigatório.

### [C14-D] - Android e cadeia de release

- **Status:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** reduzir exposição de dados locais e tornar o artefato Android verificável e fail-closed quanto à configuração Firebase e às propriedades de segurança do manifesto.
- **Recursos/arquivos principais envolvidos:** `/android/app/src/main/AndroidManifest.xml`, `/android/app/src/main/res/xml/file_paths.xml`, `/android/app/build.gradle`, scripts/testes de release, AAB assinado e aparelho físico.
- **O que foi feito:** nenhuma implementação iniciada. Está aprovado desligar o Auto Backup Android; também serão tratados `FileProvider` restrito, cleartext explicitamente negado, validação semântica de `google-services.json` e manifesto/hash reproduzível do release.

### [C14-E] - Auth, sessão e onboarding recuperável

- **Status:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** impedir contas parcialmente configuradas por falhas silenciosas, alinhar a senha mínima e dar ao usuário controle explícito sobre a persistência da sessão web.
- **Recursos/arquivos principais envolvidos:** `/login-screen.js`, runtime Firebase Auth modular, i18n PT/EN/ES, testes de onboarding/sessão e configuração manual da política de senha no Firebase Console.
- **O que foi feito:** nenhuma implementação iniciada. Estão aprovados mínimo de 12 caracteres sem composição forçada e o checkbox “Manter logado”: desmarcado usa persistência `SESSION`; marcado usa `LOCAL`, sem janela de tolerância após fechar.

### [C14-F] - Worker, observabilidade, Functions, IAM e dependências

- **Status:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** limitar abuso e falhas do backend, criar observabilidade sanitizada e auditar privilégios efetivos da infraestrutura sem ampliar IAM antes de conhecer o estado real.
- **Recursos/arquivos principais envolvidos:** `/worker/src/`, Durable Object/rate limiter, `/functions/`, Cloud Functions/Tasks, Google Cloud IAM, Artifact/Cloud Logging, lockfiles e testes de backend.
- **O que foi feito:** nenhuma implementação iniciada. O plano aprovado divide a fatia em F1 (infraestrutura de tiers por UID mantida desligada nos testes, UID pseudonimizado, timeout/limite de resposta, métricas endpoint/status/escopo/latência por 30 dias e compatibilidade do Worker) e F2 (auditoria somente leitura de IAM/invocadores, alertas e atualizações controladas; criação de service accounts de privilégio mínimo depende do resultado da auditoria).

### [C14-G] - Web, CSP e superfícies de debug

- **Status:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** reduzir o impacto de uma eventual XSS e impedir que APIs globais de diagnóstico permaneçam disponíveis indevidamente em produção.
- **Recursos/arquivos principais envolvidos:** `/index.html`, CSP via `<meta http-equiv>`, integrações Firebase/reCAPTCHA/Worker/Google APIs, globals de debug e matriz PT/EN/ES em Pages.
- **O que foi feito:** nenhuma implementação iniciada. Está aprovada a CSP imediata no GitHub Pages, inicialmente via meta e compatível com os serviços atualmente necessários.

### [C14-H] - Staging, validação final e rollout

- **Status:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Propósito:** comprovar o endurecimento completo em um ambiente destrutivo separado antes do lançamento público e produzir o handoff operacional para C16/C25.
- **Recursos/arquivos principais envolvidos:** novo projeto Firebase staging, emuladores, CI, Pages, Worker, Functions/Tasks, AAB distribuído pela Play, matriz offline/multiaba/backup/exclusão, inventário IAM/secrets/dependências e documentação operacional.
- **O que foi feito:** nenhuma implementação iniciada. Está aprovada a criação de um projeto Firebase separado para testes destrutivos; a matriz final cobrirá cross-account, payloads malformados, App Check, rate limit, tarefas duplicadas, cache/lifecycle, Auto Backup, rollback e validação física.

## Incidentes e trabalhos separados observados

### [BUG-SAVED-MEAL-ID] - Reutilização de refeição salva com identidade duplicada

- **Status:** concluído.
- **Data de conclusão:** 02/09/2026.
- **Propósito:** permitir que uma refeição salva, inclusive um modelo histórico sem `foodSnapshot`, seja registrada novamente na categoria original ou em outra categoria sem colidir com entradas já existentes no Diário.
- **Recursos/arquivos principais envolvidos:** `/food-entry.js`, `/tests/unit/food-entry.test.js`, `DailyEntryModel` e `DailyEntryPersistence` como contratos de integração.
- **O que foi feito:** o diagnóstico reproduziu que modelos antigos reutilizavam `foodId` ou nome como `entry.id`; após o C28 exigir IDs únicos em todo o dia, repetir o modelo na mesma categoria virava no-op e em outra categoria lançava `Daily entry snapshots require unique stable IDs` antes de alcançar o Firestore. A correção gera um ID novo a cada carregamento em todos os formatos e preserva `foodId` somente como referência. Os testes UMD/ESM comprovam duas reutilizações na categoria original e uma terceira em categoria diferente, sem colisão no diff granular. O PR #179, commit `dba47ef`, foi mesclado em `0eeca71` após o run autenticado `33568921326` ficar totalmente verde. Este bug é separado das recusas de rules da C14-B2.

- **Reload/troca de idioma após C14-A:** o chat Trofia-UI/UX relatou, sem reprodução estável, uma queda para login em espanhol e um `SearchableChoiceField` preso em `#loading`. Três tentativas isoladas passaram. No PR #175, a tentativa 2 do CI chegou ao mesmo teste, mas o job foi cancelado exatamente pelo teto global de 30 minutos depois de apenas 5,6 segundos da espera de 15 segundos; isso não comprova o travamento. O teto do CI foi ajustado para 45 minutos e ficou registrado investigar, em pausa natural do C14, consumidores de reload/bootstrap que ainda possam presumir o contrato antigo de leitura silenciosa, sem atribuir causalidade à C14-A até existir evidência.
- **F06 / PR #143:** documentação reconciliada e mesclada em 01/09/2026 no merge `7662899`; a causa de rede específica por usuário/ISP e a futura migração para domínio próprio permanecem registradas fora do C08.
- **PR #101:** draft antigo de leituras do Firestore, fechado sem merge em 01/09/2026 por ter sido substituído pelo C28, especialmente PRs #113–#117.
- **PR #150:** trabalho de NumericField em outra frente de UI, ainda draft na captura.

## Estado ao encerrar esta cronologia

- Base usada para o checkpoint: `origin/main` no commit `0187c90`, em 01/09/2026.
- Versão nomeada preparada no código: `0.11.0-beta`.
- C22, C23, C28, C20 e C19: concluídos segundo o roadmap.
- C08: implementação A–F concluída e mesclada no PR #167.
- Próximos gates de lançamento público no roadmap: C14, C16 e C25.

## Fontes consultadas e limitações

- GitHub: lista de PRs mesclados e abertos, títulos, datas e commits.
- Git: `origin/main` no commit `3d776db`.
- Documentos: `/ROADMAP.md`, `/VERSIONING.md`, `/PENDENCIAS.md`, `/AI_NUTRITION_POLICY.md`, `/NUTRITION_SCORE.md`, `/C22_ROLLOUT.md` e `/C24_FATIA_7_VALIDACAO.md`.
- O histórico integral das conversas não existe no Git; decisões que dependem somente do diálogo e não deixaram evidência versionada são **não determinadas**.
- APIs do GitHub estavam acessíveis durante esta captura; nenhum intervalo foi omitido por indisponibilidade da API.
