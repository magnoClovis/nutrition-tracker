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

C08 permanece parcial. O modelo permanece `gemini-3.5-flash-lite`; comparação de modelo foi adiada em `PENDENCIAS.md`.

## 31/08/2026 — organização documental e retomada da C08

- **PR #153** — criou o índice documental, o resumo de estado e este histórico comprovável; merge incluído na base `3d776db`.
- **PR #155** — passou a reservar a suíte pesada para PRs que também alterem código, sem abrir exceção para PR misto de código e documentação; merge incluído na base `3d776db`.

### C08-E — despensa e explicação da avaliação

- **Código:** `C08-E`.
- **Data:** 31/08/2026.
- **Propósito:** retirar do controlador o prompt livre de sugestões pela despensa, impedir correspondência aproximada de alimentos e alinhar a explicação narrativa do C19 ao score contextual definitivo.
- **Recursos:** contrato `pantry-suggestions-v2`; endpoint autenticado `POST /v1/ai/pantry-suggestions`; contrato narrativo `meal-explanation-v1`; modelo mantido em `gemini-3.5-flash-lite`.
- **Arquivos principais:** `/pantry-suggestions-ai.js`, `/worker/src/pantry-suggestions.js`, `/worker/src/ai-worker.js`, `/ai-client.js`, `/nutrition-tracker-controller.js`, `/meal-review-ai.js`, composições UMD/ESM, testes e `/AI_NUTRITION_POLICY.md`.
- **O que foi feito:** a IA passou a receber uma projeção limitada da despensa com IDs exatos; Worker e cliente validam resposta integralmente em modo fail-closed; IDs desconhecidos/repetidos, quantidades inválidas e campos extras são recusados; todos os totais são recalculados a partir do snapshot canônico local. O GA visível continua local e não foi substituído silenciosamente. A explicação da avaliação agora recebe versão do algoritmo, nota 0–5 definitiva, cobertura, confiança, provisoriedade e seus motivos específicos, sem recalcular nota, diagnosticar ou transformar ausência em zero.
- **PRs/commits relacionados:** PR draft #165, branch `codex/c08-pantry-score-explanation`, commit de implementação `be8534d`.

## Incidentes e trabalhos separados observados

- **F06 / PR #143:** draft aberto para documentar bloqueio de conectividade ao domínio compartilhado `workers.dev`. Não foi mesclado até esta captura; causa de rede específica por usuário/ISP e futura migração para domínio próprio permanecem registradas fora do C08.
- **PR #101:** draft antigo de leituras do Firestore, não mesclado. Entregas equivalentes ou posteriores aparecem em C28, especialmente #113–#117; a decisão administrativa de fechar o draft é **não determinada**.
- **PR #150:** trabalho de NumericField em outra frente de UI, ainda draft na captura.

## Estado ao encerrar esta cronologia

- Base usada para a C08-E: `origin/main` no commit `3d776db`, em 31/08/2026.
- Versão nomeada no código: `0.10.0-beta`.
- C22, C23, C28, C20 e C19: concluídos segundo o roadmap.
- C08: parcial; A–D mescladas, E implementada no PR draft #165 com deploy/smoke/merge ainda pendentes, e trabalho residual posterior ainda planejado.
- Próximos gates de lançamento público no roadmap: C14, C16 e C25.

## Fontes consultadas e limitações

- GitHub: lista de PRs mesclados e abertos, títulos, datas e commits.
- Git: `origin/main` no commit `3d776db`.
- Documentos: `/ROADMAP.md`, `/VERSIONING.md`, `/PENDENCIAS.md`, `/AI_NUTRITION_POLICY.md`, `/NUTRITION_SCORE.md`, `/C22_ROLLOUT.md` e `/C24_FATIA_7_VALIDACAO.md`.
- O histórico integral das conversas não existe no Git; decisões que dependem somente do diálogo e não deixaram evidência versionada são **não determinadas**.
- APIs do GitHub estavam acessíveis durante esta captura; nenhum intervalo foi omitido por indisponibilidade da API.
