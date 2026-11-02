# Documento 5 — Mudanças técnicas desde 1º de setembro de 2026

**Matriz técnica aprofundada: antes → agora → evidência → limite operacional**

**Base anterior:** `documentation/snapshots/2026-09-01/`.
**Referência atual:** `origin/main` em `4e727679d8b556e89a590b2861acc1b7b53b8b72`.
**Versão nomeada nos manifests:** `0.11.0-beta`.
**Regra de evidência:** merge, CI, rollout controlado, staging, teste interno e lançamento público são estados independentes.

## 1. Taxonomia operacional usada nesta comparação

| Estado | Critério usado neste documento |
|---|---|
| Código mesclado | O commit-base contém a alteração. Não prova deploy nem ausência de defeitos. |
| CI verde | Um run identificado executou o gate declarado. Não generaliza para toda execução. |
| Rollout de produção controlado | Serviço remoto foi publicado e exercitado com conta/cenário delimitado. Não abre o produto ao público. |
| Staging parcial | Alguns recursos e fronteiras existem, mas o ambiente incompleto continua fail-closed. |
| Android interno | AAB instalado pela faixa interna e testado em aparelho. Não é faixa pública. |
| Lançamento público | Exige gate C25 e evidência de disponibilidade geral. Não comprovado. |

## 2. Matriz por fronteira

### 2.1 — Versão e recorte

- **Antes → agora:** snapshot nomeava 0.10.0-beta → package/web/Android nomeiam 0.11.0-beta
- **Arquivos, componentes e serviços:** `package.json`, Gradle, manifests, `VERSIONING.md`
- **Evidência versionada:** PR #169/merge `0187c90`; commit-base `4e727679d8b556e89a590b2861acc1b7b53b8b72`
- **Decisão e trade-off:** a versão declarada não é usada como prova de distribuição
- **Impacto técnico:** identifica o código comparado e reduz mistura com PRs posteriores
- **Limites comprovados:** `VERSIONING.md` ainda preserva uma linha histórica chamada estado atual para 0.9.0-beta; versionCode interno não é inferível só do Gradle
- **Estado operacional em 01/11/2026:** código mesclado; lançamento público não comprovado
### 2.2 — Diálogos e acessibilidade básica

- **Antes → agora:** cinco usos ativos de `alert/confirm/prompt` → `GenericDialog` com portal, foco contido, Escape/Enter/Back e estados bloqueados
- **Arquivos, componentes e serviços:** componente UMD/ESM, controladores consumidores, CSS e Playwright
- **Evidência versionada:** PR #172, merge `f612de2`
- **Decisão e trade-off:** substituir primitivas do navegador sem mudar contratos de domínio
- **Impacto técnico:** comportamento consistente em desktop/mobile e temas
- **Limites comprovados:** não cobre todos os diálogos futuros; apenas os cinco usos inventariados
- **Estado operacional em 01/11/2026:** mesclado e validado
### 2.3 — Firestore rules e schema

- **Antes → agora:** envelope amplo e falhas de leitura podiam parecer vazio → delete client-side negado, limites raiz/data, allowlists/tipos/tamanhos e leitor profundo fail-closed
- **Arquivos, componentes e serviços:** `firestore.rules`, `firebase-firestore-sdk.js`, `C14_B2_FIRESTORE_SCHEMA_INVENTORY.md`, testes Admin/emulador
- **Evidência versionada:** PRs #174/#175/#178; merges `141da41`, `8d2ddae`, `80bc2ca`; run `33575611133`
- **Decisão e trade-off:** a validação profunda dos seis componentes foi movida das rules ao leitor porque excedia 1.000 expressões; `diff().affectedKeys()` valida mudanças
- **Impacto técnico:** reduz aceitação de documento inesperado sem bloquear toda escrita legítima histórica
- **Limites comprovados:** não afirma sanitização retroativa de todos os documentos; C22 continua único delete administrativo
- **Estado operacional em 01/11/2026:** mesclado e rules publicadas; C14 global ainda parcial
### 2.4 — Modelo canônico e compatibilidade C23

- **Antes → agora:** legado já estava fisicamente fechado em agosto → o hardening de setembro preserva schema C23 e valida somente contratos canônicos
- **Arquivos, componentes e serviços:** `nutrition/{uid}`, `data/{key}`, `days/{date}/meals|water|supplements`, importador histórico
- **Evidência versionada:** C23 PRs #107–#112; C14-B2 PR #178
- **Decisão e trade-off:** não reabrir paths antigos para facilitar compatibilidade; aceitar backup antigo somente na entrada
- **Impacto técnico:** rules, backup e exclusão convergem para a mesma árvore
- **Limites comprovados:** export de segurança tem lifecycle de 90 dias; compatibilidade de importação será removida somente conforme decisão futura C15
- **Estado operacional em 01/11/2026:** produção canônica; paths antigos fechados
### 2.5 — Detalhes e edição do Diário

- **Antes → agora:** ações básicas sem domínio completo de detalhe/movimentação → detalhe somente leitura, edição e movimento preservam ID; avaliação incompatível é invalidada
- **Arquivos, componentes e serviços:** `diary-screen.js`, controlador, menus, snapshots C19 e testes
- **Evidência versionada:** PRs #182/#184; merges `842b7de`, `cadad17`
- **Decisão e trade-off:** preservar identidade do registro e invalidar metadados derivados em vez de copiá-los
- **Impacto técnico:** correção histórica sem recriar item e sem score obsoleto
- **Limites comprovados:** não entrega timeline/calendário I6
- **Estado operacional em 01/11/2026:** mesclado e testado
### 2.6 — Domínio proporcional de estimativas

- **Antes → agora:** foto e descrição tinham caminhos de edição parcialmente distintos → ambas usam recálculo proporcional compartilhado; limite de itens é específico da superfície
- **Arquivos, componentes e serviços:** `meal-estimate.js`, editor compartilhado, foto, descrição, Worker/cliente
- **Evidência versionada:** PRs #186/#188 e #345/#346; merges `3cfe038`, `7069d4d`, `f025e47`, `6f796b1`
- **Decisão e trade-off:** recalcular valores determinísticos no cliente; não pedir nova inferência generativa após cada edição
- **Impacto técnico:** consistência entre origens e correção do limite herdado
- **Limites comprovados:** estimativa continua dependente da qualidade da entrada; limites não são intercambiáveis
- **Estado operacional em 01/11/2026:** mesclado; documentação pós-merge presente
### 2.7 — Auth e persistência de sessão

- **Antes → agora:** persistência web implícita e senha mínima histórica menor → `SESSION` padrão, `LOCAL` opt-in, Android persistente, senha nova ≥12 e perfil incompleto recuperável
- **Arquivos, componentes e serviços:** `login-screen.js`, `profile-validation.js`, Firebase Auth modular, i18n e Console
- **Evidência versionada:** PR #215; merge `b307d29`
- **Decisão e trade-off:** compatibilidade de contas antigas foi mantida; Firebase ficou em Notificar em vez de enforcement de senha global
- **Impacto técnico:** reduz sessão permanente acidental e conta parcial
- **Limites comprovados:** incidentes de reload/perfil permanecem monitorados; não há prova de causa universal eliminada
- **Estado operacional em 01/11/2026:** mesclado; Auth de produção configurado conforme fonte
### 2.8 — App Check nos clientes e Worker

- **Antes → agora:** verificação parcial/observacional → sete clientes enviam token; CI usa debug provider; Worker exige token válido e rejeita ausência com 401
- **Arquivos, componentes e serviços:** `app-check-client.js`, clientes IA, `firebase-app-check-token.js`, Wrangler, workflows e Play Integrity
- **Evidência versionada:** PRs #189/#191/#210; merges `323610e`, `e118872`, `f799a93`; runs `34478874949`, `35024249874`
- **Decisão e trade-off:** observe → prova web/AAB → enforce; bloquear somente depois de confirmar clientes legítimos
- **Impacto técnico:** chamada sem atestação não alcança Gemini
- **Limites comprovados:** debug é restrito ao lane autenticado; staging web ainda sem enforcement e Android staging sem Play Integrity
- **Estado operacional em 01/11/2026:** produção controlada do Worker em enforce; staging parcial
### 2.9 — Worker: limites, tiers e telemetria

- **Antes → agora:** limites fixos e observabilidade menor → HMAC por UID, tiers em observação, 40 s/128 KB, métricas sanitizadas e retenção ≤30 dias
- **Arquivos, componentes e serviços:** Worker, Durable Object SQLite, Analytics Engine/Logs, contratos e Wrangler
- **Evidência versionada:** PR #257/merge `6293899`; rollout #262/merge `859f6fb`; versão `179df5a8`
- **Decisão e trade-off:** medir tiers antes de cobrar; não registrar prompt, foto ou resposta; limitar saída do provider
- **Impacto técnico:** diagnóstico e preparação comercial sem expor conteúdo
- **Limites comprovados:** tiers não aplicam cobrança/entitlement; C30 não iniciado
- **Estado operacional em 01/11/2026:** rollout F1 a 100% com smokes controlados
### 2.10 — IA: contratos estruturados e narrativos

- **Antes → agora:** critérios espalhados e risco de interpretar ausência como zero → política `c08-ai-nutrition-policy-v1`, schemas estruturados e prompts narrativos minimizados
- **Arquivos, componentes e serviços:** `AI_NUTRITION_POLICY.md`, `food-autofill-ai.js`, `dish-description-ai.js`, `pantry-suggestions-ai.js`, `meal-review-ai.js`, Worker
- **Evidência versionada:** PRs #147/#149/#151/#152/#165/#167; merges `67514dd` a `2547a19`
- **Decisão e trade-off:** estruturado para dados que entram no editor; narrativo para explicação/padrões; autoridade numérica continua local
- **Impacto técnico:** respostas malformadas/injeção/IDs desconhecidos falham fechadas
- **Limites comprovados:** Gemini depende de rede; prova real foi controlada e não é validação clínica
- **Estado operacional em 01/11/2026:** mesclado; Worker publicado/validado nas fatias citadas
### 2.11 — Android release

- **Antes → agora:** backup/cleartext/FileProvider e verificações menos estritas → Auto Backup/account transfer/cleartext negados, cache privado e AAB verificado por configuração, manifesto, assinatura, versão e hash
- **Arquivos, componentes e serviços:** AndroidManifest, `file_paths.xml`, Gradle, scripts/testes de release e AAB
- **Evidência versionada:** PR #213/merge `fbb8486`; run `35109617209`
- **Decisão e trade-off:** falhar o build quando configuração release não pode ser comprovada; não gerar artefato sem autorização
- **Impacto técnico:** reduz exfiltração local e release mal configurado
- **Limites comprovados:** versionCode histórico distribuído não é derivável apenas do Gradle; iOS ausente
- **Estado operacional em 01/11/2026:** mesclado; provas internas, não publicação pública
### 2.12 — Câmera e resultado compartilhado

- **Antes → agora:** preview/análise/resultado fragmentados → foto congelada, palco central, flash real, análise full-screen, erros/retry e `MealResultSheet` comum
- **Arquivos, componentes e serviços:** CAM-RED-2–9, Camera Preview 8.0.1, `image-meal-*`, sheet, editor, Galaxy e Play
- **Evidência versionada:** PRs #203/#207/#227/#244/#246/#256/#277/#323; merges documentados de `caeb515` a `9537a9d`
- **Decisão e trade-off:** preservar dois frames e `stop()` anticrash; primeira pintura usa captura bruta enquanto normalização ocorre em paralelo
- **Impacto técnico:** continuidade visual, ação recuperável e edição proporcional compartilhada
- **Limites comprovados:** CAM-RED-10 ainda não iniciado; busca aberta/barcode fora; foto temporária
- **Estado operacional em 01/11/2026:** código mesclado, CI verde e múltiplas provas em faixa interna
### 2.13 — C28: cache, offline e sincronização

- **Antes → agora:** arquitetura offline-first recém-entregue em agosto → hardening posterior opera sobre SDK modular, cache protegido, escrita granular e status observável
- **Arquivos, componentes e serviços:** `firebase-firestore-lifecycle.js`, `firebase-firestore-sdk.js`, `daily-entry-persistence.js`, `firebase-sync-state.js`, IndexedDB
- **Evidência versionada:** C28 PRs #113–#124; merges `c9c5662`–`9e19575`; incidentes/backup PRs #264/#271/#274
- **Decisão e trade-off:** cache persistente só em dispositivo confiável; troca de conta bloqueia e apaga; diffs/lotes evitam autosave agregado
- **Impacto técnico:** resiliência a rede, multi-aba e concorrência
- **Limites comprovados:** IA/busca/exclusão não funcionam offline; algumas corridas históricas de loader permanecem dívida C15
- **Estado operacional em 01/11/2026:** arquitetura mesclada; incidentes adicionais corrigidos/monitorados
### 2.14 — Backup e preview

- **Antes → agora:** leitura permissiva/repetitiva podia gerar arquivo ou preview enganoso → export fail-closed, coalescência por data e normalização histórica somente em memória
- **Arquivos, componentes e serviços:** `firebase-backup-internal.js`, preview/import, histórico PT/EN/ES, sync lifecycle
- **Evidência versionada:** PR #174 e PRs #264/#271/#274; merges `141da41`, `d617840`, `adc4dcf`, `2d40a10`
- **Decisão e trade-off:** não regravar dados persistidos durante análise; recusar parcial em vez de completar silenciosamente
- **Impacto técnico:** medição documentada caiu de 1.793 para 623 requests no cenário observado
- **Limites comprovados:** não extrapolar a medição para toda latência; export offline declara pending writes
- **Estado operacional em 01/11/2026:** mesclado e validado nos recortes
### 2.15 — Functions, IAM, Tasks e Scheduler

- **Antes → agora:** identidade Editor compartilhada e invocadores herdados → build/runtime/scheduler dedicados, callable/processador/reconciliador isolados e invocador residual removido
- **Arquivos, componentes e serviços:** IAM/Cloud Run/Functions/Tasks/Scheduler/Artifact Registry, `functions/src/config.js`, lockfiles
- **Evidência versionada:** PRs #258/#265/#288/#292/#298–#300/#311; merges documentados até `75c5c0e`; execuções naturais HTTP 200
- **Decisão e trade-off:** migrar consumidor por consumidor com baseline e rollback; não revogar Editor sem decisão separada
- **Impacto técnico:** menor blast radius e prova de retry/callable/Scheduler com contas descartáveis
- **Limites comprovados:** `roles/editor` permanece residual rastreado; staging não possui stack equivalente
- **Estado operacional em 01/11/2026:** produção controlada comprovada; C14-F2 concluída com residual explícito
### 2.16 — CSP e superfícies de debug

- **Antes → agora:** destinos mais amplos e helpers globais → meta CSP restrita, debug condicionado e verificação do HTML publicado
- **Arquivos, componentes e serviços:** `index.html`, Vite, storage, `verify-csp-policy.js`, Pages, WebChannel
- **Evidência versionada:** PR #294/merge `5dfff2a`; provas desktop/mobile no domínio real
- **Decisão e trade-off:** interpretar corretamente o transporte WebChannel; cabeçalhos codificados no POST não são ausência de proteção
- **Impacto técnico:** reduz destinos possíveis para XSS e exposição de diagnósticos
- **Limites comprovados:** CSP é uma camada, não prova de inexistência de XSS; staging exige política própria
- **Estado operacional em 01/11/2026:** Pages publicado/provado; não implica lançamento do produto
### 2.17 — I1/I2/I3

- **Antes → agora:** loading genérico, cadastro concentrado e política histórica de tema → marca por 900 ms, sete decisões progressivas e tema local v2 claro/escuro/sistema
- **Arquivos, componentes e serviços:** loading/bootstrap, login/perfil, `theme-policy.js`, Configurações, i18n e Playwright
- **Evidência versionada:** PRs #280/#293/#321; merges `b0e20f4`, `f09ac0b`, `76b71eb`
- **Decisão e trade-off:** não corrigir runtime reduzindo espera ou aumentando timeout do teste; tema migra uma vez e depois respeita escolha
- **Impacto técnico:** prontidão explícita, menor carga cognitiva e preferência previsível
- **Limites comprovados:** tema não sincroniza; incidentes intermitentes continuam monitorados
- **Estado operacional em 01/11/2026:** mesclado; I3 também validado em AAB interno 28
### 2.18 — I4-A/I4-B

- **Antes → agora:** entrada direta fragmentada e coordenação de destino/horário dispersa → menu de quatro caminhos + sheet com destino, horário, repetição recente e Undo
- **Arquivos, componentes e serviços:** navegação, `add-screen.js`, sheet, ChoiceField/TemporalField, marca/ícones, i18n e Playwright
- **Evidência versionada:** PR #332/merge `b00f7e5`; PR #337/merge `3657dde`; closeout #347/merge `9ba057d`
- **Decisão e trade-off:** reutilizar fluxos existentes e provar fonte/destino com identidades separadas; barcode fica fora
- **Impacto técnico:** criação mais encontrável e repetição reversível
- **Limites comprovados:** I4-C bandeja/pesquisa não iniciada; nenhum deploy/AAB/Play alterado por I4-B
- **Estado operacional em 01/11/2026:** mesclado; CI do PR e main verde
### 2.19 — I8-A

- **Antes → agora:** acordeões de alimentos/refeições/suplementos → shell com contagens, busca, quatro segmentos, filtros e categorias derivadas
- **Arquivos, componentes e serviços:** `pantry-screen.js`, controlador, modelos existentes, CSS, i18n, Playwright e mock Open Food Facts
- **Evidência versionada:** PR #340; merge/base `4e72767`; gate local 1.572 unitários, legado 185+10, Vite 195 e cutover 60/60
- **Decisão e trade-off:** preservar schema/persistência e filtrar somente 503 deliberado do host opcional exato
- **Impacto técnico:** melhora navegação sem reescrever dados
- **Limites comprovados:** documentação viva ainda diz em andamento/draft; I8-B/C não iniciadas
- **Estado operacional em 01/11/2026:** código mesclado; fechamento documental contraditório
### 2.20 — C14-H staging

- **Antes → agora:** não havia ambiente separado → projeto/apps/Auth/App Check web/manifesto/CSP parciais, com fronteiras Web/Functions/Worker fail-closed
- **Arquivos, componentes e serviços:** `trofia-staging`, `config/staging-environment.json`, Vite, `.firebaserc`, Wrangler, scripts, Firebase/Cloud
- **Evidência versionada:** PRs #315–#343; merges #320 `240d4d4`, #330 `74a988a`, #334 `6499845`, #341 `364eb4d`, #343 `04a77bc`
- **Decisão e trade-off:** mesclar verificadores antes de provisionar recursos; campos vazios bloqueiam build/deploy; alerta €1 não é cap
- **Impacto técnico:** reduz risco de mistura entre contas/projetos
- **Limites comprovados:** sem Worker/DO/Functions/Tasks/Scheduler/IAM/CI lane/Android/matriz completa; App Check web sem enforcement; nenhum deploy staging
- **Estado operacional em 01/11/2026:** parcial e fail-closed; C14-H aberta

## 3. Relações causais principais

### 3.1 C23 → C28 → C14-B2

C23 fechou fisicamente caminhos antigos e definiu a árvore canônica. C28 pôde então trocar REST por SDK modular e granularizar o dia sem manter dois sistemas de escrita. C14-B2, por sua vez, endureceu rules sobre um schema conhecido. Inverter essa ordem teria exigido rules para formatos em movimento ou compatibilidade operacional indefinida. O trade-off foi manter importação histórica isolada e aceitar que validação profunda de componentes ficasse no leitor quando o orçamento de expressões das rules se esgotou.

### 3.2 C20/C19 → C08

O score determinístico e o snapshot aceito definem os números e a integridade histórica. Só depois a política de IA pôde receber metas/totais/cobertura já calculados e limitar o modelo a estimar ou explicar. Isso impede que uma resposta narrativa altere silenciosamente nota, total ou histórico.

### 3.3 C14-C → C14-F1 → C30

App Check prova origem; F1 cria pseudonimização, limites e tiers observados. Cobrança/entitlements C30 ainda precisa de verificação de compra, estados de assinatura e fonte de verdade no backend. Observar um tier no Worker não concede nem restringe benefício pago.

### 3.4 CAM-RED → I4

CAM-RED criou captura e resultado reutilizável. I4-A apenas escolhe o caminho e I4-B coordena destino/hora/repetição. I4-C, ainda futura, deve usar o mesmo `MealResultSheet`; não deve introduzir outro editor.

## 4. Matriz de gates e alcance

| Fronteira | Gate comprovado | Alcance | Não comprovado |
|---|---|---|---|
| Firestore/rules | emuladores, Admin fail-closed, run pós-deploy | schema e mudanças permitidas | ausência de todo documento histórico inesperado |
| Worker | unitários/runtime, smokes reais, App Check | endpoints e clientes cobertos | disponibilidade ininterrupta e tiers pagos |
| Functions | testes puros/emulados, contas descartáveis, Scheduler natural | exclusão e identidades publicadas | stack equivalente em staging |
| Android | scripts release, AAB interno, Galaxy | artefatos e cenários citados | faixa pública, iOS, todos os aparelhos |
| UI | legado/Vite, desktop/mobile, PT/EN/ES, cutover | contratos dos cenários | todo estado futuro ou redesign ainda planejado |
| Staging | verificadores negativos e identidades parciais | bloqueio de mistura | ambiente completo ou rollout |

## 5. Contradições e lacunas preservadas

1. I8-A está no commit-base via PR #340, mas documentos vivos ainda registram “em andamento” e “PR draft”.
2. `VERSIONING.md` preserva 0.9.0-beta como “estado atual” histórico, enquanto manifests nomeiam 0.11.0-beta.
3. O Gradle versionado não prova qual `versionCode` foi distribuído em cada rodada interna.
4. `roles/editor` residual não foi revogado; existe item separado e não há atestado de risco eliminado.
5. Incidentes de reload/sessão/perfil permanecem sob investigação ou monitoramento; repetição verde não determina causa universal.
6. Staging parcial não possui recursos remotos, Android e matriz completos.
7. Não há evidência de lançamento público nem entrega iOS.

## 6. Fontes verificadas

- snapshot imutável `documentation/snapshots/2026-09-01/`;
- `RESUMO-STATUS.md`, `ROADMAP.md`, `BUG-INVENTORY.md`, `VERSIONING.md`;
- `AI_NUTRITION_POLICY.md`, `NUTRITION_SCORE.md`, rules, Worker, Functions, Android e workflows;
- documentos C14, I2, I3, I8 e CAM-RED-9 em `documentation/estado-atual/`;
- `git log --first-parent` até `4e727679d8b556e89a590b2861acc1b7b53b8b72` e PRs/commits indicados em cada fronteira.
