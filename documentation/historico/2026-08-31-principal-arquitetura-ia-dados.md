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
- **Data de início:** 01/09/2026.
- **Data de conclusão:** 01/09/2026.
- **Tempo decorrido:** 43 min.
- **Minutos de CI:** 32 min (1 leve + 31 pesado).
- **Propósito:** estender a correção fail-closed do documento raiz aos documentos canônicos de dados e à enumeração usada pelo backup completo, impedindo que falhas sejam interpretadas como ausência.
- **O que se planeja fazer:** propagar falhas de leitura/listagem, não cacheá-las como ausência e impedir exportação de backup incompleta.
- **Recursos/arquivos principais envolvidos:** `/firebase-firestore-sdk.js`, `/firebase-backup-internal.js`, testes unitários UMD/ESM, `/documentation/estado-atual/RESUMO-STATUS.md` e este histórico.
- **O que foi feito:** `fetchDataDoc()` e `listDataKeys()` deixaram de converter falha de rede, permissão ou App Check em `null`/`[]`; falhas não são cacheadas como ausência. O backup só é produzido depois de todas as leituras canônicas concluírem e aborta explicitamente se raiz, listagem, documento ou agregado diário não puder ser comprovado. O incidente da build 11 foi encerrado documentalmente após a build Play versionCode 12 validar App Check, leitura, escrita e sincronização com a conta real.
- **Alinhamento:** 100%; o escopo fail-closed e o encerramento documental foram entregues integralmente. Impacto final positivo.
- **PRs/commits relacionados:** PR #174, commit de implementação `bd62a32`, merge `141da412`; incidente original corrigido no PR #173.

### [C14-B1] - Proteção inicial das rules

- **Status:** concluído.
- **Data de início:** 01/09/2026.
- **Data de conclusão:** 01/09/2026.
- **Tempo decorrido:** 2 h 13 min.
- **Minutos de CI:** 30 min (1 leve + 29 pesado).
- **Propósito:** impedir exclusão client-side do documento raiz e aplicar limites conservadores sem fechar prematuramente o schema canônico.
- **O que se planeja fazer:** remover `delete` do cliente, limitar raiz e documentos `data` e preservar exclusivamente a exclusão administrativa C22.
- **Recursos/arquivos principais envolvidos:** `/firestore.rules`, testes de rules/emuladores, workflow autenticado e documentação de deploy.
- **O que foi feito:** o PR #175 negou `delete` da raiz para qualquer cliente, preservou o Admin SDK do C22, limitou a raiz a 128 campos e exigiu nos documentos `/data/{key}` o envelope exato `{value: string}` com máximo de 900.000 caracteres. As rules foram publicadas em 01/09/2026 e o run pós-deploy `33512725510` (tentativa 2) ficou totalmente verde.
- **Alinhamento:** 100%. O escopo conservador foi entregue e validado em produção sem antecipar a allowlist da B2; impacto positivo.
- **PRs/commits relacionados:** PR #175, branch `codex/c14-b-rules-hardening`, commit `9a0b228`, merge `8d2ddae`.

### [C14-B2] - Schema completo das rules

- **Status:** concluído.
- **Data de início:** 01/09/2026.
- **Data de conclusão:** 07/09/2026.
- **Tempo decorrido:** 5 d 11 h 20 min.
- **Minutos de CI:** 59 min (1 leve + 58 pesado).
- **Propósito:** restringir campos, tipos e tamanhos do esquema canônico com base em dados reais, sem rejeitar escritas legítimas do cliente granular C28.
- **O que se planeja fazer:** inventariar administrativamente os documentos reais, aplicar allowlists e validar proprietário, lock, entradas, nutrientes e snapshots de score.
- **Recursos/arquivos principais envolvidos:** `/firestore.rules`, `/documentation/estado-atual/C14_B2_FIRESTORE_SCHEMA_INVENTORY.md`, ferramenta Admin SDK somente leitura, testes de emulador/cliente e documentação de rollback/deploy.
- **O que foi feito:** a ferramenta administrativa enumerou Auth, raízes, `data` e collection groups granulares com paginação fail-closed e saída sanitizada. O primeiro deploy do PR #177 excedeu o teto de 1.000 expressões das Security Rules em batches reais e foi revertido duas vezes para B1. O hotfix definitivo do PR #178 valida creates integralmente, somente campos alterados em updates, entrada/nutrientes e o envelope superior do score; o contrato fail-closed C20/C19 valida o interior dos componentes. Um teste injeta componente inválido via Admin SDK e comprova que o cliente oculta a avaliação. O run `33575611133` ficou verde antes e depois da republicação. O inventário encontrou duas raízes sem Auth e 114 descendentes com padrão de contas descartáveis; nada foi excluído.
- **Alinhamento:** divergiu do desenho estrito original — a validação profunda dos seis componentes nas rules excedia o orçamento de expressões. A solução preservou envelope e allowlist e delegou apenas a validação interna ao leitor fail-closed; impacto final positivo, após impacto temporário negativo em produção registrado abaixo.
- **PRs/commits relacionados:** PR #177, merge `9d16e60`; PR #178, commits `5e8ecf7`, `3b32b7b` e `f8f3c09`, merge `80bc2ca`; PR #180, fechamento documental, merge `92e6722`.

### Incidente de produção — rules C14-B2 rejeitando escrita granular legítima

- **Status:** encerrado; rules corrigidas publicadas e validadas em 02/09/2026, PR #178 mesclado em 07/09/2026.
- **Data:** 01/09/2026.
- **Propósito do registro:** preservar a causa, o impacto e o procedimento de recuperação do segundo incidente real em que uma regra/configuração nova rejeitou uma escrita legítima em produção.
- **Recursos/arquivos principais envolvidos:** `/firestore.rules`, `/firebase-firestore-sdk.js`, `/daily-entry-persistence.js`, testes autenticados em `/tests/smoke/authenticated-flows.spec.js` e inventário [`C14_B2_FIRESTORE_SCHEMA_INVENTORY.md`](../estado-atual/C14_B2_FIRESTORE_SCHEMA_INVENTORY.md).
- **Causa:** o CI do PR #177 executou antes do deploy e, portanto, ainda testava contra B1. Depois que B2 foi publicada, a combinação de validação integral da raiz com verificações individuais de todos os nutrientes da entrada e do `foodSnapshot` ultrapassou o limite de 1.000 expressões das Security Rules. O Firestore rejeitava atomicamente o batch que criava a refeição/GA e atualizava `_dailyDates`.
- **Impacto:** oito falhas reproduzíveis, quatro fluxos em desktop e mobile; refeição retroativa ausente na Semana, modal que não fechava porque o save falhava, avaliação aceita não persistida e sugestão GA ausente. O legado passou. A atomicidade evitou escrita parcial, mas usuários poderiam perder uma ação recém-realizada.
- **Timeline e resposta:** PR #177 mesclado no merge `9d16e60`; deploy B2 concluído; tentativas 1 e 2 do run `33529042502` falharam após o deploy; diagnóstico isolado confirmou que não era concorrência de portas; B1 do merge `8d2ddae` foi restaurada em 01/09/2026 com hash verificado `bd1398b58bfa618797f6819a51c393b885af298a`. A tentativa 3 do mesmo run ficou totalmente verde, com 95/95 cenários Playwright e os oito fluxos Vite antes bloqueados restaurados.
- **Correção definitiva publicada e validada:** creates continuam integralmente validados; em updates, somente a allowlist canônica pode mudar e cada campo afetado tem o tipo validado. Campos históricos podem sobreviver apenas inalterados. A entrada mantém allowlist, identidade, tipos centrais e nutrientes; `foodSnapshot` não duplica as 18 verificações. Para o score, as rules validam o envelope superior e os nomes `protein`/`kcal`/`fiber`/`salt`/`carbs`/`fat`; o cliente valida profundamente cada componente e oculta o grupo inteiro ao encontrar campo/tipo malformado. O emulador cobre o snapshot completo e uma injeção administrativa malformada lida pelo cliente. Em 02/09/2026, a tentativa 2 do run `33575611133` validou o SHA antes do deploy; após a publicação, a tentativa 3 repetiu toda a matriz autenticada contra produção e ficou verde.

### [C14-C1] - Observação do App Check no Worker

- **Status:** concluído.
- **Data de início:** 10/09/2026.
- **Data de conclusão:** 10/09/2026.
- **Tempo decorrido:** não separado individualmente; C14-C1 a C14-C3 foram entregues no PR #189, cujo tempo total foi 1 d 16 h 20 min.
- **Minutos de CI:** não separados individualmente; PR #189 totalizou 40 min (1 leve + 39 pesado).
- **Propósito:** medir tokens App Check válidos e inválidos antes de bloquear clientes legítimos.
- **O que se planeja fazer:** validar criptograficamente o token no Worker em modo `observe`, com métricas sanitizadas e allowlist de apps.
- **Recursos/arquivos principais envolvidos:** `/worker/src/firebase-app-check-token.js`, `/worker/src/ai-worker.js`, `/worker/wrangler.jsonc`, JWKS Firebase, testes do Worker e runbook C14-C.
- **O que foi feito:** o Worker passou a verificar RS256, `typ`, `kid`, emissor, audiência, expiração e app ID com JWKS cacheado por no máximo seis horas. A versão `632877f3-e51f-4226-92fa-0b139e51e459` foi publicada em `observe` e passou no smoke externo sem bloquear clientes antigos.
- **Alinhamento:** 100%. A observação foi implantada antes de qualquer enforcement, como aprovado; impacto positivo.
- **PRs/commits relacionados:** PR #189, commit `c9d8796`, merge `323610e`.

### [C14-C2] - Clientes enviam token App Check

- **Status:** concluído.
- **Data de início:** 10/09/2026.
- **Data de conclusão:** 12/09/2026.
- **Tempo decorrido:** não separado individualmente; C14-C1 a C14-C3 foram entregues no PR #189, cujo tempo total foi 1 d 16 h 20 min.
- **Minutos de CI:** não separados individualmente; PR #189 totalizou 40 min (1 leve + 39 pesado).
- **Propósito:** anexar atestação às chamadas de IA sem transmitir conteúdo quando a prova do app falhar.
- **O que se planeja fazer:** obter token real e enviar `X-Firebase-AppCheck` nas superfícies de texto e imagem, em Web e Android.
- **Recursos/arquivos principais envolvidos:** `/app-check-client.js`, `/src/firebase/app-check-client.js`, `/ai-client.js`, `/image-meal-client.js`, demais clientes de IA, composições legado/Vite e ponte `@capacitor-firebase/app-check`.
- **O que foi feito:** todos os clientes de IA passaram a obter e enviar `X-Firebase-AppCheck`; erro ou token dummy é rejeitado de forma sanitizada antes do upload de prompt ou imagem. CORS e verificadores de deploy reconhecem o novo cabeçalho.
- **Alinhamento:** 100%. O envio foi integrado sem alterar contratos funcionais dos sete fluxos; impacto positivo.
- **PRs/commits relacionados:** PR #189, commit `c9d8796`, merge `323610e`.

### [C14-C3] - Debug provider no CI

- **Status:** concluído.
- **Data de início:** 10/09/2026.
- **Data de conclusão:** 12/09/2026.
- **Tempo decorrido:** não separado individualmente; C14-C1 a C14-C3 foram entregues no PR #189, cujo tempo total foi 1 d 16 h 20 min.
- **Minutos de CI:** não separados individualmente; PR #189 totalizou 40 min (1 leve + 39 pesado).
- **Propósito:** permitir que o CI autenticado exercite App Check sem usar atestação real de produção.
- **O que se planeja fazer:** configurar o debug provider registrado e comprovar chamadas autenticadas no pipeline, mantendo o segredo somente no GitHub Actions.
- **Recursos/arquivos principais envolvidos:** workflows autenticados, segredo do debug provider, inicialização Firebase/App Check, clientes de IA e matriz Playwright.
- **O que foi feito:** o run autenticado `34478874949` validou o debug provider e a matriz integral do PR #189 sem expor o segredo no repositório ou nos logs.
- **Alinhamento:** 100%. O CI permaneceu funcional depois da introdução do cabeçalho App Check; impacto positivo.
- **PRs/commits relacionados:** PR #189, commit `c9d8796`, merge `323610e`.

### [C14-C4] - Validação real no Pages e no AAB distribuído pela Play

- **Status:** concluído.
- **Data de início:** 12/09/2026.
- **Data de conclusão:** 15/09/2026.
- **Tempo decorrido:** 1 min 55 s.
- **Minutos de CI:** 1 min (1 leve + 0 pesado); a validação física reutilizou o AAB versionCode 16 produzido após os gates verdes da CAM-RED-2.
- **Propósito:** retirar o risco de bloquear clientes legítimos ao transformar App Check de observação em requisito obrigatório, validando reCAPTCHA Enterprise no Pages e Play Integrity no pacote efetivamente distribuído.
- **O que se planeja fazer:** comprovar, antes do enforcement, que o cliente Web real e um AAB assinado instalado pela Play obtêm App Check e concluem Descrever prato, Reconhecer por foto e Avaliar refeição com explicação, sempre com conta descartável no aparelho.
- **Recursos/arquivos principais envolvidos:** `/app-check-client.js`, `/src/firebase/app-check-client.js`, `/ai-client.js`, `/image-meal-client.js`, ponte `@capacitor-firebase/app-check`, Worker em modo `observe`, Pages, AAB versionCode 16, Play Store interna, Galaxy SM-S938B, ADB/logcat e `/documentation/estado-atual/C14_C_APP_CHECK_WORKER_ROLLOUT.md`.
- **O que foi feito:** após o PR #191, o Pages foi validado com login normal, ausência do modal indevido de perfil e sucesso nos três fluxos de IA. Em 15/09/2026, reutilizou-se o AAB real da CAM-RED-2, versionCode 16, instalado pela Play com `installerPackageName=com.android.vending`. A automação ADB usou exclusivamente uma conta descartável e confirmou login, Descrever prato, Reconhecer por foto com cópia sanitizada de foto aprovada e Avaliar refeição com explicação. Nenhuma refeição foi persistida; o logcat amostrado não apresentou erro fatal, recusa do Firestore ou falha de transporte de IA. O modo `observe` não produz prova server-side definitiva da aceitação criptográfica do token; por desenho, essa prova final ocorre na C14-C5 quando chamadas sem App Check forem recusadas e os mesmos fluxos legítimos continuarem verdes. Ao final, a sessão descartável, mídia temporária e processos ADB foram removidos e DND, sincronização e timeout de tela voltaram aos valores anteriores.
- **Alinhamento:** 100%. Todo o escopo aprovado para Pages e AAB real foi comprovado; reaproveitar o artefato já distribuído evitou novo build/instalação sem enfraquecer a evidência. O impacto foi positivo. A limitação deliberada do modo `observe` não é desvio: o enforcement e sua prova negativa pertencem à C14-C5.
- **PRs/commits relacionados:** PR #189 (cliente App Check), PR #191 (gate de perfil), PR #203/CAM-RED-2 (AAB versionCode 16, merge `caeb515`), PR #205 (fechamento documental, merge `c9f5713`) e PR #206 (métricas pós-merge, merge `8ead0ee`). — **Chat:** Trofia-Principal.

### [C14-C5] - Enforcement obrigatório no Worker

- **Status:** concluído.
- **Data de início:** 15/09/2026.
- **Data de conclusão:** 15/09/2026.
- **Tempo decorrido:** 41 min 38 s.
- **Minutos de CI:** 71 min 12 s no total (1 min 22 s leves + 69 min 50 s pesados). O total reúne os gates leves dos PR/merge e da prova `observe`/`enforce`, além das matrizes autenticadas pré e pós-merge; no run final `35024176167`, legado terminou com 103 testes aprovados e 8 skips Vite-only documentados, e Vite com 111 aprovados e zero skips.
- **Propósito:** rejeitar chamadas de IA sem atestação válida somente após os gates Web, CI e Android reais.
- **O que se planeja fazer:** registrar a versão `observe`, ativar `APP_CHECK_MODE = "enforce"`, exigir `401 app-check-required` sem token, repetir via ADB os três fluxos legítimos no AAB versionCode 16 e reverter imediatamente ao primeiro erro inesperado do cliente real.
- **Recursos/arquivos principais envolvidos:** Worker, Wrangler, versão de rollback `observe`, Firebase App Check, CI, Pages, AAB versionCode 16, Galaxy SM-S938B e documentação de rollout.
- **O que foi feito:** a execução começou em worktree isolada da `origin/main`. Foi preparada a mudança mínima de `APP_CHECK_MODE` para `enforce`, juntamente com uma sonda operacional que cria e remove uma conta descartável, envia corpo inválido sem App Check e exige a resposta exata de cada modo sem alcançar rate limiter ou Gemini. O dry-run do Wrangler 4.115.0 produziu o bundle correto e a consulta somente leitura registrou a versão `observe` `632877f3-e51f-4226-92fa-0b139e51e459` como alvo de rollback. Como o ambiente local encontrou o bloqueio F06 de `workers.dev`, o gate versionado rodou externamente: o baseline `observe` passou no PR e, depois do merge `f799a93`, o Worker `cf6f8d82-566c-483f-9fb0-2a587dda0dab` foi publicado em `enforce`; o run `35024249874` comprovou a recusa exata `401 app-check-required` sem token. A prova legítima reutilizou o AAB versionCode 16 instalado pela Play (`installerPackageName=com.android.vending`) no Galaxy SM-S938B. Com conta descartável, Descrever prato retornou estimativa estruturada, Reconhecer por foto retornou estimativa estruturada e Avaliar refeição exibiu a nota local com explicação da IA; nenhuma refeição foi confirmada ou persistida. A combinação da recusa negativa obrigatória com o sucesso dos três fluxos prova que a ponte Play Integrity foi aceita pelo Worker em produção. Nenhum critério de rollback ocorreu. Ao final, a conta foi desconectada, o app finalizado, 38 artefatos temporários e a mídia sintética removidos do aparelho, DND desligado, sincronização ativa, timeout restaurado para 30 segundos, `stay_on_while_plugged_in` restaurado a `0` e todos os processos ADB encerrados. Apesar dessas confirmações, a rotação automática ficou ativada e não foi incluída na comparação final; o usuário a restaurou manualmente. O runbook foi corrigido imediatamente para tornar `accelerometer_rotation` e orientação itens obrigatórios do preflight e do fechamento.
- **Alinhamento:** ~95%. O rollout de segurança e toda a matriz funcional seguiram o plano e tiveram impacto positivo, mas a higiene final do aparelho divergiu: a rotação automática não foi capturada nem restaurada, com impacto operacional negativo e limitado. A falha não afetou dados nem a validade do App Check, e gerou uma prevenção permanente verificável no runbook.
- **PRs/commits relacionados:** PR #210, commit `9205ad7`, merge `f799a93`, runs `35020147509`, `35020147544`, `35020147546`, `35024176081`, `35024176167` e `35024249874`; Worker `cf6f8d82-566c-483f-9fb0-2a587dda0dab`.

### [C14-C-PROFILE-GATE] - Corrida entre App Check, cache e perfil obrigatório

- **Status:** concluído.
- **Data de início:** 12/09/2026.
- **Data de conclusão:** 12/09/2026.
- **Tempo decorrido:** 1 h 31 min.
- **Minutos de CI:** 45 min (1 leve + 44 pesado).
- **Propósito:** impedir que uma leitura aparentemente bem-sucedida, mas atendida por cache desatualizado durante a obtenção do token App Check, seja interpretada como perfil ausente e abra uma tela exclusiva da criação de conta.
- **O que se planeja fazer:** exigir token App Check real, usar leitura de servidor no gate e impedir o modal de cadastro em login normal ou falha transitória.
- **Recursos/arquivos principais envolvidos:** `/app-check-client.js`, `/src/firebase/app-check-client.js`, `/firebase-firestore-sdk.js`, `/src/firebase/firebase-firestore-sdk.js`, `/profile-validation.js`, `/src/App.jsx`, testes unitários/smoke e documentação de C14-C.
- **O que foi feito:** em 12/09/2026, durante a fase 4 do rollout C14-C no Pages, uma conta antiga com perfil completo recebeu o modal “Completar perfil nutricional”; após F5 o modal desapareceu e Descrever prato, Reconhecer por foto e Avaliar refeição com explicação funcionaram. O diagnóstico comprovou uma categoria distinta da C14-A: não houve exceção mascarada, mas uma leitura `getDoc()` aceita como sucesso a partir de cache antigo. O hotfix rejeita resultados/dummy tokens, espera token real antes da primeira leitura protegida, usa `getDocFromServer()` para o gate, remove App Check do timeout de autenticação, mostra erro recuperável e só retorna `requires-completion` quando `isNewAccount === true`. Após o merge, o login e os três fluxos de IA foram validados no Pages sem reabrir o modal.
- **Alinhamento:** 100%; todos os cenários aprovados foram cobertos e a prova real confirmou a correção. Impacto final positivo.
- **PRs/commits relacionados:** PR #191, branch `codex/c14-c-profile-readiness`, commit `bdea83f`, merge `e118872`. — **Chat:** Trofia-Principal.

### [C14-D] - Android e cadeia de release

- **Status:** concluído.
- **Data de início:** 16/09/2026.
- **Data de conclusão:** 16/09/2026.
- **Tempo decorrido:** 1 h 19 min 42 s.
- **Minutos de CI:** 61 min 28 s no total (48 s leves + 60 min 40 s pesados), incluindo a primeira matriz que revelou o seletor de teste desatualizado e a repetição integral verde.
- **Propósito:** reduzir exposição de dados locais e tornar o artefato Android verificável e fail-closed quanto à configuração Firebase e às propriedades de segurança do manifesto.
- **O que se planeja fazer:** desligar Auto Backup, restringir FileProvider/cleartext e tornar configuração/manifests do AAB verificáveis.
- **Recursos/arquivos principais envolvidos:** `/android/app/src/main/AndroidManifest.xml`, `/android/app/src/main/res/xml/file_paths.xml`, `/android/app/build.gradle`, scripts/testes de release, AAB assinado e aparelho físico.
- **O que foi feito:** a auditoria comprovou `android:allowBackup="true"`, ausência de negação explícita de cleartext e um `FileProvider` que expunha todo o armazenamento externo. A implementação passou a negar Auto Backup e transferência de dados de conta, definiu `usesCleartextTraffic="false"`, restringiu o provider a um único `cache-path` privado e acrescentou verificação reproduzível da configuração Firebase de produção, manifesto mesclado, versão, assinatura real e SHA-256 do AAB. O Gradle agora interrompe builds release quando `google-services.json` estiver ausente, inválido ou apontar para projeto/package incorreto; o preflight também fiscaliza as garantias estáticas. A configuração Firebase real foi copiada apenas temporariamente para o worktree, conferida por hash e removida após a compilação; nenhum segredo foi exibido ou versionado. O schema XML compilou em 106 tarefas Android, os 11 testes focados passaram e a suíte local completa passou com 1.386 unitários, smoke legado/Vite e matriz cutover 60/60. No primeiro CI autenticado, 110/111 casos Vite passaram e o backup mobile expôs apenas um seletor de teste desatualizado após reload: o fallback procurava “Configurações” dentro do menu ainda fechado quando o botão estável `⚙` estava visível. O helper passou a usar essa engrenagem acessível como fallback específico de `menu-settings`. A repetição integral no run 35109617209 ficou totalmente verde: 1.386 unitários, Worker e Functions sem falhas, legado com 103 aprovações e apenas 8 skips Vite-only documentados, e Vite com 111/111 aprovações e zero skips. Nenhum `versionCode` foi alterado e nenhum AAB foi gerado sem autorização.
- **Alinhamento:** 100%; todas as barreiras Android e de release aprovadas foram implementadas. A estabilização incidental do seletor de teste preservou o comportamento do produto e teve impacto positivo na confiabilidade da validação.
- **PRs/commits relacionados:** PR #213, commits `1eb92a7` e `cac5f46`, merge `fbb8486`, runs `35104712014`, `35104712056`, `35109617202` e `35109617209`. — **Chat:** Trofia-Principal.

### [C14-E] - Auth, sessão e onboarding recuperável

- **Status:** concluído.
- **Data de início:** 16/09/2026.
- **Data de conclusão:** 16/09/2026.
- **Tempo decorrido:** 2 h 27 min 26 s, do primeiro commit `3e4b9ba` ao merge `b307d29`.
- **Minutos de CI:** 63 min 55 s no total (1 min 12 s leves + 62 min 43 s pesados): primeira execução `35120342305`/`35120342282`, repetição autenticada verde `35126370601`/`35126370693` e preflight documental final `35135301608`.
- **Propósito:** impedir contas parcialmente configuradas por falhas silenciosas, alinhar a senha mínima e dar ao usuário controle explícito sobre a persistência da sessão web.
- **O que se planeja fazer:** aplicar senha mínima de 12 caracteres, sessão `SESSION`/`LOCAL` explícita e onboarding recuperável.
- **Recursos/arquivos principais envolvidos:** `/login-screen.js`, runtime Firebase Auth modular, i18n PT/EN/ES, testes de onboarding/sessão e configuração manual da política de senha no Firebase Console.
- **O que foi feito:** a auditoria confirmou `browserLocalPersistence` forçada, mínimo local de 6 caracteres e falhas de perfil engolidas. A implementação passou a preservar a persistência restaurada pelo Firebase e a selecionar `SESSION` no login web sem opt-in, `LOCAL` com “Manter logado” e persistência local no Android. Cadastro e troca de senha agora exigem 12 caracteres com mensagens equivalentes em PT/EN/ES. O cadastro grava um marcador não sensível apenas na sessão, conserva um checkpoint com ID estável quando uma escrita inicial falha e permite repetir as gravações sem novo `createUser`; login normal remove esse marcador e conta antiga continua sem acesso ao modal exclusivo de criação. Falha ao enviar e-mail de verificação foi separada de falha de persistência, evitando mensagem enganosa. Os entrypoints UMD/Vite receberam as mesmas dependências, `app.js` e `nutrition-tracker.jsx` permanecem byte a byte sincronizados e o gate de perfil Vite consome o marcador somente para uma criação confirmada. A primeira matriz autenticada do PR #215 confirmou preflight, unitários, Worker e Functions, mas expôs uma incompatibilidade exclusiva do fixture: `browserSessionPersistence` não atravessa os novos contextos criados a partir do `storageState` do Playwright. O setup autenticado passou a marcar explicitamente “Manter logado”, optando por `LOCAL` somente para a conta descartável de CI; isso preserva a semântica `SESSION` padrão do produto e permite que a matriz exercite os fluxos autenticados reais. A repetição local completa após o ajuste ficou verde com preflight, 1.396 unitários, 48/48 smoke legado, 48/48 smoke Vite e 60/60 cutover. O run autenticado final `35126370601` também ficou integralmente verde: 1.396 unitários, Worker, 74 Functions, legado com 103 aprovações e 8 skips Vite-only documentados, e Vite 111/111 sem skips. Em 16/09/2026, o responsável configurou no Firebase Console mínimo 12, máximo 4.096, nenhuma composição obrigatória e modo **Notificar**. Essa escolha deliberada impede bloqueio imediato de contas antigas; o cliente já aplica 12 caracteres em cadastro/troca, e a futura migração do backend para **Exigir a aplicação** foi registrada como P11 antes do lançamento público.
- **Alinhamento:** 100%. A entrega corresponde ao escopo aprovado de senha, persistência e onboarding. A configuração **Notificar**, escolhida após a interface do Firebase tornar explícito o bloqueio que **Exigir** causaria às contas antigas, é uma transição deliberada e documentada em P11; o impacto é positivo por preservar acesso durante o beta sem permitir novas senhas curtas pelo cliente.
- **PRs/commits relacionados:** PR #215, commits `3e4b9ba`, `3b00fea` e `4d422f6`, merge `b307d29`, runs `35120342282`, `35120342305`, `35126370601`, `35126370693` e `35135301608`; configuração manual do Firebase confirmada pelo responsável. — **Chat:** Trofia-Principal.

### [C14-F1] - Worker, tiers e observabilidade

- **Status:** não iniciado.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Tempo decorrido:** pendente de merge.
- **Minutos de CI:** 0 min; não iniciado.
- **Propósito:** preparar limites comerciais e monitoramento sem dados pessoais antes da distribuição pública.
- **O que se planeja fazer:** modelar tiers com enforcement individual desligado durante os testes, pseudonimizar identificadores, limitar timeout/saída e manter métricas sanitizadas por 30 dias.
- **Recursos/arquivos principais envolvidos:** `/worker/src/`, Durable Object, rate limiter, Cloudflare/Google Cloud Logging e Monitoring, contratos e testes.

### [C14-F2] - IAM, invocadores e dependências

- **Status:** não iniciado.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Tempo decorrido:** pendente de merge.
- **Minutos de CI:** 0 min; não iniciado.
- **Propósito:** reduzir privilégios e dependências somente depois de conhecer o estado administrativo real.
- **O que se planeja fazer:** auditar IAM, contas de serviço, invocadores, Functions/Tasks e lockfiles antes de criar identidades mínimas ou alterar privilégios.
- **Recursos/arquivos principais envolvidos:** Google Cloud IAM, Firebase Functions, Cloud Tasks, Artifact Registry, lockfiles, relatórios administrativos e documentação de decisões.

### [C14-G] - Web, CSP e superfícies de debug

- **Status:** não iniciado.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Tempo decorrido:** pendente de merge.
- **Minutos de CI:** 0 min; não iniciado.
- **Propósito:** reduzir o impacto de uma eventual XSS e impedir que APIs globais de diagnóstico permaneçam disponíveis indevidamente em produção.
- **O que se planeja fazer:** aplicar CSP compatível com os provedores atuais e restringir superfícies globais de debug.
- **Recursos/arquivos principais envolvidos:** `/index.html`, CSP via `<meta http-equiv>`, integrações Firebase/reCAPTCHA/Worker/Google APIs, globals de debug e matriz PT/EN/ES em Pages.
- **O que foi feito:** nenhuma implementação iniciada. Está aprovada a CSP imediata no GitHub Pages, inicialmente via meta e compatível com os serviços atualmente necessários.

### [C14-H] - Staging, validação final e rollout

- **Status:** não iniciado.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Tempo decorrido:** pendente de merge.
- **Minutos de CI:** 0 min; não iniciado.
- **Propósito:** comprovar o endurecimento completo em um ambiente destrutivo separado antes do lançamento público e produzir o handoff operacional para C16/C25.
- **O que se planeja fazer:** criar staging separado e executar a matriz destrutiva/final antes do lançamento público.
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

### [C29-A] - Contrato seguro de reclassificação por IA

- **Status:** não iniciado.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Tempo decorrido:** 0 min; não iniciado.
- **Minutos de CI:** 0 min; não iniciado.
- **Propósito:** permitir que um usuário peça nova classificação para somente um alimento reconhecido incorretamente por foto, preservando o restante da estimativa e os limites de privacidade e segurança já consolidados em C08, C24 e C14-C.
- **O que se planeja fazer:** definir um contrato estruturado de reclassificação que receba a imagem ainda transitória, o contexto mínimo do item atual e uma descrição curta do erro; tratar essa descrição como entrada não confiável; exigir Firebase Auth e App Check antes da transmissão; validar a resposta fail-closed; aplicar limites de payload, timeout e rate limits de imagem/globais; ignorar respostas tardias; e não registrar nem persistir imagem, correção textual, prompt ou resposta bruta.
- **Recursos/arquivos principais envolvidos:** Worker multimodal, `worker/src/ai-worker.js`, validação Firebase Auth/App Check, Durable Object/rate limiter, contratos estruturados de estimativa C24/C08, `image-meal-client.js`, Gemini e testes unitários/de integração do Worker e do cliente.
- **PRs/commits relacionados:** nenhum; planejamento aprovado em 16/09/2026, com implementação deliberadamente posterior ao grupo A do roadmap.

### [C29-B] - Integração da reclassificação no editor compartilhado

- **Status:** não iniciado.
- **Data de início:** não iniciado.
- **Data de conclusão:** não iniciado.
- **Tempo decorrido:** 0 min; não iniciado.
- **Minutos de CI:** 0 min; não iniciado.
- **Propósito:** inserir a correção assistida no fluxo de revisão C24 sem substituir silenciosamente dados, alterar outros alimentos ou impedir a edição manual final pelo usuário.
- **O que se planeja fazer:** adicionar a ação “Classificado incorretamente” a cada item reconhecido por foto; coletar uma descrição breve e limitada; informar que somente o item escolhido será substituído; manter os demais itens e suas edições byte a byte inalterados; preservar o estado atual em falha/cancelamento; permitir editar, excluir ou confirmar o novo resultado; e cobrir PT/EN/ES, acessibilidade, loading, cancelamento, retry, timeout, quota, sessão, resposta inválida e smoke legado/Vite. A implementação também deve confirmar se a política e o Data Safety existentes continuam suficientes antes da exposição.
- **Recursos/arquivos principais envolvidos:** `image-meal-screen.js`, `image-meal-flow.js`, `meal-estimate-editor.js`, composições legado/Vite, i18n, estados de erro C24, testes unitários/smoke e documentos trilíngues de privacidade/Data Safety.
- **PRs/commits relacionados:** nenhum; planejamento aprovado em 16/09/2026, posicionado antes de N03 para que a futura leitura de rótulos possa reutilizar o padrão corretivo.

- **Reload/troca de idioma após C14-A:** o chat Trofia-UI/UX relatou, sem reprodução estável, uma queda para login em espanhol e um `SearchableChoiceField` preso em `#loading`. Três tentativas isoladas passaram. No PR #175, a tentativa 2 do CI chegou ao mesmo teste, mas o job foi cancelado exatamente pelo teto global de 30 minutos depois de apenas 5,6 segundos da espera de 15 segundos; isso não comprova o travamento. O teto do CI foi ajustado para 45 minutos e ficou registrado investigar, em pausa natural do C14, consumidores de reload/bootstrap que ainda possam presumir o contrato antigo de leitura silenciosa, sem atribuir causalidade à C14-A até existir evidência.
- **F06 / PR #143:** documentação reconciliada e mesclada em 01/09/2026 no merge `7662899`; a causa de rede específica por usuário/ISP e a futura migração para domínio próprio permanecem registradas fora do C08.
- **PR #101:** draft antigo de leituras do Firestore, fechado sem merge em 01/09/2026 por ter sido substituído pelo C28, especialmente PRs #113–#117.
- **PR #150:** trabalho de NumericField em outra frente de UI, ainda draft na captura.

## Estado ao encerrar esta cronologia

- Base atual verificada: `origin/main` no merge `6d72791`, em 16/09/2026.
- Versão nomeada preparada no código: `0.11.0-beta`.
- C22, C23, C28, C20 e C19: concluídos segundo o roadmap.
- C08: implementação A–F concluída e mesclada no PR #167.
- C14-A, C14-B1, C14-B2 e C14-C: concluídas; a C14-C encerrou as cinco fases com enforcement obrigatório ativo no Worker e validação negativa/legítima em produção.
- C29: planejamento pós-lançamento aprovado em duas fatias não iniciadas, após C21 e antes de N03; não interrompe C14-D–H, C16 ou C25.
- Próximos gates de lançamento público no roadmap: conclusão de C14, C16 e C25.

## Fontes consultadas e limitações

- GitHub: lista de PRs mesclados e abertos, títulos, datas e commits.
- Git: `origin/main` no merge `caeb515` no momento desta atualização.
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

### [DOC-FORMAT-198] - Padronização detalhada das entradas históricas

- **Status:** concluído.
- **Data de início:** 14/09/2026.
- **Data de conclusão:** 14/09/2026.
- **Tempo decorrido:** 2 min.
- **Minutos de CI:** 1 min (1 leve + 0 pesado).
- **Propósito:** substituir registros compactados por um formato verificável e consistente, com rastreabilidade suficiente para comparar planejamento e entrega.
- **O que se planeja fazer:** reformatar as entradas da frente principal no `RESUMO-STATUS.md`, acrescentar datas, propósito, escopo aprovado, recursos, entrega e alinhamento e consolidar as duplicações conhecidas do C14.
- **Recursos/arquivos principais envolvidos:** `/documentation/estado-atual/RESUMO-STATUS.md`, histórico Git/PRs, validação estrutural e preflight documental.
- **O que foi feito:** o PR #198 normalizou 78 entradas e consolidou no resumo compartilhado C14-B1/B2, C14-C1–C5 e C14-F1/F2. A auditoria de 15/09 confirmou, porém, que o histórico desta frente ainda preservava B, C e F como agregados; essa lacuna residual passou a ser tratada separadamente em DOC-RECONCILIACAO-C14.
- **Alinhamento:** divergiu parcialmente do objetivo completo — o `RESUMO-STATUS.md` foi corrigido, mas a mesma granularidade não chegou ao histórico. O impacto inicial foi positivo, e o desvio documental está sendo corrigido sem alterar fatos de produto.
- **PRs/commits relacionados:** PR #198, commit `edb8a9f`, merge `8c6c9a9`.

### [DOC-RECONCILIACAO-C14] - Granularidade e gate documental da frente principal

- **Status:** concluído.
- **Data de início:** 15/09/2026.
- **Data de conclusão:** 15/09/2026.
- **Tempo decorrido:** 5 min 33 s.
- **Minutos de CI:** 1 min (1 leve + 0 pesado).
- **Propósito:** corrigir a divergência entre a granularidade já existente no resumo compartilhado e o histórico da frente principal e impedir que documentação volte a ser tratada como acabamento opcional.
- **O que se planeja fazer:** separar C14-B1/B2, C14-C1–C5 e C14-F1/F2 em registros completos, eliminar agregados duplicados, formalizar a Definition of Done documental e torná-la instrução operacional carregada no repositório.
- **Recursos/arquivos principais envolvidos:** `/AGENTS.md`, `/documentation/PADRAO-DOCUMENTACAO.md`, `/documentation/README.md`, `/documentation/estado-atual/RESUMO-STATUS.md` e este histórico.
- **O que foi feito:** o PR #208 substituiu os blocos agregados por entradas individuais completas, preservou o incidente C14-B2 e o gate de perfil como registros próprios, acrescentou o registro formal ausente do PR #198 e vinculou o fechamento C14-C4 aos PRs #205/#206. O novo `AGENTS.md` obriga todas as frentes a ler a regra, e `PADRAO-DOCUMENTACAO.md` fixa campos, momentos de atualização, métricas, limites entre chats e a checklist de encerramento. A validação confirmou uma ocorrência e todos os campos obrigatórios em 16/16 entradas C14, zero agregados B/C/F remanescentes e preflight sem avisos.
- **Alinhamento:** 100%. A reconciliação cobriu todas as lacunas comprovadas da frente principal e acrescentou uma barreira operacional permanente. Não foram inferidos nem alterados escopos pertencentes a UI/UX ou Trofia-Bugs; impacto final positivo.
- **PRs/commits relacionados:** PR #208, commits `ba8eb8d` e `7afe844`, merge `1a3d75f`; run documental `35015749125`.

## [INC-FIRESTORE-PERSIST-20260917] - Falso incidente de persistência causado por data UTC no teste

- **Status:** concluído.
- **Data de início:** 17/09/2026.
- **Data de conclusão:** 17/09/2026.
- **Tempo decorrido:** 12 h 33 min 43 s, do primeiro commit ao merge `2ff02c9`.
- **Minutos de CI:** 124 min 50 s (2 min 7 s leve + 122 min 43 s pesado; inclui a tentativa pesada inicial, o rerun verde, a validação do SHA final e o tempo efetivamente consumido por um run documental obsoleto cancelado após o merge).
- **Propósito:** determinar por que quatro fluxos autenticados centrais aparentaram deixar de persistir ou reler entradas do Diário poucos minutos depois de uma execução verde, bloqueando o gate do UI/UX e inicialmente sugerindo regressão externa de rules, App Check ou estado compartilhado.
- **O que se planeja fazer:** reproduzir os quatro casos em worktree limpa da `origin/main`, confrontar o estado visível do Diário com a data consultada pelo teste, verificar a fronteira de data usada pelo app e distinguir falha real de escrita/leitura de erro determinístico do harness antes de tocar em produção.
- **Recursos/arquivos principais envolvidos:** `tests/smoke/authenticated-flows.spec.js`, `tests/unit/authenticated-daily-date.test.js`, `date-utils.js`, `DateUtils.localToday()`, `DateUtils.addCivilDays()`, Playwright legado/Vite, conta autenticada descartável, artefatos Playwright do worktree UI/UX e worktree isolada `codex/firestore-persistence-incident-20260917`.
- **O que foi feito:** o relatório do UI/UX registrou 95 casos aprovados, 8 skips esperados e 8 falhas em quatro cenários desktop/mobile, embora a execução anterior na mesma base tivesse 103 aprovações e 8 skips. A frente Principal reproduziu exatamente as oito falhas em checkout limpo de `d99f465`. As capturas mostraram que cada entrada nova estava visível no Diário, eliminando a hipótese de rejeição silenciosa de escrita. A causa era temporal: os quatro testes derivavam “hoje” ou “ontem” com `Date.toISOString()` (UTC), enquanto o app usa a data civil local. O erro se manifestava nas primeiras horas depois da meia-noite local porque, nesse período, Madrid já estava no novo dia civil e o UTC ainda permanecia no dia anterior. Essa faixa descreve quando a implementação antiga falhava; ela não é uma janela de tolerância criada pela correção. A solução eliminou o uso de UTC para datas do Diário e centralizou o cálculo de teste em `DateUtils.localToday()` e `DateUtils.addCivilDays()`, adicionou um contrato unitário que proíbe a regressão UTC nesse arquivo e preservou código runtime, rules e App Check sem alteração. O recorte autenticado passou 9/9 (setup e quatro cenários em desktop/mobile); a validação ampla passou 1.401/1.401 unitários, 103 smokes legado com 8 skips esperados, 111/111 smokes Vite e 60/60 cenários cutover. Uma primeira tentativa Vite sem a site key pública local falhou no bootstrap de App Check; repetida com as mesmas variáveis públicas do CI, ficou integralmente verde, confirmando que não era regressão do hotfix. No CI do PR #222, a tentativa inicial do job pesado encontrou apenas uma flakiness visual alheia no `SearchableChoiceField`; os fluxos de persistência passaram. O rerun integral `35161997173` terminou verde em 34 min 15 s, confirmando preflight, unitários, Worker, Functions e Playwright autenticado.
- **Explicação em linguagem simples:** o Diário guarda cada dia separadamente, como se cada data fosse uma gaveta com uma etiqueta. O aplicativo colocava a refeição na gaveta correta segundo a data exibida no celular. O teste automático, porém, consultava a data por outro relógio, baseado em UTC. Logo depois da meia-noite em Madrid, esses dois relógios podiam discordar sobre qual era o dia atual: para o celular já era dia 17, enquanto para o relógio UTC ainda era dia 16. Assim, a refeição era salva corretamente na gaveta do dia 17, aparecia no Diário, mas o teste abria a gaveta do dia 16, encontrava-a vazia e informava incorretamente que a gravação tinha falhado. Para corrigir, o teste passou a usar exatamente a mesma forma de determinar a data que o aplicativo usa. Ele agora prepara, grava, procura e restaura os dados sempre na mesma gaveta diária. Não foi adicionada uma espera, uma tolerância de duas horas nem uma busca no dia anterior: o teste simplesmente deixou de consultar a data errada.
- **Estratégia técnica e medidas aplicadas:**
  1. **Reprodução isolada e fail-closed:** os quatro cenários foram executados em worktree criada diretamente de `origin/main`, com a mesma conta descartável e o mesmo App Check debug provider do CI. A reprodução idêntica fora da branch do UI/UX eliminou as alterações visuais locais como causa.
  2. **Confronto entre interface e persistência consultada:** os `error-context.md` e screenshots foram comparados com o valor retornado por `readDailyLog()`. Os itens com os identificadores únicos da própria execução estavam renderizados no Diário enquanto o helper consultava `{}` ou `null`, demonstrando que a ação de gravação havia ocorrido e que o teste relia outra chave diária.
  3. **Auditoria da fronteira temporal:** o caminho runtime usa `DateUtils.localToday()` para a data civil do dispositivo e `DateUtils.addCivilDays()` para deslocamentos. Os testes afetados construíam a chave com `new Date().toISOString().split('T')[0]` ou com `setDate()` seguido de ISO. Como ISO serializa em UTC, nas primeiras horas depois da meia-noite de Madrid havia uma diferença determinística de um dia entre a chave limpa/lida pelo teste e a chave gravada pela interface. A duração dessa faixa depende do deslocamento sazonal do fuso; ela explica a manifestação do bug antigo e não participa da solução.
  4. **Helper canônico único no harness:** `tests/smoke/authenticated-flows.spec.js` recebeu `readLocalCivilDate(page, dayOffset = 0)`. Ele executa no contexto da aplicação, obtém `window.DateUtils.localToday()` e aplica `window.DateUtils.addCivilDays(today, offset)`, garantindo que preparação, gravação, polling e restauração usem exatamente o mesmo domínio de datas do produto.
  5. **Migração dos quatro pontos vulneráveis:** o teste de refeição retroativa passou a pedir offset `-1`; avaliação local durante timeout da IA, avaliação contextual PT/EN/ES e sugestão do GA passaram a pedir offset `0`. Em todos eles, a mesma data civil agora alimenta `readDailyLog()`, `replaceDailyLog()` e a expectativa posterior, evitando limpar um dia e validar outro.
  6. **Barreira contra regressão:** `tests/unit/authenticated-daily-date.test.js` verifica a presença das chamadas a `window.DateUtils.localToday()` e `window.DateUtils.addCivilDays()` e recusa os dois padrões antigos de UTC no arquivo autenticado. O `Date.UTC(...).toISOString()` que permanece na fixture de backup é deliberado: gera uma chave histórica inativa e determinística, não representa “hoje” nem participa desses fluxos.
  7. **Escopo mínimo e proteção de produção:** nenhum código runtime, documento Firestore, rule, configuração de App Check ou dado de usuário foi alterado. Rules e App Check permaneceram hipóteses até a evidência descartá-los; por isso não houve rollback nem relaxamento indevido de segurança.
  8. **Validação em camadas:** além do recorte autenticado 9/9, foram executadas as suítes unitária, legado, Vite e cutover. O SHA funcional final passou no sanity `35167062834` e no CI autenticado completo `35167062837`, incluindo preflight, Worker, Functions e Playwright. Os commits exclusivamente documentais posteriores passaram nos preflights leves; o run pesado obsoleto `35216383795`, iniciado para um SHA intermediário, foi cancelado após o merge para não consumir CI sem valor adicional.
- **Exemplo concreto do erro antigo:** às `00:30` de 17/09 em Madrid, o relógio UTC ainda podia representar `22:30` de 16/09. A interface usava a chave civil local de 17/09 e mostrava a nova refeição corretamente; o teste calculava 16/09 com `toISOString()` e chamava `readDailyLog()` para a chave do dia anterior, recebendo `{}`. O dado não havia desaparecido: a consulta automatizada apontava para outro documento diário.
- **Comportamento depois da correção:** “hoje” é sempre a data civil local retornada pelo próprio `DateUtils` da aplicação; “ontem” é sempre `addCivilDays(hoje, -1)`. A mesma chave é usada para preparar a fixture, gravar pela interface, reler no polling e restaurar o estado anterior, em qualquer horário e fuso.
- **O que a correção não faz:** não cria uma janela de duas horas, não consulta simultaneamente o dia atual e o anterior, não aceita dados com atraso, não adiciona fallback por UTC e não muda a semântica do Diário. Ela simplesmente remove do teste a fonte de data incompatível com a já utilizada pelo produto.
- **Alinhamento:** 100%. O diagnóstico começou tratando rules/App Check como hipóteses, mas a evidência deslocou corretamente a correção para o relógio do próprio teste. O desvio foi positivo: evitou um rollback ou alteração de produção indevida e restaurou um gate confiável sem tocar nos dados dos usuários.
- **PRs/commits relacionados:** base `d99f465`; PR #222; commits `68e5f51`, `0a09eec`, `d394857` e `e73a84f`; merge `2ff02c9`; runs funcionais `35161997173` e `35167062837`; preflights documentais `35161997106`, `35167062834`, `35216383806`, `35217465988` e `35217958625`. — **Chat:** Trofia-Principal.

## [INC-AUTH-BOOTSTRAP-20260917] - Login autenticado preso em “Processando...”

- **Status:** concluído sem reprodução; observação permanece aberta em D03/`INV-RELOAD-SESSAO`.
- **Data de início:** 17/09/2026.
- **Data de conclusão:** 17/09/2026.
- **Tempo decorrido:** 3 h 49 min 14 s, do primeiro commit `68cea62` ao merge `c2257cf`.
- **Minutos de CI:** 50 s (50 s leve + 0 pesado; preflights de 23 s e 27 s).
- **Propósito:** diagnosticar uma ocorrência em que o setup autenticado permaneceu por mais de 20 segundos no formulário público, com a ação “Processando...” desabilitada e sem chegar à navegação, ao perfil obrigatório ou a um erro recuperável. O bloqueio ocorreu antes dos casos da CAM-RED-4 e deve ser separado do código de câmera.
- **O que se planeja fazer:** executar o mesmo setup 2–3 vezes em uma worktree criada diretamente de `origin/main`; registrar somente marcos e erros sanitizados do sign-in, token Firebase Auth, inicialização/token App Check, entrada/saída de `afterAuthenticated`, leitura confirmada de perfil e remoção do loading; inspecionar promises e requests pendentes no timeout; classificar a ocorrência como determinística ou intermitente; implementar correção mínima e teste de regressão apenas se a causa for comprovada.
- **Recursos/arquivos principais envolvidos:** `login-screen.js`, `src/App.jsx`, `src/leaf/authenticated-profile-gate.js`, `src/firebase/firebase-auth-sdk.js`, `src/firebase/app-check-client.js`, `tests/smoke/auth.setup.js`, `tests/smoke/app-check-fixture.js`, Playwright autenticado, Firebase Auth, App Check e Firestore.
- **O que foi feito:** o relato do UI/UX foi confrontado com a `origin/main` em `f494895`; a branch do UI/UX contém o registro documental `9991507`, mas sua worktree, seus artefatos potencialmente sensíveis e suas mudanças funcionais não foram alterados. A investigação do Principal foi isolada na branch `codex/auth-bootstrap-stuck-20260917`. Foram executadas três reproduções basais do `auth-setup`, todas aprovadas, seguidas de três reproduções com observação temporária e sanitizada de rede/estado. Nessas três, o login alcançou a navegação em 1.487 ms, 1.499 ms e 1.487 ms; `signInWithPassword` respondeu `200` após aproximadamente 260–278 ms, `accounts:lookup` respondeu `200` após aproximadamente 171–179 ms, todas as requests observadas do Firestore responderam `200`, nenhuma request permaneceu pendente e não houve `pageerror`. A instrumentação temporária foi removida e nunca registrou e-mail, senha, UID, token, corpo ou cabeçalho.
- **Análise do ponto de bloqueio:** no runtime legado usado pelo gate, `LoginScreen.handleSubmit()` mantém `loading=true` enquanto aguarda sequencialmente `fbSignIn()` e `fbCheckEmailVerified()`. Somente depois dessas duas promises existe chamada a `onLogin(false)`, que entra em `afterAuthenticated()`. Como o snapshot da falha ainda exibia o próprio formulário com “Processando...”, a execução não havia alcançado `afterAuthenticated`, App Check do perfil nem as leituras subsequentes do Diário. As duas operações anteriores usam requests sem deadline próprio; uma request externa que não resolve nem rejeita mantém a interface nesse estado. Isso explica estruturalmente como o sintoma é possível e mantém relação com D03, mas o run original não preservou trace/rede e, por isso, não permite afirmar honestamente se ficou pendente o sign-in, o lookup de e-mail ou a camada de transporte subjacente.
- **Conclusão e retomada:** a ocorrência é válida, porém intermitente e com causa disparadora não confirmada. Nenhuma correção de runtime foi aplicada, pois isso exigiria escolher timeout/copy/comportamento sem reprodução objetiva. O gate CAM-RED-4 pode ser repetido sobre a `main` exata `f494895`; se “Processando...” reaparecer, deve parar novamente e capturar os marcos sanitizados de `auth-sign-in` e `auth-email-verification` no próprio run. Não aumentar timeout, repetir login automaticamente, forçar clique nem aceitar outra tela como sucesso.
- **Alinhamento:** 100%. O protocolo aprovado para não reprodução foi cumprido: múltiplas tentativas, tempos e estado de rede foram registrados, a worktree alheia foi preservada e nenhuma hipótese foi apresentada como causa comprovada. O impacto final foi neutro no produto e positivo na confiabilidade do diagnóstico.
- **PRs/commits relacionados:** relato originado na branch `codex/cam-red-4-flash`, commit documental `9991507`; PR #225, commits `68cea62` e `d690420`, merge `c2257cf`; preflights `35234475181` e `35258378574`. — **Chat:** Trofia-Principal.

## [INC-PROFILE-INCOMPLETE-PLAY-20260917] - Perfil existente classificado como incompleto no AAB Play

- **Status:** em andamento.
- **Data de início:** 17/09/2026.
- **Data de conclusão:** não concluído.
- **Tempo decorrido:** pendente de merge.
- **Minutos de CI:** 40 min 25 s no total (28 s leves + 39 min 57 s pesados), nos runs `35267419513` e `35267419620`; o gate autenticado terminou integralmente verde.
- **Propósito:** diagnosticar a recorrência física de `profile-incomplete-existing-account` depois de um login concluído no AAB assinado versionCode 20 instalado pela faixa interna da Play, distinguindo dado realmente ausente de falha de Auth, App Check/Play Integrity, Firestore, cache ou validação do perfil.
- **O que se planeja fazer:** preservar e examinar screenshot, árvore acessível e logcat sanitizado; conferir o perfil da conta descartável por leitura remota não destrutiva; mapear token Auth, token App Check, origem server/cache e campos obrigatórios sem registrar valores pessoais; reproduzir em ambiente controlado e, se necessário, no Galaxy; corrigir somente a causa comprovada; executar testes focados, suíte completa e CI autenticado antes de liberar nova prova física da CAM-RED-4.
- **Recursos/arquivos principais envolvidos:** `src/App.jsx`, `src/leaf/authenticated-profile-gate.js`, `src/firebase/app-check-client.js`, `src/firebase/firebase-firestore-sdk.js`, `firebase-storage.js`, `profile-validation.js`, Playwright, Firebase Auth/App Check/Firestore, AAB Play versionCode 20, Galaxy SM-S938B e evidências em `trofia-cam-red-4-galaxy`.
- **O que foi feito:** a evidência visual confirma a tela espanhola de erro com detalhe `profile-incomplete-existing-account`; a árvore acessível confirma as ações de retry/logout e não contém e-mail; o logcat sanitizado confirma inicialização bem-sucedida do Firebase, mas não expõe o resultado da leitura protegida. A branch `codex/cam-red-4-flash`, o PR #227 e seus arquivos de câmera/flash permaneceram intocados. A investigação do Principal foi aberta em worktree própria a partir de `origin/main` no merge `c6c7d37`. O AAB exato do relato foi localizado e conferido pelo SHA-256 informado; seus arquivos de Auth, perfil e Firestore correspondem ao código-base auditado, sem alteração funcional da câmera nessa cadeia.
- **Confirmação não destrutiva do dado real:** usando exclusivamente a conta descartável já destinada aos testes, uma leitura REST autenticada e sanitizada confirmou Auth `200`, conta verificada, App Check `200`, Firestore `200`, documento raiz existente e todos os campos obrigatórios presentes, tipados e semanticamente válidos. Nenhum valor, e-mail, UID, token, header ou dado nutricional foi impresso ou preservado. O documento foi atualizado às `18:30:36.766589Z`, antes da árvore de erro capturada às `18:31:20Z` e do screenshot às `18:31:50Z`; portanto, o servidor não continha um perfil incompleto quando o bootstrap exibiu essa classificação.
- **Causa em linguagem direta:** o perfil do usuário não estava faltando. Durante uma janela transitória da sessão, a camada de dados podia tentar confirmar o perfil antes de enxergar o identificador do usuário autenticado. Em vez de dizer “não há sessão pronta para fazer esta leitura”, ela devolvia um objeto vazio. A tela recebia esse vazio como se fosse uma leitura válida de um perfil sem campos e mostrava a mensagem errada de perfil incompleto.
- **Causa técnica comprovada:** `fbGetProfileFromServer3()` continha `if (!getUid()) return {}`. Esse retorno ocorria antes de `getDocFromServer()`, logo não era leitura do cache nem resposta do Firestore, mas ainda assim passava pelo contrato como resultado bem-sucedido. `getRequiredProfileData()` convertia o objeto vazio em campos vazios e `resolveAuthenticatedProfileGate()` produzia `incomplete-existing`. A combinação de (a) documento completo e imutável antes do erro, (b) classificação exclusiva desse caminho e (c) reprodução unitária determinística com UID ausente comprova o defeito de classificação. O artefato sanitizado original não permite reconstruir qual evento upstream tornou `auth.currentUser` momentaneamente indisponível; isso não muda a correção fail-closed e fica explicitamente registrado como limite do diagnóstico, sem inventar uma causa secundária.
- **Correção aplicada:** a leitura confirmada de perfil agora captura um UID autenticado no início da operação; se ele não existir, lança `firestore-profile-auth-unavailable` e não executa request nem retorna perfil vazio. O UID capturado é reutilizado ao construir a referência do documento, evitando uma segunda leitura instável do estado de sessão durante a mesma operação. O aviso de falha da leitura de perfil deixou de incluir UID. Assim, o login normal continua fora do modal de cadastro e uma sessão ainda não pronta chega à tela recuperável com o motivo real, sem retry automático, consulta duplicada, timeout ampliado ou fallback para cache.
- **Cobertura de regressão:** o contrato UMD/ESM ganhou teste que injeta UID ausente, exige rejeição com `firestore-profile-auth-unavailable` e comprova zero chamadas a `getDocFromServer`; os testes existentes continuam comprovando leitura exclusiva do servidor, propagação de indisponibilidade e impossibilidade de abrir o modal de cadastro para conta existente.
- **Validação local e remota:** o teste focado passou 80/80 sem skips. A execução integral autenticada, após carregar somente em memória o App ID/site key públicos do AAB e o debug token local ignorado pelo Git, passou 1.404/1.404 unitários, 103/103 smokes legado com os 8 skips estruturais esperados, 111/111 smokes Vite e 60/60 casos cutover. O login Vite concluiu em 3,8 s, sem `profile-incomplete-existing-account` nem falha de App Check. Tentativas anteriores sem dependências/configuração completas foram descartadas como ambiente inválido e não contabilizadas como validação do produto. No GitHub, o preflight documental `35267419513` terminou verde em 28 s e o CI autenticado `35267419620` terminou totalmente verde em 39 min 57 s, cobrindo preflight, 1.404 unitários, Worker, Functions e toda a matriz Playwright. A validação física ainda depende de um novo AAB Play que contenha o hotfix; por isso, o incidente permanece em andamento.
- **PRs/commits relacionados:** PR UI/UX #227, commits `5bc3313` e `2655978`; PR #229, commit `c6c6707`, runs `35267419513` e `35267419620`. — **Chat:** Trofia-Principal.

## [INC-AUTH-CLEANUP-LANG-20260918] - Cleanup autenticado e propagação de idioma no gate CAM-RED-4

- **Status:** em andamento.
- **Data de início:** 18/09/2026.
- **Data de conclusão:** não concluído.
- **Tempo decorrido:** pendente de merge.
- **Minutos de CI:** 0 min até esta etapa; investigação e reprodução local ainda em andamento.
- **Propósito:** explicar por que o gate legado autenticado da CAM-RED-4 pode (a) abrir a avaliação contextual com o idioma anterior depois de uma troca PT→EN e (b) terminar com o cleanup do Diário aparentemente preso, distinguindo defeito de runtime, Firestore ou sincronização do harness antes de qualquer correção.
- **O que se planeja fazer:** preservar os dois conjuntos de artefatos sanitizados fornecidos pela UI/UX; revisar os contratos de `setAppLanguage()`, `replaceDailyLog()` e `replaceDailyAggregate()`; reproduzir desktop e mobile sobre uma worktree limpa da `origin/main`; marcar tempos de escrita de idioma, reload/bootstrap, abertura do modal, persistência e restauração; observar erros de console/rede sem imprimir caminhos, UID, tokens ou dados; corrigir somente a causa objetivamente reproduzida; repetir recorte, suíte completa e CI autenticado. Não aumentar timeout, adicionar retry automático, relaxar expectativas nem alterar a câmera/flash.
- **Recursos/arquivos principais envolvidos:** `tests/smoke/app-check-global-setup.js`, `tests/smoke/authenticated-suite-coordinator.js`, `tests/unit/authenticated-suite-coordinator.test.js`, `.github/workflows/ci.yml`, Playwright autenticado, GitHub Actions, conta descartável e evidências `trofia-cam-red-4-post-hotfix-gate-20260918`/`trofia-cam-red-4-assessment-repeat-20260918` em `AppData/Local/Temp`.
- **O que foi feito:** a branch UI/UX permaneceu intocada e uma worktree exclusiva do Principal foi criada no merge `1e9ef55`. A evidência preservada confirma uma falha funcional observável: após `setAppLanguage(page, 'en')`, a avaliação abriu com o título português “Adequação ao restante do dia”. Já as duas falhas atribuídas visualmente ao cleanup registram `page.evaluate: Target page, context or browser has been closed` na linha de `replaceDailyLog()` somente depois que o timeout global de 120 s encerrou a página. Isso prova que o cleanup foi a operação ativa no momento do encerramento, mas não prova que ele iniciou ou consumiu sozinho os 120 s; a causa continua aberta até a instrumentação separar o tempo gasto antes do `finally` do tempo da própria restauração.
- **Hipóteses locais descartadas:** a configuração usa `workers: 1`, portanto desktop e mobile do mesmo comando não disputavam o perfil em paralelo. Também não foi necessário alterar `setAppLanguage()`, `replaceDailyAggregate()`, o timeout ou a hidratação do runtime: sem outra suíte autenticada concorrente, o mesmo caso mobile passou repetidamente com os contratos existentes. A investigação preservou essas observações para explicar por que o foco inicial em reload/cleanup era plausível, mas não as promoveu a causa sem evidência.
- **Causa raiz confirmada:** os timestamps internos dos JSONs colocam o gate completo local entre `22:40:32Z` e `22:58:50Z` e as repetições entre `23:00:34Z` e `23:04:25Z`. O GitHub Actions `35281945540`, disparado pelo merge do PR #229, executou a suíte autenticada entre `22:27:46Z` e `23:02:56Z`, integralmente sobre a mesma conta descartável. O próprio log remoto mostra suas matrizes legado/Vite lendo e escrevendo durante todo o intervalo. Assim, duas suítes independentes alternaram `language`, `pantry_v2` e o Diário: uma podia restaurar português ou a despensa anterior enquanto a outra ainda esperava inglês ou seu alimento-fixture. Isso explica simultaneamente o modal em português, “Nenhum resultado” e as falhas visuais posteriores com idioma herdado. Não houve evidência de rejeição das rules, defeito no score, erro da câmera ou regressão de persistência do produto.
- **Por que o stack do cleanup confundiu o diagnóstico:** ao perder seu alimento-fixture, o teste principal falhou e entrou no `finally`. O timeout global fechou a página enquanto a restauração era a última operação ativa; Playwright então apontou `replaceDailyLog()`/`replaceDailyAggregate()` como o local onde a página já fechada foi observada. A linha era consequência do encerramento, não prova de que o cleanup iniciou os 120 segundos. O snapshot preservado, ainda no formulário com a busca do fixture e “Nenhum resultado”, confirma a interferência anterior à restauração.
- **Correção implementada:** o setup global autenticado passou a adquirir um arquivo de lock atômico compartilhado por todas as worktrees locais em `%LOCALAPPDATA%/Trofia`. Uma segunda suíte local falha antes do login com `authenticated-smoke-local-run-active`. Locks cujo processo proprietário morreu ou que ultrapassaram duas horas são recuperados com segurança; a liberação só remove o lock quando o token de posse coincide. Antes de usar a conta, uma execução local também consulta a API pública do GitHub Actions e falha fechado se o workflow `CI` estiver `queued`, `in_progress`, `waiting` ou `pending`, informando apenas o ID público do run. Dentro do GitHub Actions essa consulta é dispensada porque o workflow já usa `concurrency: nutrition-authenticated-suite`; o lock local do runner continua sendo adquirido e liberado pelo teardown retornado pelo `globalSetup`.
- **Validação local concluída:** cinco repetições mobile consecutivas sobre a `origin/main` limpa passaram, somadas a uma execução inicial e a uma execução posterior já usando o coordenador (6/6 antes da mudança e 1/1 depois). Os nove testes focados do coordenador/App Check passaram; o arquivo de lock foi comprovadamente removido após o Playwright. A suíte integral, executada sem CI concorrente, terminou verde com preflight aprovado, 1.409/1.409 unitários, 103/103 smokes legado com os 8 skips estruturais esperados, 111/111 smokes Vite e 60/60 casos cutover. Nos dois runtimes e viewports, refeição retroativa, avaliação local, avaliação contextual PT/EN/ES e sugestão GA persistiram e foram restauradas normalmente. Resta somente o CI autenticado real do PR antes de concluir o incidente.
- **Alinhamento:** não aplicável enquanto a investigação está em andamento.
- **PRs/commits relacionados:** bloqueio originado no PR UI/UX #227, sobre o hotfix do PR #229/merge `1e9ef55`; nenhum PR de correção aberto nesta etapa. — **Chat:** Trofia-Principal.

## [DOC-SYNC-LOCAL-20260916] - Reconciliação segura do checkout principal

- **Status:** concluído.
- **Data de início:** 16/09/2026.
- **Data de conclusão:** 16/09/2026.
- **Tempo decorrido:** 1 min 25 s, do primeiro commit `a856617` ao merge `f62d745`.
- **Minutos de CI:** 1 min (1 leve + 0 pesado; execução 39 s).
- **Propósito:** corrigir a reincidência em que o checkout principal permaneceu desatualizado enquanto trabalho documental retroativo era acumulado diretamente sobre uma `main` local suja, impedindo que a pasta `documentation/` refletisse os merges remotos.
- **O que se planeja fazer:** auditar a divergência sem alterar arquivos, criar backup externo com hashes, distinguir adições exclusivas de snapshots regressivos, transplantar somente o conteúdo válido sobre uma worktree da `origin/main`, publicar a reconciliação e atualizar o checkout principal por fast-forward, preservando seletivamente os ajustes locais autorizados.
- **Recursos/arquivos principais envolvidos:** Git, `git worktree`, backup `C:\Users\clovi\AppData\Local\Trofia\safety-backups\main-sync-20260916`, nove arquivos em `documentation/historico/`, `documentation/estado-atual/RESUMO-STATUS.md`, `android/app/build.gradle`, `android/build.gradle`, `bug-inventory.txt`, `android/app/google-services.json` e `android/keystore.properties`.
- **O que foi feito:** a auditoria comprovou que o checkout principal estava na `main` local `06ce74a`, 49 commits atrás de `origin/main` `9ec964e`, com 13 arquivos rastreados modificados. O trabalho exclusivo foi reduzido a 240 linhas de métricas e registros retroativos; estados antigos de C14 e CAM-RED foram deliberadamente excluídos da reconciliação para não regredir a documentação vigente. Um backup externo de 21 arquivos, patch integral e hashes foi criado antes de qualquer mudança. O PR #219 passou no preflight documental, foi mesclado em `f62d745` e a `main` principal recebeu o fast-forward completo. O stash restrito reaplicou somente `versionCode 13`, o redirecionamento externo de build e G01; a documentação ficou idêntica a `origin/main`, enquanto `google-services.json` e `keystore.properties` conservaram exatamente hash e tamanho.
- **Alinhamento:** 100%. O plano aprovado foi executado sem conflito nem perda; a seleção manual impediu que snapshots antigos sobrescrevessem C14/CAM-RED atuais. O impacto foi positivo para integridade documental e para a segurança do checkout local.
- **PRs/commits relacionados:** PR #219, commit `a856617`, merge `f62d745`, run leve `35139571971`. — **Chat:** Trofia-Principal.

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
| [#198](https://github.com/magnoClovis/nutrition-tracker/pull/198) | 2 min | 1 min (1 leve + 0 pesado) | Trofia-Principal |
