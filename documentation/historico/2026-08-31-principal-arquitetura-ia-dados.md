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
- **Status:** concluído.
- **Data de conclusão:** 31/08/2026.
- **Tempo decorrido:** 1 h 42 min.
- **Minutos de CI:** 30 min (1 leve + 29 pesado).
- **O que se planeja fazer:** extrair a sugestão de despensa do controlador, validar referências contra o snapshot local e alinhar a explicação narrativa ao contrato C19/C20 sem mudar o score.
- **Propósito:** retirar do controlador o prompt livre de sugestões pela despensa, impedir correspondência aproximada de alimentos e alinhar a explicação narrativa do C19 ao score contextual definitivo.
- **Recursos:** contrato `pantry-suggestions-v2`; endpoint autenticado `POST /v1/ai/pantry-suggestions`; contrato narrativo `meal-explanation-v1`; modelo mantido em `gemini-3.5-flash-lite`.
- **Arquivos principais:** `/pantry-suggestions-ai.js`, `/worker/src/pantry-suggestions.js`, `/worker/src/ai-worker.js`, `/ai-client.js`, `/nutrition-tracker-controller.js`, `/meal-review-ai.js`, composições UMD/ESM, testes e `/AI_NUTRITION_POLICY.md`.
- **O que foi feito:** a IA passou a receber uma projeção limitada da despensa com IDs exatos; Worker e cliente validam resposta integralmente em modo fail-closed; IDs desconhecidos/repetidos, quantidades inválidas e campos extras são recusados; todos os totais são recalculados a partir do snapshot canônico local. O GA visível continua local e não foi substituído silenciosamente. A explicação da avaliação agora recebe versão do algoritmo, nota 0–5 definitiva, cobertura, confiança, provisoriedade e seus motivos específicos, sem recalcular nota, diagnosticar ou transformar ausência em zero. O Worker foi implantado primeiro, na versão `11f11b83-fb2d-413e-a133-3818f52ddf66`. Como o ambiente local reproduziu o bloqueio F06 ao domínio `workers.dev`, o smoke real foi executado uma única vez em runner externo: cadastro descartável 200, endpoint 200, contrato `pantry-suggestions-v2` válido com três sugestões e limpeza da conta 200.
- **Alinhamento:** 100%; o escopo aprovado foi entregue. A troca do smoke local por runner externo respondeu ao bloqueio F06 sem alterar o produto e teve impacto neutro.
- **PRs/commits relacionados:** PR #165, branch `codex/c08-pantry-score-explanation`, commits `be8534d`, `4fd4b02` e `2e99ee3`; smoke de produção runs `33432122955` e `33432381264`; merge `e12b464`.

### C08-F — validação final

- **Código:** `C08-F`.
- **Status:** concluído.
- **Data de conclusão:** 31/08/2026.
- **Tempo decorrido:** 38 min.
- **Minutos de CI:** 25 min (1 leve + 24 pesado).
- **O que se planeja fazer:** validar PT/EN/ES, dados ausentes, respostas malformadas, entradas adversariais e uma amostra controlada contra o Gemini real.
- **Propósito:** fechar o alinhamento das sete superfícies de IA com evidência determinística e uma avaliação pequena e controlada contra o provedor real.
- **Recursos:** matriz PT/EN/ES; dados ausentes preservados como `null`; respostas malformadas rejeitadas em modo fail-closed; entradas adversariais tratadas como dados; quatro chamadas reais limitadas e conta descartável.
- **Arquivos principais:** `/tests/fixtures/ai-nutrition-policy.json`, `/tests/unit/ai-nutrition-policy.test.js`, `/scripts/validate-c08-production.mjs`, `/.github/workflows/c08-production-validation.yml`, `/worker/src/structured-estimates.js`, `/meal-review-ai.js`, `/nutrition-feedback-ai.js`, testes, `/AI_NUTRITION_POLICY.md`, `/ROADMAP.md` e documentação sincronizada.
- **O que foi feito:** nomes e descrições não confiáveis passaram a ser serializados como dados JSON ou escapados antes de entrar nos prompts; a validação final cobre todas as superfícies e classes de falha aprovadas. O Worker compatível foi implantado antes da prova real na versão `ca5e65d9-2eeb-4a86-9364-5eb2d0b2b2e1`, sem alterar endpoint, modelo, limite ou contrato público. A prova real verifica preenchimento em português, descrição em inglês, sugestões em espanhol e explicação narrativa em português, apenas por invariantes de contrato, sem registrar conteúdo. A evidência de imagem permanece a validação física e de produção do C24, sem copiar fotos privadas para o repositório. Workflows de prova real verificam apenas o commit mais recente para não repetir chamadas após alterações exclusivamente documentais.
- **Alinhamento:** 100%; a matriz aprovada e a prova real controlada foram executadas sem ampliar modelo, limites ou persistência. Impacto final positivo.
- **PRs/commits relacionados:** PR #167, branch `codex/c08-final-validation`, commit `2490f91`, merge `2547a19`; CI e validação de produção totalmente verdes antes do merge.

## 01/09/2026 — checkpoint 0.11.0-beta

- **Código:** `0.11.0-beta`.
- **Status:** concluído.
- **Data de conclusão:** 01/09/2026.
- **Tempo decorrido:** 1 h 14 min.
- **Minutos de CI:** 18 min (1 leve + 17 pesado).
- **O que se planeja fazer:** consolidar C20, C19 e C08 numa versão nomeada com aviso trilíngue e tutorial pontual já aprovados.
- **Propósito:** reunir C20, C19 e C08 numa versão nomeada coerente para distribuição no teste interno.
- **Recursos:** aviso cumulativo em PT/EN/ES com o texto aprovado em `VERSIONING.md`; tutorial pontual sobre nota contextual, cobertura/confiança, revisão de estimativas e critérios nutricionais compartilhados; referências de versão sincronizadas.
- **Arquivos principais:** `/package.json`, `/package-lock.json`, `/android/app/build.gradle`, `/index.html`, `/release-notice.js`, `/tutorial-overlay.js`, testes e documentação de estado.
- **O que foi feito:** o identificador de release passou a `0.11.0-beta`; usuários existentes recebem aviso e tutorial pontual, enquanto usuários novos recebem o mesmo aviso seguido do tutorial completo. O `versionCode` do AAB é incrementado somente na preparação local do artefato assinado, conforme a prática do projeto.
- **Alinhamento:** 100%; referências, aviso e tutorial foram sincronizados como planejado. Impacto final positivo.
- **PRs/commits relacionados:** PR #169, branch `codex/version-0.11.0-beta`, commit de preparação `1514ace`; merge `0187c90`.

## 01/09/2026 — hotfix de App Check e leitura do perfil (encerrado)

- **Código:** `hotfix-v11-appcheck-profile`.
- **Status:** concluído.
- **Data de conclusão:** 01/09/2026.
- **Tempo decorrido:** 48 min.
- **Minutos de CI:** 27 min (1 leve + 26 pesado).
- **O que se planeja fazer:** tornar o build release fail-closed para `google-services.json` e impedir que falha de leitura seja confundida com perfil incompleto.
- **Propósito:** impedir que um AAB Android release seja empacotado sem a configuração nativa do Firebase e impedir que falhas de leitura do Firestore sejam interpretadas como perfil nutricional incompleto.
- **Recursos:** verificação fail-closed de `google-services.json` no build release; inicialização observável do App Check; erro recuperável de leitura do perfil em PT/EN/ES; retry sem cachear documento raiz vazio.
- **Arquivos principais:** `/android/app/build.gradle`, `/firebase-firestore-sdk.js`, `/profile-validation.js`, `/required-profile-modal.js`, composições UMD/ESM e testes.
- **O que foi feito:** a distribuição do AAB `0.11.0-beta` versionCode 11 foi pausada/revertida após a confirmação de que o artefato saiu de um worktree sem `android/app/google-services.json`. A conta real foi auditada somente por leitura e seu documento canônico continha os campos obrigatórios válidos; nenhum dado foi alterado. O build release passa a falhar explicitamente quando a configuração nativa estiver ausente. Falhas de App Check ou leitura do documento raiz deixam de virar `{}` e agora bloqueiam a abertura do app com um estado de erro distinto, sanitizado e repetível, sem mostrar o formulário de perfil incompleto. O incidente foi encerrado após a build `0.11.0-beta` versionCode 12 ser instalada pela Play Store e validada na conta real: login normal, perfil carregado, alteração de perfil salva, sincronização funcional e App Check inicializado corretamente.
- **Alinhamento:** 100%; os dois defeitos autorizados foram corrigidos e validados numa build distribuída pela Play. Impacto final positivo.
- **PRs/commits relacionados:** PR #173, branch `codex/fix-v11-appcheck-profile-read`, commit `8721c35`, merge `e39f6bd`; build Play versionCode 12 validada fisicamente em 01/09/2026.

## C14 — divisão completa da revisão geral de segurança

### [C14-A] - Integridade fail-closed e encerramento documental

- **Status:** concluído.
- **Data de conclusão:** 01/09/2026.
- **Tempo decorrido:** 43 min.
- **Minutos de CI:** 32 min (1 leve + 31 pesado).
- **O que se planeja fazer:** propagar falhas de leitura/listagem, não cacheá-las como ausência e impedir exportação de backup incompleta.
- **Propósito:** estender a correção fail-closed do documento raiz aos documentos canônicos de dados e à enumeração usada pelo backup completo, impedindo que falhas sejam interpretadas como ausência.
- **Recursos/arquivos principais envolvidos:** `/firebase-firestore-sdk.js`, `/firebase-backup-internal.js`, testes unitários UMD/ESM, `/documentation/estado-atual/RESUMO-STATUS.md` e este histórico.
- **O que foi feito:** `fetchDataDoc()` e `listDataKeys()` deixaram de converter falha de rede, permissão ou App Check em `null`/`[]`; falhas não são cacheadas como ausência. O backup só é produzido depois de todas as leituras canônicas concluírem e aborta explicitamente se raiz, listagem, documento ou agregado diário não puder ser comprovado. O incidente da build 11 foi encerrado documentalmente após a build Play versionCode 12 validar App Check, leitura, escrita e sincronização com a conta real.
- **Alinhamento:** 100%; o escopo fail-closed e o encerramento documental foram entregues integralmente. Impacto final positivo.
- **PRs/commits relacionados:** PR #174, commit de implementação `bd62a32`, merge `141da412`; incidente original corrigido no PR #173.

### [C14-B] - Rules do Firestore e schema canônico

- **Status:** concluído.
- **Data de conclusão:** validação técnica em 02/09/2026; fechamento formal pelo merge do PR #178 em 07/09/2026.
- **Tempo decorrido:** B1: 2 h 13 min; B2/hotfix final: 5 d 11 h 20 min.
- **Minutos de CI:** B1: 30 min (1 leve + 29 pesado); B2/hotfix final: 59 min (1 leve + 58 pesado).
- **O que se planeja fazer:** negar exclusão client-side, inventariar dados reais e aplicar allowlists/tipos/tamanhos ao esquema canônico sem bloquear escritas legítimas.
- **Propósito:** impedir exclusão client-side do documento raiz e restringir os envelopes, campos, chaves, tipos e tamanhos aceitos pelas rules sem bloquear dados legítimos já existentes.
- **Recursos/arquivos principais envolvidos:** `/firestore.rules`, testes de rules/emuladores, ferramenta administrativa Admin SDK de inventário somente leitura e documentação de rollback/deploy.
- **O que foi feito:** B1 nega `delete` da raiz para qualquer cliente e preserva exclusivamente o Admin SDK do C22 para exclusão completa. A raiz recebe um teto conservador de 128 campos; documentos `/data/{key}` exigem o envelope exato `{value: string}` com máximo de 900.000 caracteres. As rules B1 foram publicadas em produção em 01/09/2026 e validadas pelo CI autenticado pós-deploy no run `33512725510` (tentativa 2), totalmente verde. Na B2, uma ferramenta Admin SDK somente leitura passou a enumerar Auth, raízes, `data` e collection groups granulares com paginação completa e saída sanitizada. As rules completas foram mescladas no PR #177 e publicadas, mas as duas tentativas do run pós-deploy `33529042502` e uma reprodução ampliada no emulador confirmaram que a validação exaustiva ultrapassava o limite de 1.000 expressões em batches granulares reais. A primeira versão do hotfix ainda falhou na tentativa 2 do run `33548758342` com snapshots reais de seis componentes e exigiu novo rollback B1, confirmado verde na tentativa 3. A correção final valida creates integralmente, somente campos alterados em updates, entrada/nutrientes e envelope superior do score nas rules; o interior dos componentes passa pelo contrato fail-closed C20/C19. Um teste integrado injeta componente inválido via Admin SDK, lê como usuário e confirma que a avaliação é rejeitada/ocultada. O run `33575611133` ficou verde na tentativa 2 antes do deploy e na tentativa 3 contra as rules republicadas em 02/09/2026. A investigação administrativa separou 2 raízes sem Auth de 114 descendentes em 26 UIDs e encontrou padrão fortemente compatível com contas descartáveis automatizadas; nada foi excluído. O C22 não os descobre sem job conhecido, logo uma limpeza futura requer janitor dedicado e fail-closed.
- **Alinhamento:** divergiu do escopo original — a validação profunda de todos os componentes nas rules excedeu o orçamento de expressões e causou rollback; a solução final preservou envelope/allowlist e transferiu o interior ao leitor fail-closed. O impacto final foi positivo, embora tenha havido impacto negativo temporário em produção, registrado no incidente abaixo.
- **PRs/commits relacionados:** PR #175, branch `codex/c14-b-rules-hardening`, commit B1 `9a0b228`, merge `8d2ddae`; PR #177, merge B2 `9d16e60`; hotfix definitivo no PR #178, commits `5e8ecf7`, `3b32b7b` e `f8f3c09`, merge `80bc2ca`.

### Incidente de produção — rules C14-B2 rejeitando escrita granular legítima

- **Status:** encerrado; rules corrigidas publicadas e validadas em 02/09/2026, PR #178 mesclado em 07/09/2026.
- **Data:** 01/09/2026.
- **Propósito do registro:** preservar a causa, o impacto e o procedimento de recuperação do segundo incidente real em que uma regra/configuração nova rejeitou uma escrita legítima em produção.
- **Recursos/arquivos principais envolvidos:** `/firestore.rules`, `/firebase-firestore-sdk.js`, `/daily-entry-persistence.js`, testes autenticados em `/tests/smoke/authenticated-flows.spec.js` e inventário [`C14_B2_FIRESTORE_SCHEMA_INVENTORY.md`](../estado-atual/C14_B2_FIRESTORE_SCHEMA_INVENTORY.md).
- **Causa:** o CI do PR #177 executou antes do deploy e, portanto, ainda testava contra B1. Depois que B2 foi publicada, a combinação de validação integral da raiz com verificações individuais de todos os nutrientes da entrada e do `foodSnapshot` ultrapassou o limite de 1.000 expressões das Security Rules. O Firestore rejeitava atomicamente o batch que criava a refeição/GA e atualizava `_dailyDates`.
- **Impacto:** oito falhas reproduzíveis, quatro fluxos em desktop e mobile; refeição retroativa ausente na Semana, modal que não fechava porque o save falhava, avaliação aceita não persistida e sugestão GA ausente. O legado passou. A atomicidade evitou escrita parcial, mas usuários poderiam perder uma ação recém-realizada.
- **Timeline e resposta:** PR #177 mesclado no merge `9d16e60`; deploy B2 concluído; tentativas 1 e 2 do run `33529042502` falharam após o deploy; diagnóstico isolado confirmou que não era concorrência de portas; B1 do merge `8d2ddae` foi restaurada em 01/09/2026 com hash verificado `bd1398b58bfa618797f6819a51c393b885af298a`. A tentativa 3 do mesmo run ficou totalmente verde, com 95/95 cenários Playwright e os oito fluxos Vite antes bloqueados restaurados.
- **Correção definitiva publicada e validada:** creates continuam integralmente validados; em updates, somente a allowlist canônica pode mudar e cada campo afetado tem o tipo validado. Campos históricos podem sobreviver apenas inalterados. A entrada mantém allowlist, identidade, tipos centrais e nutrientes; `foodSnapshot` não duplica as 18 verificações. Para o score, as rules validam o envelope superior e os nomes `protein`/`kcal`/`fiber`/`salt`/`carbs`/`fat`; o cliente valida profundamente cada componente e oculta o grupo inteiro ao encontrar campo/tipo malformado. O emulador cobre o snapshot completo e uma injeção administrativa malformada lida pelo cliente. Em 02/09/2026, a tentativa 2 do run `33575611133` validou o SHA antes do deploy; após a publicação, a tentativa 3 repetiu toda a matriz autenticada contra produção e ficou verde.

### [C14-C] - App Check no Worker de IA

- **Status:** em andamento.
- **Data de conclusão:** não concluído.
- **Tempo decorrido:** pendente de merge da conclusão da C14-C.
- **Minutos de CI:** 85 min acumulados até aqui (PR #189: 1 leve + 39 pesado; PR #191: 1 leve + 44 pesado).
- **O que se planeja fazer:** executar rollout progressivo em cinco fases — observação, envio pelos clientes, debug provider no CI, validação Pages/AAB e enforcement.
- **Propósito:** proteger a cota e os endpoints de IA contra clientes automatizados que possuam apenas uma conta Firebase válida, sem repetir uma quebra de clientes durante o rollout.
- **Recursos/arquivos principais envolvidos:** `/worker/src/firebase-app-check-token.js`, `/worker/src/ai-worker.js`, `/worker/wrangler.jsonc`, `/ai-client.js`, `/image-meal-client.js`, composições legado/Vite, inicialização App Check web/Android, CI autenticado, testes Worker/Pages/AAB e `/documentation/estado-atual/C14_C_APP_CHECK_WORKER_ROLLOUT.md`.
- **O que foi feito:** em 10/09/2026 foi implementada a verificação própria dos tokens Firebase App Check no Worker: JWKS oficial com cache limitado a seis horas, assinatura RS256, `typ`, `kid`, emissor, audiência, expiração e allowlist dos app IDs Web/Android. Os clientes de texto e imagem passaram a obter e enviar `X-Firebase-AppCheck`, falhando de forma sanitizada antes do upload quando a prova do app não está disponível. O CORS e os verificadores de deploy reconhecem o cabeçalho. O run autenticado `34478874949` ficou integralmente verde, incluindo o debug provider do App Check, e a versão Worker `632877f3-e51f-4226-92fa-0b139e51e459` foi publicada em `observe` e aprovada no smoke externo. Depois do hotfix #191, o Pages foi validado com login normal e os três fluxos de IA. Faltam um AAB real com Play Integrity e, somente depois, a ativação de `enforce` com nova validação para concluir a fatia.
- **Alinhamento:** parcial — fases 1–3 e a validação Pages da fase 4 foram concluídas; AAB real e enforcement permanecem. A descoberta do gate de perfil ampliou a validação sem alterar o objetivo e teve impacto positivo.

### [C14-C-PROFILE-GATE] - Corrida entre App Check, cache e perfil obrigatório

- **Status:** concluído.
- **Data de conclusão:** 12/09/2026.
- **Tempo decorrido:** 1 h 31 min.
- **Minutos de CI:** 45 min (1 leve + 44 pesado).
- **O que se planeja fazer:** exigir token App Check real, usar leitura de servidor no gate e impedir o modal de cadastro em login normal ou falha transitória.
- **Propósito:** impedir que uma leitura aparentemente bem-sucedida, mas atendida por cache desatualizado durante a obtenção do token App Check, seja interpretada como perfil ausente e abra uma tela exclusiva da criação de conta.
- **Recursos/arquivos principais envolvidos:** `/app-check-client.js`, `/src/firebase/app-check-client.js`, `/firebase-firestore-sdk.js`, `/src/firebase/firebase-firestore-sdk.js`, `/profile-validation.js`, `/src/App.jsx`, testes unitários/smoke e documentação de C14-C.
- **O que foi feito:** em 12/09/2026, durante a fase 4 do rollout C14-C no Pages, uma conta antiga com perfil completo recebeu o modal “Completar perfil nutricional”; após F5 o modal desapareceu e Descrever prato, Reconhecer por foto e Avaliar refeição com explicação funcionaram. O diagnóstico comprovou uma categoria distinta da C14-A: não houve exceção mascarada, mas uma leitura `getDoc()` aceita como sucesso a partir de cache antigo. O hotfix rejeita resultados/dummy tokens, espera token real antes da primeira leitura protegida, usa `getDocFromServer()` para o gate, remove App Check do timeout de autenticação, mostra erro recuperável e só retorna `requires-completion` quando `isNewAccount === true`. Após o merge, o login e os três fluxos de IA foram validados no Pages sem reabrir o modal.
- **Alinhamento:** 100%; todos os cenários aprovados foram cobertos e a prova real confirmou a correção. Impacto final positivo.
- **PRs/commits relacionados:** PR #191, branch `codex/c14-c-profile-readiness`, commit `bdea83f`, merge `e118872`. — **Chat:** Trofia-Principal.

### [C14-D] - Android e cadeia de release

- **Status:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Tempo decorrido:** pendente de merge.
- **Minutos de CI:** 0 min; não iniciado.
- **O que se planeja fazer:** desligar Auto Backup, restringir FileProvider/cleartext e tornar configuração/manifests do AAB verificáveis.
- **Propósito:** reduzir exposição de dados locais e tornar o artefato Android verificável e fail-closed quanto à configuração Firebase e às propriedades de segurança do manifesto.
- **Recursos/arquivos principais envolvidos:** `/android/app/src/main/AndroidManifest.xml`, `/android/app/src/main/res/xml/file_paths.xml`, `/android/app/build.gradle`, scripts/testes de release, AAB assinado e aparelho físico.
- **O que foi feito:** nenhuma implementação iniciada. Está aprovado desligar o Auto Backup Android; também serão tratados `FileProvider` restrito, cleartext explicitamente negado, validação semântica de `google-services.json` e manifesto/hash reproduzível do release.

### [C14-E] - Auth, sessão e onboarding recuperável

- **Status:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Tempo decorrido:** pendente de merge.
- **Minutos de CI:** 0 min; não iniciado.
- **O que se planeja fazer:** aplicar senha mínima de 12 caracteres, sessão `SESSION`/`LOCAL` explícita e onboarding recuperável.
- **Propósito:** impedir contas parcialmente configuradas por falhas silenciosas, alinhar a senha mínima e dar ao usuário controle explícito sobre a persistência da sessão web.
- **Recursos/arquivos principais envolvidos:** `/login-screen.js`, runtime Firebase Auth modular, i18n PT/EN/ES, testes de onboarding/sessão e configuração manual da política de senha no Firebase Console.
- **O que foi feito:** nenhuma implementação iniciada. Estão aprovados mínimo de 12 caracteres sem composição forçada e o checkbox “Manter logado”: desmarcado usa persistência `SESSION`; marcado usa `LOCAL`, sem janela de tolerância após fechar.

### [C14-F] - Worker, observabilidade, Functions, IAM e dependências

- **Status:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Tempo decorrido:** pendente de merge.
- **Minutos de CI:** 0 min; não iniciado.
- **O que se planeja fazer:** executar F1 (tiers, limites, observabilidade) e F2 (auditoria IAM/invocadores/dependências) na ordem aprovada.
- **Propósito:** limitar abuso e falhas do backend, criar observabilidade sanitizada e auditar privilégios efetivos da infraestrutura sem ampliar IAM antes de conhecer o estado real.
- **Recursos/arquivos principais envolvidos:** `/worker/src/`, Durable Object/rate limiter, `/functions/`, Cloud Functions/Tasks, Google Cloud IAM, Artifact/Cloud Logging, lockfiles e testes de backend.
- **O que foi feito:** nenhuma implementação iniciada. O plano aprovado divide a fatia em F1 (infraestrutura de tiers por UID mantida desligada nos testes, UID pseudonimizado, timeout/limite de resposta, métricas endpoint/status/escopo/latência por 30 dias e compatibilidade do Worker) e F2 (auditoria somente leitura de IAM/invocadores, alertas e atualizações controladas; criação de service accounts de privilégio mínimo depende do resultado da auditoria).

### [C14-G] - Web, CSP e superfícies de debug

- **Status:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Tempo decorrido:** pendente de merge.
- **Minutos de CI:** 0 min; não iniciado.
- **O que se planeja fazer:** aplicar CSP compatível com os provedores atuais e restringir superfícies globais de debug.
- **Propósito:** reduzir o impacto de uma eventual XSS e impedir que APIs globais de diagnóstico permaneçam disponíveis indevidamente em produção.
- **Recursos/arquivos principais envolvidos:** `/index.html`, CSP via `<meta http-equiv>`, integrações Firebase/reCAPTCHA/Worker/Google APIs, globals de debug e matriz PT/EN/ES em Pages.
- **O que foi feito:** nenhuma implementação iniciada. Está aprovada a CSP imediata no GitHub Pages, inicialmente via meta e compatível com os serviços atualmente necessários.

### [C14-H] - Staging, validação final e rollout

- **Status:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Tempo decorrido:** pendente de merge.
- **Minutos de CI:** 0 min; não iniciado.
- **O que se planeja fazer:** criar staging separado e executar a matriz destrutiva/final antes do lançamento público.
- **Propósito:** comprovar o endurecimento completo em um ambiente destrutivo separado antes do lançamento público e produzir o handoff operacional para C16/C25.
- **Recursos/arquivos principais envolvidos:** novo projeto Firebase staging, emuladores, CI, Pages, Worker, Functions/Tasks, AAB distribuído pela Play, matriz offline/multiaba/backup/exclusão, inventário IAM/secrets/dependências e documentação operacional.
- **O que foi feito:** nenhuma implementação iniciada. Está aprovada a criação de um projeto Firebase separado para testes destrutivos; a matriz final cobrirá cross-account, payloads malformados, App Check, rate limit, tarefas duplicadas, cache/lifecycle, Auto Backup, rollback e validação física.

## Incidentes e trabalhos separados observados

### [DIARY-MENU-A] - Detalhes somente leitura da entrada do Diário

- **Status:** concluído.
- **Data de conclusão:** 09/09/2026.
- **Tempo decorrido:** 1 h 35 min.
- **Minutos de CI:** 47 min (1 leve + 46 pesado).
- **O que se planeja fazer:** tornar funcional a ação “Detalhes” do menu do Diário por meio de um modal somente leitura, acessível e responsivo, sem alterar dados persistidos.
- **Propósito:** completar a ação “Detalhes” que alterava um estado controlado, mas não possuía qualquer interface renderizada, permitindo consultar o registro sem risco de edição acidental.
- **Recursos:** modal acessível e responsivo; fechamento por botão, backdrop, `Esc` e Voltar do Android; apresentação trilíngue; distinção entre nutriente ausente e valor zero; origem de estimativa por foto ou descrição apresentada sem IDs ou metadados técnicos.
- **Arquivos principais:** `/diary-screen.js`, `/tests/unit/diary-screen.test.js`, `/tests/smoke/authenticated-flows.spec.js`, `/documentation/estado-atual/RESUMO-STATUS.md` e este histórico.
- **O que foi feito:** o estado `detailFood`, já reconhecido pelo despachante do botão Voltar do Android, passou a resolver a entrada e a categoria atuais e a renderizar seus dados registrados. Somente nutrientes numéricos presentes são exibidos; dados ausentes não viram zero. A prova unitária cobre abertura pelo menu, conteúdo, estimativa por IA, ausência, zero e todas as formas de fechamento; o smoke autenticado reutiliza uma refeição real da fixture para abrir o modal no fluxo integrado.
- **Alinhamento:** 100%. O escopo aprovado foi entregue sem ampliação de comportamento; o ajuste adicional do seletor autenticado para localizar a refeição real da fixture foi apenas estabilização de teste, com impacto neutro no produto.
- **PRs/commits relacionados:** PR #182, branch `codex/diary-menu-details`, commits `b6cba6d` e `7993760`, merge `842b7de`.

### [DIARY-MENU-B] - Editar quantidade e mover entrada entre refeições

- **Status:** concluído.
- **Data de conclusão:** 10/09/2026.
- **Tempo decorrido:** 37 min.
- **Minutos de CI:** 37 min (1 leve + 36 pesado).
- **O que se planeja fazer:** substituir a edição isolada de quantidade por um editor único de quantidade e tipo de refeição, preservando identidade e metadados e invalidando snapshots C19 quando necessário.
- **Propósito:** transformar a antiga edição exclusiva de quantidade em um editor único que também permite corrigir a categoria de uma entrada já registrada, inclusive em datas históricas, sem perder identidade, horário, origem ou metadados não alterados.
- **Recursos:** `ChoiceField` trilíngue para tipo de refeição; quantidade e unidade informativa; aviso explícito antes de invalidar avaliação C19; transformação imutável com ID estável; diff granular C28 por atualização do mesmo documento; validação das rules C14-B2 em emulador.
- **Arquivos principais:** `/diary-screen.js`, `/nutrition-tracker-controller.js`, `/daily-entry-model.js`, `/src/composite/daily-entry-model.js`, `/functions/test/firestore-rules.emulator.test.js`, testes unitários e smoke autenticado, `/documentation/estado-atual/RESUMO-STATUS.md` e este histórico.
- **O que foi feito:** a ação foi renomeada para “Editar” e passa a abrir quantidade e categoria juntas. O controlador invalida conservadoramente o grupo avaliado antes da alteração; mover preserva o mesmo `entry.id` e o `DailyEntryPersistence` emite apenas um `set` para atualizar `mealKey`, sem delete/recreate. O teste de emulador comprova que as rules aceitam a atualização de `mealKey` mantendo documento, entrada e horário. A cobertura integrada move uma entrada avaliada, confirma quantidade/horário/ID e verifica a remoção do snapshot.
- **Alinhamento:** 100%. A entrega correspondeu ao desenho aprovado; a troca do seletor de teste baseado no nome pelo identificador estável da entrada corrigiu somente a robustez da automação, com impacto positivo na confiabilidade do CI.
- **PRs/commits relacionados:** PR #184, branch `codex/diary-menu-edit-move`, commit `999a03d`, merge `cadad17`.

### [BUG-SAVED-MEAL-ID] - Reutilização de refeição salva com identidade duplicada

- **Status:** concluído.
- **Data de conclusão:** 02/09/2026.
- **Tempo decorrido:** 1 h 7 min.
- **Minutos de CI:** 26 min (1 leve + 25 pesado).
- **O que se planeja fazer:** gerar identidade nova para toda entrada instanciada a partir de refeição salva, mantendo `foodId` apenas como referência do alimento e cobrindo reutilização na mesma categoria e em categoria diferente.
- **Propósito:** permitir que uma refeição salva, inclusive um modelo histórico sem `foodSnapshot`, seja registrada novamente na categoria original ou em outra categoria sem colidir com entradas já existentes no Diário.
- **Recursos/arquivos principais envolvidos:** `/food-entry.js`, `/tests/unit/food-entry.test.js`, `DailyEntryModel` e `DailyEntryPersistence` como contratos de integração.
- **O que foi feito:** o diagnóstico reproduziu que modelos antigos reutilizavam `foodId` ou nome como `entry.id`; após o C28 exigir IDs únicos em todo o dia, repetir o modelo na mesma categoria virava no-op e em outra categoria lançava `Daily entry snapshots require unique stable IDs` antes de alcançar o Firestore. A correção gera um ID novo a cada carregamento em todos os formatos e preserva `foodId` somente como referência. Os testes UMD/ESM comprovam duas reutilizações na categoria original e uma terceira em categoria diferente, sem colisão no diff granular. O PR #179, commit `dba47ef`, foi mesclado em `0eeca71` após o run autenticado `33568921326` ficar totalmente verde. Este bug é separado das recusas de rules da C14-B2.
- **Alinhamento:** 100%. A correção permaneceu isolada do hotfix C14-B2, como planejado, e resolveu a colisão de identidade sem alterar o modelo persistido além da nova identidade da entrada; impacto positivo.

### [PHOTO-03-A] - Transformação proporcional de estimativas nutricionais

- **Status:** concluído.
- **Data de conclusão:** 10/09/2026.
- **Tempo decorrido:** 2 h 5 min.
- **Minutos de CI:** 30 min (1 leve + 29 pesado).
- **O que se planeja fazer:** criar uma transformação de domínio pura que recalcule nutrientes proporcionalmente quando `quantity` ou `estimatedGrams` mudar, preservando ausente diferente de zero e usando edições manuais posteriores como nova base.
- **Propósito:** criar uma regra de domínio única e testável para manter quantidade, peso estimado e nutrientes coerentes quando o usuário redimensionar uma estimativa compartilhada pelos fluxos de foto e descrição textual.
- **Recursos/arquivos principais envolvidos:** `/meal-estimate.js`, `/src/composite/meal-estimate.js`, `/tests/unit/meal-estimate.test.js`, editor compartilhado C24/C08-C e este histórico.
- **O que foi feito:** a transformação pura aceita `quantity` ou `estimatedGrams` como referência, recalcula proporcionalmente os oito nutrientes conhecidos, preserva ausente diferente de zero, mantém a edição manual como nova base e arredonda de forma determinística. Alterar quantidade também ajusta o peso estimado; alterar o peso não muda a quantidade nominal. A API permanece sem uso em produção até a integração da Fatia PHOTO-03-B.
- **Alinhamento:** 100%. A transformação implementou os dois gatilhos e a semântica de nova base exatamente como aprovados, sem acoplamento ao Worker nem à interface; impacto positivo por manter a lógica reutilizável.
- **PRs/commits relacionados:** PR #186, branch `codex/photo-estimate-proportional-domain`, commit de implementação `174bf9c`.

### [PHOTO-03-B] - Integração proporcional no editor compartilhado

- **Status:** concluído.
- **Data de conclusão:** 10/09/2026.
- **Tempo decorrido:** 37 min.
- **Minutos de CI:** 35 min (1 leve + 34 pesado).
- **O que se planeja fazer:** integrar a transformação proporcional ao editor compartilhado por foto e descrição textual e persistir no Diário os valores revisados, sem metadados transitórios.
- **Propósito:** aplicar a transformação proporcional aprovada na interface comum de revisão, garantindo o mesmo comportamento nas estimativas por foto e por descrição textual e preservando os valores recalculados ao registrar a refeição.
- **Recursos/arquivos principais envolvidos:** `/meal-estimate-editor.js`, as composições `/app.js`, `/nutrition-tracker.jsx` e `/src/App.jsx`, `/tests/unit/meal-estimate-editor.test.js`, `/tests/unit/dish-description-ai.test.js`, `/tests/unit/image-meal-registration.test.js`, `/documentation/estado-atual/RESUMO-STATUS.md` e este histórico.
- **O que foi feito:** o editor passou a encaminhar mudanças de `quantity` e `estimatedGrams` à transformação de domínio única. Quantidade recalcula peso e nutrientes; peso recalcula nutrientes sem alterar a quantidade. Uma edição nutricional manual permanece no estado controlado e, numa alteração posterior de peso/quantidade, torna-se a nova base proporcional. Os dois fluxos continuam compartilhando o mesmo editor; os builders de descrição e imagem persistem os valores revisados sem incluir peso estimado ou metadados da imagem nas entradas do Diário.
- **Alinhamento:** 100%. A integração cobriu ambos os fluxos e a persistência conforme o escopo aprovado, sem criar exceção específica para foto; impacto positivo para consistência de UX e dados.
- **PRs/commits relacionados:** PR #188, branch `codex/photo-estimate-proportional-integration`, commit de implementação `4755c66`.

- **Reload/troca de idioma após C14-A:** o chat Trofia-UI/UX relatou, sem reprodução estável, uma queda para login em espanhol e um `SearchableChoiceField` preso em `#loading`. Três tentativas isoladas passaram. No PR #175, a tentativa 2 do CI chegou ao mesmo teste, mas o job foi cancelado exatamente pelo teto global de 30 minutos depois de apenas 5,6 segundos da espera de 15 segundos; isso não comprova o travamento. O teto do CI foi ajustado para 45 minutos e ficou registrado investigar, em pausa natural do C14, consumidores de reload/bootstrap que ainda possam presumir o contrato antigo de leitura silenciosa, sem atribuir causalidade à C14-A até existir evidência.
- **F06 / PR #143:** documentação reconciliada e mesclada em 01/09/2026 no merge `7662899`; a causa de rede específica por usuário/ISP e a futura migração para domínio próprio permanecem registradas fora do C08.
- **PR #101:** draft antigo de leituras do Firestore, fechado sem merge em 01/09/2026 por ter sido substituído pelo C28, especialmente PRs #113–#117.
- **PR #150:** trabalho de NumericField em outra frente de UI, ainda draft na captura.

## Estado ao encerrar esta cronologia

- Base atual verificada: `origin/main` no merge `e6f8bef`, em 12/09/2026.
- Versão nomeada preparada no código: `0.11.0-beta`.
- C22, C23, C28, C20 e C19: concluídos segundo o roadmap.
- C08: implementação A–F concluída e mesclada no PR #167.
- C14-A, C14-B1 e C14-B2: concluídas; C14-C: em andamento, com Pages validado depois do PR #191 e AAB/Play Integrity ainda pendente antes do enforcement.
- Próximos gates de lançamento público no roadmap: conclusão de C14, C16 e C25.

## Fontes consultadas e limitações

- GitHub: lista de PRs mesclados e abertos, títulos, datas e commits.
- Git: `origin/main` no merge `e6f8bef` no momento desta atualização.
- Documentos: `/ROADMAP.md`, `/VERSIONING.md`, `/PENDENCIAS.md`, `/AI_NUTRITION_POLICY.md`, `/NUTRITION_SCORE.md`, `/C22_ROLLOUT.md` e `/C24_FATIA_7_VALIDACAO.md`.
- O histórico integral das conversas não existe no Git; decisões que dependem somente do diálogo e não deixaram evidência versionada são **não determinadas**.
- APIs do GitHub estavam acessíveis durante esta captura; nenhum intervalo foi omitido por indisponibilidade da API.

## [PR-189] - C14-C: protect AI Worker with progressive App Check

**Data de início:** 2026-09-10 17:00:04 +02:00

**Data de conclusão:** 2026-09-12 09:20:13 +02:00

**Tempo decorrido:** 1 d 16 h 20 min

**Minutos de CI:** 40 min (1 leve + 39 pesado)

**Chat-Origin:** Trofia-Principal

**O que se planeja fazer:** introduzir validação App Check no Worker por rollout progressivo, mantendo o contrato público e sem ativar enforcement antes das provas Web, CI e Android reais.

**Propósito:** proteger progressivamente o Worker de IA com Firebase App Check sem interromper clientes durante o rollout.

**Recursos/arquivos principais envolvidos:** worker/src/firebase-app-check-token.js, worker/src/ai-worker.js, ai-client.js, image-meal-client.js, composições legado/Vite, testes e runbook de rollout.

**O que foi feito:** o Worker passou a validar tokens App Check via JWKS/RS256 e allowlist de apps, os clientes passaram a enviar X-Firebase-AppCheck e o rollout foi publicado inicialmente em modo observe, mantendo o enforcement desligado até as validações reais.

**Alinhamento:** parcial — o PR entregou corretamente observação, envio pelos clientes e debug provider no CI; a validação do Pages revelou uma corrida de perfil corrigida no PR #191, enquanto AAB e enforcement permaneceram nos gates aprovados. O desvio teve impacto positivo por impedir um enforcement prematuro.

**PRs/commits relacionados:** PR [#189](https://github.com/magnoClovis/nutrition-tracker/pull/189); head c9d87966; merge 323610e0.

## Métricas retroativas

| PR | Tempo decorrido | Minutos de CI | Chat-Origin |
|---:|---:|---:|---|
| [#79](https://github.com/magnoClovis/nutrition-tracker/pull/79) | 11 min | 12 min (0 leve + 12 pesado) | Trofia-Principal |
| [#80](https://github.com/magnoClovis/nutrition-tracker/pull/80) | 4 min | 18 min (0 leve + 18 pesado) | Trofia-Principal |
| [#81](https://github.com/magnoClovis/nutrition-tracker/pull/81) | 14 min | 16 min (0 leve + 16 pesado) | Trofia-Principal |
| [#82](https://github.com/magnoClovis/nutrition-tracker/pull/82) | 20 h 14 min | 22 min (0 leve + 22 pesado) | Trofia-Principal |
| [#83](https://github.com/magnoClovis/nutrition-tracker/pull/83) | 32 min | 21 min (0 leve + 21 pesado) | Trofia-Principal |
| [#84](https://github.com/magnoClovis/nutrition-tracker/pull/84) | 22 min | 17 min (0 leve + 17 pesado) | Trofia-Principal |
| [#85](https://github.com/magnoClovis/nutrition-tracker/pull/85) | 43 min | 47 min (0 leve + 47 pesado) | Trofia-Principal |
| [#86](https://github.com/magnoClovis/nutrition-tracker/pull/86) | 34 min | 36 min (0 leve + 36 pesado) | Trofia-Principal |
| [#87](https://github.com/magnoClovis/nutrition-tracker/pull/87) | 2 h 4 min | 47 min (0 leve + 47 pesado) | Trofia-Principal |
| [#88](https://github.com/magnoClovis/nutrition-tracker/pull/88) | 40 min | 48 min (0 leve + 48 pesado) | Trofia-Principal |
| [#89](https://github.com/magnoClovis/nutrition-tracker/pull/89) | 34 min | 50 min (0 leve + 50 pesado) | Trofia-Principal |
| [#90](https://github.com/magnoClovis/nutrition-tracker/pull/90) | 1 h 1 min | 40 min (0 leve + 40 pesado) | Trofia-Principal |
| [#91](https://github.com/magnoClovis/nutrition-tracker/pull/91) | 31 min | 44 min (0 leve + 44 pesado) | Trofia-Principal |
| [#92](https://github.com/magnoClovis/nutrition-tracker/pull/92) | 2 h 54 min | 35 min (0 leve + 35 pesado) | Trofia-Principal |
| [#93](https://github.com/magnoClovis/nutrition-tracker/pull/93) | 6 d 16 h 39 min | 36 min (0 leve + 36 pesado) | Trofia-Principal |
| [#94](https://github.com/magnoClovis/nutrition-tracker/pull/94) | 10 h 15 min | 36 min (0 leve + 36 pesado) | Trofia-Principal |
| [#95](https://github.com/magnoClovis/nutrition-tracker/pull/95) | 1 h 4 min | 41 min (0 leve + 41 pesado) | Trofia-Principal |
| [#96](https://github.com/magnoClovis/nutrition-tracker/pull/96) | 3 d 18 h 9 min | 29 min (0 leve + 29 pesado) | Trofia-Principal |
| [#97](https://github.com/magnoClovis/nutrition-tracker/pull/97) | 1 h 4 min | 52 min (0 leve + 52 pesado) | Trofia-Principal |
| [#98](https://github.com/magnoClovis/nutrition-tracker/pull/98) | 9 min | 43 min (0 leve + 43 pesado) | Trofia-Principal |
| [#99](https://github.com/magnoClovis/nutrition-tracker/pull/99) | 2 h 15 min | 41 min (0 leve + 41 pesado) | Trofia-Principal |
| [#100](https://github.com/magnoClovis/nutrition-tracker/pull/100) | 1 h 51 min | 49 min (0 leve + 49 pesado) | Trofia-Principal |
| [#102](https://github.com/magnoClovis/nutrition-tracker/pull/102) | 2 d 4 h 34 min | 52 min (0 leve + 52 pesado) | Trofia-Principal |
| [#103](https://github.com/magnoClovis/nutrition-tracker/pull/103) | 7 h 48 min | 39 min (0 leve + 39 pesado) | Trofia-Principal |
| [#104](https://github.com/magnoClovis/nutrition-tracker/pull/104) | 2 h 45 min | 49 min (0 leve + 49 pesado) | Trofia-Principal |
| [#105](https://github.com/magnoClovis/nutrition-tracker/pull/105) | 4 h 22 min | 45 min (0 leve + 45 pesado) | Trofia-Principal |
| [#106](https://github.com/magnoClovis/nutrition-tracker/pull/106) | 2 h 9 min | 40 min (0 leve + 40 pesado) | Trofia-Principal |
| [#107](https://github.com/magnoClovis/nutrition-tracker/pull/107) | 35 min | 42 min (0 leve + 42 pesado) | Trofia-Principal |
| [#108](https://github.com/magnoClovis/nutrition-tracker/pull/108) | 1 d 20 h 10 min | 42 min (0 leve + 42 pesado) | Trofia-Principal |
| [#109](https://github.com/magnoClovis/nutrition-tracker/pull/109) | 55 min | 40 min (0 leve + 40 pesado) | Trofia-Principal |
| [#110](https://github.com/magnoClovis/nutrition-tracker/pull/110) | 3 d 18 h 2 min | 48 min (0 leve + 48 pesado) | Trofia-Principal |
| [#111](https://github.com/magnoClovis/nutrition-tracker/pull/111) | 57 min | 38 min (0 leve + 38 pesado) | Trofia-Principal |
| [#112](https://github.com/magnoClovis/nutrition-tracker/pull/112) | 17 h 2 min | 35 min (0 leve + 35 pesado) | Trofia-Principal |
| [#113](https://github.com/magnoClovis/nutrition-tracker/pull/113) | 2 h 49 min | 9 min (0 leve + 9 pesado) | Trofia-Principal |
| [#114](https://github.com/magnoClovis/nutrition-tracker/pull/114) | 22 min | 9 min (0 leve + 9 pesado) | Trofia-Principal |
| [#115](https://github.com/magnoClovis/nutrition-tracker/pull/115) | 3 h 44 min | 10 min (0 leve + 10 pesado) | Trofia-Principal |
| [#116](https://github.com/magnoClovis/nutrition-tracker/pull/116) | 27 min | 9 min (0 leve + 9 pesado) | Trofia-Principal |
| [#117](https://github.com/magnoClovis/nutrition-tracker/pull/117) | 12 min | 9 min (0 leve + 9 pesado) | Trofia-Principal |
| [#118](https://github.com/magnoClovis/nutrition-tracker/pull/118) | 7 h 16 min | 9 min (0 leve + 9 pesado) | Trofia-Principal |
| [#119](https://github.com/magnoClovis/nutrition-tracker/pull/119) | 13 min | 8 min (0 leve + 8 pesado) | Trofia-Principal |
| [#120](https://github.com/magnoClovis/nutrition-tracker/pull/120) | 21 min | 8 min (0 leve + 8 pesado) | Trofia-Principal |
| [#121](https://github.com/magnoClovis/nutrition-tracker/pull/121) | 36 min | 10 min (0 leve + 10 pesado) | Trofia-Principal |
| [#122](https://github.com/magnoClovis/nutrition-tracker/pull/122) | 13 min | 9 min (0 leve + 9 pesado) | Trofia-Principal |
| [#123](https://github.com/magnoClovis/nutrition-tracker/pull/123) | 13 min | 9 min (0 leve + 9 pesado) | Trofia-Principal |
| [#124](https://github.com/magnoClovis/nutrition-tracker/pull/124) | 1 h 10 min | 11 min (0 leve + 11 pesado) | Trofia-Principal |
| [#125](https://github.com/magnoClovis/nutrition-tracker/pull/125) | 3 h 37 min | 13 min (0 leve + 13 pesado) | Trofia-Principal |
| [#127](https://github.com/magnoClovis/nutrition-tracker/pull/127) | 3 h 16 min | 11 min (0 leve + 11 pesado) | Trofia-Principal |
| [#128](https://github.com/magnoClovis/nutrition-tracker/pull/128) | 3 h 50 min | 24 min (0 leve + 24 pesado) | Trofia-Principal |
| [#129](https://github.com/magnoClovis/nutrition-tracker/pull/129) | 3 h 20 min | 14 min (0 leve + 14 pesado) | Trofia-Principal |
| [#131](https://github.com/magnoClovis/nutrition-tracker/pull/131) | 17 min | 15 min (0 leve + 15 pesado) | Trofia-Principal |
| [#132](https://github.com/magnoClovis/nutrition-tracker/pull/132) | 14 min | 12 min (0 leve + 12 pesado) | Trofia-Principal |
| [#134](https://github.com/magnoClovis/nutrition-tracker/pull/134) | 12 min | 11 min (0 leve + 11 pesado) | Trofia-Principal |
| [#135](https://github.com/magnoClovis/nutrition-tracker/pull/135) | 59 min | 13 min (0 leve + 13 pesado) | Trofia-Principal |
| [#137](https://github.com/magnoClovis/nutrition-tracker/pull/137) | 28 min | 25 min (0 leve + 25 pesado) | Trofia-Principal |
| [#139](https://github.com/magnoClovis/nutrition-tracker/pull/139) | 37 min | 36 min (0 leve + 36 pesado) | Trofia-Principal |
| [#140](https://github.com/magnoClovis/nutrition-tracker/pull/140) | 34 min | 33 min (0 leve + 33 pesado) | Trofia-Principal |
| [#142](https://github.com/magnoClovis/nutrition-tracker/pull/142) | 2 h 22 min | 41 min (0 leve + 41 pesado) | Trofia-Principal |
| [#143](https://github.com/magnoClovis/nutrition-tracker/pull/143) | 1 d 20 h 59 min | 1 min (1 leve + 0 pesado) | Trofia-Principal |
| [#145](https://github.com/magnoClovis/nutrition-tracker/pull/145) | 39 min | 37 min (0 leve + 37 pesado) | Trofia-Principal |
| [#147](https://github.com/magnoClovis/nutrition-tracker/pull/147) | 31 min | 29 min (0 leve + 29 pesado) | Trofia-Principal |
| [#149](https://github.com/magnoClovis/nutrition-tracker/pull/149) | 31 min | 29 min (0 leve + 29 pesado) | Trofia-Principal |
| [#151](https://github.com/magnoClovis/nutrition-tracker/pull/151) | 7 h 33 min | 30 min (0 leve + 30 pesado) | Trofia-Principal |
| [#152](https://github.com/magnoClovis/nutrition-tracker/pull/152) | 58 min | 26 min (0 leve + 26 pesado) | Trofia-Principal |
| [#153](https://github.com/magnoClovis/nutrition-tracker/pull/153) | 6 min | 6 min (0 leve + 6 pesado) | Trofia-Principal |
| [#155](https://github.com/magnoClovis/nutrition-tracker/pull/155) | 38 min | 37 min (0 leve + 37 pesado) | Trofia-Principal |
| [#162](https://github.com/magnoClovis/nutrition-tracker/pull/162) | 13 min | 1 min (1 leve + 0 pesado) | Trofia-Principal |
| [#165](https://github.com/magnoClovis/nutrition-tracker/pull/165) | 1 h 42 min | 30 min (1 leve + 29 pesado) | Trofia-Principal |
| [#167](https://github.com/magnoClovis/nutrition-tracker/pull/167) | 38 min | 25 min (1 leve + 24 pesado) | Trofia-Principal |
| [#169](https://github.com/magnoClovis/nutrition-tracker/pull/169) | 1 h 14 min | 18 min (1 leve + 17 pesado) | Trofia-Principal |
| [#173](https://github.com/magnoClovis/nutrition-tracker/pull/173) | 48 min | 27 min (1 leve + 26 pesado) | Trofia-Principal |
| [#174](https://github.com/magnoClovis/nutrition-tracker/pull/174) | 43 min | 32 min (1 leve + 31 pesado) | Trofia-Principal |
| [#175](https://github.com/magnoClovis/nutrition-tracker/pull/175) | 2 h 13 min | 30 min (1 leve + 29 pesado) | Trofia-Principal |
| [#177](https://github.com/magnoClovis/nutrition-tracker/pull/177) | 1 h 1 min | 33 min (1 leve + 32 pesado) | Trofia-Principal |
| [#178](https://github.com/magnoClovis/nutrition-tracker/pull/178) | 5 d 11 h 20 min | 59 min (1 leve + 58 pesado) | Trofia-Principal |
| [#179](https://github.com/magnoClovis/nutrition-tracker/pull/179) | 1 h 7 min | 26 min (1 leve + 25 pesado) | Trofia-Principal |
| [#182](https://github.com/magnoClovis/nutrition-tracker/pull/182) | 1 h 35 min | 47 min (1 leve + 46 pesado) | Trofia-Principal |
| [#184](https://github.com/magnoClovis/nutrition-tracker/pull/184) | 37 min | 37 min (1 leve + 36 pesado) | Trofia-Principal |
| [#186](https://github.com/magnoClovis/nutrition-tracker/pull/186) | 2 h 5 min | 30 min (1 leve + 29 pesado) | Trofia-Principal |
| [#188](https://github.com/magnoClovis/nutrition-tracker/pull/188) | 37 min | 35 min (1 leve + 34 pesado) | Trofia-Principal |
| [#189](https://github.com/magnoClovis/nutrition-tracker/pull/189) | 1 d 16 h 20 min | 40 min (1 leve + 39 pesado) | Trofia-Principal |
| [#191](https://github.com/magnoClovis/nutrition-tracker/pull/191) | 1 h 31 min | 45 min (1 leve + 44 pesado) | Trofia-Principal |
